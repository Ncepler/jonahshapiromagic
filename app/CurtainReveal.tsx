"use client";

// ── Curtain reveal ──────────────────────────────────────────────────────────
// The first thing the page shows: heavy oxblood velvet hanging from a rod,
// holding for a beat, then hauled open to reveal the site — and gone from the
// DOM the moment it finishes.
//
// It is a GRAND (traveler) curtain, which is a specific thing and not a generic
// "two panels slide apart." A traveler hangs from carriers on a track. A pull
// line is tied to the leading edge of each half; when it is hauled, that edge
// runs offstage and every carrier behind it is picked up in turn, so the cloth
// accordions into the wing rather than sliding as a sheet. It never lifts.
// Four consequences, and they are the whole design of this file:
//
//   1. THE TOP LEADS, THE HEM LAGS. Only the top of the curtain is attached to
//      anything. The hem is loose cloth with mass, dragged along by the fabric
//      above it, so it trails behind the top edge for the entire pull and is
//      still crossing the opening after the top has gone. This is the single
//      biggest tell that something is cloth and not a wall, and it is what the
//      version this replaces was missing.
//   2. THE HEM SWAYS WHEN THE PULL STOPS. Its own momentum carries it past
//      where it was going, once, and it settles.
//   3. THE PLEATS COMPRESS toward the wing as the half stacks. The visible
//      fabric gets narrower and the folds crowd together; they don't hold their
//      spacing on the way out.
//   4. IT IS HEAVY. Slow to start, builds hard through the middle, lands long.
//
// Each half is a panel of vertical FOLD STRIPS (8–14 on a desktop, 5–7 on a
// phone) that share one pull but not one timing, so a ripple travels through
// the cloth as it opens and the leading edge stays ragged instead of
// ruler-straight.
//
// Everything that can vary is drawn fresh per page load, the same "no two plays
// alike" rule the card reveal follows (see CardRevealOverlay.tsx): fold count
// and individual fold widths, which end of the panel leads the ripple, each
// fold's own delay / lag / hem lag / tilt / squeeze, how deep the hem drags and
// which way it swings back, and which half starts a hair before the other.
//
// ── The four transform layers ───────────────────────────────────────────────
// Each half is four nested elements, one job each, because two of the jobs are
// scales about DIFFERENT origins and a single element can only have one
// transform-origin:
//
//   slide   x — the haul. Origin-independent.
//   hem     skewX about the TOP edge. skewX(θ) displaces a point by y·tan(θ),
//           so with the origin at the top the top edge does not move at all and
//           the displacement grows linearly to a maximum at the hem. That is
//           (1) and (2) above, in one property.
//   gather  scaleX about the SEAM edge — the small take-up before the pull. It
//           has to scale about the seam, because scaling this about the wing
//           would walk the seam edge inward and crack the curtain open before
//           anything is supposed to move.
//   stack   scaleX about the WING edge — (3). Pinning the wing edge is what
//           makes it read as fabric piling up offstage instead of the whole
//           panel shrinking. Also carries the perspective for the folds, since
//           the folds are its direct children.
//
// ── Why this one can't tear ─────────────────────────────────────────────────
// The obvious way to build fabric — give every pleat its own independent
// transform — is the way that fails: two neighbours disagree by more than they
// overlap and a slit of the live page flashes through the middle of the
// curtain. An earlier attempt at this page did exactly that. The guarantee here
// is by construction rather than by taste, and it survives the hem lag because
// of where the layers sit:
//
//   1. The PANEL FACE is opaque velvet in its own right and is the fastest
//      thing in its half — a strip can only ever lag it, never outrun it.
//      Everything from the panel's leading edge outward is therefore covered no
//      matter what the strips are doing.
//   2. Three of the four layers above are SHARED by every strip in the half.
//      Whatever `slide`, `hem` and `gather`/`stack` do, they do to all of them
//      at once, so none of it can separate one fold from its neighbour. (The
//      two scales compress the strips' overlaps and their lags by the same
//      factor, so the ratios below are preserved, not just the raw pixels.)
//   3. That leaves the per-strip transforms, which is where the ripple lives.
//      Neighbours overlap by OVERLAP_OF_SLOT of a fold width on each side. A
//      strip can pull away from its neighbour by at most its own horizontal lag
//      (LAG_OF_SLOT of a fold) plus its own hem lag (HEM_JITTER_OF_SLOT of a
//      fold, at the very bottom, zero at the top) — and
//      LAG_OF_SLOT + HEM_JITTER_OF_SLOT < 2 × OVERLAP_OF_SLOT, so even a strip
//      at full lag beside a strip at zero lag still overlaps it, at every
//      height. The worst case the random numbers can produce is still solid
//      cloth.
//
// The margin between those numbers is the whole design budget: it is what lets
// a fold hang a full fold-width past its neighbour, and its hem hang a third of
// one further still — enough that the leading edge of the curtain is visibly
// ragged and its hem visibly raggeder — without ever letting two folds separate.
//
// ── Rendering before hydration ──────────────────────────────────────────────
// The curtain has to be closed in the very first painted frame or the page
// flashes into view before it. So the server renders the panels as plain
// velvet — correct colour, correct fold pitch, no randomness — and the
// randomized fold structure only replaces it once the plan exists on the
// client. Both states are the same closed oxblood curtain; the swap adds fold
// detail and nothing else, and it happens well inside the opening hold.
//
// Motion (the site's animation library) drives every element. Nothing here
// animates width/left/right — position is translate/scale/rotate/skew only, so
// the whole open stays on the compositor, and `will-change` is dropped before
// the overlay unmounts.
//
// Stacking: z-900. Above the whole page (so it genuinely covers the site on
// arrival) and above the mobile warm-veil at z-150, but below the wand cursor
// at z-998/999 — the cursor stays visible on top of the velvet — and below the
// card reveal at z-9999, which is the only thing that ever outranks it.

