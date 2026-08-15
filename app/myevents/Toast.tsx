"use client";

// Shared toast used by both "template copied" (Group 4) and "snippet
// copied" (Group 5) events — bottom-center, gold-bordered, ✓ icon, slides
// up on show and fades out after TOAST_DURATION_MS (DashboardClient owns
// the timer; this component just renders + animates whatever's in state).

import { AnimatePresence, motion } from "motion/react";
import { ACCENT, BG_ELEVATED, TEXT } from "./theme";

export type ToastItem = { id: number; message: string };

export const TOAST_DURATION_MS = 2500;

export function ToastStack({ toasts }: { toasts: ToastItem[] }) {
  return (
    <div
      aria-live="polite"
      role="status"
      className="pointer-events-none fixed inset-x-0 bottom-6 z-[1000] flex flex-col items-center gap-2 px-4"
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-2 rounded-[4px] px-4 py-2.5 text-[14px] shadow-lg"
            style={{ background: BG_ELEVATED, border: `1px solid ${ACCENT}`, color: TEXT }}
          >
            <span aria-hidden style={{ color: ACCENT }}>
              ✓
            </span>
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
