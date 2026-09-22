"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import type { Session, User } from "@supabase/supabase-js";
import { createBrowserClient, isSupabaseBrowserConfigured } from "@/lib/supabase/client";
import {
  AUTH_INACTIVITY_MS,
  authActivityStorageKey,
  isAuthInactive,
  readLastActivity,
  recordAuthActivity,
} from "@/lib/auth/inactivity";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const signOut = useCallback(async () => {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  useEffect(() => {
    if (!isSupabaseBrowserConfigured()) {
      setLoading(false);
      return;
    }
    const supabase = createBrowserClient();
    let active = true;
    let authEventReceived = false;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active || authEventReceived) return;
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch(() => { if (active) setLoading(false); });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (active) {
        authEventReceived = true;
        if (event === "PASSWORD_RECOVERY" && session) {
          recordAuthActivity(session.user.id);
        }
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    });

    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId || pathname === "/reset-password") return;

    let lastActivity = readLastActivity(userId) ?? Date.now();
    let timer: number | undefined;
    let signingOut = false;
    let lastStoredAt = lastActivity;
    if (!readLastActivity(userId)) recordAuthActivity(userId, lastActivity);

    const expireIfInactive = async () => {
      if (signingOut) return;
      const stored = readLastActivity(userId);
      if (stored && stored > lastActivity) lastActivity = stored;
      const remaining = AUTH_INACTIVITY_MS - (Date.now() - lastActivity);
      if (remaining > 0) {
        timer = window.setTimeout(expireIfInactive, remaining);
        return;
      }
      signingOut = true;
      await signOut();
      window.location.replace("/login?reason=inactive");
    };

    const schedule = () => {
      window.clearTimeout(timer);
      const remaining = Math.max(0, AUTH_INACTIVITY_MS - (Date.now() - lastActivity));
      timer = window.setTimeout(expireIfInactive, remaining);
    };

    const registerActivity = () => {
      const now = Date.now();
      if (isAuthInactive(lastActivity, now)) {
        void expireIfInactive();
        return;
      }
      lastActivity = now;
      if (now - lastStoredAt >= 1_000) {
        recordAuthActivity(userId, now);
        lastStoredAt = now;
      }
      schedule();
    };

    const syncOtherTab = (event: StorageEvent) => {
      if (event.key !== authActivityStorageKey(userId) || !event.newValue) return;
      const updated = Number(event.newValue);
      if (Number.isFinite(updated) && updated > lastActivity) {
        lastActivity = updated;
        schedule();
      }
    };

    if (isAuthInactive(lastActivity)) void expireIfInactive();
    else schedule();
    const events: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "scroll", "touchstart"];
    events.forEach((event) => window.addEventListener(event, registerActivity, { passive: true }));
    window.addEventListener("storage", syncOtherTab);

    return () => {
      window.clearTimeout(timer);
      events.forEach((event) => window.removeEventListener(event, registerActivity));
      window.removeEventListener("storage", syncOtherTab);
    };
  }, [pathname, session?.user.id, signOut]);

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
