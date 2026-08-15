"use client";

// Email Templates — a horizontally scrollable row of cards. Click a card to
// arm it (border goes solid gold, "Now click a booking →" appears); the
// next booking Jonah clicks in the Bookings section (Group 7) gets the
// template's {{name}} filled in and copied to the clipboard. Drag to
// reorder (built-ins and custom cards together); "+ New template" opens
// EditorModal to add one.

import { useState, type DragEvent } from "react";
import type { CustomTemplate } from "@/lib/db-types";
import { BUILTIN_TEMPLATE_IDS } from "@/lib/builtin-content";
import { Section, SectionHeading } from "./Section";
import { TemplateCard } from "./TemplateCard";
import { EditorModal } from "./EditorModal";
import { ACCENT, BORDER, TEXT_MUTED } from "./theme";

const BUILTIN_SET = new Set<string>(BUILTIN_TEMPLATE_IDS);

type ModalState = { mode: "add" } | { mode: "edit"; template: CustomTemplate } | null;

export function TemplatesSection({
  templates,
  armedTemplateId,
  onArmToggle,
  onAdd,
  onEdit,
  onDelete,
  onReorder,
}: {
  templates: CustomTemplate[];
  armedTemplateId: string | null;
  onArmToggle: (id: string) => void;
  onAdd: (title: string, body: string) => Promise<void>;
  onEdit: (id: string, title: string, body: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onReorder: (orderedIds: string[]) => void;
}) {
  const [modal, setModal] = useState<ModalState>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const handleDragOver = (overId: string) => (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!draggedId || draggedId === overId) return;
    const fromIdx = templates.findIndex((t) => t.id === draggedId);
    const toIdx = templates.findIndex((t) => t.id === overId);
    if (fromIdx === -1 || toIdx === -1) return;
    const next = [...templates];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    onReorder(next.map((t) => t.id));
  };

  return (
    <Section id="templates">
      <SectionHeading eyebrow="Email Templates" heading="Copy and send." />
      <div className="myevents-scrollbar -mx-5 flex gap-4 overflow-x-auto px-5 pb-3 md:-mx-10 md:px-10">
        {templates.map((t) => (
          <TemplateCard
            key={t.id}
            template={t}
            isBuiltin={BUILTIN_SET.has(t.id)}
            armed={armedTemplateId === t.id}
            onArmToggle={() => onArmToggle(t.id)}
            onEdit={() => setModal({ mode: "edit", template: t })}
            onDelete={() => {
              if (window.confirm(`Delete "${t.title}"? This can't be undone.`)) void onDelete(t.id);
            }}
            onDragStart={() => setDraggedId(t.id)}
            onDragOver={handleDragOver(t.id)}
            onDragEnd={() => setDraggedId(null)}
          />
        ))}
        <button
          type="button"
          onClick={() => setModal({ mode: "add" })}
          className="flex w-[280px] shrink-0 items-center justify-center rounded-[4px] p-5 text-[13px] font-semibold uppercase tracking-[0.06em] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ border: `1px dashed ${BORDER}`, color: TEXT_MUTED, outlineColor: ACCENT }}
        >
          + New template
        </button>
      </div>

      {modal && (
        <EditorModal
          heading={modal.mode === "add" ? "New template" : "Edit template"}
          primaryLabel="Title"
          primaryPlaceholder="e.g. Confirming — I'm available"
          bodyLabel="Body"
          bodyHint="Use {{name}} anywhere you want the client's name inserted on copy."
          initialPrimary={modal.mode === "edit" ? modal.template.title : ""}
          initialBody={modal.mode === "edit" ? modal.template.body : ""}
          onSave={async (title, body) => {
            if (modal.mode === "add") await onAdd(title, body);
            else await onEdit(modal.template.id, title, body);
          }}
          onClose={() => setModal(null)}
        />
      )}
    </Section>
  );
}
