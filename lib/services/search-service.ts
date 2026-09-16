import "server-only";

import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getProvider } from "@/lib/providers";
import { ApifyBusinessSearchProvider } from "@/lib/providers/apify-provider";
import { MockBusinessSearchProvider } from "@/lib/providers/mock-provider";
import { deduplicateBusinesses } from "@/lib/scoring/dedup";
import { qualifyBusiness } from "@/lib/scoring/engine";
import { recordLeadUsage } from "@/lib/usage/service";
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
): Promise<{
  searchId: string | null;
  resultLimit: number | null;
  error: string | null;
  quotaExceeded: boolean;
}> {
  const database = createSupabaseAdmin();
  const provider = getProvider();

  const { data, error } = await database.rpc("create_search_with_quota", {
    p_user_id: userId,
    p_prompt: prompt,
    p_parsed_query: parsedQuery,
    p_provider: provider.name,
    p_requested_result_limit: parsedQuery.resultLimit,
    p_idempotency_key: idempotencyKey,
  });

  if (error) {
    const quotaExceeded = error.message.includes("search_quota_exceeded") ||
      error.message.includes("lead_quota_exceeded");
    return {
      searchId: null,
      resultLimit: null,
      error: quotaExceeded
        ? "You've used all your searches or leads for this period. Upgrade to continue."
        : "Failed to create search record.",
      quotaExceeded,
    };
  }
  const searchId = typeof data === "string" ? data : null;
  if (!searchId) {
    return { searchId: null, resultLimit: null, error: "Failed to create search record.", quotaExceeded: false };
  }
  const { data: stored, error: storedError } = await database.from("searches")
    .select("requested_result_limit")
    .eq("id", searchId)
    .eq("user_id", userId)
    .maybeSingle();
  if (storedError || !stored) {
    // The quota transaction already created the search. Do not report a false
    // failure that could make the user submit and consume another search.
    return {
      searchId,
      resultLimit: Math.min(parsedQuery.resultLimit, 50),
      error: null,
      quotaExceeded: false,
    };
  }
  return {
    searchId,
    resultLimit: stored.requested_result_limit as number,
    error: null,
    quotaExceeded: false,
  };
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
  let claimedProcessing = false;
  try {
    if (Date.now() - new Date(providerRun.created_at).getTime() > PROCESSING_TIMEOUT_MS) {
      await failSearchAndRefund(searchId, "PROVIDER_TIMEOUT", "Business discovery exceeded the 30-minute processing window.");
      await database.from("provider_runs").update({
        status: "TIMED_OUT",
        completed_at: new Date().toISOString(),
      }).eq("id", providerRun.id);
      return;
    }

    if (["PROCESSING", "SCORING"].includes(search.status)) return;
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

    // The Apify webhook and browser recovery polling can arrive together. Claim
    // processing once so they cannot race while writing the same result set.
    const { data: claimed, error: claimError } = await database.from("searches")
      .update({ status: "PROCESSING" })
      .eq("id", searchId)
      .in("status", ["QUEUED", "SEARCHING"])
      .select("id")
      .maybeSingle();
    if (claimError) throw databaseFailure("claim search processing", claimError);
    if (!claimed) return;
    claimedProcessing = true;
    const query = businessSearchQuerySchema.parse(search.parsed_query);
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
    console.error("LeadScout search processing failed", {
      searchId,
      runId,
      message: error instanceof Error ? error.message : "Unknown processing error",
    });
    // A transient provider-status/network error before processing starts should
    // be retried by the webhook or next poll, not erase the user's search.
    if (!claimedProcessing) throw error;
    await failSearchAndRefund(searchId, "PROCESSING_FAILED", "Search results could not be processed safely.");
    await database.from("provider_runs").update({
      status: "FAILED",
      completed_at: new Date().toISOString(),
      metadata: { ...(providerRun.metadata ?? {}), failure: error instanceof Error ? error.message : "unknown" },
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
  if (businessError) throw databaseFailure("store businesses", businessError);
  if (!stored) throw new Error("Could not store businesses: no rows returned");

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
  if (resultError) throw databaseFailure("store search results", resultError);
}

function databaseFailure(operation: string, error: { code: string; message: string }) {
  console.error("LeadScout database failure", { operation, code: error.code, message: error.message });
  return new Error(`Could not ${operation} (${error.code})`);
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
    try {
      await processProviderRun(run.external_run_id);
    } catch {
      // processProviderRun safely marks and refunds failures. Let the status API
      // return that terminal search record instead of masking it with HTTP 500.
    }
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
