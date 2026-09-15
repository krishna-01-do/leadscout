import { createServerClient } from "@/lib/supabase/server";

export interface QuotaCheck {
  allowed: boolean;
  reason: string | null;
  searchesUsed: number;
  searchLimit: number;
  leadsUsed: number;
  leadLimit: number;
  plan: string;
}

export async function checkSearchQuota(userId: string): Promise<QuotaCheck> {
  const supabase = createServerClient();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan, status, monthly_search_limit, monthly_lead_limit, period_start, period_end")
    .eq("user_id", userId)
    .maybeSingle();

  if (!subscription) {
    return {
      allowed: false,
      reason: "No subscription found. Please contact support.",
      searchesUsed: 0,
      searchLimit: 0,
      leadsUsed: 0,
      leadLimit: 0,
      plan: "none",
    };
  }

  const { count: searchesUsed } = await supabase
    .from("usage")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("type", "search")
    .gte("created_at", subscription.period_start)
    .lte("created_at", subscription.period_end);

  const searchCount = searchesUsed ?? 0;

  if (searchCount >= subscription.monthly_search_limit) {
    return {
      allowed: false,
      reason: "You've used all your searches for this period. Upgrade to continue.",
      searchesUsed: searchCount,
      searchLimit: subscription.monthly_search_limit,
      leadsUsed: 0,
      leadLimit: subscription.monthly_lead_limit,
      plan: subscription.plan,
    };
  }

  const { data: leadUsage } = await supabase
    .from("usage")
    .select("amount")
    .eq("user_id", userId)
    .eq("type", "leads")
    .gte("created_at", subscription.period_start)
    .lte("created_at", subscription.period_end);

  const leadsUsed = leadUsage?.reduce((sum, u) => sum + u.amount, 0) ?? 0;

  return {
    allowed: true,
    reason: null,
    searchesUsed: searchCount,
    searchLimit: subscription.monthly_search_limit,
    leadsUsed,
    leadLimit: subscription.monthly_lead_limit,
    plan: subscription.plan,
  };
}

export async function recordSearchUsage(userId: string, searchId: string): Promise<void> {
  const supabase = createServerClient();
  await supabase.from("usage").insert({
    user_id: userId,
    search_id: searchId,
    type: "search",
    amount: 1,
  });
}

export async function recordLeadUsage(
  userId: string,
  searchId: string,
  leadCount: number
): Promise<void> {
  const supabase = createServerClient();
  await supabase.from("usage").insert({
    user_id: userId,
    search_id: searchId,
    type: "leads",
    amount: leadCount,
  });
}

export async function getUsageStats(userId: string) {
  const supabase = createServerClient();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan, status, monthly_search_limit, monthly_lead_limit, period_start, period_end")
    .eq("user_id", userId)
    .maybeSingle();

  if (!subscription) {
    return {
      plan: "free",
      searchesUsed: 0,
      searchLimit: 1,
      leadsUsed: 0,
      leadLimit: 20,
    };
  }

  const { count: searchesUsed } = await supabase
    .from("usage")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("type", "search")
    .gte("created_at", subscription.period_start)
    .lte("created_at", subscription.period_end);

  const { data: leadUsage } = await supabase
    .from("usage")
    .select("amount")
    .eq("user_id", userId)
    .eq("type", "leads")
    .gte("created_at", subscription.period_start)
    .lte("created_at", subscription.period_end);

  const leadsUsed = leadUsage?.reduce((sum, u) => sum + u.amount, 0) ?? 0;

  return {
    plan: subscription.plan,
    searchesUsed: searchesUsed ?? 0,
    searchLimit: subscription.monthly_search_limit,
    leadsUsed,
    leadLimit: subscription.monthly_lead_limit,
  };
}
