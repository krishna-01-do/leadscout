import { createServerClient } from "@/lib/supabase/server";
import { getProvider, getProviderName } from "@/lib/providers";
import { deduplicateBusinesses } from "@/lib/scoring/dedup";
import { qualifyBusiness } from "@/lib/scoring/engine";
import { recordSearchUsage, recordLeadUsage } from "@/lib/usage/service";
import { freeTrialConfig } from "@/lib/branding";
import type {
  BusinessSearchQuery,
  NormalizedBusiness,
  QualifiedResult,
  SearchRecord,
  SearchResultRow,
  SearchStatus,
} from "@/types";

export async function createSearch(
  userId: string,
  prompt: string,
  parsedQuery: BusinessSearchQuery
): Promise<{ searchId: string | null; error: string | null }> {
  const supabase = createServerClient();

  const providerName = getProviderName();
  const resultLimit = Math.min(parsedQuery.resultLimit, freeTrialConfig.freeResultLimit);

  const { data, error } = await supabase
    .from("searches")
    .insert({
      user_id: userId,
      prompt,
      parsed_query: parsedQuery,
      provider: providerName,
      status: "QUEUED",
      requested_result_limit: resultLimit,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { searchId: null, error: "Failed to create search record." };
  }

  return { searchId: data.id, error: null };
}

export async function processSearch(searchId: string): Promise<void> {
  const supabase = createServerClient();

  const { data: search } = await supabase
    .from("searches")
    .select("id, user_id, prompt, parsed_query, provider, requested_result_limit")
    .eq("id", searchId)
    .maybeSingle();

  if (!search || !search.parsed_query) {
    await markSearchFailed(searchId, "PARSE_ERROR", "Search query data not found.");
    return;
  }

  try {
    await updateSearchStatus(searchId, "SEARCHING");

    const provider = getProvider();
    const query = search.parsed_query as BusinessSearchQuery;
    query.resultLimit = search.requested_result_limit;

    const { data: runRecord } = await supabase
      .from("provider_runs")
      .insert({
        search_id: searchId,
        user_id: search.user_id,
        provider: search.provider,
        status: "STARTED",
        requested_results: search.requested_result_limit,
      })
      .select("id")
      .single();

    let rawBusinesses: NormalizedBusiness[];
    try {
      rawBusinesses = await provider.searchBusinesses(query);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown provider error";
      if (runRecord) {
        await supabase
          .from("provider_runs")
          .update({ status: "FAILED", completed_at: new Date().toISOString() })
          .eq("id", runRecord.id);
      }
      throw new Error(`Provider search failed: ${message}`);
    }

    if (runRecord) {
      await supabase
        .from("provider_runs")
        .update({
          status: "COMPLETED",
          received_results: rawBusinesses.length,
          completed_at: new Date().toISOString(),
        })
        .eq("id", runRecord.id);
    }

    await updateSearchStatus(searchId, "PROCESSING");

    const businesses = deduplicateBusinesses(rawBusinesses);

    const businessInserts = businesses.map((b) => ({
      provider: b.provider,
      provider_business_id: b.providerBusinessId,
      name: b.name,
      category: b.category,
      address: b.address,
      city: b.city,
      state: b.state,
      country: b.country,
      latitude: b.latitude,
      longitude: b.longitude,
      phone: b.phone,
      email: b.email,
      website: b.website,
      rating: b.rating,
      review_count: b.reviewCount,
      maps_url: b.googleMapsUrl,
      opening_hours: b.openingHours,
      social_links: b.socialLinks,
      metadata: b.metadata,
    }));

    const { data: insertedBusinesses } = await supabase
      .from("businesses")
      .upsert(businessInserts, {
        onConflict: "provider,provider_business_id",
        ignoreDuplicates: false,
      })
      .select("id, provider, provider_business_id");

    if (!insertedBusinesses || insertedBusinesses.length === 0) {
      await updateSearchStatus(searchId, "COMPLETED", 0);
      return;
    }

    const businessIdMap = new Map<string, string>();
    for (const ib of insertedBusinesses) {
      businessIdMap.set(`${ib.provider}:${ib.provider_business_id}`, ib.id);
    }

    await updateSearchStatus(searchId, "SCORING");

    const qualifiedResults = businesses
      .map((b, i) => {
        const qualified = qualifyBusiness(b, query, i + 1);
        const businessId = businessIdMap.get(`${b.provider}:${b.providerBusinessId}`);
        if (!businessId) return null;
        return { ...qualified, businessId };
      })
      .filter((r): r is QualifiedResult & { businessId: string } => r !== null)
      .sort((a, b) => b.matchScore - a.matchScore)
      .map((r, i) => ({ ...r, rank: i + 1 }));

    const resultInserts = qualifiedResults.map((r) => ({
      search_id: searchId,
      business_id: r.businessId,
      match_score: r.matchScore,
      qualified: r.qualified,
      qualification_reason: r.qualificationReason,
      opportunity_flags: r.opportunityFlags,
      rank: r.rank,
    }));

    if (resultInserts.length > 0) {
      const { error: resultsError } = await supabase
        .from("search_results")
        .insert(resultInserts);

      if (resultsError) {
        throw new Error(`Failed to store results: ${resultsError.message}`);
      }
    }

    await updateSearchStatus(searchId, "COMPLETED", qualifiedResults.length);

    await recordSearchUsage(search.user_id, searchId);
    await recordLeadUsage(search.user_id, searchId, qualifiedResults.length);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown processing error";
    await markSearchFailed(searchId, "PROCESSING_ERROR", message);
  }
}

async function updateSearchStatus(
  searchId: string,
  status: SearchStatus,
  resultCount?: number
): Promise<void> {
  const supabase = createServerClient();
  const updates: Record<string, unknown> = { status };

  if (status === "SEARCHING" || status === "PROCESSING" || status === "SCORING") {
    updates.started_at = new Date().toISOString();
  }
  if (status === "COMPLETED" || status === "FAILED") {
    updates.completed_at = new Date().toISOString();
  }
  if (resultCount !== undefined) {
    updates.result_count = resultCount;
  }

  await supabase.from("searches").update(updates).eq("id", searchId);
}

async function markSearchFailed(
  searchId: string,
  code: string,
  message: string
): Promise<void> {
  const supabase = createServerClient();
  await supabase
    .from("searches")
    .update({
      status: "FAILED",
      error_code: code,
      error_message: message,
      completed_at: new Date().toISOString(),
    })
    .eq("id", searchId);
}

export async function getSearchResults(
  searchId: string,
  userId: string
): Promise<{ results: SearchResultRow[]; search: SearchRecord | null; error: string | null }> {
  const supabase = createServerClient();

  const { data: search } = await supabase
    .from("searches")
    .select("*")
    .eq("id", searchId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!search) {
    return { results: [], search: null, error: "Search not found." };
  }

  const { data: results } = await supabase
    .from("search_results")
    .select(
      `
      id,
      search_id,
      business_id,
      match_score,
      qualified,
      qualification_reason,
      opportunity_flags,
      rank,
      businesses (
        id,
        provider,
        provider_business_id,
        name,
        category,
        address,
        city,
        state,
        country,
        latitude,
        longitude,
        phone,
        email,
        website,
        rating,
        review_count,
        maps_url,
        opening_hours,
        social_links,
        metadata
      )
    `
    )
    .eq("search_id", searchId)
    .order("rank", { ascending: true });

  if (!results || results.length === 0) {
    return { results: [], search: mapSearchRecord(search), error: null };
  }

  const mappedResults: SearchResultRow[] = results.map((r: Record<string, unknown>) => {
    const b = r.businesses as Record<string, unknown>;
    return {
      id: r.id as string,
      searchId: r.search_id as string,
      businessId: r.business_id as string,
      matchScore: r.match_score as number,
      qualified: r.qualified as boolean,
      qualificationReason: r.qualification_reason as string,
      opportunityFlags: (r.opportunity_flags as SearchResultRow["opportunityFlags"]) ?? [],
      rank: r.rank as number,
      business: {
        id: b.id as string,
        provider: b.provider as SearchResultRow["business"]["provider"],
        providerBusinessId: b.provider_business_id as string,
        name: b.name as string,
        category: (b.category as string) ?? null,
        address: (b.address as string) ?? null,
        city: (b.city as string) ?? null,
        state: (b.state as string) ?? null,
        country: (b.country as string) ?? null,
        latitude: (b.latitude as number) ?? null,
        longitude: (b.longitude as number) ?? null,
        phone: (b.phone as string) ?? null,
        email: (b.email as string) ?? null,
        website: (b.website as string) ?? null,
        rating: (b.rating as number) ?? null,
        reviewCount: (b.review_count as number) ?? null,
        googleMapsUrl: (b.maps_url as string) ?? null,
        openingHours: (b.opening_hours as Record<string, string>) ?? null,
        socialLinks: (b.social_links as string[]) ?? null,
        metadata: (b.metadata as Record<string, unknown>) ?? null,
      },
    };
  });

  return { results: mappedResults, search: mapSearchRecord(search), error: null };
}

function mapSearchRecord(row: Record<string, unknown>): SearchRecord {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    prompt: row.prompt as string,
    parsedQuery: (row.parsed_query as BusinessSearchQuery) ?? null,
    provider: row.provider as SearchRecord["provider"],
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

export async function getSearchHistory(userId: string): Promise<SearchRecord[]> {
  const supabase = createServerClient();

  const { data } = await supabase
    .from("searches")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (!data) return [];

  return data.map((row) => mapSearchRecord(row as unknown as Record<string, unknown>));
}
