// PATCH / DELETE a single custom snippet. Built-in snippets (fixed ids from
// lib/builtin-content.ts) are rejected here too, mirroring
// app/api/templates/[id]/route.ts.

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { BUILTIN_SNIPPET_IDS } from "@/lib/builtin-content";

export const runtime = "nodejs";

const BUILTIN_SET = new Set<string>(BUILTIN_SNIPPET_IDS);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (BUILTIN_SET.has(id)) {
    return NextResponse.json({ error: "Built-in snippets can't be edited." }, { status: 403 });
  }

  let payload: { label?: unknown; body?: unknown };
  try {
    payload = (await request.json()) as { label?: unknown; body?: unknown };
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const update: Record<string, string> = {};
  if (typeof payload.label === "string" && payload.label.trim()) update.label = payload.label.trim();
  if (typeof payload.body === "string" && payload.body.trim()) update.body = payload.body;
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Label and body are both required." }, { status: 400 });
  }

  const { data, error } = await getSupabaseAdmin().from("snippets").update(update).eq("id", id).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ snippet: data });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (BUILTIN_SET.has(id)) {
    return NextResponse.json({ error: "Built-in snippets can't be deleted." }, { status: 403 });
  }
  const { error } = await getSupabaseAdmin().from("snippets").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
