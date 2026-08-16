"use client";

// Calendar — Month/Week toggle, accepted bookings only (pending/declined
// never appear here). Both views share CalendarNav (←/→/Today); clicking a
// booking (via a day's popover in Month, or directly in Week) jumps to and
// highlights that card in the Bookings section below.

import { useMemo, useState } from "react";
import type { Booking, Earning } from "@/lib/db-types";
import { Section, SectionHeading } from "./Section";
import { CalendarMonth } from "./CalendarMonth";
import { CalendarWeek } from "./CalendarWeek";
import { ACCENT, BG, BORDER, TEXT_MUTED } from "./theme";

type View = "month" | "week";

export function CalendarSection({
  bookings,
  earnings,
  onFocusBooking,
  onAddEarning,
  onEditEarning,
  onDeleteEarning,
}: {
  bookings: Booking[];
  earnings: Earning[];
  onFocusBooking: (id: string) => void;
  onAddEarning: (date: string, amount: string, note: string) => void;
  onEditEarning: (id: string, amount: string, note: string) => void;
  onDeleteEarning: (id: string) => void;
}) {
  const [view, setView] = useState<View>("month");
  const [reference, setReference] = useState(() => new Date());

  const accepted = useMemo(
    () => bookings.filter((b) => b.status === "accepted" && b.event_date),
    [bookings],
  );

  return (
    <Section id="calendar">
      <SectionHeading
        eyebrow="Calendar"
        heading="The schedule."
        right={
          <div className="flex gap-1 rounded-[4px] p-1" style={{ border: `1px solid ${BORDER}` }}>
            {(["month", "week"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className="rounded-[3px] px-3 py-1.5 text-[12px] font-semibold uppercase tracking-[0.06em] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{
                  background: view === v ? ACCENT : "transparent",
                  color: view === v ? BG : TEXT_MUTED,
                  outlineColor: ACCENT,
                }}
              >
                {v === "month" ? "Month" : "Week"}
              </button>
            ))}
          </div>
        }
      />

      {/* Both views take the same day handlers: a day is where earnings get
          filed, and which view Jonah happens to be in shouldn't decide whether
          he can file one. */}
      {view === "month" ? (
        <CalendarMonth
          reference={reference}
          setReference={setReference}
          bookings={accepted}
          earnings={earnings}
          onFocusBooking={onFocusBooking}
          onAddEarning={onAddEarning}
          onEditEarning={onEditEarning}
          onDeleteEarning={onDeleteEarning}
        />
      ) : (
        <CalendarWeek
          reference={reference}
          setReference={setReference}
          bookings={accepted}
          earnings={earnings}
          onFocusBooking={onFocusBooking}
          onAddEarning={onAddEarning}
          onEditEarning={onEditEarning}
          onDeleteEarning={onDeleteEarning}
        />
      )}
    </Section>
  );
}
