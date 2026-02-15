import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_ROUTES = ["/login", "/auth/callback"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes: still refresh session cookies if they exist
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    const { supabaseResponse } = await updateSession(request);
    return supabaseResponse;
  }

  const { user, supabase, supabaseResponse } = await updateSession(request);

  // Not logged in → login
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Already on waitlist page → let through
  if (pathname === "/waitlist") {
    return supabaseResponse;
  }

  // Check approval status
  const { data: profile } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .single();

  if (!profile || profile.status !== "approved") {
    const url = request.nextUrl.clone();
    url.pathname = "/waitlist";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Match all routes except static files and API routes (APIs self-validate)
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
