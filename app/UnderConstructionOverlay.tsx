"use client";

// TEMPORARY — added while the site is paused for building.
//
// This is a pure addition: nothing else in the app was changed or removed.
// It renders on top of the real page (which is still mounted underneath,
// untouched) as a full-screen, non-scrollable cover so there is no way to
// see or reach the real site while this is up.
//
// To go live again: delete this file and remove the two lines in
// app/layout.tsx that import and render it. That's the entire rollback.

import { useEffect } from "react";

const BG = "#0a0505"; // same base background as the live site
const TEXT = "#f0e6d2"; // same warm parchment text color
const TEXT_MUTED = "#8a7a6a";
const ACCENT = "#c9a961"; // same muted antique gold accent

export default function UnderConstructionOverlay() {
  // Lock scrolling on the real page underneath while this overlay is up.
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
    };
  }, []);

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        position: "fixed",
        inset: 0,
        height: "100dvh",
        width: "100vw",
        zIndex: 2147483647,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 18,
        background: BG,
        color: TEXT,
        textAlign: "center",
        padding: 24,
        overflow: "hidden",
      }}
    >
      <div style={{ width: 46, height: 1, background: ACCENT, opacity: 0.6 }} />
      <h1
        style={{
          fontFamily: "var(--font-display), Georgia, serif",
          fontSize: "clamp(28px, 6vw, 48px)",
          letterSpacing: "0.04em",
          margin: 0,
          color: TEXT,
        }}
      >
        Under Construction
      </h1>
      <p
        style={{
          fontFamily: "var(--font-body), Georgia, serif",
          fontSize: 16,
          color: TEXT_MUTED,
          maxWidth: 420,
          margin: 0,
        }}
      >
        Back shortly.
      </p>
      <div style={{ width: 46, height: 1, background: ACCENT, opacity: 0.6 }} />
    </div>
  );
}
