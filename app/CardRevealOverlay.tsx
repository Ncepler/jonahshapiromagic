"use client";

// ── Card reveal overlay ─────────────────────────────────────────────────────
// A screen-filling flight of playing cards, used as the transition between a
// CTA and whatever that CTA opens. Two entry points on the page use it:
//
//   "Book" (sticky bar)      → mode "book"  — cards spawn at the middle of the
//                              viewport, cover the screen, the page scrolls to
//                              the booking form behind them, then they fall
//                              away to reveal it. Mixed face-up / face-down,
//                              face-down being Jonah's oxblood card back.
//   "Reveal today's trick"   → mode "trick" — cards spawn at the middle of the
//                              trick card itself, cover the screen, fall away,
//                              and then the existing random-TikTok tab opens.
//                              Fronts only, black or white depending on the
//                              visitor's system color scheme.
//
// Each click also picks one of two flight paths at random — "burst" (an
// explosion out of the origin) or "tornado" (cards blow in from both edges,
// pull back into a spinning vortex, then expand forward into the screen).
//
// Trigger it from anywhere with triggerCardReveal(); the overlay component
// itself is mounted once, in app/page.tsx.
//
// Motion (the site's animation library) drives every card. Nothing here
// animates top/left — position is translate3d and rotate3d only, so the whole
// flight stays on the compositor.

import { animate, type AnimationPlaybackControls } from "motion/react";
import { useEffect, useRef, useState, type CSSProperties } from "react";

// ── Palette ─────────────────────────────────────────────────────────────────
// Mirrors the four values this file needs from app/page.tsx's palette block —
// that block is the source of truth for the site's colors and stays the place
// to edit them. Only the card back and the drop shadow are brand-colored; the
// card faces are deliberately plain playing-card white/black.
const CURTAIN = "#3d0a0a"; // oxblood — the card back's field
const CURTAIN_DEEP = "#1f0505"; // the darker stripe in the back's lattice
const ACCENT = "#c9a961"; // antique gold — the back's frame and ✦
const BG = "#0a0505"; // near-black — the back's outer edge

// The site's own easing curve (EASE in app/page.tsx) — an expo-ish ease-out.
// It is what every "thrown outward" motion here decelerates on.
const OUT_EXPO: Bezier = [0.16, 1, 0.3, 1];
const OUT_SOFT: Bezier = [0.33, 1, 0.68, 1];
const IN_FALL: Bezier = [0.4, 0, 1, 1]; // gravity-ish, for the cards dropping

// ── Timing (seconds) ────────────────────────────────────────────────────────
// Both variants are budgeted so the whole reveal — cover AND dissipate — lands
// comfortably inside the ~5s transient user-activation window browsers give a
// click. mode "trick" opens a tab when the reveal finishes, and past that
// window a popup blocker would eat it.
const BURST_DUR = 1.75;
const BURST_DELAY_MAX = 0.15; // per-card stagger, so nothing moves in lockstep

// Tornado phases: blow in and pull back / vortex / expand forward. Kept in the
// 27% / 50% / 23% proportion of the design, trimmed ~12% overall for the
// activation budget above.
const TORNADO_A = 0.72;
const TORNADO_B = 1.32;
const TORNADO_C = 0.6;
const TORNADO_DUR = TORNADO_A + TORNADO_B + TORNADO_C;
const TORNADO_DELAY_MAX = 0.1;

const HOLD = 0.08; // beat at full cover before the cards let go
const FALL_DUR = 0.55;
const FALL_ROW_STAGGER = 0.18; // top row drops first, bottom row last
const FALL_JITTER = 0.1;
const FALL_MAX = FALL_DUR + FALL_ROW_STAGGER + FALL_JITTER;

const PERSPECTIVE = 1400; // px — depth for translateZ / rotateX / rotateY

const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const SUITS = ["♠", "♥", "♦", "♣"];
const RED_SUITS = new Set(["♥", "♦"]);

type Bezier = [number, number, number, number];
type Ease = Bezier | "linear";

export type CardRevealMode = "book" | "trick";

export type CardRevealOptions = {
  mode: CardRevealMode;
  /** Where the cards come from, in viewport coordinates (the overlay is fixed). */
  origin: { x: number; y: number };
  /** Fires the moment the cards have the screen completely covered. */
  onCovered?: (reducedMotion: boolean) => void;
  /** Fires once the cards have fallen away again. */
  onComplete?: (reducedMotion: boolean) => void;
};

