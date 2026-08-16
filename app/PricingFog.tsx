"use client";

// ── Pricing fog ─────────────────────────────────────────────────────────────
// The prices arrive behind a bank of stage fog. One tap clears it, the fog
// rolls back out to the wings it came from, and the numbers come into focus.
// After that it stays cleared for the session — this is a beat on arrival, not
// a thing that keeps happening to you.
//
// It replaces a full-screen smoke transition that fired off scroll position at
// every major section. That one had the opposite problem to this one: nobody
// asked for it, it happened seven times a page, and the only thing to do about
// it was wait. This one is asked for (it is a closed door with a handle on it),
// happens once, and is over in about a second.
//
// ── What it is, physically ──────────────────────────────────────────────────
// Two fog machines in the wings, pointed inward across a floor. That is the
// whole reference, and it decides everything below:
//
//   · it comes in from BOTH SIDE EDGES, not up from the bottom. Fog off a
//     machine is heavier than air; it does not rise, it spreads.
//   · it is LOW and DENSE. Blobs spawn biased toward the floor of the box and
//     bank upward as they roll, rather than climbing as a column.
//   · the two streams MEET IN THE MIDDLE and pile up, so each blob decelerates
//     as it reaches (see REACH / the `1 - (1-u)²` ease) instead of crossing
//     the box and exiting the far side, which reads as two conveyor belts.
//   · it CHURNS. Every blob carries its own vertical wobble and rotation, and
//     the whole population recycles continuously at staggered phases, so there
//     is no loop point and no frame where the field is evenly grey.
//
// ── What actually hides the numbers ─────────────────────────────────────────
// Not the fog — the BLUR on the content underneath it. Near-black smoke over a
// near-black page is nearly invisible on its own; what makes it read is what it
// occludes (see the palette note below). So the two layers split the work: the
// blur makes the prices genuinely unreadable, and the fog is what you see doing
// it. Clearing runs both in the same beat.
//
// ── Reduced motion, and no JS ───────────────────────────────────────────────
// Both land on the same safe state: no fog, no blur, prices legible. The server
// renders it cleared and the fog only turns on in an effect, so a visitor with
// JS off or scripts blocked reads the prices normally rather than staring at a
// permanent blur with no way to lift it.

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  ACCENT,
  CURTAIN,
  TEXT,
  clamp,
  hexToRgb,
  hexToRgba,
  isMobile,
  prefersReducedMotion,
  rand,
  randInt,
} from "./transition-kit";

// ── Timing ──────────────────────────────────────────────────────────────────
const ROLL_IN_MS = 900; // the machines coming up to pressure on first sight
const CLEAR_MS = 1000; // fog out to the wings
const FOCUS_MS = 900; // blur off the prices; runs alongside CLEAR_MS

// ── Density ─────────────────────────────────────────────────────────────────
const COUNT_DESKTOP: [number, number] = [26, 34];
const COUNT_MOBILE: [number, number] = [13, 18];

// Resolution the bitmap is rendered at before the browser scales it up. Fog has
// no edges worth resolving, so this is nearly free quality to give away.
const RES_DESKTOP = 0.5;
const RES_MOBILE = 0.4;

const SPRITE_PX = 128;
const SPRITE_VARIANTS = 4; // how many distinct BLACK blobs a bank is built from

// px the fog layer overhangs the block it covers, top and bottom. Enough that
// no blob is ever cut off by the canvas edge, not so much that it reaches up
// into the paragraph above.
const BLEED_Y = 22;

// …and the alpha ramp that actually hides the two horizontal edges. See the
// note on the canvas element.
const EDGE_FADE = "linear-gradient(to bottom, transparent 0%, #000 11%, #000 88%, transparent 100%)";
// Where in the box the machines' own glow sits, as a fraction of its height.
// Above the bottom fade, or the one warm thing in the layer would be masked
// away exactly where it is supposed to be brightest.
const VENT_AT = 0.9;

