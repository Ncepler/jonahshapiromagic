"use client";

// ── Torn-paper reveal ───────────────────────────────────────────────────────
// The booking form goes through. Rather than the form quietly swapping itself
// for a confirmation, it gets ripped in half and thrown off the screen, and the
// confirmation is what was underneath it all along.
//
// The tear runs top-right to bottom-left along a jagged line — a rip, not a
// cut — and the two halves shudder for a frame before they go, the way paper
// does at the moment it lets go.
//
// ── Why there is no html2canvas ─────────────────────────────────────────────
// The brief's first option was to snapshot the form to a bitmap. html2canvas
// isn't in the project and is ~200KB of JavaScript before gzip — for one
// animation on one form, on a page whose entire dependency list is Next, React,
// Motion, Supabase and date-fns, that is not a trade worth making. The brief's
// fallback is what this does: clone the form's own DOM twice and clip each copy
// with an SVG-style polygon. It costs nothing, it is pixel-identical to the
// form (it IS the form), and unlike a bitmap it stays sharp on a retina screen.
//
// The one thing a clone doesn't bring with it is what the visitor typed —
// `value` is a property, not an attribute, so cloneNode leaves every field
// empty. copyFieldState() below walks the two trees together and carries the
// values across, because a form that tears up blank is a form that looks like
// it lost the submission.
//
// ── The handoff ─────────────────────────────────────────────────────────────
// The clones have to be on screen in the same painted frame the real form
// leaves it, or the form blinks out and then reappears torn. So the overlay
// appends the clones and calls `onTorn` from a LAYOUT effect: React flushes the
// caller's resulting state change — the swap to the confirmation message —
// synchronously, before the browser paints either.
//
// Randomised per play: the tear's start and end points, the jitter along it
// (~24 points, never the same twice), which half turns further, which way the
// shudder goes first, and the angle each half leaves at.

import { animate, type AnimationPlaybackControls } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  IN_OUT_HEAVY,
  LAYER,
  OUT_SOFT,
  clamp,
  createChannel,
  isMobile,
  prefersReducedMotion,
  rand,
  randInt,
  secs,
  sign,
} from "./transition-kit";

// ── Timing (ms) ─────────────────────────────────────────────────────────────
const CRINKLE_MS = 60; // the shudder, before anything separates
const FLY_MS = 1300;
const TAIL_MS = 240; // a beat after the halves are gone, before unmounting
const MOVE_MS = CRINKLE_MS + FLY_MS;
const TOTAL_MS = MOVE_MS + TAIL_MS; // 1.6s
// The crinkle's share of the one continuous track the two phases share.
const CRINKLE_AT = CRINKLE_MS / MOVE_MS;

// ── The tear ────────────────────────────────────────────────────────────────
const POINTS_DESKTOP: [number, number] = [24, 30];
const POINTS_MOBILE: [number, number] = [18, 22];
const JITTER: [number, number] = [0.012, 0.03]; // of the form's width
const SPIKE_CHANCE = 0.12;
const SPIKE_MULT = 2.4;
// Each half keeps a sliver of the other's territory, so the two polygons
// overlap instead of meeting exactly and no hairline of page shows down the
// tear while they are still together.
const SEAM_BIAS = 0.004;

// ── The throw ───────────────────────────────────────────────────────────────
const ROTATE = 15; // deg, ± — left half one way, right half the other
const TURN_MORE: [number, number] = [1.15, 1.5]; // the half that keeps more of it
const TURN_LESS: [number, number] = [0.72, 1];
const ANGLE_JITTER = 5; // deg of variance on each half's exit direction
const CRINKLE_ROTATE: [number, number] = [0.5, 1.1]; // deg
const CRINKLE_SHIFT: [number, number] = [1, 2.4]; // px

export type TornPaperOptions = {
  /** The element to tear. Cloned synchronously, so it may be unmounted after. */
  node: HTMLElement | null;
  /**
   * Fires with the clones already on screen, covering the original exactly.
   * Swap the real content out here — nothing the visitor can see changes.
   */
  onTorn?: (reducedMotion: boolean) => void;
  /** Fires once both halves are gone and the overlay has unmounted. */
  onComplete?: (reducedMotion: boolean) => void;
};

type Half = {
  node: HTMLElement;
  clip: string;
  /** Where it ends up, well past the edge of the screen. */
  x: number;
  y: number;
  rotate: number;
  crinkleRotate: number;
  crinkleShift: number;
};

type TearRun = {
  id: number;
  rect: { left: number; top: number; width: number; height: number };
  halves: Half[];
  onTorn?: (reducedMotion: boolean) => void;
  onComplete?: (reducedMotion: boolean) => void;
};

