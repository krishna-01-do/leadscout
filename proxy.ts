import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(items) {
        items.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        items.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (user && !user.email_confirmed_at && request.nextUrl.pathname.startsWith("/app")) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login?error=confirm_email", request.url));
  }
  if (!user && request.nextUrl.pathname.startsWith("/app")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (user?.email_confirmed_at && ["/login", "/signup", "/forgot-password"].includes(request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL("/app/account", request.url));
  }
  return response;
}

export const config = { matcher: ["/app/:path*", "/login", "/signup", "/forgot-password"] };
