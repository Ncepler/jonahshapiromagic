"use client";

// ── Transition kit ──────────────────────────────────────────────────────────
// The pieces every full-screen transition on this page needs, in one place:
// the palette it paints in, the easing curves, the random helpers, the stacking
// order, and the mount/trigger registry that lets a button anywhere on the page
// fire an overlay that is mounted once at the root.
//
// ── The registry ────────────────────────────────────────────────────────────
// CardRevealOverlay.tsx introduced the pattern: a module-level `start` the
// overlay hands over on mount, plus a `busy` flag so a second click mid-flight
// is ignored, wrapped in one exported trigger function. createChannel() is that
// same pattern generalised, so the transitions added after it — spotlight, torn
// paper — share one implementation instead of carrying a copy each.
//
// The card reveal itself still owns its copy. It is the one registry a shipped
// interaction already depends on (both "book" CTAs and the trick card route
// through it), and re-pointing it at this file would be a rewrite of working
// code for no behavioural gain.
//
// ── House rules these transitions all follow ────────────────────────────────
//   · prefers-reduced-motion: reduce → the animation never plays and whatever
//     the animation was covering for happens immediately. Enforced here, once,
//     in Channel.open() — a transition cannot forget to check.
//   · Fixed overlays, pointer-events: none while they play, unmounted after.
//   · Transform and opacity only. Nothing animates width/left/top.
//   · will-change while playing, cleared before unmount.
//   · Randomised per play, at the level the card reveal set: not a jittered
//     constant, but a structure that comes out differently each time.

// ── Palette ─────────────────────────────────────────────────────────────────
// Mirrors app/page.tsx's palette block, which stays the source of truth for the
// site's colours and the place to edit them. It has to be a mirror rather than
// an import: page.tsx imports these overlays, so an import back the other way
// would be a cycle. (CardRevealOverlay.tsx and CurtainReveal.tsx each mirror
// the handful of values they need for the same reason and predate this file;
// everything added since reads them from here instead.) There is no CSS-var or
// site-config palette to pull from — site-config.ts carries contact details
// only, and the page paints entirely in inline styles.
export const BG = "#0a0505"; // near-black with a warm undertone — the page
export const BG_ELEVATED = "#140808"; // one step up — cards, panels, fields
export const CURTAIN = "#3d0a0a"; // oxblood — the velvet, atmosphere only
export const CURTAIN_DEEP = "#1f0505"; // the curtain's own shadow
export const TEXT = "#f0e6d2"; // warm parchment
export const ACCENT = "#c9a961"; // muted antique gold — the only accent

/** #rrggbb → [r, g, b]. */
export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

/** Same helper page.tsx keeps, so gradients can borrow a palette colour at
 *  partial opacity instead of hand-copying its RGB triplet. */
export function hexToRgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── Stacking ────────────────────────────────────────────────────────────────
// Every fixed overlay on the page, in paint order, so a new one can be slotted
// in against the others rather than guessed at. The three entries marked
// "elsewhere" are documentation of where those files already sit — they set
// their own z-index and do not read this object.
export const LAYER = {
  /** elsewhere — CurtainReveal.tsx */
  curtain: 900,
  /** elsewhere — MagicianCursor.tsx */
  cursor: 998,
  /** The torn form's two halves, flying over the page. */
  tornPaper: 9997,
  /** The spotlight, which hands off to the card reveal directly above it and
   *  fades out underneath the cards' first frames. */
  spotlight: 9998,
  /** elsewhere — CardRevealOverlay.tsx. While it is up, it IS the page. */
  cardReveal: 9999,
} as const;

// ── Easing ──────────────────────────────────────────────────────────────────
export type Bezier = [number, number, number, number];
/** The site's own curve (EASE in app/page.tsx) — an expo-ish ease-out. */
export const OUT_EXPO: Bezier = [0.16, 1, 0.3, 1];
export const OUT_SOFT: Bezier = [0.33, 1, 0.68, 1];
/** Gravity-ish: slow to leave, still gaining when it exits the frame. */
export const IN_FALL: Bezier = [0.4, 0, 1, 1];
/** Weight moving off and settling — a sweep, a haul, a piece of paper thrown. */
export const IN_OUT_HEAVY: Bezier = [0.62, 0, 0.28, 1];

// ── Random helpers ──────────────────────────────────────────────────────────
export const rand = (min: number, max: number) => min + Math.random() * (max - min);
export const randInt = (min: number, max: number) => Math.round(rand(min, max));
export const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];
export const sign = () => (Math.random() < 0.5 ? -1 : 1);
export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export const secs = (ms: number) => ms / 1000;
/** 0→1 with both ends easing. Used to space samples along a path. */
export const smoothstep = (t: number) => t * t * (3 - 2 * t);

// ── Environment ─────────────────────────────────────────────────────────────
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** The same breakpoint the card reveal and the curtain size themselves off. */
export function isMobile(): boolean {
  return (
    typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches
  );
}

// ── Channels ────────────────────────────────────────────────────────────────
export type Channel<Run> = {
  /**
   * The overlay component calls this on mount and calls the returned function
   * on unmount. Registering also clears any stale busy flag, so a hot reload or
   * a remount can't leave the channel jammed shut.
   */
  register(start: (run: Run) => void): () => void;
  /**
   * Play a run. `build` is only called once the run is definitely going to
   * play, so a caller can measure the DOM inside it without paying for that
   * measurement on the paths that skip.
   *
   * Returns false — and leaves the channel untouched — when the animation
   * cannot or should not play: the visitor asked for reduced motion, the
   * overlay isn't mounted, or one is already in flight. Every trigger treats
   * false as "do the underlying thing right now, without the spectacle."
   */
  open(build: () => Run): boolean;
  /** The overlay calls this once the run has finished and unmounted. */
  close(): void;
  /** True while a run is in flight. */
  busy(): boolean;
};

export function createChannel<Run>(): Channel<Run> {
  let start: ((run: Run) => void) | null = null;
  let busy = false;

  return {
    register(fn) {
      start = fn;
      busy = false;
      return () => {
        start = null;
        busy = false;
      };
    },
    open(build) {
      if (busy || !start || prefersReducedMotion()) return false;
      busy = true;
      start(build());
      return true;
    },
    close() {
      busy = false;
    },
    busy: () => busy,
  };
}
