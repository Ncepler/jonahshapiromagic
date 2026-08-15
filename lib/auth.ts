// Session cookie signing/verification for /myevents. Built on the Web
// Crypto API (crypto.subtle) rather than Node's `crypto` module so the same
// code runs unmodified in both the Node.js login route and the Edge
// middleware that guards every /myevents/* request.
//
// The password itself (ADMIN_PASSWORD) never leaves the server and is never
// embedded in the token — the cookie holds an expiry timestamp plus an
// HMAC-SHA256 signature over it, keyed by ADMIN_PASSWORD. Forging a valid
// cookie requires knowing that key; reading the cookie reveals nothing about
// it (HMAC output doesn't invert to the key).

export const SESSION_COOKIE = "admin_auth";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getSecret(): string {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) {
    throw new Error("ADMIN_PASSWORD is not set — /myevents cannot authenticate anyone until it is.");
  }
  return secret;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmacSign(message: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return base64UrlEncode(new Uint8Array(sig));
}

/** Constant-time string comparison — used for both the signature check
 * below and the plaintext password check in the login route, so neither
 * leaks how many leading characters matched via response timing. */
export function timingSafeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

/** Builds a fresh `admin_auth` cookie value, valid for SESSION_MAX_AGE_SECONDS. */
export async function createSessionToken(): Promise<string> {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS;
  const payload = String(expiresAt);
  const signature = await hmacSign(payload, getSecret());
  return `${payload}.${signature}`;
}

/** True if `token` is a well-formed, unexpired, correctly-signed session. */
export async function verifySessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const dot = token.indexOf(".");
  if (dot < 0) return false;
  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  const expiresAt = Number.parseInt(payload, 10);
  if (!Number.isFinite(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) return false;

  let expectedSignature: string;
  try {
    expectedSignature = await hmacSign(payload, getSecret());
  } catch {
    return false;
  }
  return timingSafeEqual(signature, expectedSignature);
}
