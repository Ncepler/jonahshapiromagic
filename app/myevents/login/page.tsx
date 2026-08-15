"use client";

// /myevents/login — the only route under /myevents that middleware.ts lets
// through unauthenticated. A single password field, styled to match the
// public site (see app/myevents/theme.ts) but with none of its theatrics —
// this is the door, not the show.

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { MagicianCursor } from "../../MagicianCursor";
import { ACCENT, BG, BG_ELEVATED, BORDER, DISPLAY, TEXT, TEXT_MUTED } from "../theme";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "err">("idle");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setState("sending");
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.push("/myevents");
        router.refresh();
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Something went wrong.");
      setState("err");
    } catch {
      setError("Something went wrong. Try again.");
      setState("err");
    }
  };

  return (
    <MagicianCursor>
      <div className="flex min-h-screen items-center justify-center px-6" style={{ background: BG }}>
        <div
          className="w-full max-w-[360px] rounded-[4px] p-8"
          style={{ background: BG_ELEVATED, border: `1px solid ${BORDER}` }}
        >
          <h1
            className="text-center text-[22px] uppercase tracking-[0.04em]"
            style={{ color: TEXT, fontFamily: DISPLAY }}
          >
            Jonah Shapiro
          </h1>
          <p
            className="mt-2 text-center text-[12px] font-semibold uppercase tracking-[0.2em]"
            style={{ color: ACCENT }}
          >
            Dashboard
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <div>
              <label htmlFor="password" className="mb-1.5 block text-[14px] font-semibold" style={{ color: TEXT_MUTED }}>
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                autoFocus
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                className="myevents-login-input w-full px-3.5 py-3 text-[15px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{
                  background: BG,
                  border: `1px solid ${BORDER}`,
                  color: TEXT,
                  borderRadius: 4,
                  outlineColor: ACCENT,
                }}
              />
              <style>{`
                .myevents-login-input:focus {
                  border-color: ${ACCENT};
                }
              `}</style>
            </div>

            {error && (
              <p role="alert" className="text-[14px] leading-[1.5]" style={{ color: TEXT_MUTED }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={state === "sending"}
              className="w-full rounded-[4px] px-6 py-3 text-[14px] font-semibold uppercase tracking-[0.08em] transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
              style={{ background: BG, color: TEXT, border: `1px solid ${ACCENT}`, outlineColor: ACCENT }}
            >
              {state === "sending" ? "Checking…" : "Enter"}
            </button>
          </form>
        </div>
      </div>
    </MagicianCursor>
  );
}
