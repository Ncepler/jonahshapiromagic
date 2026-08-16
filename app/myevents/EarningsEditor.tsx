"use client";

// The earnings half of a calendar day's popover: what was made that day, and
// the form to add to it. Every entry can be edited in place or removed; a day
// can hold several, because one row is one payment rather than one day's
// takings.
//
// The amount field is plain text rather than type="number" on purpose — see
// parseAmount() in lib/money.ts, which is what makes sense of whatever gets
// typed. The only thing checked here is that the field isn't empty; everything
// else is the route's call, and comes back as a toast.

import { useState } from "react";
import type { Earning } from "@/lib/db-types";
import { formatMoney } from "./earnings";
import { ACCENT, BG, BORDER, fieldStyle, TEXT, TEXT_MUTED } from "./theme";

const inputClass =
  "w-full rounded-[4px] px-2 py-1.5 text-[13px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

const linkClass =
  "text-[12px] underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

function EntryRow({
  earning,
  onEdit,
  onDelete,
}: {
  earning: Earning;
  onEdit: (amount: string, note: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(String(earning.amount));
  const [note, setNote] = useState(earning.note ?? "");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (editing) {
    return (
      <div className="mb-2 space-y-1.5 last:mb-0">
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          aria-label="Amount"
          className={inputClass}
          style={{ ...fieldStyle, outlineColor: ACCENT }}
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          aria-label="Note"
          placeholder="Note (optional)"
          className={inputClass}
          style={{ ...fieldStyle, outlineColor: ACCENT }}
        />
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              onEdit(amount, note);
            }}
            className={linkClass}
            style={{ color: ACCENT, outlineColor: ACCENT }}
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => {
              // Back to whatever is actually stored, not to whatever was typed.
              setAmount(String(earning.amount));
              setNote(earning.note ?? "");
              setEditing(false);
            }}
            className={linkClass}
            style={{ color: TEXT_MUTED, outlineColor: ACCENT }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-2 flex items-start justify-between gap-2 last:mb-0">
      <div className="min-w-0">
        <p className="text-[13px] font-medium leading-[1.3]" style={{ color: TEXT }}>
          {formatMoney(earning.amount)}
        </p>
        {earning.note && (
          <p className="break-words text-[12px] leading-[1.35]" style={{ color: TEXT_MUTED }}>
            {earning.note}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {confirmingDelete ? (
          <>
            <button
              type="button"
              onClick={() => {
                setConfirmingDelete(false);
                onDelete();
              }}
              className={linkClass}
              style={{ color: TEXT, outlineColor: ACCENT }}
            >
              Delete
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className={linkClass}
              style={{ color: TEXT_MUTED, outlineColor: ACCENT }}
            >
              Keep
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className={linkClass}
              style={{ color: TEXT_MUTED, outlineColor: ACCENT }}
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className={linkClass}
              style={{ color: TEXT_MUTED, outlineColor: ACCENT }}
            >
              Remove
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function EarningsEditor({
  dayLabel,
  earnings,
  onAdd,
  onEdit,
  onDelete,
}: {
  dayLabel: string;
  earnings: Earning[];
  onAdd: (amount: string, note: string) => void;
  onEdit: (id: string, amount: string, note: string) => void;
  onDelete: (id: string) => void;
}) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  // Only surfaces the one thing that can go wrong locally — an empty or
  // unreadable amount. Everything else is the route's to report, and comes back
  // as a toast.
  const [error, setError] = useState(false);

  const submit = () => {
    if (!amount.trim()) {
      setError(true);
      return;
    }
    setError(false);
    onAdd(amount, note);
    setAmount("");
    setNote("");
  };

  const total = earnings.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: ACCENT }}>
          Earned
        </span>
        {earnings.length > 0 && (
          <span className="text-[13px]" style={{ color: TEXT }}>
            {formatMoney(total)}
          </span>
        )}
      </div>

      {earnings.map((e) => (
        <EntryRow
          key={e.id}
          earning={e}
          onEdit={(a, n) => onEdit(e.id, a, n)}
          onDelete={() => onDelete(e.id)}
        />
      ))}

      <div className="mt-2 space-y-1.5">
        <input
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            if (error) setError(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          inputMode="decimal"
          aria-label={`Amount earned on ${dayLabel}`}
          aria-invalid={error || undefined}
          placeholder="$0"
          className={inputClass}
          style={{ ...fieldStyle, border: `1px solid ${error ? ACCENT : BORDER}`, outlineColor: ACCENT }}
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          aria-label={`Note for ${dayLabel}`}
          placeholder="Note (optional)"
          className={inputClass}
          style={{ ...fieldStyle, outlineColor: ACCENT }}
        />
        <button
          type="button"
          onClick={submit}
          className="w-full rounded-[4px] px-3 py-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ background: BG, color: TEXT, border: `1px solid ${ACCENT}`, outlineColor: ACCENT }}
        >
          {earnings.length > 0 ? "Add another" : "Save"}
        </button>
      </div>
    </div>
  );
}
