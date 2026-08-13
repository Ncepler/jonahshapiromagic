"use client";

// A real magic-wand cursor — a shaft with a star-sparkle tip that tracks the
// pointer, throwing off small gold/ember sparks as it moves (plus a light
// idle trickle so the tip is never fully still). ALWAYS active inside the
// magician demo (this component wraps just that content, see app/page.tsx's
// MagicianDemo export).
// Spec: .claude/skills/local-service-design-system/SKILL.md §16.

import { motion, useMotionValue, type MotionValue } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";

const GOLD = "#D4A53C";
const EMBER = "#E0531F";

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
          <stop offset="0%" stopColor={GOLD} stopOpacity="0.5" />
          <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={TIP_X} cy={TIP_Y} r={12} fill="url(#wand-tip-glow)" />
      {/* shaft — dark outline + gold overlay */}
      <line x1={9} y1={38} x2={25} y2={17} stroke="#2E210E" strokeWidth={4.5} strokeLinecap="round" />
      <line x1={9} y1={38} x2={25} y2={17} stroke={GOLD} strokeWidth={2.2} strokeLinecap="round" />
      {/* grip beads */}
      <circle cx={13} cy={34} r={1.6} fill={EMBER} />
      <circle cx={17} cy={30} r={1.3} fill={GOLD} />
      {/* tip sparkle + a small companion twinkle */}
      <path d={BIG_SPARKLE} fill={GOLD} />
      <path d={SMALL_SPARKLE} fill={EMBER} opacity={0.9} />
    </svg>
  );
}

// Continuous spark trail off the wand tip — a capped canvas particle layer,
// same low-density approach as the page's ambient Embers (see app/page.tsx).
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
      vx: number;
      vy: number;
      life: number;
      maxLife: number;
      r: number;
      gold: boolean;
    };
    let sparks: Spark[] = [];
    const MAX_SPARKS = 140;

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
      const moved = Math.min(Math.hypot(curX - lastX, curY - lastY), 120);
      lastX = curX;
      lastY = curY;

      // idle trickle + a lot more the faster the wand moves
      spawnAccumulator += dt * (10 + moved * 1.6);
      while (spawnAccumulator >= 1 && sparks.length < MAX_SPARKS) {
        spawnAccumulator -= 1;
        const angle = Math.random() * Math.PI * 2;
        const speed = 20 + Math.random() * 60;
        sparks.push({
          x: curX,
          y: curY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 30, // gentle upward bias, like embers
          life: 0,
          maxLife: 0.5 + Math.random() * 0.5,
          r: 1.8 + Math.random() * 2.6,
          gold: Math.random() < 0.6,
        });
      }

      ctx.clearRect(0, 0, w, h);
      const next: Spark[] = [];
      for (const p of sparks) {
        p.life += dt;
        if (p.life >= p.maxLife) continue;
        p.vx *= 1 - Math.min(1, 2.2 * dt);
        p.vy -= 30 * dt; // keep drifting up
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        const t01 = p.life / p.maxLife;
        const alpha = t01 < 0.15 ? t01 / 0.15 : 1 - (t01 - 0.15) / 0.85;
        const a = Math.max(0, alpha);
        const color = p.gold ? "212,165,60" : "224,83,31";
        ctx.save();
        ctx.shadowBlur = 8;
        ctx.shadowColor = `rgba(${color},${a})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color},${a})`;
        ctx.fill();
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
