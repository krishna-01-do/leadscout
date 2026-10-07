"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers";
import { AppNavbar } from "@/components/layout/app-navbar";
import { trackMetaLead } from "@/lib/analytics/meta-pixel";
import { hasVerifiedEmail } from "@/lib/auth/verified";
import { Loader2 } from "lucide-react";

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user || !hasVerifiedEmail(user)) return;
    trackMetaLead({
      id: user.id,
      createdAt: user.created_at,
      confirmedAt: user.email_confirmed_at,
      verified: true,
    });
  }, [user]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <AppNavbar />
      <main className="mx-auto min-w-0 max-w-6xl overflow-x-clip px-3 py-5 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedLayout>{children}</ProtectedLayout>
  );
}
