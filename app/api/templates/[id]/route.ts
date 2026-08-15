// PATCH / DELETE a single custom template. Built-in templates (fixed ids
// from lib/builtin-content.ts) are rejected here too, in addition to the UI
// hiding their "•••" menu — a crafted request shouldn't be able to do what
// the UI won't offer.

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { BUILTIN_TEMPLATE_IDS } from "@/lib/builtin-content";

export const runtime = "nodejs";

const BUILTIN_SET = new Set<string>(BUILTIN_TEMPLATE_IDS);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (BUILTIN_SET.has(id)) {
    return NextResponse.json({ error: "Built-in templates can't be edited." }, { status: 403 });
  }

  let payload: { title?: unknown; body?: unknown };
  try {
    payload = (await request.json()) as { title?: unknown; body?: unknown };
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const update: Record<string, string> = {};
  if (typeof payload.title === "string" && payload.title.trim()) update.title = payload.title.trim();
  if (typeof payload.body === "string" && payload.body.trim()) update.body = payload.body;
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Title and body are both required." }, { status: 400 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("custom_templates")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ template: data });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (BUILTIN_SET.has(id)) {
    return NextResponse.json({ error: "Built-in templates can't be deleted." }, { status: 403 });
  }
  const { error } = await getSupabaseAdmin().from("custom_templates").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
