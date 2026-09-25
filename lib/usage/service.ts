import "server-only";

import { createSupabaseAdmin } from "@/lib/supabase/admin";

const PAID_PLANS = new Set(["basic", "pro", "plus", "starter"]);

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

function subscriptionIsActive(subscription: {
  plan: string;
  status: string;
  period_start: string;
  period_end: string;
}) {
  if (subscription.status !== "active") return false;
  if (!PAID_PLANS.has(subscription.plan)) return false;
  const now = Date.now();
  const start = new Date(subscription.period_start).getTime();
  const end = new Date(subscription.period_end).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return false;
  return now >= start && now <= end;
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
    return {
      plan: "none",
      status: "inactive",
      hasActivePlan: false,
      searchesUsed: 0,
      searchLimit: 0,
      leadsUsed: 0,
      leadLimit: 0,
      periodEnd: null,
    };
  }

  const active = subscriptionIsActive(subscription);
  if (!active) {
    return {
      plan: subscription.plan === "free" || subscription.plan === "none" ? "none" : subscription.plan,
      status: subscription.status === "active" ? "expired" : subscription.status,
      hasActivePlan: false,
      searchesUsed: 0,
      searchLimit: 0,
      leadsUsed: 0,
      leadLimit: 0,
      periodEnd: subscription.period_end,
    };
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
    status: subscription.status,
    hasActivePlan: true,
    searchesUsed: searchesUsed ?? 0,
    searchLimit: subscription.monthly_search_limit,
    leadsUsed: leadUsage?.reduce((sum, item) => sum + item.amount, 0) ?? 0,
    leadLimit: subscription.monthly_lead_limit,
    periodEnd: subscription.period_end,
  };
}
