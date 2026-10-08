import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { signupJustCompleted } from "@/lib/analytics/meta-pixel";
import { hasVerifiedEmail } from "@/lib/auth/verified";

function safeRedirectPath(next: string | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/app/account";
  return next;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const cookieStore = await cookies();
  const next = safeRedirectPath(url.searchParams.get("next") ?? cookieStore.get("av_auth_next")?.value ?? null);
  const origin = url.origin;

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=auth_callback", origin));
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return NextResponse.redirect(new URL("/login?error=auth_config", origin));
  }

  const cookieUpdates: { name: string; value: string; options?: Parameters<NextResponse["cookies"]["set"]>[2] }[] = [];
  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(items) {
        items.forEach((item) => cookieUpdates.push(item));
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/login?error=auth_callback", origin));
  }

  const { data: { user } } = await supabase.auth.getUser();
  const destination = new URL(next, origin);
  if (user && hasVerifiedEmail(user) && signupJustCompleted(user)) {
    destination.searchParams.set("signup", "1");
  }

  const response = NextResponse.redirect(destination);
  cookieUpdates.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
  response.cookies.set("av_auth_next", "", { path: "/", maxAge: 0 });
  return response;
}
