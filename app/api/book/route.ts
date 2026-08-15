// Booking form endpoint. Takes the JSON the form posts, inserts it into the
// `bookings` table (so it shows up in /myevents), and also emails it to
// whoever `siteConfig.bookingEmail` points at.
//
// Mail goes out over Resend's HTTP API via plain fetch — no SDK, so there's
// no dependency to install or keep current. Two things have to be set before
// this can deliver anything:
//
//   1. `bookingEmail` in site-config.ts — the address that receives bookings.
//   2. `RESEND_API_KEY` and `BOOKING_FROM_EMAIL` in the environment. The from
//      address has to be on a domain verified with the mail provider, which
//      is a deploy concern rather than site copy, so it lives in env and not
//      in site-config.ts.
//
// Until both are set the route will not report success it can't back up:
// in development it logs the submission and returns ok so the form's states
// can be exercised locally, and in production it returns 503 so the form
// shows its error state and tells the visitor to text instead. A booking
// that quietly evaporates is worse than one that visibly fails.
//
// The database insert (below) is independent of the email path — it's what
// populates the /myevents dashboard — and is attempted whenever Supabase is
// configured, regardless of whether mail is. A visitor's submission should
// land in the dashboard even on a day the mail provider is down, and vice
// versa: a missing DB insert shouldn't stop the email that tells Jonah about
// it. Neither failure blocks the other.

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

  // ── Database insert — feeds the /myevents dashboard ────────────────────
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
    } catch (err) {
      console.error(`[booking] Supabase insert threw: ${String(err)}\n${body}`);
    }
  } else {
    console.info(`[booking] Not saved to database — Supabase is not configured.\n${body}`);
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.BOOKING_FROM_EMAIL;
  const to = siteConfig.bookingEmail;

  if (!apiKey || !from || isPlaceholder(to)) {
    const missing = [
      !apiKey && "RESEND_API_KEY",
      !from && "BOOKING_FROM_EMAIL",
      isPlaceholder(to) && "siteConfig.bookingEmail",
    ].filter(Boolean);
    if (process.env.NODE_ENV === "production") {
      console.error(
        `[booking] Dropped a submission — mail is not configured (missing: ${missing.join(", ")}).\n${body}`,
      );
      return NextResponse.json({ error: "Mail is not configured." }, { status: 503 });
    }
    console.info(`[booking] Not sent — mail is not configured (missing: ${missing.join(", ")}).\n${body}`);
    return NextResponse.json({ ok: true, delivered: false });
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
        reply_to: email,
        subject: `Booking enquiry — ${name}`,
        text: body,
      }),
    });
    if (!res.ok) {
      console.error(`[booking] Mail provider returned ${res.status}: ${await res.text()}\n${body}`);
      return NextResponse.json({ error: "Could not send." }, { status: 502 });
    }
  } catch (err) {
    console.error(`[booking] Mail send threw: ${String(err)}\n${body}`);
    return NextResponse.json({ error: "Could not send." }, { status: 502 });
  }

  return NextResponse.json({ ok: true, delivered: true });
}
