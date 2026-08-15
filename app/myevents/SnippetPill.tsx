"use client";

import { useEffect, useState } from "react";
import type { Snippet } from "@/lib/db-types";
import { ACCENT, BG_ELEVATED, BORDER, TEXT, TEXT_MUTED } from "./theme";

export function SnippetPill({
  snippet,
  isBuiltin,
  onCopy,
  onEdit,
  onDelete,
}: {
  snippet: Snippet;
  isBuiltin: boolean;
  onCopy: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [menuOpen]);

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={onCopy}
        className="rounded-full px-4 py-2.5 text-[13px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{
          background: BG_ELEVATED,
          border: `1px solid ${BORDER}`,
          color: TEXT,
          paddingRight: isBuiltin ? undefined : 30,
          outlineColor: ACCENT,
        }}
      >
        {snippet.label}
      </button>

      {!isBuiltin && (
        <div className="absolute right-1 top-1/2 -translate-y-1/2">
          <button
            type="button"
            aria-label="Snippet options"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
            className="rounded px-1 py-1 text-[13px] leading-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ color: TEXT_MUTED, outlineColor: ACCENT }}
          >
            •••
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-full z-10 mt-1 w-32 rounded-[4px] py-1 text-[13px]"
              style={{ background: BG_ELEVATED, border: `1px solid ${BORDER}` }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onEdit();
                }}
                className="block w-full px-3 py-1.5 text-left hover:opacity-80"
                style={{ color: TEXT }}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete();
                }}
                className="block w-full px-3 py-1.5 text-left hover:opacity-80"
                style={{ color: TEXT }}
              >
                Delete
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
