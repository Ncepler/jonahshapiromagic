"use client";

// A classic stage magician's wand — black cylindrical shaft, white caps on
// both ends. Flat fills only: no gradients, no stars, no glow, no stroke.
// Drawn horizontally in its own SVG space, then rotated -35° via CSS so it
// angles up-and-to-the-right. Sparks kick off the tip (the upper-right cap)
// in the direction OPPOSITE the wand's motion — a trail left behind, like a
// sparkler — then arc and fall under gravity as they cool and fade,
// rendered as short streaks, not dots. ALWAYS active inside the magician
// demo (this component wraps just that content, see app/page.tsx's
// MagicianDemo export).

import { motion, useMotionValue, type MotionValue } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";

const WAND_CAP = "#f5f5f0";
const WAND_SHAFT = "#0a0a0a";

// cap : shaft : cap = 5 : 18 : 5
const WAND_LEN = 28;
const WAND_THICK = 4;
const WAND_ANGLE_DEG = -35;

// The tip — the outer end of the right (upper, after rotation) cap — is
// what tracks the mouse and what sparks emit from, not the SVG's box. Its
// local position before rotation is (WAND_LEN, WAND_THICK / 2); rotate that
// offset around the SVG's own center to get where the tip actually lands
// once the wand is angled, then use it to pull the whole icon back so the
// tip (not the box) sits on the pointer.
function computeTipOffset() {
  const centerX = WAND_LEN / 2;
  const centerY = WAND_THICK / 2;
  const dx = WAND_LEN - centerX;
  const dy = WAND_THICK / 2 - centerY; // = 0
  const angleRad = (WAND_ANGLE_DEG * Math.PI) / 180;
  const rotatedDx = dx * Math.cos(angleRad) - dy * Math.sin(angleRad);
  const rotatedDy = dx * Math.sin(angleRad) + dy * Math.cos(angleRad);
  return { x: centerX + rotatedDx, y: centerY + rotatedDy };
}
const TIP_OFFSET = computeTipOffset();

function WandIcon() {
  return (
    <svg
      viewBox={`0 0 ${WAND_LEN} ${WAND_THICK}`}
      width={WAND_LEN}
      height={WAND_THICK}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {/* left white cap — rounded outer end, square inner end */}
      <path d="M 2,0 L 5,0 L 5,4 L 2,4 A 2,2 0 0 1 2,0 Z" fill={WAND_CAP} />
      {/* black shaft */}
      <rect x={5} y={0} width={18} height={4} fill={WAND_SHAFT} />
      {/* right white cap — rounded outer end, square inner end (the tip) */}
      <path d="M 23,0 L 26,0 A 2,2 0 0 1 26,4 L 23,4 Z" fill={WAND_CAP} />
    </svg>
  );
}

// Continuous spark trail off the wand tip — a capped canvas particle layer,
// same low-density approach as the page's ambient Embers (see app/page.tsx),
// but with real spark physics: each spark is kicked out opposite the wand's
// current direction of travel (idle sparks just drip straight down off the
// tip), then gravity takes over and pulls it into a falling arc while it
// cools from white-hot to ember and fades out. Drawn as a short streak along
// its own velocity, not a circle — reads as an actual spark, not a dot.
function CursorSparks({ x, y }: { x: MotionValue<number>; y: MotionValue<number> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = window.innerWidth;
    let h = window.innerHeight;
    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    type Spark = {
      x: number;
      y: number;
      px: number; // previous frame position, so we can draw a streak
      py: number;
      vx: number;
      vy: number;
      life: number;
      maxLife: number;
      r: number;
    };
    let sparks: Spark[] = [];
    const MAX_SPARKS = 160;
    const GRAVITY = 320; // px/s^2 — sparks arc over and fall as they age

    let lastX = x.get();
    let lastY = y.get();
    let spawnAccumulator = 0;
    let raf = 0;
    let last = performance.now();

    const tick = (t: number) => {
      const dt = Math.min((t - last) / 1000, 0.05);
      last = t;

      const curX = x.get();
      const curY = y.get();
      const dx = curX - lastX;
      const dy = curY - lastY;
      const moved = Math.min(Math.hypot(dx, dy), 140);
      lastX = curX;
      lastY = curY;

      // idle trickle + a lot more the faster the wand moves
      spawnAccumulator += dt * (7 + moved * 1.4);
      while (spawnAccumulator >= 1 && sparks.length < MAX_SPARKS) {
        spawnAccumulator -= 1;

        let baseAngle: number;
        let speed: number;
        if (moved > 1.5) {
          // kick out the opposite way from the direction of travel — a
          // trail left behind the tip, like a sparkler being swung
          baseAngle = Math.atan2(dy, dx) + Math.PI;
          speed = 50 + moved * 3 + Math.random() * 40;
        } else {
          // idle — sparks just drip straight down off the tip
          baseAngle = Math.PI / 2;
          speed = 6 + Math.random() * 16;
        }
        const angle = baseAngle + (Math.random() - 0.5) * (Math.PI / 2.2); // ~±40° spread

        sparks.push({
          x: curX,
          y: curY,
          px: curX,
          py: curY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0,
          maxLife: 0.5 + Math.random() * 0.5,
          r: 1.2 + Math.random() * 1.8,
        });
      }

      ctx.clearRect(0, 0, w, h);
      const next: Spark[] = [];
      for (const p of sparks) {
        p.life += dt;
        if (p.life >= p.maxLife) continue;

        p.px = p.x;
        p.py = p.y;
        p.vy += GRAVITY * dt; // gravity — sparks fall as they age
        p.vx *= 1 - Math.min(1, 1.1 * dt); // mild air drag
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        const t01 = p.life / p.maxLife;
        const alpha = t01 < 0.12 ? t01 / 0.12 : 1 - (t01 - 0.12) / 0.88;
        const a = Math.max(0, alpha);

        // cools from white-hot to ember as it falls
        const hot: [number, number, number] = [255, 241, 214];
        const cool: [number, number, number] = [210, 76, 30];
        const k = Math.min(1, t01 * 1.3);
        const cr = Math.round(hot[0] + (cool[0] - hot[0]) * k);
        const cg = Math.round(hot[1] + (cool[1] - hot[1]) * k);
        const cb = Math.round(hot[2] + (cool[2] - hot[2]) * k);

        ctx.save();
        ctx.shadowBlur = 5;
        ctx.shadowColor = `rgba(${cr},${cg},${cb},${a})`;
        ctx.strokeStyle = `rgba(${cr},${cg},${cb},${a})`;
        ctx.lineWidth = p.r;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(p.px, p.py);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        ctx.restore();

        next.push(p);
      }
      sparks = next;

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [x, y]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[998] h-full w-full"
    />
  );
}

export function MagicianCursor({ children }: { children: ReactNode }) {
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [x, y]);

  return (
    <div className="relative" style={{ cursor: "none" }}>
      <CursorSparks x={x} y={y} />
      <motion.div
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[999]"
        style={{ x, y }}
      >
        {/* pull the box back by the rotated tip offset, so the tip (not the
            box) lands on the pointer */}
        <div style={{ transform: `translate(${-TIP_OFFSET.x}px, ${-TIP_OFFSET.y}px)` }}>
          {/* rotate the wand itself around its own center */}
          <div
            style={{
              width: WAND_LEN,
              height: WAND_THICK,
              transform: `rotate(${WAND_ANGLE_DEG}deg)`,
              transformOrigin: "center",
            }}
          >
            <WandIcon />
          </div>
        </div>
      </motion.div>
      {children}
    </div>
  );
}
