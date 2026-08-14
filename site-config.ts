// PLACEHOLDER VALUES — these are not real yet.
// Replace all TODO_ values before the site goes live.
export const siteConfig = {
  phone: "TODO_REAL_PHONE",           // currently (917) 555-0199 — fake 555 number
  phoneHref: "tel:TODO_REAL_PHONE",
  email: "TODO_REAL_EMAIL",           // currently hello@jonahshapiro.com — domain may not be owned
  instagramHandle: "TODO_REAL_IG_HANDLE",  // currently @jonahshapiro.magic — unverified
  instagramUrl: "TODO_REAL_IG_URL",
  tiktokHandle: "@shap_shufflz_magic",     // confirmed correct
  tiktokUrl: "https://www.tiktok.com/@shap_shufflz_magic",
  // Where booking-form submissions get emailed (app/api/book/route.ts).
  // Never rendered on the page — this one has no display fallback, so an
  // unreplaced value makes the route refuse to pretend it delivered.
  bookingEmail: "TODO_REAL_BOOKING_EMAIL",
};

// ── Display fallbacks ───────────────────────────────────────────────────────
// The values above are the single place to edit, but until they're real the
// page has to keep showing the strings it shows today (nothing about the
// live site changes yet). Each entry maps a TODO_ sentinel to the string the
// page currently renders. Replacing a TODO_ value above makes the matching
// entry here dead — resolve() passes any non-sentinel string straight
// through — so a launch edit stays a one-file, one-line-per-value edit.
const DISPLAY_FALLBACKS: Record<string, string> = {
  TODO_REAL_PHONE: "(917) 555-0199",
  "tel:TODO_REAL_PHONE": "tel:+19175550199",
  TODO_REAL_EMAIL: "hello@jonahshapiro.com",
  TODO_REAL_IG_HANDLE: "@jonahshapiro.magic",
  TODO_REAL_IG_URL: "https://www.instagram.com/jonahshapiro.magic",
};

function resolve(value: string): string {
  return DISPLAY_FALLBACKS[value] ?? value;
}

/** True once a value has been swapped for something real. */
export function isPlaceholder(value: string): boolean {
  return value.includes("TODO_");
}

/**
 * What the page actually renders. Import this — not `siteConfig` — anywhere a
 * value is displayed or linked, so unreplaced placeholders fall back to the
 * strings the site shows today instead of printing "TODO_REAL_PHONE" at a
 * visitor.
 */
export const site = {
  phone: resolve(siteConfig.phone),
  phoneHref: resolve(siteConfig.phoneHref),
  email: resolve(siteConfig.email),
  instagramHandle: resolve(siteConfig.instagramHandle),
  instagramUrl: resolve(siteConfig.instagramUrl),
  tiktokHandle: siteConfig.tiktokHandle,
  tiktokUrl: siteConfig.tiktokUrl,
};
