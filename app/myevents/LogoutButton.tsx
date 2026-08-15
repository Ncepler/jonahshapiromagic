"use client";

// "Log out" — clears the admin_auth cookie via the API route, then sends
// Jonah back to the login page. Used in the dashboard header (Group 3).

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ACCENT, BG, TEXT } from "./theme";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const onClick = async () => {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/myevents/login");
      router.refresh();
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="rounded-[4px] px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.08em] transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
      style={{ background: BG, color: TEXT, border: `1px solid ${ACCENT}`, outlineColor: ACCENT }}
    >
      Log out
    </button>
  );
}
