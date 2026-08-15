// POST { order: [{ id, sort_order }, ...] } — persists a drag-reorder of
// the template row (built-ins and custom templates together; either can
// move, since only edit/delete is restricted for built-ins, not ordering).

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let payload: { order?: unknown };
  try {
    payload = (await request.json()) as { order?: unknown };
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  if (!Array.isArray(payload.order)) {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  for (const entry of payload.order as Array<{ id?: unknown; sort_order?: unknown }>) {
    if (typeof entry.id !== "string" || typeof entry.sort_order !== "number") continue;
    const { error } = await supabase.from("custom_templates").update({ sort_order: entry.sort_order }).eq("id", entry.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
