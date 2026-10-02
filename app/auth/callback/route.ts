import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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

  const response = NextResponse.redirect(new URL(next, origin));
  response.cookies.set("av_auth_next", "", { path: "/", maxAge: 0 });
  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(items) {
        items.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/login?error=auth_callback", origin));
  }

  return response;
}
