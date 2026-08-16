"use client";

// Bookings — Pending/Accepted/Archived tabs over the same list, newest
// first. Archived is presentation-only for the `declined` status, so the
// "Move to Pending" link on it is a real undo, not a re-submission.

import { useMemo } from "react";
import type { Booking, BookingStatus } from "@/lib/db-types";
import type { BookingsTab } from "./types";
import { Section, SectionHeading } from "./Section";
import { BookingCard } from "./BookingCard";
import { ACCENT, BORDER, TEXT, TEXT_MUTED } from "./theme";

const TABS: Array<{ key: BookingsTab; label: string }> = [
  { key: "pending", label: "Pending" },
  { key: "accepted", label: "Accepted" },
  { key: "archived", label: "Archived" },
];

function statusForTab(tab: BookingsTab): BookingStatus {
  if (tab === "accepted") return "accepted";
  if (tab === "archived") return "declined";
  return "pending";
}

export function BookingsSection({
  bookings,
  tab,
  onTabChange,
  expandedBookingId,
  onToggleExpand,
  highlightedBookingId,
  armedTemplateId,
  onCopyArmedTemplate,
  onAccept,
  onDecline,
  onArchive,
  onUnarchive,
  onDelete,
}: {
  bookings: Booking[];
  tab: BookingsTab;
  onTabChange: (tab: BookingsTab) => void;
  expandedBookingId: string | null;
  onToggleExpand: (id: string) => void;
  highlightedBookingId: string | null;
  armedTemplateId: string | null;
  onCopyArmedTemplate: (name: string) => void;
  onAccept: (id: string, eventDate?: string) => void;
  onDecline: (id: string) => void;
  onArchive: (id: string) => void;
  onUnarchive: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const pendingCount = useMemo(() => bookings.filter((b) => b.status === "pending").length, [bookings]);
  const visible = useMemo(() => bookings.filter((b) => b.status === statusForTab(tab)), [bookings, tab]);

  return (
    <Section id="bookings">
      <SectionHeading eyebrow="Bookings" heading="Every request." />

      <div className="mb-6 flex gap-6" style={{ borderBottom: `1px solid ${BORDER}` }}>
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => onTabChange(t.key)}
              className="relative flex items-center gap-1.5 pb-3 text-[14px] font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ color: active ? TEXT : TEXT_MUTED, outlineColor: ACCENT }}
            >
              {t.label}
              {t.key === "pending" && pendingCount > 0 && (
                <span
                  className="rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none"
                  style={{ background: ACCENT, color: "#0a0505" }}
                >
                  {pendingCount}
                </span>
              )}
              {active && <span className="absolute inset-x-0 -bottom-px h-[2px]" style={{ background: ACCENT }} />}
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <p className="text-[14px]" style={{ color: TEXT_MUTED }}>
          Nothing here yet.
        </p>
      ) : (
        <div className="space-y-3">
          {visible.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              tab={tab}
              expanded={expandedBookingId === b.id}
              highlighted={highlightedBookingId === b.id}
              armed={Boolean(armedTemplateId)}
              onToggleExpand={() => onToggleExpand(b.id)}
              onCopyArmedTemplate={() => onCopyArmedTemplate(b.name)}
              onAccept={(eventDate) => onAccept(b.id, eventDate)}
              onDecline={() => onDecline(b.id)}
              onArchive={() => onArchive(b.id)}
              onUnarchive={() => onUnarchive(b.id)}
              onDelete={() => onDelete(b.id)}
            />
          ))}
        </div>
      )}
    </Section>
  );
}