const channel = createChannel<TearRun>();
let nextId = 1;

// useLayoutEffect warns when a component renders on the server. This one never
// does anything there — the overlay renders null until a tear is running — so
// fall back to useEffect for the render Next does on the server.
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

// ── Cloning ─────────────────────────────────────────────────────────────────
// What the visitor typed lives in properties, not attributes, so it has to be
// carried across by hand. Ids come off at the same time: two elements sharing
// an id would break every <label for> on the real page underneath.
function copyFieldState(from: HTMLElement, to: HTMLElement) {
  for (const el of Array.from(to.querySelectorAll("[id]"))) el.removeAttribute("id");

  const src = from.querySelectorAll("input, textarea, select");
  const dst = to.querySelectorAll("input, textarea, select");
  for (let i = 0; i < src.length && i < dst.length; i++) {
    const a = src[i];
    const b = dst[i];
    if (a instanceof HTMLInputElement && b instanceof HTMLInputElement) {
      b.checked = a.checked;
      b.value = a.value;
    } else if (a instanceof HTMLTextAreaElement && b instanceof HTMLTextAreaElement) {
      // Both, because the attribute is what a cloned textarea renders from.
      b.textContent = a.value;
      b.value = a.value;
    } else if (a instanceof HTMLSelectElement && b instanceof HTMLSelectElement) {
      b.selectedIndex = a.selectedIndex;
    }
    if (b instanceof HTMLElement) b.tabIndex = -1;
  }
}

function cloneFor(node: HTMLElement): HTMLElement {
  const clone = node.cloneNode(true) as HTMLElement;
  copyFieldState(node, clone);
  clone.setAttribute("aria-hidden", "true");
  return clone;
}

// ── The tear line ───────────────────────────────────────────────────────────
// A run of points from a spot on the top edge down to a spot on the bottom
// edge, each nudged sideways off the straight line, with the occasional bigger
// spike. Both halves are cut from the SAME points — that is what makes them
// two halves of one sheet rather than two shapes that nearly agree.
function tearLine(): Array<{ x: number; y: number }> {
  const startX = rand(0.56, 0.88);
  const endX = rand(0.12, 0.44);
  const count = randInt(...(isMobile() ? POINTS_MOBILE : POINTS_DESKTOP));
  const amp = rand(JITTER[0], JITTER[1]);

  return Array.from({ length: count + 1 }, (_, i) => {
    const t = i / count;
    const spike = Math.random() < SPIKE_CHANCE ? SPIKE_MULT : 1;
    // The two ends stay put; the jitter fades in and out between them, so the
    // rip starts and finishes at a definite point instead of fraying off the
    // edge of the form.
    const ends = Math.sin(t * Math.PI);
    return {
      x: startX + (endX - startX) * t + rand(-amp, amp) * spike * ends,
      y: clamp(t + (i === 0 || i === count ? 0 : rand(-0.012, 0.012)), 0, 1),
    };
  });
}

const pct = (p: { x: number; y: number }) =>
  `${(p.x * 100).toFixed(2)}% ${(p.y * 100).toFixed(2)}%`;

/** The left/lower half: the top-left corner, the tear, the bottom-left corner. */
function leftClip(line: Array<{ x: number; y: number }>) {
  const pts = line.map((p) => pct({ x: p.x + SEAM_BIAS, y: p.y }));
  return `polygon(0% 0%, ${pts.join(", ")}, 0% 100%)`;
}

/** The right/upper half: the same tear, wrapped the other way round. */
function rightClip(line: Array<{ x: number; y: number }>) {
  const pts = line
    .slice()
    .reverse()
    .map((p) => pct({ x: p.x - SEAM_BIAS, y: p.y }));
  return `polygon(${pts.join(", ")}, 100% 100%, 100% 0%)`;
}