// ── Colour, and the problem with dark smoke on a near-black page ────────────
// The site's smoke is near-black with an oxblood undertone at the vents, and
// that is what this is. But the page it sits on is #0a0505 — so near-black
// smoke over the background is, by itself, invisible. What makes it read is
// what it OCCLUDES: parchment card titles, gold ornaments, the prices. Two
// things follow, and they are why this doesn't look like a dimmer switch:
//
//   · the mass needs internal contrast, not an even wash — dense cores at
//     nearly full alpha with wispy edges, so an edge crosses a price and you
//     can see where the smoke stops;
//   · a minority of blobs are LIT rather than black. Smoke on a stage catches
//     the light in front of it; a few warm-grey wisps at low alpha are what
//     give the mass volume instead of flatness. Very faint — this is the
//     site's own parchment at a few percent, not grey smoke.
const NEAR_BLACK = "#050303";
const LIT = TEXT;

// Blobs come in two sizes, measured against the HEIGHT of the box rather than
// its width: the box is wide and shallow (three cards in a row), and sizing off
// the width would give blobs taller than the thing they are covering. One
// population alone averages out into an even field however it is randomised;
// two gives the mass a texture.
const BILLOW_R: [number, number] = [0.3, 0.55];
const BILLOW_GROW: [number, number] = [0.5, 1.1];
const WISP_R: [number, number] = [0.13, 0.25];
const WISP_GROW: [number, number] = [0.9, 1.7];
const WISP_SHARE = 0.4;

// How far in from its own edge a blob rolls, as a fraction of the box width.
// Past 0.5 is past the centreline, which is what makes the two streams mingle
// in the middle instead of each keeping to its own half. The small wisps outrun
// the big billows.
const REACH: [number, number] = [0.5, 0.85];
const REACH_WISP: [number, number] = [0.62, 1.0];
// Where a blob spawns vertically, as a fraction of the box height. Biased to
// the floor — the `Math.max` of two uniforms below pushes the distribution
// down — and then everything banks slightly upward as it rolls (DRIFT_Y).
const SPAWN_Y: [number, number] = [0.28, 1.06];
const DRIFT_Y: [number, number] = [-0.3, 0.06]; // negative = upward, in box heights
// Vertical turbulence, as a fraction of box height, and how fast it cycles.
const WOBBLE: [number, number] = [0.03, 0.09];
const WOBBLE_RATE: [number, number] = [0.35, 0.85];

// How long one blob takes to cross from its edge to the end of its reach.
// Wide, because a single speed for the whole field is the fastest way to make
// a particle system look like a screensaver.
const LIFE_S: [number, number] = [3.4, 7.2];

// The ceiling on the whole layer's opacity. Under 1 on purpose — the card
// shapes stay dimly visible through the bank, which is what says "there is
// something behind this" rather than "this section failed to load."
const CAP = 0.85;

// ── The bank ────────────────────────────────────────────────────────────────
type Blob = {
  sprite: number;
  /** +1 rolls in from the left edge, −1 from the right. */
  side: -1 | 1;
  /** 0–1 through its own life. Seeded spread out, so the field starts full. */
  u: number;
  /** How much of `u` one second buys. */
  rate: number;
  y0: number;
  r0: number;
  grow: number;
  reach: number;
  drift: number;
  wobble: number;
  wobbleRate: number;
  phase: number;
  spin0: number;
  spinRate: number;
  /** Vertical squash, so blobs are ellipses and their rotation is visible. */
  squash: number;
  alpha: number;
};

