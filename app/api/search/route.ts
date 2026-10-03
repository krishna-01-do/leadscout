import { NextRequest, NextResponse } from "next/server";
import { parseSearchPrompt } from "@/lib/ai/query-parser";
import {
  buyerFromPrompt,
  minimumResultLimit,
  placeFromPrompt,
  resultCountFromPrompt,
  websiteFromPrompt,
} from "@/lib/search/intent";
import { planSearchStrategy, strategyLocation } from "@/lib/search/planner";
import { collectBraveResults } from "@/lib/search/collect";
import { braveProspectingEnabled } from "@/lib/search/limits";
import {
  completeBraveSearch,
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
    websiteCondition: filters.websiteCondition === "ANY" ? query.websiteCondition : filters.websiteCondition,
    phoneRequired: filters.phoneRequired || query.phoneRequired,
    emailRequired: filters.emailRequired || query.emailRequired,
    resultLimit: filters.resultLimit.trim() && filters.resultLimit !== "25"
      ? numberOrFallback(filters.resultLimit, query.resultLimit)
      : query.resultLimit,
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
    const explicitBuyer = parsed.data.filters.businessCategory.trim();
    const explicitLocation = parsed.data.filters.location.trim();
    const hintedPlace = placeFromPrompt(parsed.data.prompt);
    const strategy = braveProspectingEnabled()
      ? await planSearchStrategy(parsed.data.prompt, explicitLocation || hintedPlace)
      : null;
    if (!merged.success && !strategy) {
      return NextResponse.json(
        { error: merged.error.issues[0]?.message ?? "Describe what you sell so we can find the clients who need it." },
        { status: 422 }
      );
    }

    const plannedBuyer = strategy?.idealCustomerProfiles[0]?.businessTypes[0] ?? strategy?.productSummary ?? "";
    const plannedLocation = strategy ? strategyLocation(strategy, "") : "";
    const parsedQuery = merged.success ? merged.data : null;
    const hintedBuyer = buyerFromPrompt(parsed.data.prompt);
    const businessCategory = explicitBuyer || hintedBuyer || plannedBuyer || parsedQuery?.businessCategory || "";
    const location = explicitLocation || hintedPlace || parsedQuery?.location || plannedLocation;
    const needsMaps = location.trim().length >= 2;
    const mapTerms = (strategy?.mapsQueries.length ? strategy.mapsQueries : [businessCategory])
      .map((item) => item.trim())
      .filter((item) => item.length >= 2)
      .slice(0, 2);
    const formLimit = parsed.data.filters.resultLimit.trim();
    const requestedLimit = formLimit && formLimit !== "25"
      ? numberOrFallback(formLimit, parsedQuery?.resultLimit ?? 25)
      : resultCountFromPrompt(parsed.data.prompt) ?? parsedQuery?.resultLimit ?? 25;
    const replanned = businessSearchQuerySchema.safeParse({
      ...(parsedQuery ?? {}),
      businessCategory,
      location,
      mapsQueries: needsMaps ? mapTerms : [],
      websiteCondition: parsed.data.filters.websiteCondition !== "ANY"
        ? parsed.data.filters.websiteCondition
        : websiteFromPrompt(parsed.data.prompt) ?? parsedQuery?.websiteCondition ?? "ANY",
      phoneRequired: parsed.data.filters.phoneRequired || parsedQuery?.phoneRequired || false,
      emailRequired: parsed.data.filters.emailRequired || parsedQuery?.emailRequired || false,
      resultLimit: minimumResultLimit(requestedLimit),
    });
    if (!replanned.success || businessCategory.trim().length < 2 || (needsMaps && location.trim().length < 2)) {
      return NextResponse.json(
        { error: "Describe what you sell so we can find the clients who need it." },
        { status: 422 }
      );
    }
    const query = replanned.data;

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

    const webPromise = strategy ? collectBraveResults(strategy) : null;

    if (!needsMaps && strategy && webPromise) {
      try {
        const web = await webPromise;
        await completeBraveSearch(created.searchId, strategy, web.results);
      } catch {
        await failSearchAndRefund(
          created.searchId,
          "WEB_SEARCH_FAILED",
          "Client search could not be completed. Please try again."
        );
        return NextResponse.json(
          { error: "Client search could not be completed. Please try again." },
          { status: 502 }
        );
      }
    } else {
      try {
        await startProviderSearch(created.searchId, user.id);
      } catch {
        const web = webPromise ? await webPromise.catch(() => null) : null;
        if (strategy && web?.results.length) {
          await completeBraveSearch(created.searchId, strategy, web.results);
        } else {
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
      }

      if (strategy && webPromise && needsMaps) {
        try {
          const web = await webPromise;
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
