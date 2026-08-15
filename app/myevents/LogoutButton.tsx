"use client";

// "Log out" — clears the admin_auth cookie via the API route, then sends
// Jonah back to the login page. Lives in the dashboard header (Header.tsx).

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ACCENT, BG, buttonClass, TEXT } from "./theme";

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
      className={buttonClass}
      style={{ background: BG, color: TEXT, border: `1px solid ${ACCENT}`, outlineColor: ACCENT }}
    >
      Log out
    </button>
  );
}