import { animate, type AnimationPlaybackControls } from "motion/react";
import { useEffect, useRef, useState, type CSSProperties } from "react";

// ── Palette ─────────────────────────────────────────────────────────────────
// Mirrors the three values this file needs from app/page.tsx's palette block —
// that block is the source of truth for the site's colours and stays the place
// to edit them. (CardRevealOverlay.tsx mirrors the same way, and for the same
// reason: page.tsx imports this component, so this component can't import
// back out of it.)
const CURTAIN = "#3d0a0a"; // oxblood — the velvet itself
const ACCENT = "#c9a961"; // antique gold — rod, seam trim, sparks

// ── Timing (ms) ─────────────────────────────────────────────────────────────
// The hold is measured from page load, not from hydration, so a slow connection
// spends its wait on the loading rather than on top of it.
const HOLD_MS = 900; // the beat before anything moves
const GATHER_MS = 240; // phase 1 — the cloth is taken up before the pull
const PULL_MS = 1400; // phase 2 — the haul, which does two thirds of the travel
const SETTLE_MS = 820; // phase 3 — the last third, gliding out while the hem
// swings. Long, and deliberately so: it is a third of the whole open. The hem
// only trails the top by ~200px out of ~880px of travel, so the window where
// the top has left the frame and the hem has not is narrow — spending a third
// of the animation crossing it is what makes the settle something you can
// actually see rather than a detail that happens off-screen.
const MOVE_MS = GATHER_MS + PULL_MS + SETTLE_MS; // 2.46s — weighty, not slow
const TOTAL_MS = HOLD_MS + MOVE_MS;
const MIN_HOLD_MS = 140; // still a beat, even if hydration ate the whole hold

// Phase boundaries as fractions of MOVE_MS, for the panel's keyframe times.
const GATHER_AT = GATHER_MS / MOVE_MS;
const SETTLE_AT = (GATHER_MS + PULL_MS) / MOVE_MS;
// …and of the strips' own window, which starts when the gather ends.
const STRIP_MS = PULL_MS + SETTLE_MS;
const STRIP_SETTLE_AT = PULL_MS / STRIP_MS;

// ── Shape of the fabric ─────────────────────────────────────────────────────
const OVERHANG = 0.03; // fraction of the viewport each panel runs past its edge
const SLOT_JITTER = 0.12; // ±, how unequal two neighbouring folds may be
const OVERLAP_OF_SLOT = 0.7; // how far each fold laps over its neighbour
const LAG_OF_SLOT = 1; // deepest horizontal lag, as a fraction of the NARROWEST
// fold. This is where the per-fold speed variance lives: a fold width is around
// a tenth of the distance a panel travels, so "lags by up to one fold" is the
// same statement as "runs up to ~8–10% behind" — expressed as a distance,
// because a distance is what can be bounded against the overlap.
const HEM_JITTER_OF_SLOT = 0.3; // how much further one fold's HEM may hang past
// its neighbour's. Held so that LAG_OF_SLOT + HEM_JITTER_OF_SLOT (1.3) stays
// under 2 × OVERLAP_OF_SLOT (1.4) — see the header's no-tear argument.
const GATHER_SQUEEZE = 0.015; // 1.5% take-up before the pull
const LAG_START_MAX_MS = 120; // per-fold delay before it starts falling behind
const TILT_MIN = 2; // deg — each fold's own rotateY through the pull
const TILT_MAX = 6;
const SQUEEZE_MAX = 0.018; // scaleX — fabric compressing and stretching
const PERSPECTIVE = 1200; // px, so the per-fold rotateY reads as depth

// Fold shading. Low contrast on purpose: these are creases catching light, not
// stripes. The multipliers run either side of the palette's oxblood, which is
// what keeps the whole curtain one colour instead of a two-tone pattern.
const CREASE_MIN = 0.86;
const CREASE_MAX = 0.92;
const RIDGE_MIN = 1.06;
const RIDGE_MAX = 1.14;

// ── The hem drag ────────────────────────────────────────────────────────────
// How far behind the top edge the bottom of the cloth runs at the deepest point
// of the haul, expressed as an angle so it scales with the viewport height, and
// then capped in px so it can't become absurd on a phone (where half a viewport
// is only ~190px wide and an unclamped drag would be a third of the screen).
const HEM_DRAG_MIN = 10; // deg
const HEM_DRAG_MAX = 14;
const HEM_MAX_OF_HALF = 0.32; // …but never more than this share of a half-width
// What the hem keeps once everything has settled. Not zero: the cloth is still
// hanging off a track that just stopped, so it keeps a little of the lean. It
// has to be small, though — whatever is left here is fabric still standing in
// the opening at the end, and `travel` is sized against it.
const HEM_REST = 0.2;
// The swing back. Momentum carries the hem past where the pull left it, once,
// and it decays — this is the beat that separates cloth from wall.
const HEM_SWAY_MIN = 1.6; // deg
const HEM_SWAY_MAX = 2.8;