/** A blob's parameters, re-rolled every time it recycles. */
function seedBlob(blob: Blob, balance: number, blackFrom: number, spriteCount: number): Blob {
  const side: -1 | 1 = Math.random() < balance ? 1 : -1;
  // The oxblood sprite is the machine's own glow. It hugs its vent — short
  // reach, low — instead of riding the stream into the middle of the room.
  const red = Math.random() < 0.13;
  const lit = !red && Math.random() < 0.18;
  const wisp = Math.random() < WISP_SHARE;
  const [rLo, rHi] = wisp ? WISP_R : BILLOW_R;
  const [gLo, gHi] = wisp ? WISP_GROW : BILLOW_GROW;
  const [reachLo, reachHi] = wisp ? REACH_WISP : REACH;
  const low = Math.max(Math.random(), Math.random());

  blob.sprite = red ? 0 : lit ? 1 : randInt(blackFrom, spriteCount - 1);
  blob.side = side;
  blob.u = 0;
  blob.rate = 1 / rand(LIFE_S[0], LIFE_S[1]);
  blob.y0 = SPAWN_Y[0] + (SPAWN_Y[1] - SPAWN_Y[0]) * low;
  blob.r0 = rand(rLo, rHi);
  blob.grow = rand(gLo, gHi);
  blob.reach = red ? rand(0.06, 0.2) : rand(reachLo, reachHi);
  blob.drift = red ? rand(-0.04, 0.02) : rand(DRIFT_Y[0], DRIFT_Y[1]);
  blob.wobble = rand(WOBBLE[0], WOBBLE[1]);
  blob.wobbleRate = rand(WOBBLE_RATE[0], WOBBLE_RATE[1]);
  blob.phase = rand(0, Math.PI * 2);
  blob.spin0 = rand(0, Math.PI * 2);
  blob.spinRate = rand(-0.35, 0.35);
  blob.squash = rand(0.5, 0.85);
  // The small ones are the dense ones — that contrast is the texture.
  blob.alpha = rand(wisp ? 0.72 : 0.48, wisp ? 1 : 0.88) * (red ? 0.8 : 1);
  return blob;
}

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

/**
 * The canvas itself. Mounted only while there is fog to draw, and it stops its
 * own loop whenever the section is off screen — this is the one thing on the
 * page that would otherwise run a particle system forever, five screens below
 * where anybody is looking.
 *
 * `clearingAt` is null while the bank is holding and a timestamp once the
 * visitor has cleared it; from that moment every blob reverses out toward its
 * own edge and the whole layer fades.
 */
