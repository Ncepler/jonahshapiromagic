"use client";

// ── Spotlight sweep ─────────────────────────────────────────────────────────
// The house lights go out, a single spot swings in off the top of the room,
// finds the trick card, and hits it — and on that hit the cards fly.
//
// It wraps the existing "Reveal today's trick" click without changing anything
// downstream of it. The sequence is now:
//
//   spotlight sweep (this file) → card reveal (CardRevealOverlay.tsx, mode
//   "trick", untouched) → the random TikTok video (page.tsx, untouched)
//
// The handoff is `onLanded`, which fires at the top of the spot's pulse. The
// overlay does not unmount there: it fades out over the following ~220ms, which
// is the card reveal's first ~220ms, so the dark doesn't lift off the page —
// the cards take it over. That is why this sits at z-9998, directly under the
// card reveal's 9999.
//
// ── The punch-through ───────────────────────────────────────────────────────
// The dark is one element, three viewports wide and three tall, carrying a
// radial gradient that is transparent at its centre and ~95% black from the
// spot's rim outward. Because a gradient's last stop extends to fill the box,
// that one element is both "the screen is black" and "except here."
//
// Moving the hole is then just translating that element — pure transform,
// entirely on the compositor — instead of animating a mask position or a
// gradient's coordinates, which are paint properties and would re-rasterise the
// full viewport every frame. Being 3× oversized is what makes it safe: the
// hole's centre can go anywhere in the viewport (and the element can scale up
// for the pulse) with the edges still covering the screen. Scaling it scales
// the hole about its own centre, which is exactly the pulse.
//
// Above it sits the light itself — a warm radial glow, screen-blended, moving
// on the same wrapper so the two can never drift apart.
//
// Randomised per play: which corner it enters from, how far the arc bows, the
// spot's diameter, how hard it pulses, and how long the approach takes.

import { animate, type AnimationPlaybackControls } from "motion/react";
import { useEffect, useRef, useState } from "react";
import {
  LAYER,
  OUT_SOFT,
  clamp,
  createChannel,
  prefersReducedMotion,
  rand,
  secs,
  smoothstep,
} from "./transition-kit";

// ── Timing (ms) ─────────────────────────────────────────────────────────────
const DARK_MS = 120; // the house lights going out
const TRAVEL_MS = 860; // the swing in, ending on the target
const PULSE_MS = 200; // the hit
const FADE_MS = 220; // dissolving into the card reveal's opening frames
// The hit lands halfway through the pulse; that is the handoff, and the fade
// runs from there. ~1.2s from click to the cards taking over.
const HANDOFF_MS = TRAVEL_MS + PULSE_MS / 2;
const TOTAL_MS = HANDOFF_MS + FADE_MS;

// ── The spot ────────────────────────────────────────────────────────────────
const DIAMETER: [number, number] = [280, 340];
// A 320px spot is most of a phone's width, which stops reading as a spotlight
// and starts reading as a vignette. Narrow screens get a proportionally smaller
// one — same light, same falloff, just scaled to the room.
const MIN_SPOT_SCALE = 0.62;
const SPOT_SCALE_AT = 520; // px of viewport width at which the spot is full size

const PULSE: [number, number] = [1.1, 1.2];
const DARKNESS = 0.95; // the brief's ~95% black — the page stays faintly there
const SAMPLES = 24; // points sampled along the arc

type Point = { x: number; y: number };

export type SpotlightSweepOptions = {
  /** Viewport coordinates the spot lands on — normally a button's centre. */
  target: Point;
  /**
   * Fires on the hit, with the overlay still up and fading. This is where the
   * thing the spotlight was announcing should start.
   */
  onLanded?: (reducedMotion: boolean) => void;
  /** Fires once the overlay has faded and unmounted. */
  onComplete?: (reducedMotion: boolean) => void;
};

