"use client";

// Sticky dashboard header — always visible (unlike the public site's
// StickyBar, which fades in only past the hero; there's no hero here to
// wait for). Wordmark left, Log out right, "Dashboard" eyebrow beneath.

import { ACCENT, BG, BORDER, DISPLAY, hexToRgba, TEXT, wrap } from "./theme";
import { LogoutButton } from "./LogoutButton";

export function Header() {
  return (
    <header
      role="banner"
      className="sticky top-0 z-[100]"
      style={{
        background: hexToRgba(BG, 0.9),
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: `1px solid ${BORDER}`,
      }}
    >
      <div className={`${wrap} flex h-[60px] items-center justify-between`}>
        <span
          className="text-[0.9rem] font-medium tracking-[0.12em]"
          style={{ color: TEXT, fontFamily: DISPLAY }}
        >
          Jonah Shapiro
        </span>
        <LogoutButton />
      </div>
      <div className={`${wrap} pb-3`}>
        <span
          className="text-[11px] font-semibold uppercase tracking-[0.24em]"
          style={{ color: ACCENT }}
        >
          Dashboard
        </span>
      </div>
    </header>
  );
}
