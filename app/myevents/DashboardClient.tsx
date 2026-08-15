"use client";

// Top-level client shell for /myevents. Owns the state shared across
// sections (armed template, toasts, and — once Groups 6/7 land — the
// bookings list both the Calendar and the Bookings list read from) and
// assembles the page: Header, then the four sections stacked vertically,
// then the toast stack floating on top of everything.

import { useState } from "react";
import { BG } from "./theme";
import { Header } from "./Header";
import { MyEventsGlobalStyle } from "./MyEventsGlobalStyle";
import { TemplatesSection } from "./TemplatesSection";
import { SnippetsSection } from "./SnippetsSection";
import { CalendarSection } from "./CalendarSection";
import { BookingsSection } from "./BookingsSection";
import { ToastStack, type ToastItem } from "./Toast";

export function DashboardClient() {
  // Real toast plumbing (id counter, auto-dismiss timer) lands in Group 4,
  // alongside the first thing that actually needs to show one.
  const [toasts] = useState<ToastItem[]>([]);

  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <MyEventsGlobalStyle />
      <Header />
      <main>
        <TemplatesSection />
        <SnippetsSection />
        <CalendarSection />
        <BookingsSection />
      </main>
      <ToastStack toasts={toasts} />
    </div>
  );
}