type SweepRun = {
  id: number;
  /** Half the viewport, in px — the wrapper's children are centred on it. */
  vw: number;
  vh: number;
  /** Sampled arc, in viewport coordinates. */
  path: Point[];
  radius: number;
  pulse: number;
  onLanded?: (reducedMotion: boolean) => void;
  onComplete?: (reducedMotion: boolean) => void;
};

const channel = createChannel<SweepRun>();
let nextId = 1;

// ── Building a run ──────────────────────────────────────────────────────────
function buildRun(opts: SpotlightSweepOptions): SweepRun {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // In off the top, from one corner or the other.
  const fromLeft = Math.random() < 0.5;
  const edge = rand(0.02, 0.16) * vw;
  const from: Point = {
    x: fromLeft ? edge : vw - edge,
    y: rand(-0.06, 0.03) * vh,
  };
  const to = {
    x: clamp(opts.target.x, 0, vw),
    y: clamp(opts.target.y, 0, vh),
  };

  // A quadratic bezier, bowed off the straight line between the two. The
  // control point is pushed along the perpendicular, and which side it goes is
  // chosen so the arc always bellies AWAY from the chord's midpoint rather than
  // cutting the corner — a spot swinging on a pivot, not sliding down a wire.
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const bow = rand(0.16, 0.44) * len * (fromLeft ? 1 : -1) * (Math.random() < 0.18 ? -1 : 1);
  const control: Point = {
    x: (from.x + to.x) / 2 + (dy / len) * bow,
    y: (from.y + to.y) / 2 - (dx / len) * bow * 0.55,
  };

  // Sampled at eased parameters and played back at a constant rate: the speed
  // profile lives in the spacing of the samples (slow away, quick across, slow
  // into the landing) rather than in an easing per segment, so the spot never
  // stutters where two keyframes meet.
  const path: Point[] = Array.from({ length: SAMPLES + 1 }, (_, i) => {
    const u = smoothstep(i / SAMPLES);
    const inv = 1 - u;
    return {
      x: inv * inv * from.x + 2 * inv * u * control.x + u * u * to.x,
      y: inv * inv * from.y + 2 * inv * u * control.y + u * u * to.y,
    };
  });

  const scale = clamp(vw / SPOT_SCALE_AT, MIN_SPOT_SCALE, 1);
  return {
    id: nextId++,
    vw,
    vh,
    path,
    radius: (rand(DIAMETER[0], DIAMETER[1]) / 2) * scale,
    pulse: rand(PULSE[0], PULSE[1]),
    onLanded: opts.onLanded,
    onComplete: opts.onComplete,
  };
}

/**
 * Play the spotlight, then hand off.
 *
 * Under reduced motion — or if the overlay isn't mounted, or a sweep is already
 * running — nothing is drawn and both callbacks fire immediately, so the button
 * still does exactly what it did before, just without the theatre.
 */
export function triggerSpotlightSweep(opts: SpotlightSweepOptions): void {
  if (channel.open(() => buildRun(opts))) return;
  const reduced = prefersReducedMotion();
  opts.onLanded?.(reduced);
  opts.onComplete?.(reduced);
}

// The dark, as a background: transparent through the spot, then up to DARKNESS
// by its rim and beyond. `radius` is the visible spot; the gradient runs a
// little past it so the rim is a falloff and not a cut edge.
function darkField(radius: number) {
  // The stops are tight on purpose. A long falloff turns the spot into a
  // vignette — the whole screen slightly lifted — instead of a pool of light
  // with a rim, which is the thing a followspot actually does.
  const r = radius * 1.18;
  return (
    `radial-gradient(circle ${r.toFixed(1)}px at 50% 50%, ` +
    `rgba(0,0,0,0) 0%, ` +
    `rgba(0,0,0,0) 58%, ` +
    `rgba(0,0,0,${DARKNESS * 0.35}) 74%, ` +
    `rgba(0,0,0,${DARKNESS * 0.8}) 89%, ` +
    `rgba(0,0,0,${DARKNESS}) 100%)`
  );
}