// ── The stack ───────────────────────────────────────────────────────────────
// How narrow the visible cloth gets as the pleats crowd into the wing. Kept
// modest on purpose: every percent of compression is also a percent of extra
// opening (the seam edge retreats as the panel narrows), and past ~10% the half
// starts reading as shrinking rather than gathering.
const STACK_MIN = 0.9;
const STACK_MAX = 0.94;
// How far the top has travelled by the time the pull proper ends. The remainder
// is spent during the settle, which is what keeps the lagging hem on screen —
// and visibly swaying — after the top edge has left it.
const PULL_REACH = 0.66;
// Where in the settle the hem swings back and then over, as fractions of the
// settle's own span. Both are early in it, because they have to happen while
// there is still cloth in the frame to see swing.
const SWAY_IN_AT = 0.35;
const SWAY_BACK_AT = 0.62;

// ── Easing ──────────────────────────────────────────────────────────────────
type Bezier = [number, number, number, number];
const OUT_SOFT: Bezier = [0.33, 1, 0.68, 1];
// The haul. Not linear, not a stock ease-in-out: it leaves slowly (the weight
// of the cloth against a standing start), builds through the middle, and lands
// long — the tail is what makes the last of the fabric drift off rather than
// stop dead. The first control point is what sets how heavy it feels, and it is
// possible to overdo: at 0.85 the panel sat still for a second and then crossed
// two thirds of its travel in 400ms, which reads as a snap, not as weight.
const HEAVY: Bezier = [0.68, 0, 0.3, 1];
const SETTLE: Bezier = [0.22, 1, 0.36, 1];

// ── Small random helpers ────────────────────────────────────────────────────
const rand = (min: number, max: number) => min + Math.random() * (max - min);
const randInt = (min: number, max: number) => Math.round(rand(min, max));
const sign = () => (Math.random() < 0.5 ? -1 : 1);
const secs = (ms: number) => ms / 1000;
const deg = (radians: number) => (radians * 180) / Math.PI;

/** The palette's oxblood, lightened or darkened — the only colour in the cloth. */
function shade(hex: string, mult: number) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (at: number) => Math.min(255, Math.round(((n >> at) & 255) * mult));
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

// Velvet grain: one tiny tiled SVG, desaturated, sitting over each panel at a
// few percent. Meant to be felt rather than seen — it takes the flatness off a
// large area of one colour, which is most of what "cheap" looks like.
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='v'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23v)'/%3E%3C/svg%3E\")";

// The panel's own face. It is also what the server paints, at roughly the fold
// pitch the client will pick, so gaining the real folds is a change of detail
// and not of colour. (Vertical shading is left to the valance and hem overlays,
// which are on the panel in both states — putting it here as well would double
// it, and an opaque layer here would hide the folds underneath it.)
const VELVET_BASE = `repeating-linear-gradient(90deg, ${shade(CURTAIN, 0.88)} 0px, ${shade(CURTAIN, 1.08)} 34px, ${shade(CURTAIN, 0.88)} 68px)`;

// ── The plan ────────────────────────────────────────────────────────────────
type Strip = {
  left: number;
  width: number;
  background: string;
  boxShadow: string;
  /** px it hangs behind its panel at the deepest point of the ripple. */
  lag: number;
  /** s after the pull begins before this fold starts falling behind. */
  lagStart: number;
  /** 0–1 of its own window: when it is furthest behind. */
  lagPeak: number;
  /** deg of extra skew — how much further THIS fold's hem drags than the
   *  panel's, so the bottom edge is raggeder than the top. Bounded by
   *  HEM_JITTER_OF_SLOT; see the header. */
  hemSkew: number;
  /** deg — this fold's own swing back, on top of the panel's. */
  hemSway: number;
  /** 0–1 nudge to the settle's keyframe times, so the sway ripples along the
   *  hem instead of the whole bottom edge twitching at once. */
  swayShift: number;
  tilt: number;
  squeeze: number;
};

type PanelPlan = {
  side: "left" | "right";
  /** +1 if this half opens to the right, −1 if to the left. */
  out: 1 | -1;
  offset: number; // px it starts past its screen edge
  width: number;
  travel: number;
  /** px the deepest-lagging fold can hang past the panel's leading edge. */
  ripple: number;
  /** px the raggedest fold's HEM can hang past that, at the very bottom. */
  hemRipple: number;
  /** deg the whole half's hem drags behind its top edge at the deepest point. */
  hemDrag: number;
  /** deg the hem swings back past that as the pull lets go. */
  hemSway: number;
  /** scaleX the visible cloth compresses to as it stacks into the wing. */
  stack: number;
  delay: number; // s — the 5–30ms asymmetry between the two halves
  strips: Strip[];
};

type Spark = { top: string; size: number; dx: number; dy: number; delay: number };

