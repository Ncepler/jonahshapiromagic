"use client";

import { useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import type { Booking } from "@/lib/db-types";
import { CalendarNav } from "./CalendarNav";
import { DayPopover } from "./DayPopover";
import { ACCENT, BG_ELEVATED, BORDER, TEXT, TEXT_MUTED } from "./theme";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_MARKS = 3; // ✦ repeated up to this many times before it'd just look noisy

export function CalendarMonth({
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
  const [openDay, setOpenDay] = useState<string | null>(null);

  const monthStart = startOfMonth(reference);
  const monthEnd = endOfMonth(reference);
  const days = eachDayOfInterval({ start: startOfWeek(monthStart), end: endOfWeek(monthEnd) });

  const byDay = new Map<string, Booking[]>();
  for (const b of bookings) {
    if (!b.event_date) continue;
    byDay.set(b.event_date, [...(byDay.get(b.event_date) ?? []), b]);
  }

  return (
    <div>
      <CalendarNav
        label={format(reference, "MMMM yyyy")}
        onPrev={() => setReference(subMonths(reference, 1))}
        onNext={() => setReference(addMonths(reference, 1))}
        onToday={() => setReference(new Date())}
      />

      <div className="mt-4 grid grid-cols-7 gap-1.5 md:gap-2">
        {WEEKDAY_LABELS.map((d) => (
          <div
            key={d}
            className="pb-1 text-center text-[10px] font-semibold uppercase tracking-[0.1em] md:text-[11px]"
            style={{ color: TEXT_MUTED }}
          >
            {d}
          </div>
        ))}
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayBookings = byDay.get(key) ?? [];
          const inMonth = isSameMonth(day, reference);
          const today = isToday(day);
          const hasBookings = dayBookings.length > 0;

          return (
            <div key={key} className="relative">
              <button
                type="button"
                onClick={() => hasBookings && setOpenDay((prev) => (prev === key ? null : key))}
                aria-label={hasBookings ? `${format(day, "MMMM d")} — ${dayBookings.length} booking(s)` : format(day, "MMMM d")}
                className="flex h-[52px] w-full flex-col items-start rounded-[4px] p-1.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 md:h-[80px] md:p-2"
                style={{
                  background: BG_ELEVATED,
                  border: `1px solid ${today ? ACCENT : BORDER}`,
                  opacity: inMonth ? 1 : 0.4,
                  cursor: hasBookings ? "pointer" : "default",
                  outlineColor: ACCENT,
                }}
              >
                <span className="text-[11px] md:text-[13px]" style={{ color: TEXT }}>
                  {format(day, "d")}
                </span>
                {hasBookings && (
                  <span className="mt-auto w-full text-center text-[13px] leading-none" style={{ color: ACCENT }}>
                    {"✦".repeat(Math.min(dayBookings.length, MAX_MARKS))}
                  </span>
                )}
              </button>
              {openDay === key && (
                <DayPopover
                  bookings={dayBookings}
                  onClose={() => setOpenDay(null)}
                  onFocusBooking={(id) => {
                    setOpenDay(null);
                    onFocusBooking(id);
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