// The beam's own pool of light. Warm white, falling off to nothing well inside
// its box so it has no edge at all.
const GLOW =
  "radial-gradient(circle at 50% 50%, " +
  "rgba(255,246,228,0.5) 0%, " +
  "rgba(255,241,216,0.3) 26%, " +
  "rgba(255,236,204,0.1) 48%, " +
  "rgba(255,232,198,0) 66%)";
/** The glow's box, as a multiple of the spot's radius — sized so the light
 *  runs out just inside the rim of the hole rather than spilling past it. */
const GLOW_BOX = 2.6;

/**
 * Mount once, near the root of the page. Renders nothing until a sweep is
 * running.
 */
export function SpotlightSweepOverlay() {
  const [run, setRun] = useState<SweepRun | null>(null);
  const root = useRef<HTMLDivElement | null>(null);
  const rig = useRef<HTMLDivElement | null>(null);

  useEffect(() => channel.register(setRun), []);

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
    const after = (ms: number, fn: () => void) => {
      timers.push(window.setTimeout(fn, ms));
    };

    // ── The house lights ──────────────────────────────────────────────────
    play(
      root.current,
      { opacity: [0, 1] },
      { duration: secs(DARK_MS), ease: OUT_SOFT },
    );

    // ── The swing ─────────────────────────────────────────────────────────
    // One keyframe per sample, evenly spaced, linear between them. The curve
    // is in the samples; see buildRun.
    const times = run.path.map((_, i) => i / (run.path.length - 1));
    play(
      rig.current,
      { x: run.path.map((p) => p.x), y: run.path.map((p) => p.y) },
      { duration: secs(TRAVEL_MS), times, ease: "linear" },
    );

    // ── The hit ───────────────────────────────────────────────────────────
    // Scaling the rig scales the hole and the glow together about the spot's
    // own centre, so the light swells rather than sliding.
    play(
      rig.current,
      { scale: [1, run.pulse, 1] },
      { duration: secs(PULSE_MS), delay: secs(TRAVEL_MS), times: [0, 0.5, 1], ease: OUT_SOFT },
    );

    // ── The handoff ───────────────────────────────────────────────────────
    after(HANDOFF_MS, () => {
      run.onLanded?.(false);
      play(root.current, { opacity: [1, 0] }, { duration: secs(FADE_MS), ease: "linear" });
    });

    after(TOTAL_MS, () => {
      if (rig.current) rig.current.style.willChange = "auto";
      run.onComplete?.(false);
      channel.close();
      setRun(null);
    });

    return () => {
      for (const t of timers) window.clearTimeout(t);
      for (const c of running) c.stop();
    };
  }, [run]);

  if (!run) return null;

  const start = run.path[0];
  return (
    <div
      key={run.id}
      ref={root}
      aria-hidden
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: LAYER.spotlight, opacity: 0 }}
    >
      {/* A zero-size rig at the viewport's origin; translating it puts the spot
          at a viewport coordinate directly, with no offsets to keep in step.
          Its children hang around it. */}
      <div
        ref={rig}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 0,
          height: 0,
          transform: `translate3d(${start.x}px, ${start.y}px, 0)`,
          willChange: "transform",
        }}
      >
        {/* The dark, three viewports square and centred on the spot — see the
            header for why it is oversized. */}
        <div
          style={{
            position: "absolute",
            left: -run.vw * 1.5,
            top: -run.vh * 1.5,
            width: run.vw * 3,
            height: run.vh * 3,
            background: darkField(run.radius),
          }}
        />
        {/* the beam */}
        <div
          style={{
            position: "absolute",
            left: (-run.radius * GLOW_BOX) / 2,
            top: (-run.radius * GLOW_BOX) / 2,
            width: run.radius * GLOW_BOX,
            height: run.radius * GLOW_BOX,
            background: GLOW,
            mixBlendMode: "screen",
          }}
        />
      </div>
    </div>
  );
}
