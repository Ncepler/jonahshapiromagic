"use client";

// ── Smoke transition ────────────────────────────────────────────────────────
// The beat between one section of the page and the next: dark smoke billows up
// off the bottom edge, spreads, thins the section behind it to a shape in fog,
// and dissipates off the top. Whatever the visitor scrolled into is what is
// there when it clears.
//
// It is FOG, not a cover. The card reveal's promise is that the screen is
// completely hidden at its midpoint; this one's promise is the opposite — the
// page stays dimly readable the whole way through, which is why the mass tops
// out around three quarters of the viewport and the whole canvas is capped
// below full opacity (see `cap`). Smoke you can't see through is just a black
// screen with extra steps.
//
// ── When it fires ───────────────────────────────────────────────────────────
// An IntersectionObserver watches the page's major sections (the ids are passed
// in from page.tsx, which owns the running order). A section that comes into
// view fires once and never again — `fired` is a Set that lives as long as the
// page load — so scrolling back up and down doesn't spam it. Three things are
// deliberately excluded:
//
//   · the hero, which isn't in the list at all;
//   · whichever section the visitor lands on, including a deep link into the
//     middle of the page: the observer's first callback marks everything
//     already on screen as fired without playing anything, so the first smoke
//     is always a section CHANGE and never an arrival;
//   · the opening curtain's window, because smoke behind velvet is smoke
//     nobody sees.
//
// It also yields to anything the visitor actually asked for — a card reveal in
// flight, a spotlight, a form tearing itself up. Those are answers to a click;
// this one is scenery, and scenery gives way.
//
// ── How the smoke is built ──────────────────────────────────────────────────
// A canvas particle system (the second of the two approaches in the brief, and
// the same technique the page's Embers layer already uses). 38–60 soft blobs on
// a desktop, 18–28 on a phone, each with its own birth, velocity, growth,
// sideways drift, rotation and opacity.
//
// Two details do most of the work:
//
//   · Blobs are drawn from PRE-RENDERED SPRITES, not from a gradient built per
//     blob per frame. Each sprite is 3–5 overlapping radial gradients masked
//     down to a soft circle — so the internal variation (denser here, wispy
//     there) is baked in and free, the edges are soft by construction, and the
//     per-frame cost is a drawImage rather than ~50 gradient allocations. The
//     sprites are drawn fresh per play, which is why no two runs have the same
//     texture, not just the same motion.
//   · The canvas backing store is rendered at roughly half resolution and
//     scaled up by the browser. On anything with edges that would be obvious;
//     on smoke it is invisible, and it cuts the fill cost by ~4×.
//
// Nothing here animates a layout property: the canvas holds still and only its
// opacity is animated (by Motion, on the compositor); everything else happens
// inside the bitmap.

import { animate, useReducedMotion, type AnimationPlaybackControls } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { isCardRevealPlaying } from "./CardRevealOverlay";
import {
  CURTAIN,
  CURTAIN_DEEP,
  LAYER,
  TEXT,
  OUT_SOFT,
  anyTransitionPlaying,
  clamp,
  createChannel,
  hexToRgb,
  hexToRgba,
  isMobile,
  rand,
  randInt,
  sign,
} from "./transition-kit";

// ── Timing (seconds) ────────────────────────────────────────────────────────
const DURATION = 1.4;
const BIRTH_WINDOW = 0.26; // fraction of the run over which blobs enter
const EXIT_AT = 0.56; // fraction of the run where the mass starts leaving

// ── Density ─────────────────────────────────────────────────────────────────
const COUNT_DESKTOP: [number, number] = [38, 60];
const COUNT_MOBILE: [number, number] = [18, 28];
// The ceiling on the whole layer's opacity. The single number that keeps this
// fog rather than a curtain — at peak the section behind is still legible
// through it.
const CAP: [number, number] = [0.72, 0.82];

// Resolution the bitmap is rendered at, before the browser scales it to fit.
const RES_DESKTOP = 0.6;
const RES_MOBILE = 0.45;

const SPRITE_PX = 128;
const SPRITE_VARIANTS = 4; // how many distinct BLACK blobs a run is built from

