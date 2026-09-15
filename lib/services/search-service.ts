import "server-only";

import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getProvider } from "@/lib/providers";
import { ApifyBusinessSearchProvider } from "@/lib/providers/apify-provider";
import { MockBusinessSearchProvider } from "@/lib/providers/mock-provider";
import { deduplicateBusinesses } from "@/lib/scoring/dedup";
import { qualifyBusiness } from "@/lib/scoring/engine";
import { recordLeadUsage } from "@/lib/usage/service";
import { freeTrialConfig } from "@/lib/branding";
import { businessSearchQuerySchema } from "@/schemas/search";
import type {
  BusinessSearchQuery,
  NormalizedBusiness,
  ProviderName,
  QualifiedResult,
  SearchRecord,
  SearchResultRow,
  SearchStatus,
} from "@/types";

const PROCESSING_TIMEOUT_MS = 30 * 60 * 1000;

function providerForName(name: ProviderName) {
  if (name === "mock") {
    if (process.env.NODE_ENV === "production" || process.env.APP_ENV === "production") {
      throw new Error("The mock provider is disabled in production");
    }
    return new MockBusinessSearchProvider();
  }
  if (name === "apify") return new ApifyBusinessSearchProvider();
  throw new Error(`Unsupported provider: ${name}`);
}

function callbackUrl(): string {
  const secret = process.env.APIFY_WEBHOOK_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!secret || secret.length < 32) {
    throw new Error("Apify webhook secret must be at least 32 characters");
  }
  if (!appUrl) throw new Error("Application URL is not configured");
  const url = new URL("/api/webhooks/apify", appUrl);
  if ((process.env.NODE_ENV === "production" || process.env.APP_ENV === "production") && url.protocol !== "https:") {
    throw new Error("Production application URL must use HTTPS");
  }
  return url.toString();
}

export async function createSearch(
  userId: string,
  prompt: string,
  parsedQuery: BusinessSearchQuery,
  idempotencyKey: string
): Promise<{ searchId: string | null; error: string | null; quotaExceeded: boolean }> {
  const database = createSupabaseAdmin();
  const provider = getProvider();
  const resultLimit = Math.min(parsedQuery.resultLimit, freeTrialConfig.freeResultLimit);
  const query = { ...parsedQuery, resultLimit };

  const { data, error } = await database.rpc("create_search_with_quota", {
    p_user_id: userId,
    p_prompt: prompt,
    p_parsed_query: query,
    p_provider: provider.name,
    p_requested_result_limit: resultLimit,
    p_idempotency_key: idempotencyKey,
  });

  if (error) {
    const quotaExceeded = error.message.includes("search_quota_exceeded");
    return {
      searchId: null,
      error: quotaExceeded
        ? "You've used all your searches for this period. Upgrade to continue."
        : "Failed to create search record.",
      quotaExceeded,
    };
  }
  return { searchId: typeof data === "string" ? data : null, error: null, quotaExceeded: false };
}

export async function startProviderSearch(
  searchId: string,
  userId: string
): Promise<void> {
  const database = createSupabaseAdmin();
  const provider = getProvider();
  const { data: search, error: searchError } = await database.from("searches")
    .select("parsed_query,requested_result_limit")
    .eq("id", searchId).eq("user_id", userId).maybeSingle();
  if (searchError || !search) throw new Error("Search record is unavailable");
  const parsed = businessSearchQuerySchema.safeParse(search.parsed_query);
  if (!parsed.success) throw new Error("Stored search query is invalid");
  const query = { ...parsed.data, resultLimit: search.requested_result_limit };

  const { data: placeholder, error: placeholderError } = await database.from("provider_runs")
    .insert({
      search_id: searchId,
      user_id: userId,
      provider: provider.name,
      status: "STARTING",
      requested_results: query.resultLimit,
    }).select("id").single();
  if (placeholderError?.code === "23505") return;
  if (placeholderError || !placeholder) throw new Error("Could not reserve provider run");

  const run = await provider.startSearch(
    query,
    provider instanceof ApifyBusinessSearchProvider ? callbackUrl() : undefined
  );

  const { error } = await database.from("provider_runs").update({
    external_run_id: run.runId,
    status: run.status,
    metadata: { datasetId: run.datasetId ?? null },
  }).eq("id", placeholder.id);
  if (error) throw new Error("Could not persist provider run");

  const { error: searchUpdateError } = await database.from("searches").update({
    status: "SEARCHING",
    started_at: new Date().toISOString(),
  }).eq("id", searchId);
  if (searchUpdateError) throw new Error("Could not update search status");

  if (run.status === "SUCCEEDED") await processProviderRun(run.runId);
}

