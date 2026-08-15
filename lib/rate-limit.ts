// Minimal in-memory fixed-window rate limiter for the login endpoint.
//
// This resets whenever the serverless function's process recycles and isn't
// shared across regions/instances — on Vercel that means it's a best-effort
// throttle, not a hard guarantee. It's paired with a per-request delay on
// failed attempts (see app/api/auth/login/route.ts) as the real brute-force
// deterrent; this just caps the worst case on any one warm instance.

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/** Returns true if `key` is still under `limit` attempts within the current
 * `windowMs` window, and records this attempt. Returns false once the
 * window's limit has been hit — callers should reject the request. */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();

  // Opportunistic sweep so the map doesn't grow without bound over a long
  // uptime — cheap since it only runs on the (rare) rollover path.
  if (buckets.size > 500) {
    for (const [k, b] of buckets) if (now > b.resetAt) buckets.delete(k);
  }

  const bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}
