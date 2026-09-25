"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Mail, Lock, Loader2 } from "lucide-react";
import { createBrowserClient, isSupabaseBrowserConfigured } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { branding } from "@/lib/branding";
import { isAuthInactive, readLastActivity, recordAuthActivity } from "@/lib/auth/inactivity";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get("error");
    if (authError === "auth_callback") {
      setError("Could not complete sign-in. Try again or confirm your email first.");
    } else if (authError === "confirm_email") {
      setError("Confirm your email before accessing your account.");
    }

    if (!isSupabaseBrowserConfigured()) return;
    const supabase = createBrowserClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user.email_confirmed_at) return;
      const lastActivity = readLastActivity(session.user.id);
      if (lastActivity && isAuthInactive(lastActivity)) {
        void supabase.auth.signOut();
        return;
      }
      router.push("/app/account");
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!isSupabaseBrowserConfigured()) {
      setError("Authentication is not configured. Add the Supabase variables to .env.local.");
      setLoading(false);
      return;
    }

    const supabase = createBrowserClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      const message = signInError.message.toLowerCase();
      if (message.includes("email not confirmed") || message.includes("confirm")) {
        setError("Confirm your email before signing in. Check your inbox for the verification link.");
      } else if (signInError.message === "Invalid login credentials") {
        setError("Invalid email or password.");
      } else {
        setError(signInError.message);
      }
      setLoading(false);
      return;
    }

    if (data.user && !data.user.email_confirmed_at) {
      await supabase.auth.signOut();
      setError("Confirm your email before signing in. Check your inbox for the verification link.");
      setLoading(false);
      return;
    }

    if (data.user) recordAuthActivity(data.user.id);
    router.push("/app/account");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <Link href="/" className="mb-8 flex items-center gap-2 font-semibold text-lg">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Search className="h-4 w-4" />
        </div>
        {branding.name}
      </Link>

      <div className="w-full max-w-sm rounded-2xl border border-border/60 bg-card p-5 shadow-lg sm:p-8">
        <h1 className="text-xl font-semibold">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to your account to continue.
        </p>

        <div className="mt-6 space-y-4">
          <GoogleAuthButton mode="signin" />
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/60" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="password">Password</Label>
              <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9"
                required
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