export async function failSearchAndRefund(
  searchId: string,
  code: string,
  message: string
): Promise<void> {
  const { error } = await createSupabaseAdmin().rpc("fail_search_and_refund", {
    p_search_id: searchId,
    p_error_code: code,
    p_error_message: message,
  });
  if (error) throw new Error("Could not finalize failed search");
}

export async function processProviderRun(runId: string): Promise<void> {
  const database = createSupabaseAdmin();
  const { data: providerRun } = await database
    .from("provider_runs")
    .select("*")
    .eq("external_run_id", runId)
    .maybeSingle();
  if (!providerRun) throw new Error("Unknown provider run");

  const { data: search } = await database
    .from("searches")
    .select("*")
    .eq("id", providerRun.search_id)
    .maybeSingle();
  if (!search || ["COMPLETED", "FAILED"].includes(search.status)) return;

  const searchId = search.id as string;
  try {
    if (Date.now() - new Date(providerRun.created_at).getTime() > PROCESSING_TIMEOUT_MS) {
      await failSearchAndRefund(searchId, "PROVIDER_TIMEOUT", "Business discovery exceeded the 30-minute processing window.");
      await database.from("provider_runs").update({
        status: "TIMED_OUT",
        completed_at: new Date().toISOString(),
      }).eq("id", providerRun.id);
      return;
    }

    const providerName = String(providerRun.provider).toLowerCase() as ProviderName;
    const provider = providerForName(providerName);
    const run = await provider.getRun(runId);
    if (!run.datasetId) {
      const metadata = providerRun.metadata as { datasetId?: string } | null;
      run.datasetId = metadata?.datasetId ?? undefined;
    }

    if (run.status === "FAILED") {
      await failSearchAndRefund(searchId, "PROVIDER_FAILED", "Business discovery failed.");
      await database.from("provider_runs").update({
        status: "FAILED",
        completed_at: new Date().toISOString(),
      }).eq("id", providerRun.id);
      return;
    }
    if (run.status !== "SUCCEEDED") return;

    await updateSearchStatus(searchId, "PROCESSING");
    const query = search.parsed_query as BusinessSearchQuery;
    const rawBusinesses = await provider.getResults(run, query);
    const businesses = deduplicateBusinesses(rawBusinesses).slice(0, search.requested_result_limit);

    await updateSearchStatus(searchId, "SCORING");
    const qualified = businesses
      .map((business, index) => qualifyBusiness(business, query, index + 1))
      .sort((a, b) => b.matchScore - a.matchScore)
      .map((business, index) => ({ ...business, rank: index + 1 }));

    await persistResults(searchId, businesses, qualified);
    await recordLeadUsage(search.user_id, searchId, qualified.length);
    await database.from("provider_runs").update({
      status: "SUCCEEDED",
      received_results: rawBusinesses.length,
      completed_at: new Date().toISOString(),
    }).eq("id", providerRun.id);
    await updateSearchStatus(searchId, "COMPLETED", qualified.length);
  } catch (error) {
    await failSearchAndRefund(searchId, "PROCESSING_FAILED", "Search results could not be processed safely.");
    await database.from("provider_runs").update({
      status: "FAILED",
      completed_at: new Date().toISOString(),
      metadata: { failure: error instanceof Error ? error.name : "unknown" },
    }).eq("id", providerRun.id);
    throw error;
  }
}

async function persistResults(
  searchId: string,
  businesses: NormalizedBusiness[],
  qualified: QualifiedResult[]
) {
  if (!businesses.length) return;
  const database = createSupabaseAdmin();
  const businessRows = businesses.map((business) => ({
    provider: business.provider,
    provider_business_id: business.providerBusinessId,
    name: business.name,
    category: business.category,
    address: business.address,
    city: business.city,
    state: business.state,
    country: business.country,
    latitude: business.latitude,
    longitude: business.longitude,
    phone: business.phone,
    email: business.email,
    website: business.website,
    rating: business.rating,
    review_count: business.reviewCount,
    maps_url: business.googleMapsUrl,
    opening_hours: business.openingHours,
    social_links: business.socialLinks,
    metadata: business.metadata ?? {},
  }));
  const { data: stored, error: businessError } = await database.from("businesses")
    .upsert(businessRows, { onConflict: "provider,provider_business_id" })
    .select("id,provider,provider_business_id");
  if (businessError || !stored) throw new Error("Could not store businesses");

  const ids = new Map(stored.map((row) => [
    `${row.provider}:${row.provider_business_id}`,
    row.id as string,
  ]));
  const resultRows = qualified.flatMap((result) => {
    const businessId = ids.get(`${result.provider}:${result.providerBusinessId}`);
    return businessId ? [{
      search_id: searchId,
      business_id: businessId,
      match_score: result.matchScore,
      qualified: result.qualified,
      qualification_reason: result.qualificationReason,
      opportunity_flags: result.opportunityFlags,
      rank: result.rank,
    }] : [];
  });
  if (!resultRows.length) return;
  const { error: resultError } = await database.from("search_results")
    .upsert(resultRows, { onConflict: "search_id,business_id" });
  if (resultError) throw new Error("Could not store search results");
}

