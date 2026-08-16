// Booking form endpoint. Takes the JSON the form posts and lands it in the
// `bookings` table, which is what /myevents reads — that row IS the booking,
// and getting it there is the only thing a successful submit depends on.
//
// A heads-up email to `siteConfig.bookingEmail` goes out on top of that, over
// Resend's HTTP API via plain fetch (no SDK to install or keep current). It's
// best-effort only: a missing key or a provider hiccup is logged and moved
// past, never surfaced to the visitor, because the request is already saved
// where Jonah will see it. Wiring the mail up takes three things —
//
//   1. `bookingEmail` in site-config.ts — the address that receives bookings.
//   2. `RESEND_API_KEY` and `BOOKING_FROM_EMAIL` in the environment. The from
//      address has to be on a domain verified with the mail provider, which
//      is a deploy concern rather than site copy, so it lives in env and not
//      in site-config.ts.
//
// — but until they're set the form still succeeds; the booking just arrives in
// the dashboard without also pinging an inbox.
//
// The only thing that fails the request is not being able to save it at all:
// if Supabase isn't configured in production there's no dashboard for it to
// land in, so the route returns 503 and the form shows its error state rather
// than promising a booking it dropped on the floor. (Locally, with no database
// wired up, it still returns ok so the form's success flow can be exercised.)

import { NextResponse } from "next/server";
import { isPlaceholder, siteConfig } from "@/site-config";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Payload = Record<string, unknown>;

/** Trim, cap length, and collapse anything falsy to an em dash. */
function field(payload: Payload, key: string): string {
  const raw = payload[key];
  if (typeof raw === "boolean") return raw ? "yes" : "no";
  if (typeof raw !== "string") return "—";
  const clean = raw.trim().slice(0, 2000);
  return clean || "—";
}

export async function POST(request: Request) {
  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  // The form validates these client-side too; this is the copy that counts,
  // since anything can post here.
  const name = field(payload, "name");
  const email = field(payload, "email");
  if (name === "—") {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }

  const lines = [
    `Name: ${name}`,
    `Email: ${email}`,
    `Event type: ${field(payload, "event_type")}`,
    `Date: ${field(payload, "date")}`,
    `Location / venue: ${field(payload, "venue")}`,
    `Headcount: ${field(payload, "headcount")}`,
    `Notes: ${field(payload, "notes")}`,
    `Interested in branded decks: ${field(payload, "branded_decks")}`,
  ];
  const body = lines.join("\n");

  // ── Database insert — the /myevents dashboard, and the record that decides
  // whether this booking succeeded ───────────────────────────────────────
  let saved = false;
  if (isSupabaseConfigured()) {
    const rawDate = field(payload, "date");
    const rawHeadcount = field(payload, "headcount");
    const headcount = rawHeadcount === "—" ? null : Number.parseInt(rawHeadcount, 10);
    try {
      const { error } = await getSupabaseAdmin().from("bookings").insert({
        status: "pending",
        name,
        email,
        event_type: field(payload, "event_type") === "—" ? null : field(payload, "event_type"),
        event_date: rawDate === "—" ? null : rawDate,
        location: field(payload, "venue") === "—" ? null : field(payload, "venue"),
        headcount: Number.isFinite(headcount) ? headcount : null,
        notes: field(payload, "notes") === "—" ? null : field(payload, "notes"),
        wants_branded_decks: payload.branded_decks === true,
      });
      if (error) console.error(`[booking] Supabase insert failed: ${error.message}\n${body}`);
      else saved = true;
    } catch (err) {
      console.error(`[booking] Supabase insert threw: ${String(err)}\n${body}`);
    }
  } else {
    console.info(`[booking] Not saved to database — Supabase is not configured.\n${body}`);
    // No database to land in, but locally we still let the form's success flow
    // run so it can be exercised without one.
    if (process.env.NODE_ENV !== "production") saved = true;
  }

  // ── Email — best effort, never blocks the booking ──────────────────────
  // Deliberately NOT awaited. Swallowing the errors is not enough on its own:
  // an awaited send that merely hangs would hold the response open behind it,
  // and a request that eventually trips the function timeout turns a booking
  // that IS saved into a visible failure — exactly the coupling this route is
  // supposed to have gotten rid of. The trade is that on a serverless host the
  // send can be cut off when the response returns, so a heads-up can be lost.
  // That is the right way round: the row is already where Jonah will see it,
  // and the inbox copy is a convenience.
  void sendBookingEmail({ name, replyTo: email, body });

  if (!saved) {
    return NextResponse.json({ error: "Could not save your booking." }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}

/**
 * Fire the heads-up email if — and only if — mail is fully configured.
 * Swallows every outcome (not configured, provider error, thrown fetch) into a
 * log line, and never rejects: the caller doesn't await it, so a rejection here
 * would surface as an unhandled promise rather than as anything useful.
 */
async function sendBookingEmail(input: { name: string; replyTo: string; body: string }): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.BOOKING_FROM_EMAIL;
  const to = siteConfig.bookingEmail;

  if (!apiKey || !from || isPlaceholder(to)) {
    const missing = [
      !apiKey && "RESEND_API_KEY",
      !from && "BOOKING_FROM_EMAIL",
      isPlaceholder(to) && "siteConfig.bookingEmail",
    ].filter(Boolean);
    console.info(`[booking] Heads-up email not sent — mail is not configured (missing: ${missing.join(", ")}).`);
    return;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: input.replyTo,
        subject: `Booking enquiry — ${input.name}`,
        text: input.body,
      }),
    });
    if (!res.ok) {
      console.error(`[booking] Mail provider returned ${res.status}: ${await res.text()}\n${input.body}`);
    }
  } catch (err) {
    console.error(`[booking] Mail send threw: ${String(err)}\n${input.body}`);
  }
}
