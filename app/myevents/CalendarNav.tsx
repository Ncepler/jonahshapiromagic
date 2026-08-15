"use client";

// ← current-period-label → + Today — shared by CalendarMonth and CalendarWeek.

import { ACCENT, BORDER, buttonClass, TEXT, TEXT_MUTED } from "./theme";

export function CalendarNav({
  label,
  onPrev,
  onNext,
  onToday,
}: {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onPrev}
          aria-label="Previous"
          className="rounded px-2 py-1 text-[16px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ color: TEXT_MUTED, outlineColor: ACCENT }}
        >
          ←
        </button>
        <span className="min-w-[140px] text-center text-[15px] font-medium" style={{ color: TEXT }}>
          {label}
        </span>
        <button
          type="button"
          onClick={onNext}
          aria-label="Next"
          className="rounded px-2 py-1 text-[16px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ color: TEXT_MUTED, outlineColor: ACCENT }}
        >
          →
        </button>
      </div>
      <button
        type="button"
        onClick={onToday}
        className={buttonClass}
        style={{ background: "transparent", color: TEXT_MUTED, border: `1px solid ${BORDER}`, outlineColor: ACCENT }}
      >
        Today
      </button>
    </div>
  );
}
