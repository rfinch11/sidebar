import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_ROUTES = ["/login", "/auth/callback"];
const APPROVED_COOKIE = "sb-approved";
const APPROVED_COOKIE_MAX_AGE = 60 * 60; // 1 hour

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

  // Skip DB query if the approval cookie is present for this user
  const approvedCookie = request.cookies.get(APPROVED_COOKIE);
  if (approvedCookie?.value === user.id) {
    return supabaseResponse;
  }

  // Check approval status in DB
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

  // Cache approval in a cookie so we skip the DB query for the next hour
  supabaseResponse.cookies.set(APPROVED_COOKIE, user.id, {
    httpOnly: true,
    sameSite: "strict",
    maxAge: APPROVED_COOKIE_MAX_AGE,
    path: "/",
  });

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Match all routes except static files and API routes (APIs self-validate)
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