function FogCanvas({ clearingAt }: { clearingAt: number | null }) {
  const ref = useRef<HTMLCanvasElement>(null);
  // Read inside the loop rather than restarting it, so clearing doesn't rebuild
  // the bank at the moment it is supposed to be leaving.
  const clearRef = useRef(clearingAt);
  clearRef.current = clearingAt;

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const mobile = isMobile();
    const res = mobile ? RES_MOBILE : RES_DESKTOP;
    const dpr = Math.min(window.devicePixelRatio || 1, 2) * res;

    let w = 0;
    let h = 0;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = Math.max(1, rect.width);
      h = Math.max(1, rect.height);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Index 0 is the oxblood one, index 1 the lit one, the rest are black. Drawn
    // fresh on mount, so no two visits get the same texture.
    const sprites = [
      makeSprite(CURTAIN, 0.6),
      makeSprite(LIT, 0.22),
      ...Array.from({ length: SPRITE_VARIANTS }, () => makeSprite(NEAR_BLACK, 1)),
    ];
    const blackFrom = 2;

    // How the volume splits between the two wings leans a different way each
    // visit, so the left and right banks are never mirror images.
    const balance = rand(0.36, 0.64);
    const [lo, hi] = mobile ? COUNT_MOBILE : COUNT_DESKTOP;
    const count = randInt(lo, hi);
    const blobs: Blob[] = Array.from({ length: count }, () => {
      const b = seedBlob({} as Blob, balance, blackFrom, sprites.length);
      // Spread the starting phases across the whole life cycle, so the bank is
      // already full in its first frame instead of building up from an empty
      // box while the visitor watches.
      b.u = Math.random();
      return b;
    });

    let raf = 0;
    let last = performance.now();
    const born = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      // The machines coming up to pressure, and — once cleared — everything
      // draining back out to the wings.
      const rollIn = clamp((now - born) / ROLL_IN_MS, 0, 1);
      const clearing = clearRef.current;
      const out = clearing === null ? 0 : clamp((now - clearing) / CLEAR_MS, 0, 1);
      const layer = CAP * rollIn * (1 - out * out);

      ctx.clearRect(0, 0, w, h);

      // A warm oxblood glow low in each wing — the lit mouth of a machine. It
      // is the only warm thing here and it never leaves its corner, so the
      // colour reads as a source rather than as tinted smoke.
      if (layer > 0.01) {
        const vy = h * VENT_AT;
        for (const x of [0, w]) {
          const rad = w * 0.3;
          const grad = ctx.createRadialGradient(x, vy, 0, x, vy, rad);
          grad.addColorStop(0, hexToRgba(CURTAIN, 0.22 * layer));
          grad.addColorStop(0.6, hexToRgba(CURTAIN, 0.07 * layer));
          grad.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = grad;
          ctx.fillRect(x === 0 ? 0 : w - rad, vy - rad, rad, rad * 2);
        }
      }

      for (const b of blobs) {
        // Frozen once clearing starts: the bank stops churning and simply
        // leaves, which is what a room clearing actually looks like.
        if (clearing === null) {
          b.u += b.rate * dt;
          if (b.u >= 1) seedBlob(b, balance, blackFrom, sprites.length);
        }

        const r0 = h * b.r0;
        // Decelerating: fast off the vent, slowing as it reaches — so the mass
        // piles up where the two streams meet instead of sweeping past.
        const f = 1 - (1 - b.u) * (1 - b.u);
        // …and on the way out it accelerates instead, back the way it came.
        const escape = out * out * (w * 0.55 + r0);

        const x =
          b.side > 0
            ? -(r0 * 0.8) + b.reach * w * f - b.side * escape
            : w + r0 * 0.8 - b.reach * w * f - b.side * escape;
        const y =
          h * b.y0 +
          h * b.drift * f +
          h * b.wobble * Math.sin(b.phase + (now / 1000) * b.wobbleRate * Math.PI);
        const r = r0 * (1 + b.grow * f);

        // Fades up as it leaves the vent and back down at the end of its reach,
        // so blobs are never seen appearing or vanishing.
        const edge = Math.min(1, b.u / 0.14) * Math.min(1, (1 - b.u) / 0.3);
        const a = b.alpha * edge * layer;
        if (a <= 0.004 || x + r < 0 || x - r > w) continue;

        ctx.save();
        ctx.globalAlpha = a;
        ctx.translate(x, y);
        ctx.rotate(b.spin0 + (now / 1000) * b.spinRate);
        ctx.scale(1, b.squash);
        ctx.drawImage(sprites[b.sprite], -r, -r, r * 2, r * 2);
        ctx.restore();
      }

      raf = requestAnimationFrame(tick);
    };

    // Only run while the section is actually on screen. A fog bank five screens
    // below the fold is a rAF loop nobody can see.
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !raf) {
          last = performance.now();
          raf = requestAnimationFrame(tick);
        } else if (!entry.isIntersecting && raf) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      },
      { rootMargin: "200px 0px" },
    );
    io.observe(canvas);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
    };
  }, []);

  // Fills its parent, which is the full-bleed button below — see the note there
  // on why the fog is not clipped to the content column.
  //
  // The mask is what stops the top and bottom of the bank from being straight
  // lines. Fog is densest along the floor, so blobs pile up against the bottom
  // edge of the canvas and get sheared off by it; no amount of overhang fixes
  // that, because the pile just moves down with the edge. Fading the alpha out
  // over the last stretch instead means the bank dissolves into the dark rather
  // than stopping at a border. (The vent glows are anchored above the fade for
  // the same reason — see VENT_AT.)
  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ maskImage: EDGE_FADE, WebkitMaskImage: EDGE_FADE }}
    />
  );
}

