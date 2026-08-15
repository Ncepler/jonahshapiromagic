// POST { password } → sets the `admin_auth` cookie and unlocks /myevents.
//
// The password check happens ONLY here, server-side, against
// process.env.ADMIN_PASSWORD — that string is never sent to, or embedded
// in, any client bundle. Two brute-force deterrents:
//   - a ~500ms delay on every failed attempt
//   - a 5-attempts-per-15-minutes-per-IP rate limit (see lib/rate-limit.ts)

import { NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, timingSafeEqual } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const RATE_LIMIT_MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const FAILED_ATTEMPT_DELAY_MS = 500;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(request: Request) {
  const ip = clientIp(request);

  if (!checkRateLimit(`login:${ip}`, RATE_LIMIT_MAX_ATTEMPTS, RATE_LIMIT_WINDOW_MS)) {
    return NextResponse.json({ error: "Too many attempts. Try again in a bit." }, { status: 429 });
  }

  let payload: { password?: unknown };
  try {
    payload = (await request.json()) as { password?: unknown };
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const submitted = typeof payload.password === "string" ? payload.password : "";
  const expected = process.env.ADMIN_PASSWORD;

  if (!expected) {
    console.error("[auth] ADMIN_PASSWORD is not set — refusing all logins.");
    return NextResponse.json({ error: "Login is not configured." }, { status: 503 });
  }

  if (!submitted || !timingSafeEqual(submitted, expected)) {
    await delay(FAILED_ATTEMPT_DELAY_MS);
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const token = await createSessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return res;
}
