// Server-only Supabase client, built on the service role key.
//
// This must never be imported from a "use client" file — the service role
// key bypasses Row Level Security entirely, so it can only ever run on the
// server (route handlers, server components, middleware). The public site
// itself never talks to Supabase directly either; the booking form posts to
// app/api/book/route.ts, which is the only thing that writes to `bookings`
// from outside /myevents.
//
// Env vars (see .env.local / Vercel project settings):
//   NEXT_PUBLIC_SUPABASE_URL   — the project's REST URL. Despite the
//     NEXT_PUBLIC_ prefix (kept so the same var name matches Supabase's own
//     docs/dashboard), it's only ever read here, server-side.
//   SUPABASE_SERVICE_ROLE_KEY  — secret. Server-side only. Never expose this
//     to the browser.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

/** Lazily builds (and caches) the service-role Supabase client. Throws with
 * a clear message if the env isn't configured yet, rather than silently
 * returning something that fails on first query. */
export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase is not configured — set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.",
    );
  }

  cached = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

/** True once both Supabase env vars are set — lets callers degrade
 * gracefully (e.g. the public booking route, which still has email as a
 * fallback) instead of throwing. */
export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
