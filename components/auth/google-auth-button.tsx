"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { createBrowserClient, isSupabaseBrowserConfigured } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

function authCallbackUrl() {
  return `${window.location.origin}/auth/callback?next=${encodeURIComponent("/app/account")}`;
}

export function GoogleAuthButton({ mode }: { mode: "signin" | "signup" }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogleAuth() {
    setError(null);
    if (!isSupabaseBrowserConfigured()) {
      setError("Authentication is not configured. Add the Supabase variables to .env.local.");
      return;
    }

    setLoading(true);
    const supabase = createBrowserClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: authCallbackUrl(),
        queryParams: { prompt: "select_account" },
      },
    });

    if (oauthError) {
      setError(oauthError.message);
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={loading}
        onClick={handleGoogleAuth}
      >
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#EA4335"
              d="M12 10.2v3.6h5.1c-.2 1.2-.9 2.3-1.9 3l3.1 2.4c1.8-1.7 2.9-4.1 2.9-7 0-.7-.1-1.3-.2-1.9H12z"
            />
            <path
              fill="#34A853"
              d="M6.6 14.3l-.9.7-2.5 1.9C4.8 19.3 8.1 21.2 12 21.2c2.4 0 4.5-.8 6.2-2.2l-3.1-2.4c-.8.6-1.9.9-3.1.9-2.4 0-4.4-1.6-5.1-3.8z"
            />
            <path
              fill="#4A90E2"
              d="M3.2 7.1C2.4 8.6 2 10.2 2 12s.4 3.4 1.2 4.9l3.4-2.6C6.2 13.1 6 12.6 6 12s.2-1.1.5-1.6z"
            />
            <path
              fill="#FBBC05"
              d="M12 5.8c1.3 0 2.5.5 3.4 1.3l2.5-2.5C16.5 2.9 14.4 2 12 2 8.1 2 4.8 3.9 3.2 7.1l3.4 2.6C7.6 7.4 9.6 5.8 12 5.8z"
            />
          </svg>
        )}
        {mode === "signin" ? "Continue with Google" : "Sign up with Google"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
