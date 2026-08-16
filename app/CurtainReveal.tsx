"use client";

// ── Curtain reveal ──────────────────────────────────────────────────────────
// The first thing the page shows: heavy oxblood velvet hanging from a rod,
// holding for a beat, then hauled open to reveal the site — and gone from the
// DOM the moment it finishes.
//
// The version this replaces was two solid rectangles sliding apart: it moved,
// but it read as "two walls," not as cloth. This one is fabric. Each half is a
// panel of vertical FOLD STRIPS (8–14 on a desktop, 5–7 on a phone) that share
// one pull but not one timing, so a ripple travels through the cloth as it
// opens and the leading edge stays ragged instead of ruler-straight.
//
// Everything that can vary is drawn fresh per page load, the same "no two plays
// alike" rule the card reveal follows (see CardRevealOverlay.tsx): fold count
// and individual fold widths, which end of the panel leads the ripple, each
// fold's own delay / lag / tilt / squeeze, which way the settle wobbles, and
// which half starts a hair before the other.
//
// ── Why this one can't tear ─────────────────────────────────────────────────
// The obvious way to build fabric — give every pleat its own independent
// transform — is the way that fails: two neighbours disagree by more than they
// overlap and a slit of the live page flashes through the middle of the
// curtain. An earlier attempt at this page did exactly that. Two properties
// make it impossible here, both enforced by construction rather than by taste:
//
//   1. The PANEL is opaque velvet in its own right and is the fastest thing in
//      its half — a strip can only ever lag it, never outrun it. Everything
//      from the panel's leading edge outward is therefore covered by the panel
//      no matter what the strips are doing.
//   2. That leaves only the ripple zone, the part of the strips hanging past
//      that edge. There, neighbours overlap by OVERLAP_OF_SLOT of a fold width
//      on each side while the deepest any strip can lag is LAG_OF_SLOT of a
//      fold width — and 2 × OVERLAP_OF_SLOT > LAG_OF_SLOT, so even a strip at
//      full lag beside a strip at zero lag still overlaps it. The worst case
//      the random numbers can produce is still solid cloth.
//
// The margin between those two numbers is the whole design budget: it is what
// lets a fold hang a full fold-width past its neighbour — enough that the
// leading edge of the curtain is visibly ragged rather than a ruled line —
// without ever letting two folds separate.
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
// animates width/left/right — position is translate/scale/rotate only, so the
// whole open stays on the compositor, and `will-change` is dropped before the
// overlay unmounts.
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
const GATHER_MS = 200; // phase 1 — the cloth is gathered before the pull
const PULL_MS = 1520; // phase 2 — the haul
const SETTLE_MS = 180; // phase 3 — the last of the fabric whips past and settles
const MOVE_MS = GATHER_MS + PULL_MS + SETTLE_MS; // 1.9s, weighty but not slow
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
const LAG_OF_SLOT = 1; // deepest lag, as a fraction of the NARROWEST fold —
// held under 2 × OVERLAP_OF_SLOT so folds can never pull apart (see the header).
// This is also where the per-fold speed variance lives: a fold width is around
// a tenth of the distance a panel travels, so "lags by up to one fold" is the
// same statement as "runs up to ~8–10% behind" — expressed as a distance,
// because a distance is what can be bounded against the overlap.
const GATHER_SQUEEZE = 0.015; // 1.5% inward compression before the pull
const LAG_START_MAX_MS = 120; // per-fold delay before it starts falling behind
const TILT_MIN = 2; // deg — each fold's own rotateY through the pull
const TILT_MAX = 6;
const WOBBLE_MIN = 2.2; // deg — the settle, back and forth and decaying
const WOBBLE_MAX = 3.6;
const SQUEEZE_MAX = 0.018; // scaleX — fabric compressing and stretching
const PERSPECTIVE = 1200; // px, so the per-fold rotateY reads as depth

// Fold shading. Low contrast on purpose: these are creases catching light, not
// stripes. The multipliers run either side of the palette's oxblood, which is
// what keeps the whole curtain one colour instead of a two-tone pattern.
const CREASE_MIN = 0.86;
const CREASE_MAX = 0.92;
const RIDGE_MIN = 1.06;
const RIDGE_MAX = 1.14;

// ── Easing ──────────────────────────────────────────────────────────────────
type Bezier = [number, number, number, number];
const OUT_SOFT: Bezier = [0.33, 1, 0.68, 1];
// The pull. Not linear, not a stock ease-in-out: it leaves slowly (the weight
// of the cloth), builds hard through the middle, and lands long — the tail is
// what makes the last of the fabric drift off rather than stop dead.
const HEAVY: Bezier = [0.7, 0, 0.28, 1];
const SETTLE: Bezier = [0.22, 1, 0.36, 1];