// ── Small random helpers ────────────────────────────────────────────────────
const rand = (min: number, max: number) => min + Math.random() * (max - min);
const randInt = (min: number, max: number) => Math.round(rand(min, max));
const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];
const sign = () => (Math.random() < 0.5 ? -1 : 1);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// ── Run + card shapes ───────────────────────────────────────────────────────
type Skin = {
  faceBg: string;
  faceBorder: string;
  redInk: string;
  blackInk: string;
  shadow: string;
};

type Track = {
  duration: number;
  delay: number;
  times: number[];
  x: number[];
  y: number[];
  z: number[];
  scale: number[];
  rotateX: number[];
  rotateY: number[];
  rotateZ: number[];
  moveEase: Ease[];
  spinEase: Ease[];
};

type CardSpec = {
  face: "front" | "back";
  rank: string;
  suit: string;
  /** Left edge of this card's orbit wrapper, in viewport px. */
  wrapLeft: number;
  /** rotateY keyframes for the orbit wrapper — tornado only. */
  orbit: { times: number[]; rotateY: number[]; ease: Ease[] } | null;
  track: Track;
  fall: { delay: number; x: number; y: number; rotateZ: number };
};

type Run = {
  id: number;
  mode: CardRevealMode;
  skin: Skin;
  /** Card size at scale 1 — i.e. the size at the moment the screen is covered. */
  width: number;
  height: number;
  cards: CardSpec[];
  /** Seconds from start until the screen is completely covered. */
  cover: number;
  onCovered?: (reducedMotion: boolean) => void;
  onComplete?: (reducedMotion: boolean) => void;
};

// ── The trigger ─────────────────────────────────────────────────────────────
// The overlay registers itself here on mount so any button on the page can
// start a reveal without threading props or context through the tree.
let start: ((run: Run) => void) | null = null;
let busy = false;
let nextId = 1;

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Play a card reveal, then run the action it is covering for.
 *
 * If the visitor asked for reduced motion, or the overlay isn't mounted, the
 * animation is skipped entirely and both callbacks fire immediately — the
 * button still does exactly what it does today, just without the spectacle.
 * A second click while a reveal is already in flight is ignored.
 */
export function triggerCardReveal(opts: CardRevealOptions): void {
  if (busy) return;

  const reduced = prefersReducedMotion();
  if (reduced || !start) {
    opts.onCovered?.(reduced);
    opts.onComplete?.(reduced);
    return;
  }

  busy = true;
  start(buildRun(opts));
}

// ── Building a run ──────────────────────────────────────────────────────────
function skinFor(mode: CardRevealMode): Skin {
  if (mode === "book") {
    // Standard playing-card faces: warm white stock, red and black suits.
    return {
      faceBg: "linear-gradient(158deg, #fdfaf2 0%, #ece2cd 100%)",
      faceBorder: "rgba(20,10,6,0.22)",
      redInk: "#b02a2a",
      blackInk: "#16100c",
      shadow: "0 18px 46px rgba(0,0,0,0.55)",
    };
  }
  // mode "trick" — read the system color scheme now, at click time, not once
  // at page load, so switching the OS theme mid-visit is picked up.
  const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return dark
    ? {
        faceBg: "linear-gradient(158deg, #141416 0%, #050506 100%)",
        faceBorder: "rgba(255,255,255,0.18)",
        redInk: "rgba(255,255,255,0.7)",
        blackInk: "rgba(255,255,255,0.7)",
        shadow: "0 18px 46px rgba(0,0,0,0.72)",
      }
    : {
        faceBg: "linear-gradient(158deg, #ffffff 0%, #f1f1f4 100%)",
        faceBorder: "rgba(12,12,16,0.18)",
        redInk: "#17161a",
        blackInk: "#17161a",
        shadow: "0 18px 46px rgba(0,0,0,0.38)",
      };
}

