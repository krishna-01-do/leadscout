"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Mail, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { branding } from "@/lib/branding";
import { createBrowserClient, isSupabaseBrowserConfigured } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    if (!isSupabaseBrowserConfigured()) {
      setError("Password recovery is not configured yet.");
      setLoading(false);
      return;
    }

    const supabase = createBrowserClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setSent(true);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Link href="/" className="mb-8 flex items-center gap-2 text-lg font-semibold">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Search className="h-4 w-4" />
        </span>
        {branding.name}
      </Link>

      <div className="w-full max-w-sm rounded-2xl border border-border/60 bg-card p-5 shadow-lg sm:p-8">
        <h1 className="text-xl font-semibold">Reset your password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter your account email and we&apos;ll send you a secure reset link.
        </p>

        {sent ? (
          <div className="mt-6 space-y-5">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-emerald-700">
              If an account exists for <span className="break-all font-medium">{email}</span>, a reset link has been sent. Check your inbox and spam folder.
            </div>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/login"><ArrowLeft className="mr-2 h-4 w-4" />Back to sign in</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recovery-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="recovery-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send reset link"}
            </Button>
          </form>
        )}

        {!sent && (
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Remembered it? <Link href="/login" className="font-medium text-primary hover:underline">Sign in</Link>
          </p>
        )}
      </div>
    </main>
  );
}
