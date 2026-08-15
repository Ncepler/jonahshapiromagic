"use client";

// Quick Snippets — a grid of pill cards. Unlike templates, a click copies
// immediately (no arming, no variables) and shows the "Copied." toast.

import { useState } from "react";
import type { Snippet } from "@/lib/db-types";
import { BUILTIN_SNIPPET_IDS } from "@/lib/builtin-content";
import { Section, SectionHeading } from "./Section";
import { SnippetPill } from "./SnippetPill";
import { EditorModal } from "./EditorModal";
import { ACCENT, BORDER, TEXT_MUTED } from "./theme";

const BUILTIN_SET = new Set<string>(BUILTIN_SNIPPET_IDS);

type ModalState = { mode: "add" } | { mode: "edit"; snippet: Snippet } | null;

export function SnippetsSection({
  snippets,
  onCopy,
  onAdd,
  onEdit,
  onDelete,
}: {
  snippets: Snippet[];
  onCopy: (snippet: Snippet) => void;
  onAdd: (label: string, body: string) => Promise<void>;
  onEdit: (id: string, label: string, body: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [modal, setModal] = useState<ModalState>(null);

  return (
    <Section id="snippets">
      <SectionHeading eyebrow="Quick Snippets" heading="One-liners." />
      <div className="flex flex-wrap gap-3">
        {snippets.map((s) => (
          <SnippetPill
            key={s.id}
            snippet={s}
            isBuiltin={BUILTIN_SET.has(s.id)}
            onCopy={() => onCopy(s)}
            onEdit={() => setModal({ mode: "edit", snippet: s })}
            onDelete={() => {
              if (window.confirm(`Delete "${s.label}"? This can't be undone.`)) void onDelete(s.id);
            }}
          />
        ))}
        <button
          type="button"
          onClick={() => setModal({ mode: "add" })}
          className="rounded-full px-4 py-2.5 text-[13px] font-semibold uppercase tracking-[0.04em] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ border: `1px dashed ${BORDER}`, color: TEXT_MUTED, outlineColor: ACCENT }}
        >
          + New
        </button>
      </div>

      {modal && (
        <EditorModal
          heading={modal.mode === "add" ? "New snippet" : "Edit snippet"}
          primaryLabel="Label"
          primaryPlaceholder="e.g. Price for the night"
          bodyLabel="Body"
          bodyHint="Use ___ for blanks you'll fill in by hand after pasting — those aren't templated."
          initialPrimary={modal.mode === "edit" ? modal.snippet.label : ""}
          initialBody={modal.mode === "edit" ? modal.snippet.body : ""}
          onSave={async (label, body) => {
            if (modal.mode === "add") await onAdd(label, body);
            else await onEdit(modal.snippet.id, label, body);
          }}
          onClose={() => setModal(null)}
        />
      )}
    </Section>
  );
}
