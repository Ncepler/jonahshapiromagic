"use client";

import { useEffect, useState, type DragEvent } from "react";
import type { CustomTemplate } from "@/lib/db-types";
import { ACCENT, BG_ELEVATED, BORDER, TEXT, TEXT_MUTED } from "./theme";

function firstLine(body: string): string {
  return body.split("\n").find((line) => line.trim().length > 0) ?? "";
}

export function TemplateCard({
  template,
  isBuiltin,
  armed,
  onArmToggle,
  onEdit,
  onDelete,
  onDragStart,
  onDragOver,
  onDragEnd,
}: {
  template: CustomTemplate;
  isBuiltin: boolean;
  armed: boolean;
  onArmToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDragStart: (e: DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [menuOpen]);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      role="button"
      tabIndex={0}
      aria-pressed={armed}
      onClick={onArmToggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onArmToggle();
        }
      }}
      className="relative flex w-[280px] shrink-0 cursor-pointer select-none flex-col rounded-[4px] p-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{ background: BG_ELEVATED, border: `1px solid ${armed ? ACCENT : BORDER}`, outlineColor: ACCENT }}
    >
      <span aria-hidden className="absolute right-3 top-3 text-[13px]" style={{ color: ACCENT }}>
        ✦
      </span>

      {!isBuiltin && (
        <div className="absolute right-8 top-2">
          <button
            type="button"
            aria-label="Template options"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
            className="rounded px-1.5 py-1 text-[13px] leading-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
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
                className="block w-full px-3 py-1.5 text-left hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ color: TEXT, outlineColor: ACCENT }}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete();
                }}
                className="block w-full px-3 py-1.5 text-left hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ color: TEXT, outlineColor: ACCENT }}
              >
                Delete
              </button>
            </div>
          )}
        </div>
      )}

      <p className="mt-3 pr-6 text-[14px] font-medium leading-[1.3]" style={{ color: TEXT }}>
        {template.title}
      </p>
      <p className="mt-2 overflow-hidden text-ellipsis whitespace-nowrap text-[13px]" style={{ color: TEXT_MUTED }}>
        {firstLine(template.body)}
      </p>

      {armed && (
        <p className="mt-3 text-[12px] font-semibold" style={{ color: TEXT }}>
          Now click a booking →
        </p>
      )}
    </div>
  );
}