async function updateSearchStatus(
  searchId: string,
  status: SearchStatus,
  resultCount?: number
) {
  const updates: Record<string, unknown> = { status };
  if (status === "COMPLETED" || status === "FAILED") {
    updates.completed_at = new Date().toISOString();
  }
  if (resultCount !== undefined) updates.result_count = resultCount;
  const { error } = await createSupabaseAdmin().from("searches").update(updates).eq("id", searchId);
  if (error) throw new Error("Could not update search status");
}

export async function recoverSearch(searchId: string, userId: string) {
  const database = createSupabaseAdmin();
  const { data: search } = await database.from("searches")
    .select("id,status,user_id,created_at")
    .eq("id", searchId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!search || !["QUEUED", "SEARCHING", "PROCESSING", "SCORING"].includes(search.status)) return;
  const { data: run } = await database.from("provider_runs")
    .select("external_run_id,created_at")
    .eq("search_id", searchId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (run?.external_run_id) {
    await processProviderRun(run.external_run_id);
    return;
  }
  const pendingSince = run?.created_at ?? search.created_at;
  if (Date.now() - new Date(pendingSince).getTime() > 2 * 60 * 1000) {
    await failSearchAndRefund(searchId, "PROVIDER_START_TIMEOUT", "Business discovery did not start.");
  }
}

export async function getSearchResults(
  searchId: string,
  userId: string
): Promise<{ results: SearchResultRow[]; search: SearchRecord | null; error: string | null }> {
  const database = createSupabaseAdmin();
  const { data: search } = await database.from("searches").select("*")
    .eq("id", searchId).eq("user_id", userId).maybeSingle();
  if (!search) return { results: [], search: null, error: "Search not found." };

  const { data: results, error } = await database.from("search_results").select(`
    id, search_id, business_id, match_score, qualified, qualification_reason,
    opportunity_flags, rank, businesses (*)
  `).eq("search_id", searchId).order("rank", { ascending: true });
  if (error) return { results: [], search: mapSearchRecord(search), error: "Failed to load results." };

  const mapped: SearchResultRow[] = (results ?? []).flatMap((row) => {
    const businessValue = row.businesses as unknown;
    const business = (Array.isArray(businessValue) ? businessValue[0] : businessValue) as Record<string, unknown> | null;
    if (!business) return [];
    return [{
      id: row.id,
      searchId: row.search_id,
      businessId: row.business_id,
      matchScore: row.match_score,
      qualified: row.qualified,
      qualificationReason: row.qualification_reason ?? "",
      opportunityFlags: row.opportunity_flags ?? [],
      rank: row.rank,
      business: mapBusiness(business),
    }];
  });
  return { results: mapped, search: mapSearchRecord(search), error: null };
}

export async function getSearchHistory(userId: string): Promise<SearchRecord[]> {
  const { data } = await createSupabaseAdmin().from("searches").select("*")
    .eq("user_id", userId).order("created_at", { ascending: false }).limit(50);
  return (data ?? []).map((row) => mapSearchRecord(row));
}

function mapBusiness(row: Record<string, unknown>): NormalizedBusiness {
  return {
    id: row.id as string,
    provider: row.provider as ProviderName,
    providerBusinessId: row.provider_business_id as string,
    name: row.name as string,
    category: (row.category as string) ?? "",
    address: (row.address as string) ?? null,
    city: (row.city as string) ?? null,
    state: (row.state as string) ?? null,
    country: (row.country as string) ?? null,
    latitude: (row.latitude as number) ?? null,
    longitude: (row.longitude as number) ?? null,
    phone: (row.phone as string) ?? null,
    email: (row.email as string) ?? null,
    website: safeStoredUrl(row.website),
    rating: (row.rating as number) ?? null,
    reviewCount: (row.review_count as number) ?? null,
    googleMapsUrl: safeStoredUrl(row.maps_url),
    openingHours: (row.opening_hours as Record<string, string>) ?? null,
    socialLinks: (row.social_links as string[]) ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  };
}

function safeStoredUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function mapSearchRecord(row: Record<string, unknown>): SearchRecord {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    prompt: row.prompt as string,
    parsedQuery: (row.parsed_query as BusinessSearchQuery) ?? null,
    provider: row.provider as ProviderName,
    status: row.status as SearchStatus,
    requestedResultLimit: row.requested_result_limit as number,
    resultCount: row.result_count as number,
    errorCode: (row.error_code as string) ?? null,
    errorMessage: (row.error_message as string) ?? null,
    createdAt: row.created_at as string,
    startedAt: (row.started_at as string) ?? null,
    completedAt: (row.completed_at as string) ?? null,
  };
}
