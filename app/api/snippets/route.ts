// POST — creates a new custom snippet, appended after everything currently
// in the grid. Protected by middleware.ts (matches /api/snippets/:path*).

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let payload: { label?: unknown; body?: unknown };
  try {
    payload = (await request.json()) as { label?: unknown; body?: unknown };
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const label = typeof payload.label === "string" ? payload.label.trim() : "";
  const body = typeof payload.body === "string" ? payload.body : "";
  if (!label || !body.trim()) {
    return NextResponse.json({ error: "Label and body are both required." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: maxRow } = await supabase
    .from("snippets")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextSortOrder = (maxRow?.sort_order ?? -1) + 1;

  const { data, error } = await supabase
    .from("snippets")
    .insert({ label, body, sort_order: nextSortOrder })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ snippet: data });
}
