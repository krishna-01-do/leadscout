import "server-only";

import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function enforceRateLimit(
  userId: string,
  action: string,
  limit = 10,
  windowSeconds = 60
): Promise<boolean> {
  const { data, error } = await createSupabaseAdmin().rpc("check_rate_limit", {
    p_user_id: userId,
    p_action: action,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) throw new Error("Could not verify request rate");
  return data === true;
}

export async function recordLeadUsage(
  userId: string,
  searchId: string,
  leadCount: number
): Promise<void> {
  const { error } = await createSupabaseAdmin().from("usage").insert({
    user_id: userId,
    search_id: searchId,
    type: "leads",
    amount: leadCount,
  });
  // Both the original partial index and migration 004 enforce uniqueness for
  // non-null search IDs. INSERT works with either, unlike PostgREST upsert.
  if (error && error.code !== "23505") {
    console.error("Lead usage write failed", { searchId, code: error.code, message: error.message });
    throw new Error(`Could not record lead usage (${error.code})`);
  }
}

export async function getUsageStats(userId: string) {
  const database = createSupabaseAdmin();
  const { data: subscription, error: subscriptionError } = await database
    .from("subscriptions")
    .select("plan, status, monthly_search_limit, monthly_lead_limit, period_start, period_end")
    .eq("user_id", userId)
    .maybeSingle();

  if (subscriptionError) throw new Error("Could not load subscription");
  if (!subscription) {
    return { plan: "none", searchesUsed: 0, searchLimit: 0, leadsUsed: 0, leadLimit: 0 };
  }

  const [{ count: searchesUsed, error: searchError }, { data: leadUsage, error: leadError }] =
    await Promise.all([
      database.from("usage").select("id", { count: "exact", head: true })
        .eq("user_id", userId).eq("type", "search")
        .gte("created_at", subscription.period_start).lte("created_at", subscription.period_end),
      database.from("usage").select("amount")
        .eq("user_id", userId).eq("type", "leads")
        .gte("created_at", subscription.period_start).lte("created_at", subscription.period_end),
    ]);
  if (searchError || leadError) throw new Error("Could not load usage");

  return {
    plan: subscription.plan,
    searchesUsed: searchesUsed ?? 0,
    searchLimit: subscription.monthly_search_limit,
    leadsUsed: leadUsage?.reduce((sum, item) => sum + item.amount, 0) ?? 0,
    leadLimit: subscription.monthly_lead_limit,
  };
}
