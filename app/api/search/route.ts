import { NextRequest, NextResponse } from "next/server";
import { parseSearchPrompt } from "@/lib/ai/query-parser";
import { planSearchStrategy } from "@/lib/search/planner";
import { collectBraveResults } from "@/lib/search/collect";
import { braveProspectingEnabled } from "@/lib/search/limits";
import {
  createSearch,
  failSearchAndRefund,
  saveProspecting,
  startProviderSearch,
} from "@/lib/services/search-service";
import { requireUser } from "@/lib/supabase/server";
import { enforceRateLimit } from "@/lib/usage/service";
import {
  businessSearchQuerySchema,
  createSearchRequestSchema,
  type CreateSearchRequest,
} from "@/schemas/search";
import type { BusinessSearchQuery } from "@/types";

function numberOrFallback(value: string, fallback: number | null) {
  if (!value.trim()) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function applyFilters(
  query: BusinessSearchQuery,
  filters: CreateSearchRequest["filters"]
) {
  if (!filters) return businessSearchQuerySchema.safeParse(query);
  return businessSearchQuerySchema.safeParse({
    ...query,
    businessCategory: filters.businessCategory || query.businessCategory,
    location: filters.location || query.location,
    minRating: numberOrFallback(filters.minRating, query.minRating),
    maxRating: numberOrFallback(filters.maxRating, query.maxRating),
    minReviews: numberOrFallback(filters.minReviews, query.minReviews),
    maxReviews: numberOrFallback(filters.maxReviews, query.maxReviews),
    websiteCondition: filters.websiteCondition,
    phoneRequired: filters.phoneRequired,
    emailRequired: filters.emailRequired,
    resultLimit: numberOrFallback(filters.resultLimit, query.resultLimit),
  });
}

function queryFromFilters(filters: CreateSearchRequest["filters"]) {
  return businessSearchQuerySchema.safeParse({
    businessCategory: filters.businessCategory,
    location: filters.location,
    city: null,
    state: null,
    country: null,
    minRating: numberOrFallback(filters.minRating, null),
    maxRating: numberOrFallback(filters.maxRating, null),
    minReviews: numberOrFallback(filters.minReviews, null),
    maxReviews: numberOrFallback(filters.maxReviews, null),
    websiteCondition: filters.websiteCondition,
    phoneRequired: filters.phoneRequired,
    emailRequired: filters.emailRequired,
    keywords: [],
    resultLimit: numberOrFallback(filters.resultLimit, 25),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = createSearchRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }

    const user = await requireUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!(await enforceRateLimit(user.id, "create_search", 6, 60))) {
      return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
    }

    const interpreted = await parseSearchPrompt(parsed.data.prompt);
    const merged = interpreted.query
      ? applyFilters(interpreted.query, parsed.data.filters)
      : queryFromFilters(parsed.data.filters);

    if (!merged) {
      return NextResponse.json(
        {
          error:
            "We could not tell which clients to find. Describe your offer or the client type, and choose an area.",
        },
        { status: 422 }
      );
    }

    if (!merged.success) {
      return NextResponse.json(
        { error: merged.error.issues[0]?.message ?? "Invalid search filters" },
        { status: 400 }
      );
    }

    let query = merged.data;
    let strategy = null;
    if (braveProspectingEnabled()) {
      strategy = await planSearchStrategy(parsed.data.prompt, merged.data.location);
      const explicitBuyer = parsed.data.filters.businessCategory.trim();
      const plannedBuyer = strategy.idealCustomerProfiles[0]?.businessTypes[0] ?? strategy.productSummary;
      const replanned = businessSearchQuerySchema.safeParse({
        ...merged.data,
        businessCategory: explicitBuyer || plannedBuyer,
        mapsQueries: strategy.mapsQueries,
      });
      if (replanned.success) query = replanned.data;
    }

    const created = await createSearch(
      user.id,
      parsed.data.prompt,
      query,
      parsed.data.idempotencyKey
    );
    if (created.quotaExceeded) {
      return NextResponse.json(
        { error: created.error, quotaExceeded: true },
        { status: 403 }
      );
    }
    if (created.error || !created.searchId) {
      return NextResponse.json({ error: created.error ?? "Failed to create search" }, { status: 500 });
    }

    try {
      await startProviderSearch(created.searchId, user.id);
    } catch {
      await failSearchAndRefund(
        created.searchId,
        "PROVIDER_START_FAILED",
        "Business discovery could not be started. Please try again."
      );
      return NextResponse.json(
        { error: "Business discovery could not be started. Please try again." },
        { status: 502 }
      );
    }

    if (strategy) {
      try {
        const web = await collectBraveResults(strategy);
        const unavailable = web.failures > 0 && web.results.length === 0;
        await saveProspecting(
          created.searchId,
          strategy,
          web.results,
          unavailable ? "Web signal search was unavailable." : null
        );
      } catch {
        await saveProspecting(created.searchId, strategy, [], "Web signal search was unavailable.");
      }
    }

    return NextResponse.json(
      {
        searchId: created.searchId,
        parsedQuery: { ...query, resultLimit: created.resultLimit ?? query.resultLimit },
      },
      { status: 202 }
    );
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
