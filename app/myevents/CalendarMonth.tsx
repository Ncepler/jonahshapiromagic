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
import type { Booking, Earning } from "@/lib/db-types";
import { CalendarNav } from "./CalendarNav";
import { DayPopover } from "./DayPopover";
import { formatMoneyCompact, sumAmounts } from "./earnings";
import { ACCENT, BG_ELEVATED, BORDER, TEXT, TEXT_MUTED } from "./theme";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_MARKS = 3; // ✦ repeated up to this many times before it'd just look noisy

export function CalendarMonth({
  reference,
  setReference,
  bookings,
  earnings,
  onFocusBooking,
  onAddEarning,
  onEditEarning,
  onDeleteEarning,
}: {
  reference: Date;
  setReference: (d: Date) => void;
  bookings: Booking[]; // accepted, with an event_date — already filtered by CalendarSection
  earnings: Earning[];
  onFocusBooking: (id: string) => void;
  onAddEarning: (date: string, amount: string, note: string) => void;
  onEditEarning: (id: string, amount: string, note: string) => void;
  onDeleteEarning: (id: string) => void;
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

  const earnedByDay = new Map<string, Earning[]>();
  for (const e of earnings) {
    earnedByDay.set(e.event_date, [...(earnedByDay.get(e.event_date) ?? []), e]);
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
        {days.map((day, i) => {
          // Column 0–6 within the week row, so the popover can hang off the
          // nearer edge instead of running off the page — see PopoverAlign.
          const col = i % 7;
          const align = col <= 1 ? "start" : col >= 5 ? "end" : "center";
          const key = format(day, "yyyy-MM-dd");
          const dayLabel = format(day, "MMMM d, yyyy");
          const dayBookings = byDay.get(key) ?? [];
          const dayEarnings = earnedByDay.get(key) ?? [];
          const inMonth = isSameMonth(day, reference);
          const today = isToday(day);
          const hasBookings = dayBookings.length > 0;
          const earned = sumAmounts(dayEarnings);

          return (
            <div key={key} className="relative">
              <button
                type="button"
                // Every day opens now, booking or not — an empty day is where an
                // earnings entry gets filed.
                onClick={() => setOpenDay((prev) => (prev === key ? null : key))}
                aria-label={
                  [
                    dayLabel,
                    hasBookings ? `${dayBookings.length} booking(s)` : null,
                    dayEarnings.length ? `earned ${formatMoneyCompact(earned)}` : null,
                  ]
                    .filter(Boolean)
                    .join(" — ")
                }
                aria-expanded={openDay === key}
                className="flex h-[52px] w-full flex-col items-start rounded-[4px] p-1.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 md:h-[80px] md:p-2"
                style={{
                  background: BG_ELEVATED,
                  border: `1px solid ${today ? ACCENT : BORDER}`,
                  opacity: inMonth ? 1 : 0.4,
                  outlineColor: ACCENT,
                }}
              >
                <span className="text-[11px] md:text-[13px]" style={{ color: TEXT }}>
                  {format(day, "d")}
                </span>
                {/* The two markers share the bottom of the cell: bookings on the
                    left as ✦, the day's takings on the right as a number. On a
                    52px phone cell there is only room for one line, so they sit
                    on the same row rather than stacking. */}
                {(hasBookings || dayEarnings.length > 0) && (
                  <span className="mt-auto flex w-full items-end justify-between gap-1 leading-none">
                    <span className="text-[13px]" style={{ color: ACCENT }}>
                      {hasBookings ? "✦".repeat(Math.min(dayBookings.length, MAX_MARKS)) : ""}
                    </span>
                    {dayEarnings.length > 0 && (
                      <span className="text-[10px] font-semibold md:text-[11px]" style={{ color: TEXT }}>
                        {formatMoneyCompact(earned)}
                      </span>
                    )}
                  </span>
                )}
              </button>
              {openDay === key && (
                <DayPopover
                  dayLabel={dayLabel}
                  bookings={dayBookings}
                  earnings={dayEarnings}
                  align={align}
                  onClose={() => setOpenDay(null)}
                  onFocusBooking={(id) => {
                    setOpenDay(null);
                    onFocusBooking(id);
                  }}
                  onAddEarning={(amount, note) => onAddEarning(key, amount, note)}
                  onEditEarning={onEditEarning}
                  onDeleteEarning={onDeleteEarning}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
