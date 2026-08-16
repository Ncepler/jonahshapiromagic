// PATCH / DELETE a single earnings entry — the edit and remove halves of the
// calendar's day editor (DayPopover.tsx). Same shape as the bookings and
// templates id-routes beside it, and behind the same middleware gate.

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { toEarning } from "@/lib/myevents-data";
import { parseAmount } from "@/lib/money";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let payload: { amount?: unknown; note?: unknown };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  // Both fields are optional and independent, so this covers "just the amount"
  // and "amount and note" with one endpoint. The date isn't editable: an entry
  // belongs to the day it was filed under, and moving it is delete-and-re-add.
  const update: Record<string, string | number | null> = {};
  if (payload.amount !== undefined) {
    const amount = parseAmount(payload.amount);
    if (amount === null) return NextResponse.json({ error: "Enter an amount." }, { status: 400 });
    update.amount = amount;
  }
  if (payload.note !== undefined) {
    const note = typeof payload.note === "string" ? payload.note.trim().slice(0, 500) : "";
    update.note = note || null;
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("earnings")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ earning: toEarning(data) });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error } = await getSupabaseAdmin().from("earnings").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
