"use client";

// Shared add/edit modal for both custom templates (Group 4: Title + Body)
// and custom snippets (Group 5: Label + Body) — same shape, "a short field
// plus a long one," so one component covers both.

import { useEffect, useState, type FormEvent } from "react";
import { ACCENT, BG, BG_ELEVATED, BORDER, buttonClass, DISPLAY, fieldStyle, TEXT, TEXT_MUTED } from "./theme";

export function EditorModal({
  heading,
  primaryLabel,
  primaryPlaceholder,
  bodyLabel,
  bodyHint,
  initialPrimary = "",
  initialBody = "",
  onSave,
  onClose,
}: {
  heading: string;
  primaryLabel: string;
  primaryPlaceholder?: string;
  bodyLabel: string;
  bodyHint?: string;
  initialPrimary?: string;
  initialBody?: string;
  onSave: (primary: string, body: string) => Promise<void>;
  onClose: () => void;
}) {
  const [primary, setPrimary] = useState(initialPrimary);
  const [body, setBody] = useState(initialBody);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!primary.trim() || !body.trim()) {
      setError("Both fields are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(primary.trim(), body);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[900] flex items-center justify-center bg-black/60 px-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-label={heading}
        className="w-full max-w-[480px] rounded-[4px] p-6"
        style={{ background: BG_ELEVATED, border: `1px solid ${BORDER}` }}
      >
        <h3 className="text-[18px]" style={{ color: TEXT, fontFamily: DISPLAY }}>
          {heading}
        </h3>

        <div className="mt-4">
          <label htmlFor="editor-primary" className="mb-1.5 block text-[13px] font-semibold" style={{ color: TEXT_MUTED }}>
            {primaryLabel}
          </label>
          <input
            id="editor-primary"
            autoFocus
            value={primary}
            onChange={(e) => setPrimary(e.target.value)}
            placeholder={primaryPlaceholder}
            className="w-full px-3.5 py-2.5 text-[14px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ ...fieldStyle, outlineColor: ACCENT }}
          />
        </div>

        <div className="mt-4">
          <label htmlFor="editor-body" className="mb-1.5 block text-[13px] font-semibold" style={{ color: TEXT_MUTED }}>
            {bodyLabel}
          </label>
          <textarea
            id="editor-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            className="w-full px-3.5 py-2.5 text-[14px] leading-[1.5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ ...fieldStyle, outlineColor: ACCENT }}
          />
          {bodyHint && (
            <p className="mt-1.5 text-[12px] leading-[1.4]" style={{ color: TEXT_MUTED }}>
              {bodyHint}
            </p>
          )}
        </div>

        {error && (
          <p role="alert" className="mt-3 text-[13px] leading-[1.4]" style={{ color: TEXT_MUTED }}>
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className={buttonClass}
            style={{ background: "transparent", color: TEXT_MUTED, border: `1px solid ${BORDER}`, outlineColor: ACCENT }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className={buttonClass}
            style={{ background: BG, color: TEXT, border: `1px solid ${ACCENT}`, outlineColor: ACCENT }}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
