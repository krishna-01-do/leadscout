"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Mail, CreditCard, BarChart3, LogOut, Loader2, Sparkles, Search, CalendarDays } from "lucide-react";
import { useAuth } from "@/components/providers";
import { createBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PaymentPlanOptions } from "@/components/payments/payment-plan-options";
import { ProfileEditor } from "@/components/account/profile-editor";
import { trackMetaPurchase } from "@/lib/analytics/meta-pixel";
import { planDisplayName } from "@/lib/branding";

type AccountStats = {
  plan: string;
  status?: string;
  hasActivePlan?: boolean;
  searchesUsed: number;
  searchLimit: number;
  leadsUsed: number;
  leadLimit: number;
  periodEnd?: string | null;
};

function formatPeriodEnd(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AccountPage() {
  const { user, session, signOut } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<AccountStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [paymentNotice, setPaymentNotice] = useState<string | null>(null);

  useEffect(() => {
    const payment = new URLSearchParams(window.location.search).get("payment");
    if (["success", "complete", "retry"].includes(payment ?? "")) {
      setPaymentNotice("Checking your payment. This page will update automatically; please do not pay again.");
    } else if (payment === "failed" || payment === "invalid") {
      setPaymentNotice("Payment was not completed. No plan change was made.");
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentFlow = params.has("payment") || params.has("txnid");
    if (!paymentFlow) return;
    let txnid = params.get("txnid");
    if (!session) return;
    let attempts = 0;
    let cancelled = false;
    let timer: number | undefined;
    const check = async () => {
      attempts += 1;
      try {
        const response = await fetch(
          `/api/payments/status${txnid ? `?txnid=${encodeURIComponent(txnid)}` : ""}`,
          { headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store" }
        );
        const body = await response.json().catch(() => null);
        if (cancelled) return;
        if (response.ok && !body?.payment) return;
        if (response.status === 401) return;
        if (body?.payment?.txnid) txnid = body.payment.txnid;
        if (body?.payment?.status === "success") {
          trackMetaPurchase({
            txnid: body.payment.txnid ?? txnid ?? "",
            value: body.payment.amount,
            plan: body.payment.plan,
          });
          const usageResponse = await fetch("/api/usage", {
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          if (usageResponse.ok) setStats((await usageResponse.json()).stats);
          setPaymentNotice(null);
          window.history.replaceState({}, "", "/app/account");
          return;
        }
        if (body?.payment?.status === "failed") {
          setPaymentNotice("Payment was not completed. No plan change was made.");
          return;
        }
        setPaymentNotice("Checking your payment. This page will update automatically; please do not pay again.");
      } catch {
        /* Retry temporary connection failures without starting another payment. */
      }
      if (cancelled) return;
      if (attempts >= 20) {
        setPaymentNotice(
          `We could not confirm your payment yet. Do not pay again. Contact support with transaction ${txnid ?? "shown on your receipt"}. Reopening Account will check again.`
        );
        return;
      }
      timer = window.setTimeout(check, 5_000);
    };
    void check();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [session]);

  useEffect(() => {
    async function fetchStats() {
      if (!user) return;
      const supabase = createBrowserClient();
      const { data } = await supabase.auth.getSession();
      const currentSession = data.session;
      if (!currentSession) return;

      try {
        const res = await fetch("/api/usage", {
          headers: { Authorization: `Bearer ${currentSession.access_token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setStats(data.stats);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    if (user) fetchStats();
  }, [user]);

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
    router.push("/");
  }

  const hasActivePlan = Boolean(stats?.hasActivePlan);
  const planName = planDisplayName(hasActivePlan ? stats?.plan : "none");
  const searchLimit = hasActivePlan ? stats?.searchLimit ?? 0 : 0;
  const searchesUsed = hasActivePlan ? stats?.searchesUsed ?? 0 : 0;
  const leadLimit = hasActivePlan ? stats?.leadLimit ?? 0 : 0;
  const leadsUsed = hasActivePlan ? stats?.leadsUsed ?? 0 : 0;
  const searchPercent = searchLimit > 0 ? Math.min(100, (searchesUsed / searchLimit) * 100) : 0;
  const leadPercent = leadLimit > 0 ? Math.min(100, (leadsUsed / leadLimit) * 100) : 0;
  const periodLabel = formatPeriodEnd(stats?.periodEnd);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your profile, usage, and 30-day prospecting plan.
        </p>
      </div>

      {paymentNotice && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm">
          {paymentNotice}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
          <h2 className="text-sm font-medium text-muted-foreground">Profile</h2>
          <div className="mt-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <User className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">{user?.user_metadata?.full_name ?? "User"}</p>
                <p className="text-xs text-muted-foreground">Name</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Mail className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="break-all text-sm font-semibold">{user?.email}</p>
                <p className="text-xs text-muted-foreground">Email</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <CreditCard className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold">{planName}</p>
                  <Badge variant={hasActivePlan ? "default" : "secondary"}>
                    {hasActivePlan ? planName : "Inactive"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">Plan</p>
              </div>
            </div>

            {hasActivePlan && periodLabel && (
              <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 px-3 py-3">
                <CalendarDays className="h-4 w-4 text-primary" />
                <p className="text-xs text-muted-foreground">
                  Current period ends <span className="font-medium text-foreground">{periodLabel}</span>.
                  Renew before then to keep searching without interruption.
                </p>
              </div>
            )}
          </div>
          <ProfileEditor />
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
          <h2 className="text-sm font-medium text-muted-foreground">Usage This Period</h2>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : hasActivePlan ? (
            <div className="mt-5 space-y-5">
              <div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Searches</span>
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {searchesUsed} / {searchLimit}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full transition-all ${
                      searchPercent >= 100 ? "bg-destructive" : "bg-primary"
                    }`}
                    style={{ width: `${searchPercent}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Leads Generated</span>
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {leadsUsed} / {leadLimit}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${leadPercent}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-center">
              <p className="text-sm font-medium">No active plan yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Search and lead allowances appear here after you activate a 30-day plan.
              </p>
            </div>
          )}
        </div>
      </div>

      {stats && (
        <section className="overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/[0.07] via-card to-card p-5 sm:p-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/80 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              {hasActivePlan ? "Renew or upgrade" : "Choose your plan"}
            </div>
            <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
              {hasActivePlan ? "Keep your prospecting capacity active" : "Unlock prospect searches"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              Plans are 30-day purchases. When the period ends, renew to refresh your search and lead quota.
              Automatic recurring billing is not charged.
            </p>
          </div>

          <PaymentPlanOptions currentPlan={stats.plan} hasActivePlan={hasActivePlan} />
          <p className="mt-5 text-center text-xs text-muted-foreground">
            Secure checkout powered by PayU.
          </p>
        </section>
      )}

      <div className="flex justify-stretch sm:justify-end">
        <Button className="w-full sm:w-auto" variant="outline" onClick={handleSignOut} disabled={signingOut}>
          {signingOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
          Sign Out
        </Button>
      </div>
    </div>
  );
}
