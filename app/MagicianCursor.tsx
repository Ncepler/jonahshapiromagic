"use client";

// A small gold "wand tip" glow that replaces the system cursor — but ONLY
// inside the magician demo (this component wraps just that content, see
// app/page.tsx's MagicianDemo export). Off on touch devices and
// reduced-motion, where the normal system cursor is left alone.
// Spec: .claude/skills/local-service-design-system/SKILL.md §16.

import { motion, useMotionValue, useReducedMotion } from "motion/react";
import { useEffect, type ReactNode } from "react";
import { useCanHover } from "@/lib/hooks";

const GOLD = "#D4A53C";

export function MagicianCursor({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const canHover = useCanHover();
  const active = canHover && !reduced;

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);

  useEffect(() => {
    if (!active) return;
    const onMove = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [active, x, y]);

  return (
    <div className="relative" style={{ cursor: active ? "none" : "auto" }}>
      {active && (
        <motion.div
          aria-hidden
          className="pointer-events-none fixed left-0 top-0 z-[999] h-6 w-6 rounded-full"
          style={{
            x,
            y,
            translateX: "-50%",
            translateY: "-50%",
            background: `radial-gradient(circle, ${GOLD}e6, ${GOLD}00 70%)`,
            mixBlendMode: "screen",
          }}
        />
      )}
      {children}
    </div>
  );
}
