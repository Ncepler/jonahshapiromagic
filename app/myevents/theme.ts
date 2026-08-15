// Shared palette + type constants for /myevents, kept in lockstep with the
// public site's palette (app/page.tsx). Same hex values, same fonts — the
// dashboard is a working tool, not marketing, so it skips the public site's
// curtain/ember/marquee theatrics, but it should still look like the same
// site. See app/page.tsx's own palette comment for the design intent.

export const BG = "#0a0505";
export const BG_ELEVATED = "#140808";
export const TEXT = "#f0e6d2";
export const TEXT_MUTED = "#8a7a6a";
export const ACCENT = "#c9a961";
export const BORDER = "#2a1515";

export const DISPLAY = "var(--font-playfair)";
export const SANS = "var(--font-tight)";

/** hex → rgba(), for the same gold-hover-wash treatment the public site's
 * `.magician-curtain-btn` uses (app/page.tsx) — reimplemented locally here
 * (as `.myevents-btn`, see MyEventsGlobalStyle) so the dashboard doesn't
 * reach into the public page's module. */
export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const r = Number.parseInt(clean.slice(0, 2), 16);
  const g = Number.parseInt(clean.slice(2, 4), 16);
  const b = Number.parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Page/section max width + horizontal padding, matching the public site's
 * `wrap` helper but capped at the 1200px the dashboard spec asks for. */
export const wrap = "mx-auto w-full max-w-[1200px] px-5 md:px-10";

/** Shared inline style for text inputs / selects / textareas across the
 * login page and every dashboard form. */
export const fieldStyle = {
  background: BG_ELEVATED,
  border: `1px solid ${BORDER}`,
  color: TEXT,
  borderRadius: 4,
} as const;

/** Shared className for every button in the dashboard — pair with an
 * inline `border` color (ACCENT for primary actions like Accept/Save,
 * TEXT_MUTED for secondary ones like Decline/Cancel). The gold hover wash
 * itself comes from the global `.myevents-btn:hover` rule in
 * MyEventsGlobalStyle, mirroring the public site's `.magician-curtain-btn`. */
export const buttonClass =
  "myevents-btn inline-flex items-center justify-center rounded-[4px] px-5 py-2.5 text-[13px] font-semibold uppercase tracking-[0.08em] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50";

export const eyebrowClass = "text-[12px] font-semibold uppercase tracking-[0.2em]";
