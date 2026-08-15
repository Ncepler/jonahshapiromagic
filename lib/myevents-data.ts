// Server-only data access for the /myevents dashboard. Every function here
// goes through the service-role Supabase client (lib/supabase.ts) — never
// imported from a "use client" file.

import { getSupabaseAdmin } from "./supabase";
import { BUILTIN_SNIPPETS, BUILTIN_TEMPLATES } from "./builtin-content";
import type { Booking, CustomTemplate, Snippet } from "./db-types";

export async function getBookings(): Promise<Booking[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("bookings")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to load bookings: ${error.message}`);
  return data ?? [];
}

/** Fetches `custom_templates`, seeding the four built-ins (see
 * lib/builtin-content.ts) the first time the table is found empty. */
export async function getOrSeedTemplates(): Promise<CustomTemplate[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("custom_templates").select("*").order("sort_order", { ascending: true });
  if (error) throw new Error(`Failed to load templates: ${error.message}`);

  if (data && data.length > 0) return data;

  const { data: seeded, error: seedError } = await supabase
    .from("custom_templates")
    .insert(BUILTIN_TEMPLATES)
    .select("*");
  if (seedError) throw new Error(`Failed to seed templates: ${seedError.message}`);
  return (seeded ?? []).sort((a, b) => a.sort_order - b.sort_order);
}

/** Fetches `snippets`, seeding the six built-ins the first time the table
 * is found empty. */
export async function getOrSeedSnippets(): Promise<Snippet[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("snippets").select("*").order("sort_order", { ascending: true });
  if (error) throw new Error(`Failed to load snippets: ${error.message}`);

  if (data && data.length > 0) return data;

  const { data: seeded, error: seedError } = await supabase.from("snippets").insert(BUILTIN_SNIPPETS).select("*");
  if (seedError) throw new Error(`Failed to seed snippets: ${seedError.message}`);
  return (seeded ?? []).sort((a, b) => a.sort_order - b.sort_order);
}