function buildRun(opts: CardRevealOptions): Run {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cx = vw / 2;
  const mobile = window.matchMedia("(max-width: 767px)").matches;
  const variant: "burst" | "tornado" = Math.random() < 0.5 ? "burst" : "tornado";

  // ── Coverage grid ─────────────────────────────────────────────────────────
  // "Fully covered" is a promise, so it can't be left to a lucky scatter. Every
  // card owns one cell of a grid over the viewport and lands somewhere inside
  // it. Size the card so its inscribed circle contains its whole cell — then
  // it covers that cell at ANY final rotation, jitter included — and coverage
  // is guaranteed while the placement still looks hand-thrown.
  const minCards = mobile ? 24 : 60;
  const maxCards = mobile ? 40 : 100;
  const target = randInt(minCards, maxCards);
  const cols = clamp(Math.round(Math.sqrt((target * vw) / vh)), 3, 18);
  const rows = clamp(
    Math.round(target / cols),
    3,
    Math.max(3, Math.floor(maxCards / cols)),
  );

  const cellW = vw / cols;
  const cellH = vh / rows;
  const jitterX = cellW * 0.16;
  const jitterY = cellH * 0.16;
  const width = Math.hypot(cellW + 2 * jitterX, cellH + 2 * jitterY) * 1.06;
  const height = width * 1.4; // the 2.5 : 3.5 playing-card ratio

  // Cards are rendered at their covering size and scaled DOWN to spawn, so the
  // pips and indices are crisp at the one moment anybody can read them.
  const cells: Array<{ x: number; y: number; row: number }> = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({
        x: (c + 0.5) * cellW + rand(-jitterX, jitterX),
        y: (r + 0.5) * cellH + rand(-jitterY, jitterY),
        row: r,
      });
    }
  }
  // Shuffle so paint order isn't grid order — otherwise the overlap always
  // runs the same direction and the grid reads as a grid.
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }

  const spinDir = sign();
  const cards: CardSpec[] = cells.map((cell, i) => {
    const base = {
      // mode "book" mixes faces and backs roughly 50/50; mode "trick" is
      // fronts only, per the design.
      face:
        opts.mode === "book" && Math.random() < 0.5
          ? ("back" as const)
          : ("front" as const),
      rank: pick(RANKS),
      suit: pick(SUITS),
      fall: {
        delay:
          (cell.row / Math.max(1, rows - 1)) * FALL_ROW_STAGGER +
          rand(0, FALL_JITTER),
        x: cell.x + rand(-70, 70),
        y: cell.y + vh * 1.35,
        rotateZ: rand(-140, 140),
      },
    };

    return variant === "burst"
      ? burstCard(base, cell, opts.origin, vw)
      : tornadoCard(base, cell, i, { vw, vh, cx, width, mobile, spinDir });
  });

  return {
    id: nextId++,
    mode: opts.mode,
    skin: skinFor(opts.mode),
    width,
    height,
    cards,
    cover:
      variant === "burst"
        ? BURST_DUR + BURST_DELAY_MAX
        : TORNADO_DUR + TORNADO_DELAY_MAX,
    onCovered: opts.onCovered,
    onComplete: opts.onComplete,
  };
}

// A card's final rotateX/rotateY have to land flat to the camera or it covers
// nothing — an edge-on card is a line. Snapping the end angle to a whole number
// of turns keeps it flat while leaving the number of turns free to be wild.
function flatEnd(startDeg: number, turns: number) {
  return 360 * (Math.round(startDeg / 360) + turns);
}

// How a card tumbles on the way out. Splitting this into named personalities is
// what stops the burst reading as one uniform zoom: some cards go end over end,
// some spin flat like a thrown disc, some flip.
function tumble() {
  const roll = Math.random();
  if (roll < 0.3) return { x: randInt(1, 3) * sign(), y: randInt(0, 1) * sign(), z: rand(-1, 1) };
  if (roll < 0.6) return { x: randInt(0, 1) * sign(), y: randInt(0, 1) * sign(), z: rand(-4, 4) };
  if (roll < 0.85) return { x: randInt(0, 1) * sign(), y: randInt(1, 3) * sign(), z: rand(-1, 1) };
  return { x: randInt(1, 2) * sign(), y: randInt(1, 2) * sign(), z: rand(-2, 2) };
}

