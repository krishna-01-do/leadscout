"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Mail, CreditCard, BarChart3, LogOut, Loader2, Sparkles, Search } from "lucide-react";
import { useAuth } from "@/components/providers";
import { createBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PaymentPlanOptions } from "@/components/payments/payment-plan-options";

export default function AccountPage() {
  const { user, session, signOut } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<{
    plan: string;
    searchesUsed: number;
    searchLimit: number;
    leadsUsed: number;
    leadLimit: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [paymentNotice, setPaymentNotice] = useState<string | null>(null);

  useEffect(() => {
    const payment = new URLSearchParams(window.location.search).get("payment");
    if (payment === "success" || payment === "complete") setPaymentNotice("Payment confirmed. Your plan is now active.");
    else if (payment === "retry") setPaymentNotice("Payment is still being verified. Refresh shortly; you will not be charged twice.");
    else if (payment === "failed" || payment === "invalid") setPaymentNotice("Payment was not completed. No plan change was made.");
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const txnid = params.get("txnid");
    if (params.get("payment") !== "retry" || !txnid || !session) return;
    let attempts = 0;
    const check = async () => {
      attempts += 1;
      const response = await fetch(`/api/payments/status?txnid=${encodeURIComponent(txnid)}`, { headers: { Authorization: `Bearer ${session.access_token}` } });
      const body = await response.json().catch(() => null);
      if (body?.payment?.status === "success") {
        setPaymentNotice("Payment confirmed. Your plan is now active.");
        window.history.replaceState({}, "", "/app/account?payment=success");
        const usageResponse = await fetch("/api/usage", { headers: { Authorization: `Bearer ${session.access_token}` } });
        if (usageResponse.ok) setStats((await usageResponse.json()).stats);
        return true;
      }
      if (body?.payment?.status === "failed") { setPaymentNotice("Payment was not completed. No plan change was made."); return true; }
      return attempts >= 10;
    };
    const interval = window.setInterval(async () => { if (await check()) window.clearInterval(interval); }, 3_000);
    void check().then((done) => { if (done) window.clearInterval(interval); });
    return () => window.clearInterval(interval);
  }, [session]);

  useEffect(() => {
    async function fetchStats() {
      if (!user) return;
      const supabase = createBrowserClient();
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session) return;

      try {
        const res = await fetch("/api/usage", {
          headers: { Authorization: `Bearer ${session.access_token}` },
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

  const planName = stats?.plan === "free" ? "Free Trial" : stats?.plan === "starter" ? "Starter" : stats?.plan === "pro" ? "Pro" : "Free Trial";
  const searchLimit = stats?.searchLimit ?? 1;
  const searchesUsed = stats?.searchesUsed ?? 0;
  const leadLimit = stats?.leadLimit ?? 20;
  const leadsUsed = stats?.leadsUsed ?? 0;
  const searchPercent = Math.min(100, (searchesUsed / searchLimit) * 100);
  const leadPercent = Math.min(100, (leadsUsed / leadLimit) * 100);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account and view usage.
        </p>
      </div>

      {paymentNotice && <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">{paymentNotice}</div>}

      <div className="rounded-2xl border border-border/60 bg-card p-6">
        <h2 className="text-sm font-medium text-muted-foreground mb-4">Profile</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <User className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium">{user?.user_metadata?.full_name ?? "User"}</p>
              <p className="text-xs text-muted-foreground">Name</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium">{user?.email}</p>
              <p className="text-xs text-muted-foreground">Email</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{planName}</p>
                <Badge variant="secondary" className="capitalize">{stats?.plan ?? "free"}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">Plan</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card p-6">
        <h2 className="text-sm font-medium text-muted-foreground mb-4">Usage This Period</h2>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Searches</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {searchesUsed} / {searchLimit}
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    searchPercent >= 100 ? "bg-destructive" : "bg-primary"
                  }`}
                  style={{ width: `${searchPercent}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Leads Generated</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {leadsUsed} / {leadLimit}
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${leadPercent}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {stats && (
          <div className="mt-6 rounded-xl border border-primary/30 bg-primary/5 p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium">Manage your plan</p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Upgrade or renew your current 30-day plan securely.
            </p>
            <PaymentPlanOptions currentPlan={stats.plan} />
            <p className="mt-3 text-xs text-muted-foreground text-center">Secure checkout powered by PayU.</p>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Button variant="outline" onClick={handleSignOut} disabled={signingOut}>
          {signingOut ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="mr-2 h-4 w-4" />
          )}
          Sign Out
        </Button>
      </div>
    </div>
  );
}
