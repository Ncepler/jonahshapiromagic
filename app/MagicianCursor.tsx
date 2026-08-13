"use client";

// A real magic-wand cursor — black-and-white shaft with a star-sparkle tip
// that tracks the pointer. Sparks kick off the tip in the direction OPPOSITE
// the wand's motion (a trail left behind, like a sparkler), then arc and
// fall under gravity as they cool and fade. Rendered as short streaks, not
// dots — actual sparks, not a glowing blob. ALWAYS active inside the
// magician demo (this component wraps just that content, see app/page.tsx's
// MagicianDemo export).

import { motion, useMotionValue, type MotionValue } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";

const BLACK = "#000000";
const WHITE = "#FFFFFF";

const WAND_SIZE = 44;
// Where the sparkle sits inside the icon's own box. The icon is translated
// by -TIP_X/-TIP_Y so this exact point lands on the real pointer position —
// sparks are spawned at (pointerX, pointerY) directly, no extra offset math.
const TIP_X = 32;
const TIP_Y = 10;

function sparklePath(cx: number, cy: number, outerR: number, innerR: number) {
  const pts: string[] = [];
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI / 4) * i - Math.PI / 2; // start at top, clockwise
    const r = i % 2 === 0 ? outerR : innerR;
    pts.push(`${(cx + r * Math.cos(angle)).toFixed(2)},${(cy + r * Math.sin(angle)).toFixed(2)}`);
  }
  return `M${pts.join(" L")} Z`;
}

const BIG_SPARKLE = sparklePath(TIP_X, TIP_Y, 7, 2.4);
const SMALL_SPARKLE = sparklePath(39, 19, 3, 1);

function WandIcon() {
  return (
    <svg width={WAND_SIZE} height={WAND_SIZE} viewBox={`0 0 ${WAND_SIZE} ${WAND_SIZE}`} aria-hidden>
      <defs>
        <radialGradient id="wand-tip-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={WHITE} stopOpacity="0.45" />
          <stop offset="100%" stopColor={WHITE} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={TIP_X} cy={TIP_Y} r={12} fill="url(#wand-tip-glow)" />
      {/* shaft — black outline + white core, no color */}
      <line x1={9} y1={38} x2={25} y2={17} stroke={BLACK} strokeWidth={4.5} strokeLinecap="round" />
      <line x1={9} y1={38} x2={25} y2={17} stroke={WHITE} strokeWidth={2.2} strokeLinecap="round" />
      {/* grip beads */}
      <circle cx={13} cy={34} r={1.6} fill={BLACK} stroke={WHITE} strokeWidth={0.8} />
      <circle cx={17} cy={30} r={1.3} fill={WHITE} stroke={BLACK} strokeWidth={0.8} />
      {/* tip sparkle + a small companion twinkle */}
      <path d={BIG_SPARKLE} fill={WHITE} stroke={BLACK} strokeWidth={1} strokeLinejoin="round" />
      <path d={SMALL_SPARKLE} fill={WHITE} stroke={BLACK} strokeWidth={0.75} strokeLinejoin="round" opacity={0.9} />
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
        <div style={{ transform: `translate(-${TIP_X}px, -${TIP_Y}px)` }}>
          <WandIcon />
        </div>
      </motion.div>
      {children}
    </div>
  );
}