// ── Variant 1: burst ────────────────────────────────────────────────────────
// Cards appear at the origin, tiny and far back, and are thrown out at the
// viewer. Each one gets its own velocity (it reaches its cell at its own
// moment), its own overshoot, its own sideways drift off the straight line,
// its own three-axis spin, and its own start delay.
function burstCard(
  base: Pick<CardSpec, "face" | "rank" | "suit" | "fall">,
  cell: { x: number; y: number },
  origin: { x: number; y: number },
  vw: number,
): CardSpec {
  const dx = cell.x - origin.x;
  const dy = cell.y - origin.y;
  const len = Math.hypot(dx, dy) || 1;
  // Perpendicular to the flight line, so the drift curves the path instead of
  // just making it longer or shorter.
  const wobble = rand(-1, 1) * Math.min(vw * 0.11, len * 0.35);
  // Under 1 it lags and arrives late; over 1 it overshoots the cell and swings
  // back into place.
  const reach = rand(0.86, 1.38);

  const startX = rand(-180, 180);
  const startY = rand(-180, 180);
  const startZ = rand(-180, 180);
  const turns = tumble();
  const endX = flatEnd(startX, turns.x);
  const endY = flatEnd(startY, turns.y);
  const endZ = startZ + turns.z * 360;
  const at = (from: number, to: number) => from + (to - from) * 0.72;

  return {
    ...base,
    wrapLeft: 0,
    orbit: null,
    track: {
      duration: BURST_DUR,
      delay: rand(0, BURST_DELAY_MAX),
      times: [0, 0.62, 1],
      x: [origin.x, origin.x + dx * reach + (-dy / len) * wobble, cell.x],
      y: [origin.y, origin.y + dy * reach + (dx / len) * wobble, cell.y],
      z: [-340, rand(60, 220), 0],
      scale: [0.06, rand(0.9, 1.2), 1],
      rotateX: [startX, at(startX, endX), endX],
      rotateY: [startY, at(startY, endY), endY],
      rotateZ: [startZ, at(startZ, endZ), endZ],
      moveEase: [OUT_EXPO, OUT_SOFT],
      // Constant spin on the way out, then a settle — the card stops tumbling
      // as it lands rather than easing out of the spin the whole way.
      spinEase: ["linear", OUT_EXPO],
    },
  };
}

// ── Variant 2: tornado ──────────────────────────────────────────────────────
// The vortex is built out of the DOM rather than out of keyframes. Each card
// sits inside a zero-size wrapper pinned to the viewport's vertical centre
// line; rotating that wrapper on Y sweeps the card around that line in a true
// circle, so one linear rotateY gives smooth orbital motion at any speed. The
// card's own translateX is the orbit radius, which is how the tornado tightens
// and then flings back open.
//
// The wrapper's final angle is always a whole number of turns, so by the time
// the cards land the wrapper is back at identity and a card's local position
// is its viewport position — that's what lets a spinning tornado still land
// exactly on the coverage grid.
function tornadoCard(
  base: Pick<CardSpec, "face" | "rank" | "suit" | "fall">,
  cell: { x: number; y: number },
  index: number,
  env: {
    vw: number;
    vh: number;
    cx: number;
    width: number;
    mobile: boolean;
    spinDir: number;
  },
): CardSpec {
  const { vw, vh, cx, width, mobile, spinDir } = env;
  const fromLeft = index % 2 === 0;
  const side = fromLeft ? -1 : 1;

  // Spread the cards around the vortex. Holding the angle inside ±78° and
  // letting the radius carry the sign keeps every card on the side it entered
  // from — the full circle is still covered, because a negative radius is the
  // same as another 180° of angle.
  const theta0 = rand(-78, 78);
  const enterX = fromLeft
    ? -rand(0.08, 0.5) * vw - width
    : vw + rand(0.08, 0.5) * vw + width;

  const r0 = rand(0.3, 0.5) * vw; // radius as the vortex starts turning
  const rTight = rand(0.05, 0.16) * vw; // radius once it has wound up
  const yEnterTo = rand(-0.05, 1.05) * vh;
  const yVortex = vh * 0.5 + rand(-0.42, 0.42) * vh;

  // "Violent" is the brief: multiple full turns a second. Eased back a little
  // on phones, where the extra blur costs more than it buys.
  const turnsPerSec = mobile ? 2.2 : 3;
  const thetaB = theta0 + spinDir * turnsPerSec * TORNADO_B * 360;
  // Keep turning at least another half turn while decelerating, and finish on
  // a whole number of turns so the wrapper ends at identity.
  const thetaEnd =
    spinDir > 0
      ? 360 * Math.ceil((thetaB + 200) / 360)
      : 360 * Math.floor((thetaB - 200) / 360);

  const times = [0, TORNADO_A / TORNADO_DUR, (TORNADO_A + TORNADO_B) / TORNADO_DUR, 1];
  const fan = rand(-45, 45); // each blade sits at its own angle to the sweep
  const rz = rand(-180, 180);

  return {
    ...base,
    wrapLeft: cx,
    orbit: {
      times,
      rotateY: [0, theta0, thetaB, thetaEnd],
      ease: [OUT_SOFT, "linear", OUT_EXPO],
    },
    track: {
      duration: TORNADO_DUR,
      delay: rand(0, TORNADO_DELAY_MAX),
      times,
      // Local x is the orbit radius; local y is viewport y, because the
      // wrapper is pinned to the top of the viewport.
      x: [enterX - cx, side * r0, side * rTight, cell.x - cx],
      y: [rand(-0.1, 1.1) * vh, yEnterTo, yVortex, cell.y],
      // Phase A pulls the cards back away from the viewer before the vortex
      // spins up; phase C throws them forward into the screen.
      z: [0, -rand(320, 620), -rand(140, 380), 0],
      scale: [rand(0.5, 0.75), rand(0.3, 0.42), rand(0.4, 0.55), 1],
      rotateX: [rand(-30, 30), rand(-40, 40), rand(-25, 25), 0],
      rotateY: [fan, fan, fan * 0.5, 0],
      rotateZ: [rz, rz + rand(-180, 180), rz + rand(-360, 360), rz + rand(-90, 90)],
      moveEase: [OUT_SOFT, [0.5, 0, 0.5, 1], OUT_EXPO],
      spinEase: [OUT_SOFT, "linear", OUT_EXPO],
    },
  };
}

