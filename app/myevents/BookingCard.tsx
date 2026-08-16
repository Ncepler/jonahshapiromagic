"use client";

// A single booking, collapsed by default. Clicking the card either copies
// the armed template (if one is armed — see TemplatesSection) or expands
// inline details, but never both. Every button/link inside stops
// propagation so it doesn't also trigger the card's own click.

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Booking } from "@/lib/db-types";
import type { BookingsTab } from "./types";
import { ACCENT, BG, BG_ELEVATED, BORDER, buttonClass, fieldStyle, TEXT, TEXT_MUTED } from "./theme";
import { formatEventDate, formatSubmittedOn } from "./format";

export function BookingCard({
  booking,
  tab,
  expanded,
  highlighted,
  armed,
  onToggleExpand,
  onCopyArmedTemplate,
  onAccept,
  onDecline,
  onArchive,
  onUnarchive,
  onDelete,
}: {
  booking: Booking;
  tab: BookingsTab;
  expanded: boolean;
  highlighted: boolean;
  armed: boolean;
  onToggleExpand: () => void;
  onCopyArmedTemplate: () => void;
  onAccept: (eventDate?: string) => void;
  onDecline: () => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onDelete: () => void;
}) {
  const [datePromptOpen, setDatePromptOpen] = useState(false);
  const [chosenDate, setChosenDate] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const handleCardClick = () => {
    if (armed) {
      onCopyArmedTemplate();
      return;
    }
    onToggleExpand();
  };

  return (
    <div
      id={`booking-${booking.id}`}
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleCardClick();
        }
      }}
      className="cursor-pointer rounded-[4px] p-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{
        background: BG_ELEVATED,
        border: `1px solid ${highlighted ? ACCENT : BORDER}`,
        boxShadow: highlighted ? `0 0 0 3px rgba(201, 169, 97, 0.2)` : undefined,
        transition: "border-color 400ms ease-out, box-shadow 400ms ease-out",
        outlineColor: ACCENT,
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-[160px]">
          <p className="text-[15px] font-medium" style={{ color: TEXT }}>
            {booking.name}
          </p>
          <p className="text-[13px]" style={{ color: TEXT_MUTED }}>
            {booking.event_type ?? "—"}
          </p>
        </div>
        <div className="min-w-[140px]">
          <p className="text-[14px]" style={{ color: booking.event_date ? TEXT : TEXT_MUTED }}>
            {formatEventDate(booking.event_date)}
          </p>
          <p className="text-[13px]" style={{ color: TEXT_MUTED }}>
            {booking.location ?? "—"}
          </p>
        </div>

        {/* The card itself is a button (click to expand), so every action in
            here has to stop both events, not just the click: the click is
            already handled, but a keydown bubbling to the card's own Enter/Space
            handler means activating Delete from the keyboard would also toggle
            the card open underneath the confirm. */}
        <div
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          className="flex items-center gap-3"
        >
          {tab === "pending" &&
            !datePromptOpen &&
            (
              <>
                <button
                  type="button"
                  onClick={() => (booking.event_date ? onAccept() : setDatePromptOpen(true))}
                  className={buttonClass}
                  style={{ background: BG, color: TEXT, border: `1px solid ${ACCENT}`, outlineColor: ACCENT }}
                >
                  Accept
                </button>
                <button
                  type="button"
                  onClick={onDecline}
                  className={buttonClass}
                  style={{ background: BG, color: TEXT_MUTED, border: `1px solid ${TEXT_MUTED}`, outlineColor: ACCENT }}
                >
                  Decline
                </button>
              </>
            )}
          {tab === "accepted" && (
            <>
              <span className="text-[12px] font-semibold uppercase tracking-[0.06em]" style={{ color: ACCENT }}>
                Accepted
              </span>
              <button
                type="button"
                onClick={onArchive}
                className="text-[13px] underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ color: TEXT_MUTED, outlineColor: ACCENT }}
              >
                Move to Archived
              </button>
            </>
          )}
          {tab === "archived" && (
            <>
              <span className="text-[12px] font-semibold uppercase tracking-[0.06em]" style={{ color: TEXT_MUTED }}>
                Declined
              </span>
              <button
                type="button"
                onClick={onUnarchive}
                className="text-[13px] underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ color: TEXT_MUTED, outlineColor: ACCENT }}
              >
                Move to Pending
              </button>
            </>
          )}

          {/* Delete is available on every tab but kept visually subordinate —
              a muted text link, with an inline confirm before it fires, since
              it's the one action here that can't be undone. Hidden while the
              accept date-prompt is open so the two don't crowd each other. */}
          {!datePromptOpen &&
            (confirmingDelete ? (
              <span className="flex items-center gap-2 text-[13px]" style={{ color: TEXT_MUTED }}>
                Delete?
                <button
                  type="button"
                  onClick={() => {
                    setConfirmingDelete(false);
                    onDelete();
                  }}
                  className="font-semibold underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{ color: TEXT, outlineColor: ACCENT }}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  className="underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{ color: TEXT_MUTED, outlineColor: ACCENT }}
                >
                  No
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="text-[13px] underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ color: TEXT_MUTED, outlineColor: ACCENT }}
              >
                Delete
              </button>
            ))}
        </div>
      </div>

      {datePromptOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="mt-4 rounded-[4px] p-3"
          style={{ background: BG, border: `1px solid ${BORDER}` }}
        >
          <p className="text-[13px] leading-[1.4]" style={{ color: TEXT }}>
            This booking has no date set. Add one before accepting?
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <input
              type="date"
              value={chosenDate}
              onChange={(e) => setChosenDate(e.target.value)}
              className="px-3 py-2 text-[14px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ ...fieldStyle, outlineColor: ACCENT }}
            />
            <button
              type="button"
              disabled={!chosenDate}
              onClick={() => {
                onAccept(chosenDate);
                setDatePromptOpen(false);
              }}
              className={buttonClass}
              style={{ background: BG_ELEVATED, color: TEXT, border: `1px solid ${ACCENT}`, outlineColor: ACCENT }}
            >
              Confirm &amp; accept
            </button>
            <button
              type="button"
              onClick={() => setDatePromptOpen(false)}
              className="text-[13px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ color: TEXT_MUTED, outlineColor: ACCENT }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="mt-5 grid grid-cols-1 gap-x-6 gap-y-3 border-t pt-5 sm:grid-cols-2"
              style={{ borderColor: BORDER }}
            >
              <Field label="Name" value={booking.name} />
              <Field label="Email" value={booking.email} href={`mailto:${booking.email}`} />
              <Field label="Event Type" value={booking.event_type ?? "—"} />
              <Field label="Event Date" value={formatEventDate(booking.event_date)} />
              <Field label="Location" value={booking.location ?? "—"} />
              <Field label="Headcount" value={booking.headcount != null ? String(booking.headcount) : "—"} />
              <Field label="Anything else?" value={booking.notes ?? "—"} full />
              <Field label="Wants Branded Decks" value={booking.wants_branded_decks ? "Yes" : "No"} />
              <Field label="Submitted On" value={formatSubmittedOn(booking.created_at)} />
            </div>
            <div className="mt-3 text-right">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpand();
                }}
                className="text-[13px] underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ color: TEXT_MUTED, outlineColor: ACCENT }}
              >
                Collapse
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Field({ label, value, href, full }: { label: string; value: string; href?: string; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : undefined}>
      <p className="text-[12px] uppercase tracking-[0.06em]" style={{ color: TEXT_MUTED }}>
        {label}
      </p>
      {href ? (
        <a
          href={href}
          className="text-[14px] underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ color: TEXT, outlineColor: ACCENT }}
        >
          {value}
        </a>
      ) : (
        <p className="text-[14px] leading-[1.5]" style={{ color: TEXT }}>
          {value}
        </p>
      )}
    </div>
  );
}