type Plan = { panels: PanelPlan[]; sparks: Spark[] };

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function buildPanel(
  side: "left" | "right",
  env: {
    count: number;
    width: number;
    visible: number;
    height: number;
    rippleFromSeam: boolean;
    swayDir: number;
    delay: number;
  },
): PanelPlan {
  const { count, width, visible, height, rippleFromSeam, swayDir, delay } = env;
  const out = side === "left" ? -1 : 1;

  // Fold boundaries across the panel. Unequal widths are most of what stops a
  // curtain reading as a comb — real folds are not a repeating pattern.
  const weights = Array.from({ length: count }, () =>
    rand(1 - SLOT_JITTER, 1 + SLOT_JITTER),
  );
  const total = weights.reduce((a, b) => a + b, 0);
  const bounds: number[] = [0];
  for (const w of weights) bounds.push(bounds[bounds.length - 1] + (w / total) * width);
  bounds[count] = width; // absorb the rounding, so the seam edge is exact

  const avgSlot = width / count;
  const minSlot = Math.min(...weights.map((w) => (w / total) * width));
  // The overlap is taken off the AVERAGE fold and both lag ceilings off the
  // NARROWEST one, which is the conservative pairing: it makes
  // 2 × overlap > maxLag + maxHemLag true for every fold in the panel, not just
  // for a typical one, whatever way the width jitter happened to land.
  const overlap = avgSlot * OVERLAP_OF_SLOT;
  const maxLag = minSlot * LAG_OF_SLOT;
  const maxHemLag = minSlot * HEM_JITTER_OF_SLOT;
  // A per-fold hem lag is set as an ANGLE but budgeted as a DISTANCE, so the
  // angle is whatever puts `maxHemLag` px of drag at the bottom of this
  // viewport. Same conversion, one level up, for the panel's own drag.
  const maxHemSkew = deg(Math.atan(maxHemLag / height));

  // How far the whole half's hem runs behind its top edge. Picked as an angle
  // (so a tall window drags further, which is what heavy cloth does), then
  // clamped in px so a phone doesn't get a hem hanging a third of the way
  // across the screen.
  const dragPx = Math.min(
    height * Math.tan((rand(HEM_DRAG_MIN, HEM_DRAG_MAX) * Math.PI) / 180),
    visible * HEM_MAX_OF_HALF,
  );
  const hemDrag = deg(Math.atan(dragPx / height));

  // Panel-local x runs wall → seam on the left half and seam → wall on the
  // right, because each panel is pinned to its own side of the screen.
  //
  // A wave through the cloth, laid over the ramp below: the ramp says which end
  // of the panel is dragging, the wave keeps folds differing from their
  // neighbours everywhere along it — including at the seam, so the leading edge
  // is ragged whichever way the ramp happens to run this load.
  const wavePhase = rand(0, Math.PI * 2);
  const waveTurns = rand(1.1, 2.1);

  const strips: Strip[] = [];
  for (let i = 0; i < count; i++) {
    // 0 at the wall, 1 at the seam, whichever end of the panel that is.
    const toSeam = count === 1 ? 1 : side === "left" ? i / (count - 1) : 1 - i / (count - 1);
    // The wave either starts at the seam and runs to the wall or the reverse —
    // it's the difference between the curtain peeling open and being dragged
    // open, and it's re-picked every load.
    const ramp = rippleFromSeam ? toSeam : 1 - toSeam;
    const wave = 0.5 + 0.5 * Math.sin(wavePhase + toSeam * waveTurns * Math.PI * 2);
    // Stays inside 0–1, which is what keeps every lag inside maxLag and the
    // no-tear guarantee in the header true for any pair of folds, not just
    // neighbouring ones.
    const profile = 0.58 * ramp + 0.42 * wave;
    // The hem's raggedness runs on its own wave, a half-turn out of phase with
    // the horizontal one. If both were driven by `profile` the fold that lags
    // furthest would also be the one whose hem drags furthest, and the ripple
    // would read as one wave instead of cloth.
    const hemProfile = 0.5 + 0.5 * Math.sin(wavePhase + Math.PI + toSeam * waveTurns * Math.PI * 2);

    // The end folds sit flush with the panel's own edges; only the boundaries
    // between folds get the overlap, so the closed curtain has a clean seam and
    // no fold sticks out past the screen edge.
    const left = Math.max(0, bounds[i] - overlap);
    const right = Math.min(width, bounds[i + 1] + overlap);
    const slotStart = bounds[i] - left;
    const slotEnd = bounds[i + 1] - left;
    const ridge = slotStart + (slotEnd - slotStart) * rand(0.42, 0.58);

    // The fold's cross-section: crease, lit ridge, crease. The ridge is placed
    // over the part of the fold its neighbour isn't lapping, so the light lands
    // where it can actually be seen.
    const creaseA = rand(CREASE_MIN, CREASE_MAX);
    const creaseB = rand(CREASE_MIN, CREASE_MAX);
    const lit = rand(RIDGE_MIN, RIDGE_MAX);
    const background = `linear-gradient(90deg, ${shade(CURTAIN, creaseA * 0.94)} 0px, ${shade(CURTAIN, creaseA)} ${slotStart.toFixed(1)}px, ${shade(CURTAIN, lit)} ${ridge.toFixed(1)}px, ${shade(CURTAIN, creaseB)} ${slotEnd.toFixed(1)}px, ${shade(CURTAIN, creaseB * 0.94)} 100%)`;

    // Depth along the leading edge — the edge that moves out into the opening —
    // with a weaker one behind it so the fold reads as rounded, not as a plate.
    const lead = Math.round((right - left) * 0.22);
    const boxShadow =
      `inset ${out * lead}px 0 ${lead * 2}px -${Math.round(lead * 0.9)}px rgba(0,0,0,0.55), ` +
      `inset ${-out * lead}px 0 ${lead * 2}px -${Math.round(lead * 1.1)}px rgba(0,0,0,0.3)`;

    strips.push({
      left,
      width: right - left,
      background,
      boxShadow,
      // The profile carries the lag and the jitter only unsettles it: a shaped
      // wave plus noise reads as cloth, pure noise reads as debris.
      lag: Math.min(maxLag, maxLag * (0.1 + 0.9 * profile) * rand(0.9, 1.1)),
      lagStart: secs(LAG_START_MAX_MS * profile * rand(0.75, 1)),
      lagPeak: rand(0.4, 0.62),
      hemSkew: Math.min(maxHemSkew, maxHemSkew * (0.15 + 0.85 * hemProfile) * rand(0.9, 1.1)),
      hemSway: maxHemSkew * rand(0.3, 0.7) * swayDir,
      swayShift: rand(-0.03, 0.03),
      // Alternating tilt, so neighbouring folds face fractionally different
      // ways and catch the light differently down the panel.
      tilt: rand(TILT_MIN, TILT_MAX) * (i % 2 === 0 ? 1 : -1),
      squeeze: rand(SQUEEZE_MAX * 0.4, SQUEEZE_MAX),
    });
  }

  const stack = rand(STACK_MIN, STACK_MAX);
  // Far enough that the last of the cloth clears the seam. Three things are
  // still standing in the opening when the top edge reaches `travel`: the
  // deepest-lagging fold (maxLag), its hem's extra drag (maxHemLag), and the
  // panel's own residual lean (dragPx × HEM_REST). The stack compression is
  // *pulling the seam edge back* by width × (1 − stack) at the same time, so it
  // pays for part of that — but it is not subtracted here, because leaving the
  // margin in is what guarantees the bottom corner is actually gone rather than
  // finishing a pixel inside the frame.
  const travel = visible + maxLag + maxHemLag + dragPx * HEM_REST + 24;

  return {
    side,
    out,
    offset: width - visible,
    width,
    travel,
    ripple: maxLag,
    hemRipple: maxHemLag,
    hemDrag,
    hemSway: rand(HEM_SWAY_MIN, HEM_SWAY_MAX) * swayDir,
    stack,
    delay,
    strips,
  };
}

