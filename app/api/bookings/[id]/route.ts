// PATCH / DELETE a single booking. PATCH covers status transitions
// (Accept/Decline/Move to Pending/Move to Archived, all from BookingsSection)
// and, when accepting a booking with no event_date yet, the date Jonah picks
// in the inline prompt — both fields optional and independent, so one endpoint
// covers "just a status change" and "status + date together." DELETE removes
// the row outright: the Archived tab is a soft "declined" state, so this is the
// hard delete for a request Jonah wants gone for good.

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

const VALID_STATUSES = new Set(["pending", "accepted", "declined"]);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let payload: { status?: unknown; event_date?: unknown };
  try {
    payload = (await request.json()) as { status?: unknown; event_date?: unknown };
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const update: Record<string, unknown> = {};

  if (payload.status !== undefined) {
    if (typeof payload.status !== "string" || !VALID_STATUSES.has(payload.status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }
    update.status = payload.status;
  }

  if (payload.event_date !== undefined) {
    if (payload.event_date !== null && typeof payload.event_date !== "string") {
      return NextResponse.json({ error: "Invalid date." }, { status: 400 });
    }
    update.event_date = payload.event_date;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const { data, error } = await getSupabaseAdmin().from("bookings").update(update).eq("id", id).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ booking: data });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error } = await getSupabaseAdmin().from("bookings").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
