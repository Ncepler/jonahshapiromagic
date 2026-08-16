"use client";

// Everything about one day on the calendar, in one popover: the accepted
// bookings on it (each with a "See full details →" link that jumps to and
// briefly highlights the matching card in the Bookings section below), and
// what was earned on it.
//
// It opens on ANY day now, not only days with a booking. That is the change the
// earnings tracking needed — plenty of paid work never came through the form,
// so an empty day still has to be somewhere Jonah can file a number.

import type { Booking, Earning } from "@/lib/db-types";
import { EarningsEditor } from "./EarningsEditor";
import { ACCENT, BG_ELEVATED, BORDER, TEXT, TEXT_MUTED } from "./theme";

/** Which edge of the day cell the popover hangs from. The month grid is seven
 *  columns wide inside a fixed wrap, so a 240px panel centred on the Sunday or
 *  Saturday column runs off the page — and with `overflow-x: hidden` on the
 *  document (globals.css) it would be genuinely unreachable, not merely ugly.
 *  Columns near an edge align to it instead. */
export type PopoverAlign = "start" | "center" | "end";

const ALIGN_CLASS: Record<PopoverAlign, string> = {
  start: "left-0",
  center: "left-1/2 -translate-x-1/2",
  end: "right-0",
};

export function DayPopover({
  dayLabel,
  bookings,
  earnings,
  align = "center",
  onClose,
  onFocusBooking,
  onAddEarning,
  onEditEarning,
  onDeleteEarning,
}: {
  dayLabel: string;
  bookings: Booking[];
  earnings: Earning[];
  align?: PopoverAlign;
  onClose: () => void;
  onFocusBooking: (id: string) => void;
  onAddEarning: (amount: string, note: string) => void;
  onEditEarning: (id: string, amount: string, note: string) => void;
  onDeleteEarning: (id: string) => void;
}) {
  return (
    <>
      {/* Click-outside-to-close backdrop — sits below the popover itself but
          above everything else in the grid. */}
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div
        // The popover carries interactive fields now, so a click inside it must
        // not reach the day button underneath and toggle it shut mid-edit.
        onClick={(e) => e.stopPropagation()}
        className={`absolute top-full z-20 mt-2 w-60 rounded-[4px] p-3 text-left shadow-lg ${ALIGN_CLASS[align]}`}
        style={{ background: BG_ELEVATED, border: `1px solid ${ACCENT}` }}
      >
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: TEXT_MUTED }}>
            {dayLabel}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-[14px] leading-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ color: TEXT_MUTED, outlineColor: ACCENT }}
          >
            ✕
          </button>
        </div>

        {bookings.map((b) => (
          <div key={b.id} className="mb-3">
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

        <div style={bookings.length > 0 ? { borderTop: `1px solid ${BORDER}`, paddingTop: 10 } : undefined}>
          <EarningsEditor
            dayLabel={dayLabel}
            earnings={earnings}
            onAdd={onAddEarning}
            onEdit={onEditEarning}
            onDelete={onDeleteEarning}
          />
        </div>
      </div>
    </>
  );
}
