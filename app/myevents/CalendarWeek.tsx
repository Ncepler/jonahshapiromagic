"use client";

import { addWeeks, eachDayOfInterval, endOfWeek, format, isToday, startOfWeek, subWeeks } from "date-fns";
import type { Booking } from "@/lib/db-types";
import { CalendarNav } from "./CalendarNav";
import { ACCENT, BG, BG_ELEVATED, BORDER, TEXT, TEXT_MUTED } from "./theme";

export function CalendarWeek({
  reference,
  setReference,
  bookings,
  onFocusBooking,
}: {
  reference: Date;
  setReference: (d: Date) => void;
  bookings: Booking[]; // accepted, with an event_date — already filtered by CalendarSection
  onFocusBooking: (id: string) => void;
}) {
  const weekStart = startOfWeek(reference);
  const weekEnd = endOfWeek(reference);
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  return (
    <div>
      <CalendarNav
        label={`${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d, yyyy")}`}
        onPrev={() => setReference(subWeeks(reference, 1))}
        onNext={() => setReference(addWeeks(reference, 1))}
        onToday={() => setReference(new Date())}
      />

      <div className="myevents-scrollbar mt-4 flex gap-2 overflow-x-auto pb-2">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayBookings = bookings.filter((b) => b.event_date === key);
          const today = isToday(day);
          return (
            <div
              key={key}
              className="w-[140px] shrink-0 rounded-[4px] p-2 md:w-[160px]"
              style={{ background: BG_ELEVATED, border: `1px solid ${today ? ACCENT : BORDER}`, minHeight: 220 }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: TEXT_MUTED }}>
                {format(day, "EEE")}
              </p>
              <p className="text-[13px]" style={{ color: TEXT }}>
                {format(day, "MMM d")}
              </p>
              <div className="mt-2 space-y-2">
                {dayBookings.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => onFocusBooking(b.id)}
                    className="block w-full rounded-[4px] p-2 text-left text-[12px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                    style={{ background: BG, border: `1px solid ${ACCENT}`, color: TEXT, outlineColor: ACCENT }}
                  >
                    <span className="block font-medium leading-[1.3]">{b.name}</span>
                    <span className="block" style={{ color: TEXT_MUTED }}>
                      {b.event_type ?? "—"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
