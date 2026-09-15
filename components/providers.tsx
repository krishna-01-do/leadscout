"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { createBrowserClient, isSupabaseBrowserConfigured } from "@/lib/supabase/client";

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
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

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
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) {
        authEventReceived = true;
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    });

    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  const signOut = useCallback(async () => {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