function buildPlan(): Plan {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const mobile = window.matchMedia("(max-width: 767px)").matches;
  // Phones get fewer, wider folds: same visual language, a third of the layers.
  const count = mobile ? randInt(5, 7) : randInt(8, 14);

  const overhang = Math.max(24, Math.round(vw * OVERHANG));
  const visible = Math.ceil(vw / 2) + 1; // +1 so the closed seam can't hairline
  const width = visible + overhang;

  const rippleFromSeam = Math.random() < 0.5;
  const swayDir = sign();
  // One half always moves a hair before the other. Perfect sync is the tell
  // that a machine is pulling both ropes.
  const skew = secs(rand(5, 30));
  const leadLeft = Math.random() < 0.5;

  const env = { count, width, visible, height: vh, rippleFromSeam, swayDir };
  const panels = [
    buildPanel("left", { ...env, delay: leadLeft ? 0 : skew }),
    buildPanel("right", { ...env, delay: leadLeft ? skew : 0 }),
  ];

  const sparks: Spark[] = Array.from({ length: randInt(5, 9) }, () => ({
    top: `${rand(12, 86).toFixed(1)}%`,
    size: randInt(3, 5),
    dx: rand(-70, 70),
    dy: rand(-22, 22),
    delay: rand(0, 0.18),
  }));

  return { panels, sparks };
}

/**
 * Mount once, at the top of the page. Renders a closed curtain on the server,
 * opens it on load, and unmounts itself when it's done — the transform layers
 * go away with it rather than sitting hidden over the page for the session.
 */