// ── Rendering ───────────────────────────────────────────────────────────────
// The first painted frame has to match keyframe 0 exactly or a full-size card
// flashes at the origin before Motion takes over, so the opening transform is
// written inline in the same order Motion composes them (translate, scale,
// rotate).
function initialTransform(t: Track) {
  return (
    `translate3d(${t.x[0]}px, ${t.y[0]}px, ${t.z[0]}px) ` +
    `scale(${t.scale[0]}) ` +
    `rotateX(${t.rotateX[0]}deg) rotateY(${t.rotateY[0]}deg) rotateZ(${t.rotateZ[0]}deg)`
  );
}

function CardFace({ run, spec }: { run: Run; spec: CardSpec }) {
  const w = run.width;
  const radius = Math.max(6, w * 0.045);
  const shell: CSSProperties = {
    position: "absolute",
    inset: 0,
    borderRadius: radius,
    boxShadow: run.skin.shadow,
    overflow: "hidden",
  };

  if (spec.face === "back") {
    // Jonah's card back — the oxblood lattice from the "pick a card" section,
    // in curtain red with a gold frame.
    return (
      <div
        style={{
          ...shell,
          background: `repeating-linear-gradient(45deg, ${CURTAIN_DEEP} 0 ${w * 0.07}px, ${CURTAIN} ${w * 0.07}px ${w * 0.14}px)`,
          border: `${Math.max(1, w * 0.012)}px solid ${BG}`,
        }}
      >
        <span
          style={{
            position: "absolute",
            inset: w * 0.06,
            borderRadius: radius * 0.6,
            border: `1px solid rgba(201,169,97,0.42)`,
          }}
        />
        <span
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: ACCENT,
            fontSize: w * 0.3,
            opacity: 0.65,
          }}
        >
          ✦
        </span>
      </div>
    );
  }

  // In "trick" mode both inks are the same value, so the faces come out
  // monochrome — black-on-white or white-on-black, per the system scheme.
  const ink = RED_SUITS.has(spec.suit) ? run.skin.redInk : run.skin.blackInk;
  const index: CSSProperties = {
    position: "absolute",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    lineHeight: 1,
    fontSize: w * 0.13,
    fontWeight: 700,
    color: ink,
  };

  return (
    <div
      style={{
        ...shell,
        background: run.skin.faceBg,
        border: `1px solid ${run.skin.faceBorder}`,
      }}
    >
      <span style={{ ...index, top: w * 0.07, left: w * 0.07 }}>
        {spec.rank}
        <span style={{ fontSize: w * 0.11 }}>{spec.suit}</span>
      </span>
      <span
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: ink,
          fontSize: w * 0.42,
          lineHeight: 1,
        }}
      >
        {spec.suit}
      </span>
      <span
        style={{
          ...index,
          bottom: w * 0.07,
          right: w * 0.07,
          transform: "rotate(180deg)",
        }}
      >
        {spec.rank}
        <span style={{ fontSize: w * 0.11 }}>{spec.suit}</span>
      </span>
    </div>
  );
}

/**
 * Mount once, near the root of the page. Renders nothing until a reveal is
 * running.
 */