// ── Colour, and the problem with dark smoke on a near-black page ────────────
// The brief's smoke is near-black with an oxblood undertone at its base, and
// that is what this is. But the page it crosses is #0a0505 — so near-black
// smoke over the background is, by itself, invisible. What makes it read is
// what it OCCLUDES: parchment headlines, gold eyebrows, the embers. Two things
// follow from that, and they are why this doesn't look like a dimmer switch:
//
//   · the mass needs internal contrast, not an even wash — dense cores at
//     nearly full alpha with wispy edges, so an edge crosses a headline and you
//     can see where the smoke stops;
//   · a minority of blobs are LIT rather than black. Smoke on a stage catches
//     the light in front of it; a few warm-grey wisps at low alpha are what
//     give the mass volume instead of flatness. Very faint — this is the site's
//     own parchment at a few percent, not grey smoke.
const NEAR_BLACK = "#050303";
const LIT = TEXT; // parchment, used at a few percent — smoke catching the light

// Blobs come in two sizes. One population alone averages out into an even
// field however it is randomised; two gives the mass a texture.
const BILLOW_R: [number, number] = [0.07, 0.14]; // of the viewport's short side
const BILLOW_GROW: [number, number] = [1.3, 2.2];
const WISP_R: [number, number] = [0.03, 0.07];
const WISP_GROW: [number, number] = [1.6, 2.8];
const WISP_SHARE = 0.38;

// ── Gating ──────────────────────────────────────────────────────────────────
// The opening curtain runs ~2.8s from page load (HOLD_MS + MOVE_MS in
// CurtainReveal.tsx). Nothing fires under it.
const ARM_AFTER_MS = 3200;

// A section qualifies when it fills 30% of the viewport OR 30% of itself is on
// screen — the second rule alone would never fire for a section taller than
// ~3× the viewport, and the first alone would never fire for a short one.
const ENTER_RATIO = 0.3;
const ENTER_VIEWPORT = 0.3;
// The observer only calls back when a threshold is crossed, so the low entry
// exists purely to get a callback for tall sections whose ratio never reaches
// 0.3; the decision is made in the handler.
const THRESHOLDS = [0.12, ENTER_RATIO, 0.6];

// ── Shapes ──────────────────────────────────────────────────────────────────
type Blob = {
  sprite: number;
  /** s into the run before this blob exists. */
  birth: number;
  x0: number;
  y0: number;
  r0: number;
  /** How many times its own radius it swells over its life. */
  grow: number;
  /** px it rises. */
  rise: number;
  /** px it drifts sideways — the run's lean plus its own wander. */
  sway: number;
  wobble: number;
  spin0: number;
  spinRate: number;
  /** Vertical squash, so blobs are ellipses and their rotation is visible. */
  squash: number;
  alpha: number;
};

type SmokeRun = {
  id: number;
  sprites: HTMLCanvasElement[];
  blobs: Blob[];
  cap: number;
  /** The oxblood wash along the bottom edge, under the base of the column. */
  base: { x: number; w: number; alpha: number };
  onComplete?: () => void;
};

const channel = createChannel<SmokeRun>();
let nextId = 1;

