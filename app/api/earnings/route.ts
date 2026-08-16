// POST — records one payment against one date. Entered by hand from the
// dashboard calendar (click a day → EarningsEditor in DayPopover.tsx); there is
// no automatic link to `bookings`, because plenty of paid work never came
// through the form. Protected by middleware.ts (matches /api/earnings/:path*).

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { toEarning } from "@/lib/myevents-data";
import { parseAmount } from "@/lib/money";

export const runtime = "nodejs";

// The calendar only ever sends a `date`-shaped string, but this is a route
// anyone with the cookie can post to, so it re-checks rather than handing
// whatever arrives to Postgres and reading the error back out.
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(request: Request) {
  let payload: { event_date?: unknown; amount?: unknown; note?: unknown };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const eventDate = typeof payload.event_date === "string" ? payload.event_date.trim() : "";
  if (!DATE_RE.test(eventDate)) {
    return NextResponse.json({ error: "A date is required." }, { status: 400 });
  }

  const amount = parseAmount(payload.amount);
  if (amount === null) {
    return NextResponse.json({ error: "Enter an amount." }, { status: 400 });
  }

  const note = typeof payload.note === "string" ? payload.note.trim().slice(0, 500) : "";

  const { data, error } = await getSupabaseAdmin()
    .from("earnings")
    .insert({ event_date: eventDate, amount, note: note || null })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ earning: toEarning(data) });
}