export function CardRevealOverlay() {
  const [run, setRun] = useState<Run | null>(null);
  const wraps = useRef<Array<HTMLDivElement | null>>([]);
  const cards = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    start = setRun;
    return () => {
      start = null;
      busy = false;
    };
  }, []);

  useEffect(() => {
    if (!run) return;

    const running: AnimationPlaybackControls[] = [];
    const timers: number[] = [];
    const play = (
      el: Element | null,
      keyframes: Parameters<typeof animate>[1],
      options: Parameters<typeof animate>[2],
    ) => {
      if (el) running.push(animate(el, keyframes, options));
    };

    // ── Cover ──────────────────────────────────────────────────────────────
    run.cards.forEach((spec, i) => {
      const t = spec.track;
      if (spec.orbit) {
        play(
          wraps.current[i],
          { rotateY: spec.orbit.rotateY },
          {
            duration: t.duration,
            delay: t.delay,
            times: spec.orbit.times,
            ease: spec.orbit.ease,
          },
        );
      }
      // Position and spin run as two animations so each can carry its own
      // easing — the throw decelerates while the tumble stays linear until it
      // settles.
      play(
        cards.current[i],
        { x: t.x, y: t.y, z: t.z, scale: t.scale },
        { duration: t.duration, delay: t.delay, times: t.times, ease: t.moveEase },
      );
      play(
        cards.current[i],
        { rotateX: t.rotateX, rotateY: t.rotateY, rotateZ: t.rotateZ },
        { duration: t.duration, delay: t.delay, times: t.times, ease: t.spinEase },
      );
    });

    const after = (seconds: number, fn: () => void) => {
      timers.push(window.setTimeout(fn, seconds * 1000));
    };

    // ── Screen covered: whatever this reveal was hiding happens now ─────────
    after(run.cover, () => run.onCovered?.(false));

    // ── Dissipate ──────────────────────────────────────────────────────────
    // By now every wrapper is back at identity, so a card's local coordinates
    // are its viewport coordinates in both variants and the cards can simply
    // fall straight down out of the frame.
    after(run.cover + HOLD, () => {
      run.cards.forEach((spec, i) => {
        const el = cards.current[i];
        if (!el) return;
        const t = spec.track;
        const last = t.times.length - 1;
        running.push(
          animate(
            el,
            {
              x: [t.x[last], spec.fall.x - spec.wrapLeft],
              y: [t.y[last], spec.fall.y],
              rotateZ: [t.rotateZ[last], t.rotateZ[last] + spec.fall.rotateZ],
              opacity: [1, 1, 0],
            },
            {
              duration: FALL_DUR,
              delay: spec.fall.delay,
              ease: IN_FALL,
              times: [0, 0.55, 1],
            },
          ),
        );
      });
    });

    // ── Done ───────────────────────────────────────────────────────────────
    after(run.cover + HOLD + FALL_MAX, () => {
      for (const el of [...wraps.current, ...cards.current]) {
        if (el) el.style.willChange = "auto";
      }
      run.onComplete?.(false);
      busy = false;
      wraps.current = [];
      cards.current = [];
      setRun(null);
    });

    return () => {
      for (const t of timers) window.clearTimeout(t);
      for (const c of running) c.stop();
    };
  }, [run]);

  if (!run) return null;

  return (
    <div
      aria-hidden
      className="fixed inset-0 overflow-hidden"
      style={{
        zIndex: 9999,
        pointerEvents: "none",
        perspective: `${PERSPECTIVE}px`,
        perspectiveOrigin: "50% 50%",
      }}
    >
      {run.cards.map((spec, i) => (
        <div
          key={`${run.id}-${i}`}
          ref={(el) => {
            wraps.current[i] = el;
          }}
          style={{
            position: "absolute",
            left: spec.wrapLeft,
            top: 0,
            width: 0,
            height: 0,
            transformStyle: "preserve-3d",
            transform: spec.orbit ? `rotateY(${spec.orbit.rotateY[0]}deg)` : undefined,
            willChange: "transform",
          }}
        >
          <div
            ref={(el) => {
              cards.current[i] = el;
            }}
            style={{
              position: "absolute",
              left: -run.width / 2,
              top: -run.height / 2,
              width: run.width,
              height: run.height,
              transform: initialTransform(spec.track),
              willChange: "transform, opacity",
            }}
          >
            <CardFace run={run} spec={spec} />
          </div>
        </div>
      ))}
    </div>
  );
}
