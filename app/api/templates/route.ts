// POST — creates a new custom template, appended after everything currently
// on the shelf (Jonah can drag it earlier from there). Protected by
// middleware.ts (matches /api/templates/:path*).

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let payload: { title?: unknown; body?: unknown };
  try {
    payload = (await request.json()) as { title?: unknown; body?: unknown };
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const body = typeof payload.body === "string" ? payload.body : "";
  if (!title || !body.trim()) {
    return NextResponse.json({ error: "Title and body are both required." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: maxRow } = await supabase
    .from("custom_templates")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextSortOrder = (maxRow?.sort_order ?? -1) + 1;

  const { data, error } = await supabase
    .from("custom_templates")
    .insert({ title, body, sort_order: nextSortOrder })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ template: data });
}
