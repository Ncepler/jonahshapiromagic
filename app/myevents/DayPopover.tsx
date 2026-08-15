"use client";

// Small popover for a month-view day cell — lists every accepted booking
// that day, each with a "See full details →" link that jumps to (and
// briefly highlights) the matching card in the Bookings section below.

import type { Booking } from "@/lib/db-types";
import { ACCENT, BG_ELEVATED, TEXT, TEXT_MUTED } from "./theme";

export function DayPopover({
  bookings,
  onClose,
  onFocusBooking,
}: {
  bookings: Booking[];
  onClose: () => void;
  onFocusBooking: (id: string) => void;
}) {
  return (
    <>
      {/* Click-outside-to-close backdrop — sits below the popover itself but
          above everything else in the grid. */}
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div
        className="absolute left-1/2 top-full z-20 mt-2 w-56 -translate-x-1/2 rounded-[4px] p-3 text-left shadow-lg"
        style={{ background: BG_ELEVATED, border: `1px solid ${ACCENT}` }}
      >
        {bookings.map((b) => (
          <div key={b.id} className="mb-3 last:mb-0">
            <p className="text-[13px] font-medium leading-[1.3]" style={{ color: TEXT }}>
              {b.name}
            </p>
            <p className="text-[12px]" style={{ color: TEXT_MUTED }}>
              {b.event_type ?? "—"}
            </p>
            <button
              type="button"
              onClick={() => onFocusBooking(b.id)}
              className="mt-1 text-[12px] underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ color: ACCENT, outlineColor: ACCENT }}
            >
              See full details →
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