// ── Sprites ─────────────────────────────────────────────────────────────────
// One soft, lumpy, dark blob on a transparent square. Built by piling a few
// off-centre radial gradients on top of each other — that overlap is the
// internal variation — and then masking the result with a single radial falloff
// so the edge is soft no matter where the lumps landed.
function makeSprite(tint: string, weight: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = SPRITE_PX;
  c.height = SPRITE_PX;
  const g = c.getContext("2d");
  if (!g) return c;

  const [r, gr, b] = hexToRgb(tint);
  const lumps = randInt(3, 5);
  for (let i = 0; i < lumps; i++) {
    const cx = SPRITE_PX * rand(0.34, 0.66);
    const cy = SPRITE_PX * rand(0.34, 0.66);
    const radius = SPRITE_PX * rand(0.22, 0.46);
    const a = rand(0.45, 0.85) * weight;
    const grad = g.createRadialGradient(cx, cy, 0, cx, cy, radius);
    grad.addColorStop(0, `rgba(${r},${gr},${b},${a})`);
    grad.addColorStop(0.55, `rgba(${r},${gr},${b},${a * 0.42})`);
    grad.addColorStop(1, `rgba(${r},${gr},${b},0)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, SPRITE_PX, SPRITE_PX);
  }

  const half = SPRITE_PX / 2;
  const mask = g.createRadialGradient(half, half, 0, half, half, half);
  mask.addColorStop(0, "rgba(0,0,0,1)");
  mask.addColorStop(0.46, "rgba(0,0,0,0.94)");
  mask.addColorStop(0.78, "rgba(0,0,0,0.34)");
  mask.addColorStop(1, "rgba(0,0,0,0)");
  g.globalCompositeOperation = "destination-in";
  g.fillStyle = mask;
  g.fillRect(0, 0, SPRITE_PX, SPRITE_PX);

  return c;
}

// ── Building a run ──────────────────────────────────────────────────────────
function buildRun(onComplete?: () => void): SmokeRun {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const mobile = isMobile();

  // Everything that can vary, varies. The column starts somewhere different
  // along the bottom edge, is a different width, is a different density, and
  // leans a different way as it climbs.
  const bandCenter = rand(0.2, 0.8) * vw;
  const bandWidth = rand(0.45, 0.95) * vw;
  const lean = sign() * rand(0.04, 0.17) * vw;
  const density = rand(0.78, 1.15);
  const [lo, hi] = mobile ? COUNT_MOBILE : COUNT_DESKTOP;
  const count = Math.round(randInt(lo, hi) * density);

  // Index 0 is the oxblood one, index 1 the lit one, the rest are black. Drawn
  // fresh every play, so a run differs from the last in its texture and not
  // only in where things move.
  const sprites = [
    makeSprite(CURTAIN, 0.6),
    makeSprite(LIT, 0.16),
    ...Array.from({ length: SPRITE_VARIANTS }, () => makeSprite(NEAR_BLACK, 1)),
  ];
  const blackFrom = 2;

  const span = Math.min(vw, vh);
  const blobs: Blob[] = Array.from({ length: count }, () => {
    // Concentrated toward the middle of the band, thinning toward its edges —
    // averaging two uniforms is enough of a bell for this, and it keeps the
    // column reading as one mass with ragged sides.
    const spread = (rand(-0.5, 0.5) + rand(-0.5, 0.5)) * bandWidth;
    // The oxblood sprite only ever spawns low and only for a few blobs — it is
    // the glow at the base, and it stays there.
    const red = Math.random() < 0.14;
    const lit = !red && Math.random() < 0.18;
    const wisp = Math.random() < WISP_SHARE;
    const [rLo, rHi] = wisp ? WISP_R : BILLOW_R;
    const [gLo, gHi] = wisp ? WISP_GROW : BILLOW_GROW;

    return {
      sprite: red ? 0 : lit ? 1 : randInt(blackFrom, sprites.length - 1),
      birth: rand(0, BIRTH_WINDOW) * DURATION,
      x0: bandCenter + spread,
      y0: vh + rand(0.02, 0.18) * vh,
      r0: span * rand(rLo, rHi),
      grow: rand(gLo, gHi),
      // Red blobs hang low; the rest carry the mass up and out of frame, the
      // small ones running ahead of the big ones.
      rise: red ? vh * rand(0.2, 0.45) : vh * rand(wisp ? 1 : 0.85, wisp ? 1.55 : 1.3),
      sway: lean * rand(0.55, 1.45),
      wobble: rand(-0.06, 0.06) * vw,
      spin0: rand(0, Math.PI * 2),
      spinRate: rand(-0.55, 0.55),
      squash: rand(0.58, 1),
      // The small ones are the dense ones — that contrast is the texture.
      alpha: rand(wisp ? 0.75 : 0.5, wisp ? 1 : 0.9) * (red ? 0.75 : 1),
    };
  });

  return {
    id: nextId++,
    sprites,
    blobs,
    cap: rand(CAP[0], CAP[1]),
    base: { x: bandCenter, w: bandWidth * rand(0.6, 1), alpha: rand(0.1, 0.2) },
    onComplete,
  };
}

/**
 * Play the smoke transition.
 *
 * Skipped silently under reduced motion, while another transition is playing,
 * or if the overlay isn't mounted — it is pure scenery, so there is no
 * underlying action to fall back to. Returns whether it actually played.
 */
export function triggerSmoke(opts: { onComplete?: () => void } = {}): boolean {
  if (isCardRevealPlaying() || anyTransitionPlaying()) return false;
  return channel.open(() => buildRun(opts.onComplete));
}

/**
 * Mount once, near the root of the page, with the ids of the sections whose
 * arrival should raise smoke — in page order, hero excluded. Renders nothing
 * until a section change fires it.
 */
export function SmokeTransition({ sections }: { sections: string[] }) {
  const [run, setRun] = useState<SmokeRun | null>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => channel.register(setRun), []);

  // ── The observer ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (reduced) return;

    const fired = new Set<string>();
    let primed = false;

    const observer = new IntersectionObserver(
      (entries) => {
        // First delivery: whatever is already on screen is where the visitor
        // landed, not somewhere they moved to. Record it and play nothing.
        if (!primed) {
          primed = true;
          for (const entry of entries) {
            if (entry.isIntersecting) fired.add(entry.target.id);
          }
          return;
        }
        if (performance.now() < ARM_AFTER_MS) return;

        for (const entry of entries) {
          const id = entry.target.id;
          if (fired.has(id) || !entry.isIntersecting) continue;
          const enough =
            entry.intersectionRatio >= ENTER_RATIO ||
            entry.intersectionRect.height >= window.innerHeight * ENTER_VIEWPORT;
          if (!enough) continue;

          // A section that couldn't play because something louder was on screen
          // keeps its turn — it hasn't had its smoke yet.
          if (triggerSmoke()) fired.add(id);
          // One per callback whatever happens: scrolling fast past three
          // section boundaries is one transition, not a queue of three.
          break;
        }
      },
      { threshold: THRESHOLDS },
    );

    for (const id of sections) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
    // `sections` is a module-level constant in page.tsx; joining it keeps this
    // from re-observing on every render if that ever stops being true.
  }, [reduced, sections.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── The run ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!run) return;
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) {
      channel.close();
      setRun(null);
      return;
    }

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const res =
      Math.min(window.devicePixelRatio || 1, 2) * (isMobile() ? RES_MOBILE : RES_DESKTOP);
    el.width = Math.max(1, Math.round(vw * res));
    el.height = Math.max(1, Math.round(vh * res));
    ctx.setTransform(res, 0, 0, res, 0, 0);

    // The layer's own fade, on the compositor. The blobs handle the shape of
    // the billow and the dissipation; this handles the envelope, and its peak
    // is the cap that keeps the page visible through the smoke.
    const envelope: AnimationPlaybackControls = animate(
      el,
      { opacity: [0, run.cap, run.cap, 0] },
      { duration: DURATION, times: [0, 0.16, 0.84, 1], ease: OUT_SOFT },
    );

    const started = performance.now();
    let raf = 0;

    const draw = (now: number) => {
      const t = (now - started) / 1000;
      ctx.clearRect(0, 0, vw, vh);

      // The whole mass lifting away at the end, on top of each blob's own rise.
      const exit = clamp((t / DURATION - EXIT_AT) / (1 - EXIT_AT), 0, 1);
      const lift = vh * 0.55 * exit * exit;
      const fade = 1 - exit * exit;

      // The oxblood wash at the base — something lit under the column. Goes
      // early, so the red never travels up the screen with the smoke.
      const baseFade = clamp(1 - t / (DURATION * 0.7), 0, 1);
      if (baseFade > 0) {
        const grad = ctx.createRadialGradient(
          run.base.x,
          vh,
          0,
          run.base.x,
          vh,
          run.base.w,
        );
        grad.addColorStop(0, hexToRgba(CURTAIN, run.base.alpha * baseFade));
        grad.addColorStop(0.55, hexToRgba(CURTAIN_DEEP, run.base.alpha * 0.5 * baseFade));
        grad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, vh - run.base.w, vw, run.base.w);
      }

      for (const b of run.blobs) {
        if (t < b.birth) continue;
        const u = clamp((t - b.birth) / (DURATION * 0.92 - b.birth), 0, 1);
        // Billows fast off the bottom edge, then slows as it spreads.
        const f = 1 - Math.pow(1 - u, 1.7);

        const x = b.x0 + b.sway * f + b.wobble * Math.sin(b.spin0 + t * 1.7);
        const y = b.y0 - b.rise * f - lift;
        const r = b.r0 * (1 + b.grow * f);
        const a = b.alpha * Math.min(1, u / 0.18) * fade;
        if (a <= 0.004 || y + r < 0) continue;

        ctx.save();
        ctx.globalAlpha = a;
        ctx.translate(x, y);
        ctx.rotate(b.spin0 + b.spinRate * t);
        ctx.scale(1, b.squash);
        ctx.drawImage(run.sprites[b.sprite], -r, -r, r * 2, r * 2);
        ctx.restore();
      }

      if (t < DURATION) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    const done = window.setTimeout(() => {
      el.style.willChange = "auto";
      run.onComplete?.();
      channel.close();
      setRun(null);
    }, DURATION * 1000);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(done);
      envelope.stop();
    };
  }, [run]);

  if (!run) return null;

  return (
    <canvas
      key={run.id}
      ref={canvas}
      aria-hidden
      className="pointer-events-none fixed inset-0 h-full w-full"
      style={{ zIndex: LAYER.smoke, opacity: 0, willChange: "opacity" }}
    />
  );
}