export function CurtainReveal() {
  const [shown, setShown] = useState(true);
  const [plan, setPlan] = useState<Plan | null>(null);
  // One ref array per transform layer — see "The four transform layers" above.
  const slides = useRef<Array<HTMLDivElement | null>>([]);
  const hems = useRef<Array<HTMLDivElement | null>>([]);
  const gathers = useRef<Array<HTMLDivElement | null>>([]);
  const stacks = useRef<Array<HTMLDivElement | null>>([]);
  const strips = useRef<Array<Array<HTMLDivElement | null>>>([[], []]);
  const rod = useRef<HTMLDivElement | null>(null);
  const seam = useRef<HTMLDivElement | null>(null);
  const flash = useRef<HTMLDivElement | null>(null);
  const sparks = useRef<Array<HTMLSpanElement | null>>([]);

  // Reduced motion: no curtain at all, the page is simply there. The stylesheet
  // below already hides it for the frames before this runs; this takes it out
  // of the DOM.
  useEffect(() => {
    if (prefersReducedMotion()) {
      setShown(false);
      return;
    }
    setPlan(buildPlan());
  }, []);

  useEffect(() => {
    if (!plan) return;

    const running: AnimationPlaybackControls[] = [];
    const play = (
      el: Element | null,
      keyframes: Parameters<typeof animate>[1],
      options: Parameters<typeof animate>[2],
    ) => {
      if (el) running.push(animate(el, keyframes, options));
    };

    // Spend whatever is left of the hold, not a fresh one — on a slow load the
    // curtain has already been sitting there for the whole beat.
    const start = Math.max(MIN_HOLD_MS, HOLD_MS - performance.now()) / 1000;
    const moveAt = start + secs(GATHER_MS);

    plan.panels.forEach((p, pi) => {
      const at = start + p.delay;

      // ── Phase 1, the gather ─────────────────────────────────────────────
      // Before any of it moves out, the half compresses toward the centre —
      // the fabric being taken up before the pull. Scaling about the seam edge
      // draws the whole face of the curtain inward; the panel overhangs its
      // screen edge by OVERHANG so this can't uncover the wall side.
      play(
        gathers.current[pi],
        { scaleX: [1, 1 - GATHER_SQUEEZE, 1] },
        {
          duration: secs(GATHER_MS + PULL_MS * 0.4),
          delay: at,
          times: [0, GATHER_MS / (GATHER_MS + PULL_MS * 0.4), 1],
          ease: [OUT_SOFT, OUT_SOFT],
        },
      );

      // ── Phase 2, the haul ───────────────────────────────────────────────
      // A small inward tug through the gather, then out and off. The panel is
      // the fastest thing in its half by construction — see the header. It only
      // reaches PULL_REACH of its travel by the time the pull proper ends; the
      // last of it drifts off during the settle, which is what keeps the
      // lagging hem in frame while it swings.
      play(
        slides.current[pi],
        {
          x: [
            0,
            -p.out * p.width * GATHER_SQUEEZE * 0.4,
            p.out * p.travel * PULL_REACH,
            p.out * p.travel,
          ],
        },
        {
          duration: secs(MOVE_MS),
          delay: at,
          times: [0, GATHER_AT, SETTLE_AT, 1],
          // The last segment is OUT_SOFT rather than the sharper SETTLE: it has
          // a third of the travel to cover and it has to cover it as a glide,
          // because this is the stretch the hem is swinging through. SETTLE
          // front-loads hard enough that the cloth was gone before the swing.
          ease: [OUT_SOFT, HEAVY, OUT_SOFT],
        },
      );

      // ── The hem drag, and its sway ──────────────────────────────────────
      // The one thing that makes this a curtain and not two panels. Only the
      // top of the cloth is on the track; the bottom is loose weight being
      // dragged, so it runs behind for the whole pull, overshoots once when the
      // pull lets go, and keeps a little of the lean at rest.
      //
      // The skew is negated against `out` so the hem trails INTO the covered
      // side. It shares the haul's keyframe times and easing, which is also the
      // safety argument: the hem's displacement stays a fixed fraction (~15%)
      // of how far the top has travelled at every instant, so the bottom corner
      // can never swing far enough to uncover the wall side of the panel, which
      // only has OVERHANG to spare.
      const swayIn = SETTLE_AT + (1 - SETTLE_AT) * SWAY_IN_AT;
      const swayBack = SETTLE_AT + (1 - SETTLE_AT) * SWAY_BACK_AT;
      play(
        hems.current[pi],
        {
          skewX: [
            0,
            0,
            -p.out * p.hemDrag,
            -p.out * (p.hemDrag - p.hemSway),
            -p.out * (p.hemDrag + p.hemSway * 0.4),
            -p.out * p.hemDrag * HEM_REST,
          ],
        },
        {
          duration: secs(MOVE_MS),
          delay: at,
          times: [0, GATHER_AT, SETTLE_AT, swayIn, swayBack, 1],
          ease: [OUT_SOFT, HEAVY, OUT_SOFT, OUT_SOFT, SETTLE],
        },
      );

      // ── Phase 3, the stack ──────────────────────────────────────────────
      // The pleats crowding into the wing. Scaling about the WALL edge is the
      // whole point: it pins the offstage side, so the fabric piles up there
      // and the folds visibly close on each other instead of the panel just
      // getting smaller. It starts at 1 and only ever narrows, and it narrows
      // toward the side that is already leaving, so it cannot open a gap the
      // haul wasn't opening anyway.
      play(
        stacks.current[pi],
        { scaleX: [1, 1, p.stack, p.stack] },
        {
          duration: secs(MOVE_MS),
          delay: at,
          times: [0, GATHER_AT, SETTLE_AT, 1],
          ease: [OUT_SOFT, HEAVY, OUT_SOFT],
        },
      );

      p.strips.forEach((s, si) => {
        const el = strips.current[pi]?.[si];
        if (!el) return;

        // Each fold falls behind its panel by its own amount, at its own
        // moment, and keeps a little of that lag to the end so the leading
        // edge is still ragged as it leaves the screen.
        play(
          el,
          { x: [0, -p.out * s.lag, -p.out * s.lag * 0.45] },
          {
            duration: secs(STRIP_MS) - s.lagStart,
            delay: moveAt + p.delay + s.lagStart,
            times: [0, s.lagPeak, 1],
            ease: [OUT_SOFT, SETTLE],
          },
        );

        // …and its hem falls behind the panel's hem by its own amount too, and
        // swings back on its own beat. The panel underneath is already doing
        // the bulk of the drag; this is the raggedness on top of it, which is
        // why the amplitudes here are a fraction of a fold width rather than a
        // fraction of the screen.
        const k = (t: number) => Math.min(0.999, Math.max(0, t + s.swayShift));
        play(
          el,
          {
            skewX: [
              0,
              -p.out * s.hemSkew,
              -p.out * (s.hemSkew - s.hemSway),
              -p.out * (s.hemSkew + s.hemSway * 0.4),
              -p.out * s.hemSkew * HEM_REST,
            ],
          },
          {
            duration: secs(STRIP_MS),
            delay: moveAt + p.delay,
            // The same two beats the panel's own hem swings on, expressed in
            // the strips' window instead of the move's, and nudged per fold so
            // the swing ripples along the bottom edge rather than the whole hem
            // twitching at once.
            times: [
              0,
              STRIP_SETTLE_AT,
              k(STRIP_SETTLE_AT + (1 - STRIP_SETTLE_AT) * SWAY_IN_AT),
              k(STRIP_SETTLE_AT + (1 - STRIP_SETTLE_AT) * SWAY_BACK_AT),
              1,
            ],
            ease: [HEAVY, OUT_SOFT, OUT_SOFT, SETTLE],
          },
        );

        // The fold turns slightly on its own axis through the pull and relaxes
        // out of it as the cloth stacks — the light moving across the pleats.
        play(
          el,
          { rotateY: [0, s.tilt, s.tilt, s.tilt * 0.45] },
          {
            duration: secs(STRIP_MS),
            delay: moveAt + p.delay,
            times: [0, 0.5, STRIP_SETTLE_AT, 1],
            ease: [OUT_SOFT, "linear", SETTLE],
          },
        );

        // Fabric doesn't hold its width while it's being hauled: it takes up a
        // fraction as it starts, gives it back as it lets go.
        play(
          el,
          { scaleX: [1, 1 - s.squeeze, 1 + s.squeeze * 0.6, 1] },
          {
            duration: secs(PULL_MS),
            delay: moveAt + p.delay + s.lagStart,
            times: [0, 0.45, 0.8, 1],
            ease: OUT_SOFT,
          },
        );
      });
    });

    // The rod holds while the cloth is still under it and fades as the opening
    // widens — a lit line across the top of a revealed page reads as a border
    // drawn round the site, not as something the curtain hung from.
    // (Every `times` array here ends at 1. Motion hands these to the Web
    // Animations API as keyframe offsets, and one that stops short leaves the
    // rest of the track undefined — the animation simply doesn't play.)
    play(
      rod.current,
      { opacity: [1, 1, 0, 0] },
      { duration: secs(MOVE_MS), delay: start, times: [0, 0.16, 0.6, 1], ease: "linear" },
    );

    // The seam light goes out as the join opens: once there is a gap, the light
    // through it is the flash below, not a line.
    play(
      seam.current,
      { opacity: [0.45, 0.45, 0.75, 0, 0], scaleX: [1, 1, 2.4, 3, 3] },
      {
        duration: secs(MOVE_MS),
        delay: start,
        times: [0, GATHER_AT * 0.7, GATHER_AT + 0.03, GATHER_AT + 0.12, 1],
        ease: [OUT_SOFT, OUT_SOFT, OUT_SOFT, "linear"],
      },
    );

    // Stage light coming through the split, and a few sparks off the seam.
    play(
      flash.current,
      { opacity: [0, 0, 1, 0, 0] },
      {
        duration: secs(MOVE_MS),
        delay: start,
        times: [0, GATHER_AT, GATHER_AT + 0.14, 0.62, 1],
        ease: [OUT_SOFT, OUT_SOFT, OUT_SOFT, "linear"],
      },
    );
    plan.sparks.forEach((s, i) => {
      play(
        sparks.current[i],
        { opacity: [0, 1, 0], x: [0, s.dx], y: [0, s.dy], scale: [0.4, 1.1, 0.8] },
        {
          duration: secs(PULL_MS * 0.55),
          delay: moveAt + s.delay,
          times: [0, 0.25, 1],
          ease: OUT_SOFT,
        },
      );
    });

    const longest = Math.max(...plan.panels.map((p) => p.delay));
    const done = window.setTimeout(
      () => {
        const layers = [
          ...slides.current,
          ...hems.current,
          ...gathers.current,
          ...stacks.current,
          ...strips.current.flat(),
        ];
        for (const el of layers) {
          if (el) el.style.willChange = "auto";
        }
        setShown(false);
      },
      (start + secs(MOVE_MS) + longest) * 1000 + 60,
    );

    return () => {
      window.clearTimeout(done);
      for (const c of running) c.stop();
    };
  }, [plan]);

  if (!shown) return null;

  return (
    <div
      aria-hidden
      className="jonah-curtain pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: 900 }}
    >
      <style>{`
        /* Reduced motion: no curtain, no wait — and this rule covers the frames
           before the effect above can unmount it. */
        @media (prefers-reduced-motion: reduce) { .jonah-curtain { display: none; } }
        /* Failsafe. If JS never arrives — hydration failed, script blocked —
           the curtain would otherwise sit closed over the page forever. This
           only bites seconds after the real open has finished and unmounted. */
        @keyframes jonah-curtain-failsafe { 0%, 97% { visibility: visible; } 100% { visibility: hidden; } }
        .jonah-curtain { animation: jonah-curtain-failsafe ${TOTAL_MS + 4000}ms linear forwards; }
      `}</style>

      {/* The rod the whole thing hangs from. Deliberately dim: it is a dark
          rail with a hint of brass along its top, not a gold bar. A bright line
          across the top of the opening stops reading as a rod and starts
          reading as a border drawn around the page. */}
      <div ref={rod} className="absolute inset-x-0 top-0" style={{ height: 13 }}>
        <div
          className="absolute inset-x-0 top-0"
          style={{
            height: 8,
            background: `linear-gradient(180deg, #241610 0%, rgba(201,169,97,0.5) 30%, #43301a 62%, #120a07 100%)`,
          }}
        />
        <div
          className="absolute inset-x-0"
          style={{
            top: 8,
            height: 5,
            background: "linear-gradient(180deg, rgba(0,0,0,0.7), transparent)",
          }}
        />
      </div>

      {/* the light coming through as the seam splits */}
      <div
        ref={flash}
        className="absolute inset-0"
        style={{
          opacity: 0,
          background: `radial-gradient(42% 58% at 50% 46%, rgba(245,230,200,0.24), transparent 70%)`,
        }}
      />

      {[0, 1].map((pi) => {
        const p = plan?.panels[pi];
        const side = pi === 0 ? "left" : "right";
        // How far the panel's own overlays reach past its leading edge: the
        // horizontal ripple, plus the extra the raggedest hem swings out to.
        const over = p ? -(p.ripple + p.hemRipple) : 0;
        const bleed = side === "left" ? { left: 0, right: over } : { left: over, right: 0 };
        return (
          <div
            key={side}
            // Layout only — this element never transforms, so `side` and
            // `width` below stay off the animation entirely.
            className="absolute inset-y-0"
            style={{
              // Before the plan exists — i.e. in the server's markup and every
              // frame up to hydration — this is plain closed velvet at the same
              // colour and roughly the same fold pitch.
              [side]: p ? -p.offset : `-${OVERHANG * 100}vw`,
              width: p ? p.width : `${50 + OVERHANG * 100}vw`,
            } as CSSProperties}
          >
            {/* 1 — the haul */}
            <div
              ref={(el) => {
                slides.current[pi] = el;
              }}
              className="absolute inset-0"
              style={{ willChange: "transform" }}
            >
              {/* 2 — the hem drag, skewed about the TOP edge so the top is
                  pinned and the displacement grows to a maximum at the bottom */}
              <div
                ref={(el) => {
                  hems.current[pi] = el;
                }}
                className="absolute inset-0"
                style={{ transformOrigin: "50% 0%", willChange: "transform" }}
              >
                {/* 3 — the take-up, about the SEAM edge */}
                <div
                  ref={(el) => {
                    gathers.current[pi] = el;
                  }}
                  className="absolute inset-0"
                  style={{
                    transformOrigin: side === "left" ? "100% 50%" : "0% 50%",
                    willChange: "transform",
                  }}
                >
                  {/* 4 — the stack, about the WALL edge. Also the opaque velvet
                      face and the perspective for the folds inside it. */}
                  <div
                    ref={(el) => {
                      stacks.current[pi] = el;
                    }}
                    className="absolute inset-0"
                    style={{
                      background: VELVET_BASE,
                      transformOrigin: side === "left" ? "0% 50%" : "100% 50%",
                      perspective: `${PERSPECTIVE}px`,
                      perspectiveOrigin: "50% 38%",
                      willChange: "transform",
                    }}
                  >
                    {p?.strips.map((s, si) => (
                      <div
                        key={si}
                        ref={(el) => {
                          strips.current[pi][si] = el;
                        }}
                        className="absolute inset-y-0"
                        style={{
                          left: s.left,
                          width: s.width,
                          background: s.background,
                          boxShadow: s.boxShadow,
                          // Its own hem lag pivots on its own top edge, same as
                          // the panel's.
                          transformOrigin: "50% 0%",
                          willChange: "transform",
                        }}
                      />
                    ))}

                    {/* Valance shadow under the rod, floor shadow at the hem,
                        and the velvet grain. Panel-level, so they cost one
                        layer each rather than one per fold — and each runs
                        `bleed` px past the leading edge, because the folds hang
                        that far out into the opening and an unshaded, ungrained
                        fringe along the ragged edge is exactly where the eye
                        would catch the trick. */}
                    <div
                      className="absolute top-0"
                      style={{
                        ...bleed,
                        height: "16%",
                        background: "linear-gradient(180deg, rgba(0,0,0,0.6), transparent)",
                      }}
                    />
                    <div
                      className="absolute bottom-0"
                      style={{
                        ...bleed,
                        height: "22%",
                        background: "linear-gradient(0deg, rgba(0,0,0,0.5), transparent)",
                      }}
                    />
                    <div
                      className="absolute inset-y-0"
                      style={{
                        ...bleed,
                        backgroundImage: GRAIN,
                        backgroundSize: "140px 140px",
                        opacity: 0.07,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Light escaping where the two halves meet — the give-away that there is
          a lit stage behind this. It belongs to the join, not to either half,
          so it stays at the centre and goes out as the gap opens and the light
          stops being a line. */}
      <div
        ref={seam}
        className="absolute inset-y-0 left-1/2"
        style={{
          width: 2,
          marginLeft: -1,
          background: `linear-gradient(180deg, rgba(201,169,97,0.15), ${ACCENT} 18%, ${ACCENT} 82%, rgba(201,169,97,0.15))`,
          opacity: 0.45,
          boxShadow: `0 0 16px rgba(201,169,97,0.5)`,
        }}
      />

      {/* sparks off the seam as it splits */}
      <div className="absolute inset-y-0 left-1/2 w-0">
        {plan?.sparks.map((s, i) => (
          <span
            key={i}
            ref={(el) => {
              sparks.current[i] = el;
            }}
            className="absolute rounded-full"
            style={{
              top: s.top,
              left: 0,
              width: s.size,
              height: s.size,
              opacity: 0,
              background: ACCENT,
              boxShadow: `0 0 6px rgba(201,169,97,0.8)`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
