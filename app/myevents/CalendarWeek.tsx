"use client";

import { useState } from "react";
import {
  addWeeks,
  eachDayOfInterval,
  endOfWeek,
  format,
  isToday,
  parseISO,
  startOfWeek,
  subWeeks,
} from "date-fns";
import type { Booking, Earning } from "@/lib/db-types";
import { CalendarNav } from "./CalendarNav";
import { EarningsEditor } from "./EarningsEditor";
import { formatMoney, sumAmounts } from "./earnings";
import { ACCENT, BG, BG_ELEVATED, BORDER, TEXT, TEXT_MUTED } from "./theme";

export function CalendarWeek({
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
          const dayLabel = format(day, "MMMM d, yyyy");
          const dayBookings = bookings.filter((b) => b.event_date === key);
          const dayEarnings = earnings.filter((e) => e.event_date === key);
          const today = isToday(day);
          const earned = sumAmounts(dayEarnings);
          return (
            <div
              key={key}
              className="relative w-[140px] shrink-0 rounded-[4px] p-2 md:w-[160px]"
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

              {/* Same day editor as the month view, reached from the foot of the
                  column — so earnings can be filed from whichever view Jonah
                  happens to be in rather than only from Month. */}
              <button
                type="button"
                onClick={() => setOpenDay((prev) => (prev === key ? null : key))}
                aria-label={
                  dayEarnings.length
                    ? `${dayLabel} — earned ${formatMoney(earned)}`
                    : `Add earnings for ${dayLabel}`
                }
                aria-expanded={openDay === key}
                className="mt-2 w-full rounded-[4px] px-2 py-1.5 text-left text-[12px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{
                  background: BG,
                  border: `1px dashed ${dayEarnings.length ? ACCENT : BORDER}`,
                  color: dayEarnings.length ? TEXT : TEXT_MUTED,
                  outlineColor: ACCENT,
                }}
              >
                {dayEarnings.length ? formatMoney(earned) : "+ Earnings"}
              </button>

            </div>
          );
        })}
      </div>

      {/* The editor sits BELOW the strip rather than in a popover off the day,
          which is the month view's arrangement. It has to: the strip scrolls
          sideways, and a box whose overflow-x isn't `visible` gets overflow-y
          auto too, so a popover anchored inside a column would be clipped by
          the very container that lets the week scroll. */}
      {openDay && (
        <div
          className="mt-3 w-full max-w-[320px] rounded-[4px] p-3"
          style={{ background: BG_ELEVATED, border: `1px solid ${ACCENT}` }}
        >
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: TEXT_MUTED }}>
              {format(parseISO(openDay), "MMMM d, yyyy")}
            </p>
            <button
              type="button"
              onClick={() => setOpenDay(null)}
              aria-label="Close"
              className="text-[14px] leading-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ color: TEXT_MUTED, outlineColor: ACCENT }}
            >
              ✕
            </button>
          </div>
          <EarningsEditor
            dayLabel={format(parseISO(openDay), "MMMM d, yyyy")}
            earnings={earnings.filter((e) => e.event_date === openDay)}
            onAdd={(amount, note) => onAddEarning(openDay, amount, note)}
            onEdit={onEditEarning}
            onDelete={onDeleteEarning}
          />
        </div>
      )}
    </div>
  );
}