/**
 * Wrap whatever should arrive behind the fog. Everything outside this — the
 * section's eyebrow, headline and intro — stays legible, so the visitor can
 * read what they are being asked to uncover.
 */
export function PricingFog({ children }: { children: ReactNode }) {
  // Server-rendered state is CLEARED, deliberately. See the header: no JS means
  // no way to lift a blur, so the safe default has to be the readable one.
  const [fogged, setFogged] = useState(false);
  const [clearingAt, setClearingAt] = useState<number | null>(null);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    setFogged(true);
  }, []);

  const clear = useCallback(() => {
    setClearingAt((prev) => prev ?? performance.now());
  }, []);

  // Drop the canvas once it has finished draining — a cleared section shouldn't
  // keep a transparent canvas and an observer alive for the rest of the visit.
  useEffect(() => {
    if (clearingAt === null) return;
    const t = window.setTimeout(() => setGone(true), CLEAR_MS + 80);
    return () => window.clearTimeout(t);
  }, [clearingAt]);

  const covered = fogged && !gone;
  const focused = !fogged || clearingAt !== null;

  const veil: CSSProperties = {
    // The blur is what genuinely hides the numbers; the fog above is what you
    // see doing it. Opacity comes down with it, but only so far — the card
    // shapes staying dimly visible is what reads as "behind" rather than "not
    // loaded yet".
    filter: focused ? "blur(0px)" : "blur(14px)",
    opacity: focused ? 1 : 0.7,
    transition: `filter ${FOCUS_MS}ms cubic-bezier(0.16,1,0.3,1), opacity ${FOCUS_MS}ms cubic-bezier(0.16,1,0.3,1)`,
    willChange: covered ? "filter, opacity" : undefined,
  };

  return (
    <div className="relative">
      <div style={veil}>{children}</div>

      {covered && (
        <button
          type="button"
          onClick={clear}
          disabled={clearingAt !== null}
          aria-label="Clear the smoke to see the prices"
          // Full-bleed, and taller than the block it covers, for two reasons.
          //
          // Visually: a fog layer clipped to the content column paints a
          // rectangle — fog with four straight sides and corners, which is the
          // one thing fog does not have. Running to the viewport edges also
          // means the two streams genuinely come in from off-screen rather than
          // materialising at a margin.
          //
          // And as a target: the instruction is "tap anywhere", so anywhere the
          // fog is visible has to be tappable, including the gutters. It is a
          // real button, so it is reachable by keyboard too — and the prices
          // underneath stay in the accessibility tree the whole time, blurred or
          // not, so nothing here hides content from a screen reader.
          className="absolute left-1/2 flex w-screen -translate-x-1/2 cursor-pointer flex-col items-center justify-center focus-visible:outline focus-visible:outline-2"
          style={{
            top: -BLEED_Y,
            height: `calc(100% + ${BLEED_Y * 2}px)`,
            outlineColor: ACCENT,
            // Inset, because at 100vw wide an outward offset draws the ring off
            // both sides of the screen.
            outlineOffset: -3,
          }}
        >
          <FogCanvas clearingAt={clearingAt} />
          <span
            className="relative flex flex-col items-center gap-2 px-6 text-center"
            style={{
              opacity: clearingAt === null ? 1 : 0,
              transition: "opacity 220ms ease-out",
            }}
          >
            <span aria-hidden style={{ color: ACCENT, fontSize: 22, opacity: 0.8 }}>
              ✦
            </span>
            <span
              className="text-[20px] uppercase leading-[1.1] tracking-[0.04em] md:text-[26px]"
              style={{ color: TEXT, fontFamily: "var(--font-display)" }}
            >
              Clear the smoke
            </span>
            <span className="text-[14px]" style={{ color: TEXT, opacity: 0.75 }}>
              Tap anywhere. The numbers are behind it.
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
