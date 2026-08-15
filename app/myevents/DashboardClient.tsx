"use client";

// Top-level client shell for /myevents. Owns the state shared across
// sections — templates + which one (if any) is armed today; bookings and
// snippets state land in Groups 5-7 as their sections stop being stubs.

import { useCallback, useState } from "react";
import type { CustomTemplate } from "@/lib/db-types";
import { BG } from "./theme";
import { Header } from "./Header";
import { MyEventsGlobalStyle } from "./MyEventsGlobalStyle";
import { TemplatesSection } from "./TemplatesSection";
import { SnippetsSection } from "./SnippetsSection";
import { CalendarSection } from "./CalendarSection";
import { BookingsSection } from "./BookingsSection";
import { ToastStack, type ToastItem } from "./Toast";

async function readError(res: Response, fallback: string): Promise<string> {
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  return data.error ?? fallback;
}

export function DashboardClient({ initialTemplates }: { initialTemplates: CustomTemplate[] }) {
  // Real toast plumbing (id counter, auto-dismiss timer) lands in Group 7,
  // alongside the first thing that actually copies something to the
  // clipboard on a booking click.
  const [toasts] = useState<ToastItem[]>([]);

  const [templates, setTemplates] = useState<CustomTemplate[]>(initialTemplates);
  const [armedTemplateId, setArmedTemplateId] = useState<string | null>(null);

  const toggleArmTemplate = useCallback((id: string) => {
    setArmedTemplateId((prev) => (prev === id ? null : id));
  }, []);

  const addTemplate = useCallback(async (title: string, body: string) => {
    const res = await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body }),
    });
    if (!res.ok) throw new Error(await readError(res, "Could not save the template."));
    const { template } = (await res.json()) as { template: CustomTemplate };
    setTemplates((prev) => [...prev, template]);
  }, []);

  const editTemplate = useCallback(async (id: string, title: string, body: string) => {
    const res = await fetch(`/api/templates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body }),
    });
    if (!res.ok) throw new Error(await readError(res, "Could not save the template."));
    const { template } = (await res.json()) as { template: CustomTemplate };
    setTemplates((prev) => prev.map((t) => (t.id === id ? template : t)));
  }, []);

  const deleteTemplate = useCallback(async (id: string) => {
    const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error(await readError(res, "Could not delete the template."));
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    setArmedTemplateId((prev) => (prev === id ? null : prev));
  }, []);

  // Reorders locally first (immediate drag feedback), then persists the new
  // sort_order for every row — fire-and-forget is fine here since a failed
  // persist just means the order reverts on next page load, not data loss.
  const reorderTemplates = useCallback((orderedIds: string[]) => {
    setTemplates((prev) => {
      const byId = new Map(prev.map((t) => [t.id, t]));
      return orderedIds.map((id, i) => ({ ...byId.get(id)!, sort_order: i }));
    });
    const order = orderedIds.map((id, i) => ({ id, sort_order: i }));
    void fetch("/api/templates/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order }),
    });
  }, []);

  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <MyEventsGlobalStyle />
      <Header />
      <main>
        <TemplatesSection
          templates={templates}
          armedTemplateId={armedTemplateId}
          onArmToggle={toggleArmTemplate}
          onAdd={addTemplate}
          onEdit={editTemplate}
          onDelete={deleteTemplate}
          onReorder={reorderTemplates}
        />
        <SnippetsSection />
        <CalendarSection />
        <BookingsSection />
      </main>
      <ToastStack toasts={toasts} />
    </div>
  );
}