// ── Building a run ──────────────────────────────────────────────────────────
function buildRun(node: HTMLElement, opts: TornPaperOptions): TearRun {
  const box = node.getBoundingClientRect();
  const rect = { left: box.left, top: box.top, width: box.width, height: box.height };
  const line = tearLine();

  // The distance either half has to cover to be gone, from wherever on the
  // page the form happens to be sitting.
  const reach =
    Math.hypot(window.innerWidth, window.innerHeight) + Math.hypot(rect.width, rect.height);
  // One half always turns further than the other — paper doesn't tear
  // symmetrically, and two halves rotating by the same angle reads as a
  // machine opening.
  const heavier = Math.random() < 0.5 ? 0 : 1;
  const first = sign(); // which way the shudder goes first

  const half = (index: 0 | 1): Half => {
    const left = index === 0;
    // Left half down and to the left, right half up and to the right, each
    // within a few degrees of that.
    const dir = ((left ? 200 : 20) + rand(-ANGLE_JITTER, ANGLE_JITTER)) * (Math.PI / 180);
    const turn =
      index === heavier ? rand(TURN_MORE[0], TURN_MORE[1]) : rand(TURN_LESS[0], TURN_LESS[1]);

    return {
      node: cloneFor(node),
      clip: left ? leftClip(line) : rightClip(line),
      x: Math.cos(dir) * reach * rand(0.62, 0.85),
      y: Math.sin(dir) * reach * rand(0.62, 0.85),
      rotate: (left ? -ROTATE : ROTATE) * turn,
      crinkleRotate: rand(CRINKLE_ROTATE[0], CRINKLE_ROTATE[1]) * first * (left ? 1 : -1),
      crinkleShift: rand(CRINKLE_SHIFT[0], CRINKLE_SHIFT[1]) * first * (left ? -1 : 1),
    };
  };

  return {
    id: nextId++,
    rect,
    halves: [half(0), half(1)],
    onTorn: opts.onTorn,
    onComplete: opts.onComplete,
  };
}

/**
 * Tear the given element in half and throw the pieces off the screen.
 *
 * Under reduced motion — or if the overlay isn't mounted, or there is nothing
 * to tear, or a tear is already running — nothing is drawn and both callbacks
 * fire immediately, so the form still swaps straight to its confirmation.
 */
export function triggerTornPaper(opts: TornPaperOptions): void {
  const node = opts.node;
  if (node && channel.open(() => buildRun(node, opts))) return;
  const reduced = prefersReducedMotion();
  opts.onTorn?.(reduced);
  opts.onComplete?.(reduced);
}

/**
 * Mount once, near the root of the page. Renders nothing until a tear is
 * running.
 */
export function TornPaperOverlay() {
  const [run, setRun] = useState<TearRun | null>(null);
  const slots = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => channel.register(setRun), []);

  // Clones in, original out, both in the same frame — see the header.
  useIsoLayoutEffect(() => {
    if (!run) return;
    run.halves.forEach((h, i) => slots.current[i]?.appendChild(h.node));
    run.onTorn?.(false);
  }, [run]);

  useEffect(() => {
    if (!run) return;

    const running: AnimationPlaybackControls[] = [];
    const play = (
      el: Element | null,
      keyframes: Parameters<typeof animate>[1],
      options: Parameters<typeof animate>[2],
    ) => {
      if (el) running.push(animate(el, keyframes, options));
    };

    // The crinkle and the throw are ONE track per property, not two animations
    // with the second delayed: a second animate() call on a value Motion is
    // already driving takes that value over immediately, which would cancel the
    // shudder the moment it was queued. Keyframed together, the shudder plays
    // out and the throw picks the half up from wherever it left it.
    const times = [0, CRINKLE_AT * 0.35, CRINKLE_AT * 0.7, CRINKLE_AT, 1];
    const ease = ["linear", "linear", "linear", IN_OUT_HEAVY] as const;

    run.halves.forEach((h, i) => {
      const el = slots.current[i];
      const s = h.crinkleShift;

      play(
        el,
        {
          x: [0, s, -s * 0.6, 0, h.x],
          y: [0, -s * 0.5, s * 0.4, 0, h.y],
          rotate: [0, h.crinkleRotate, -h.crinkleRotate * 0.5, 0, h.rotate],
        },
        { duration: secs(MOVE_MS), times, ease: [...ease] },
      );
      // Gone before it reaches the far edge, so nothing is still crawling off
      // screen once the confirmation has settled.
      play(
        el,
        { opacity: [1, 1, 0] },
        {
          duration: secs(MOVE_MS),
          times: [0, CRINKLE_AT + (1 - CRINKLE_AT) * 0.5, 1],
          ease: OUT_SOFT,
        },
      );
    });

    const done = window.setTimeout(() => {
      for (const el of slots.current) {
        if (el) el.style.willChange = "auto";
      }
      run.onComplete?.(false);
      channel.close();
      slots.current = [];
      setRun(null);
    }, TOTAL_MS);

    return () => {
      window.clearTimeout(done);
      for (const c of running) c.stop();
    };
  }, [run]);

  if (!run) return null;

  return (
    <div
      key={run.id}
      aria-hidden
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: LAYER.tornPaper }}
    >
      {run.halves.map((h, i) => (
        <div
          key={i}
          ref={(el) => {
            slots.current[i] = el;
          }}
          style={{
            position: "absolute",
            left: run.rect.left,
            top: run.rect.top,
            width: run.rect.width,
            height: run.rect.height,
            clipPath: h.clip,
            willChange: "transform, opacity",
          }}
        />
      ))}
    </div>
  );
}
