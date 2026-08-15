// Guards every /myevents/* route (except the login page itself) and every
// /api/{bookings,templates,snippets}/* route the dashboard calls — those
// APIs return data that's meant for Jonah only, so they need the same gate
// as the page that renders it, independent of anyone hitting them directly.
//
// Runs on the Edge runtime by default, which is why lib/auth.ts is built on
// Web Crypto (crypto.subtle) instead of Node's `crypto` module.

import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

export const config = {
  matcher: [
    "/myevents/:path*",
    "/api/bookings/:path*",
    "/api/templates/:path*",
    "/api/snippets/:path*",
  ],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/myevents/login") {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const authenticated = await verifySessionToken(token);
  if (authenticated) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/myevents/login", request.url);
  return NextResponse.redirect(loginUrl);
}
