"use client";

// Top-level client shell for /myevents. Owns the state shared across
// sections — templates + which one (if any) is armed, snippets, and the
// toast stack. Bookings state lands in Groups 6-7 as those sections stop
// being stubs.

import { useCallback, useRef, useState } from "react";
import type { Booking, CustomTemplate, Snippet } from "@/lib/db-types";
import type { BookingsTab } from "./types";
import { BG } from "./theme";
import { Header } from "./Header";
import { MyEventsGlobalStyle } from "./MyEventsGlobalStyle";
import { TemplatesSection } from "./TemplatesSection";
import { SnippetsSection } from "./SnippetsSection";
import { CalendarSection } from "./CalendarSection";
import { BookingsSection } from "./BookingsSection";
import { ToastStack, TOAST_DURATION_MS, type ToastItem } from "./Toast";
import { copyToClipboard } from "./clipboard";

async function readError(res: Response, fallback: string): Promise<string> {
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  return data.error ?? fallback;
}

export function DashboardClient({
  initialTemplates,
  initialSnippets,
  initialBookings,
}: {
  initialTemplates: CustomTemplate[];
  initialSnippets: Snippet[];
  initialBookings: Booking[];
}) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastIdRef = useRef(0);
  const addToast = useCallback((message: string) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), TOAST_DURATION_MS);
  }, []);

  // ── Templates ────────────────────────────────────────────────────────
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

  // ── Snippets ─────────────────────────────────────────────────────────
  const [snippets, setSnippets] = useState<Snippet[]>(initialSnippets);

  const copySnippet = useCallback(
    async (snippet: Snippet) => {
      const ok = await copyToClipboard(snippet.body);
      addToast(ok ? "Copied." : "Couldn't copy — try again.");
    },
    [addToast],
  );

  const addSnippet = useCallback(async (label: string, body: string) => {
    const res = await fetch("/api/snippets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, body }),
    });
    if (!res.ok) throw new Error(await readError(res, "Could not save the snippet."));
    const { snippet } = (await res.json()) as { snippet: Snippet };
    setSnippets((prev) => [...prev, snippet]);
  }, []);

  const editSnippet = useCallback(async (id: string, label: string, body: string) => {
    const res = await fetch(`/api/snippets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, body }),
    });
    if (!res.ok) throw new Error(await readError(res, "Could not save the snippet."));
    const { snippet } = (await res.json()) as { snippet: Snippet };
    setSnippets((prev) => prev.map((s) => (s.id === id ? snippet : s)));
  }, []);

  const deleteSnippet = useCallback(async (id: string) => {
    const res = await fetch(`/api/snippets/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error(await readError(res, "Could not delete the snippet."));
    setSnippets((prev) => prev.filter((s) => s.id !== id));
  }, []);

  // ── Bookings / Calendar ──────────────────────────────────────────────
  // Bookings themselves are still read-only here — accept/decline/etc.
  // land in Group 7. The tab setter is used now so the Calendar's "See
  // full details →" can switch the (not-yet-built) Bookings section to
  // Accepted before scrolling to the card.
  const [bookings] = useState<Booking[]>(initialBookings);
  const [, setBookingsTab] = useState<BookingsTab>("pending");

  const focusBooking = useCallback((id: string) => {
    setBookingsTab("accepted");
    // Give the tab switch a tick to render the target card before scrolling.
    setTimeout(() => {
      document.getElementById(`booking-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
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
        <SnippetsSection
          snippets={snippets}
          onCopy={copySnippet}
          onAdd={addSnippet}
          onEdit={editSnippet}
          onDelete={deleteSnippet}
        />
        <CalendarSection bookings={bookings} onFocusBooking={focusBooking} />
        <BookingsSection />
      </main>
      <ToastStack toasts={toasts} />
    </div>
  );
}
