import { NextRequest, NextResponse } from "next/server";
import { parseSearchPrompt } from "@/lib/ai/query-parser";
import {
  createSearch,
  failSearchAndRefund,
  startProviderSearch,
} from "@/lib/services/search-service";
import { requireUser } from "@/lib/supabase/server";
import { enforceRateLimit } from "@/lib/usage/service";
import { businessSearchQuerySchema, createSearchRequestSchema } from "@/schemas/search";
import type { BusinessSearchQuery } from "@/types";

function numberOrFallback(value: string, fallback: number | null) {
  if (!value.trim()) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function applyFilters(
  query: BusinessSearchQuery,
  filters: NonNullable<ReturnType<typeof createSearchRequestSchema.parse>["filters"]> | null | undefined
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
    if (interpreted.error || !interpreted.query) {
      return NextResponse.json(
        { error: interpreted.error ?? "Failed to understand the search request" },
        { status: 422 }
      );
    }

    const merged = applyFilters(interpreted.query, parsed.data.filters);
    if (!merged.success) {
      return NextResponse.json(
        { error: merged.error.issues[0]?.message ?? "Invalid search filters" },
        { status: 400 }
      );
    }

    const created = await createSearch(
      user.id,
      parsed.data.prompt,
      merged.data,
      parsed.data.idempotencyKey
    );
    if (created.quotaExceeded) {
      return NextResponse.json(
        { error: created.error, quotaExceeded: true, plan: "free" },
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

    return NextResponse.json(
      { searchId: created.searchId, parsedQuery: merged.data },
      { status: 202 }
    );
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