// ── Small random helpers ────────────────────────────────────────────────────
const rand = (min: number, max: number) => min + Math.random() * (max - min);
const randInt = (min: number, max: number) => Math.round(rand(min, max));
const sign = () => (Math.random() < 0.5 ? -1 : 1);
const secs = (ms: number) => ms / 1000;

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
  tilt: number;
  squeeze: number;
  wobble: number;
  /** 0–1 nudge to the settle's keyframe times, so the wobble ripples. */
  wobbleShift: number;
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
    rippleFromSeam: boolean;
    wobbleDir: number;
    delay: number;
  },
): PanelPlan {
  const { count, width, visible, rippleFromSeam, wobbleDir, delay } = env;
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
  // The overlap is taken off the AVERAGE fold and the lag ceiling off the
  // NARROWEST one, which is the conservative pairing: it makes
  // 2 × overlap > maxLag true for every fold in the panel, not just for a
  // typical one, whatever way the width jitter happened to land.
  const overlap = avgSlot * OVERLAP_OF_SLOT;
  const maxLag = minSlot * LAG_OF_SLOT;

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
      // Alternating tilt, so neighbouring folds face fractionally different
      // ways and catch the light differently down the panel.
      tilt: rand(TILT_MIN, TILT_MAX) * (i % 2 === 0 ? 1 : -1),
      squeeze: rand(SQUEEZE_MAX * 0.4, SQUEEZE_MAX),
      wobble: rand(WOBBLE_MIN, WOBBLE_MAX) * wobbleDir,
      wobbleShift: rand(-0.02, 0.02),
    });
  }

  // Far enough that the deepest-lagging fold still clears the seam, including
  // the lag it keeps to the end of its track.
  const travel = visible + maxLag + 24;

  return {
    side,
    out,
    offset: width - visible,
    width,
    travel,
    ripple: maxLag,
    delay,
    strips,
  };
}

function buildPlan(): Plan {
  const vw = window.innerWidth;
  const mobile = window.matchMedia("(max-width: 767px)").matches;
  // Phones get fewer, wider folds: same visual language, a third of the layers.
  const count = mobile ? randInt(5, 7) : randInt(8, 14);

  const overhang = Math.max(24, Math.round(vw * OVERHANG));
  const visible = Math.ceil(vw / 2) + 1; // +1 so the closed seam can't hairline
  const width = visible + overhang;

  const rippleFromSeam = Math.random() < 0.5;
  const wobbleDir = sign();
  // One half always moves a hair before the other. Perfect sync is the tell
  // that a machine is pulling both ropes.
  const skew = secs(rand(5, 30));
  const leadLeft = Math.random() < 0.5;

  const env = { count, width, visible, rippleFromSeam, wobbleDir };
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
  const panels = useRef<Array<HTMLDivElement | null>>([]);
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
        panels.current[pi],
        { scaleX: [1, 1 - GATHER_SQUEEZE, 1] },
        {
          duration: secs(GATHER_MS + PULL_MS * 0.4),
          delay: at,
          times: [0, GATHER_MS / (GATHER_MS + PULL_MS * 0.4), 1],
          ease: [OUT_SOFT, OUT_SOFT],
        },
      );

      // ── Phase 2, the pull ───────────────────────────────────────────────
      // A small inward tug through the gather, then out and off. The panel is
      // the fastest thing in its half by construction — see the header.
      play(
        panels.current[pi],
        {
          x: [0, -p.out * p.width * GATHER_SQUEEZE * 0.4, p.out * p.travel * 0.93, p.out * p.travel],
        },
        {
          duration: secs(MOVE_MS),
          delay: at,
          times: [0, GATHER_AT, SETTLE_AT, 1],
          ease: [OUT_SOFT, HEAVY, SETTLE],
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

        // ── Phase 3, the settle ───────────────────────────────────────────
        // The fold turns slightly on its own axis through the pull, then — in
        // the last breath, while the last of it is still crossing the screen
        // edge — whips back and forth once and decays. This is the beat that
        // separates cloth from wall.
        const w = s.wobble;
        const k = (t: number) => Math.min(0.999, t + s.wobbleShift);
        play(
          el,
          {
            rotateY: [0, s.tilt, s.tilt, s.tilt + w, s.tilt - w * 0.45, s.tilt + w * 0.15],
          },
          {
            duration: secs(STRIP_MS),
            delay: moveAt + p.delay,
            times: [0, 0.5, k(STRIP_SETTLE_AT), k(0.93), k(0.965), 1],
            ease: [OUT_SOFT, "linear", OUT_SOFT, OUT_SOFT, OUT_SOFT],
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
        for (const el of [...panels.current, ...strips.current.flat()]) {
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
        // How far the panel's own overlays reach past its leading edge.
        const over = p ? -p.ripple : 0;
        const bleed = side === "left" ? { left: 0, right: over } : { left: over, right: 0 };
        return (
          <div
            key={side}
            ref={(el) => {
              panels.current[pi] = el;
            }}
            className="absolute inset-y-0"
            style={{
              // Before the plan exists — i.e. in the server's markup and every
              // frame up to hydration — this is plain closed velvet at the same
              // colour and roughly the same fold pitch.
              [side]: p ? -p.offset : `-${OVERHANG * 100}vw`,
              width: p ? p.width : `${50 + OVERHANG * 100}vw`,
              background: VELVET_BASE,
              perspective: `${PERSPECTIVE}px`,
              perspectiveOrigin: "50% 38%",
              transformOrigin: side === "left" ? "100% 50%" : "0% 50%",
              willChange: "transform",
            } as CSSProperties}
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
                  willChange: "transform",
                }}
              />
            ))}

            {/* Valance shadow under the rod, floor shadow at the hem, and the
                velvet grain. Panel-level, so they cost one layer each rather
                than one per fold — and each runs `bleed` px past the leading
                edge, because the folds hang that far out into the opening and
                an unshaded, ungrained fringe along the ragged edge is exactly
                where the eye would catch the trick. */}
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
