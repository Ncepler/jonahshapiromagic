// Server-only data access for the /myevents dashboard. Every function here
// goes through the service-role Supabase client (lib/supabase.ts) — never
// imported from a "use client" file.

import { getSupabaseAdmin } from "./supabase";
import { BUILTIN_SNIPPETS, BUILTIN_TEMPLATES } from "./builtin-content";
import type { Booking, CustomTemplate, Earning, Snippet } from "./db-types";

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

/**
 * The one place a raw `earnings` row becomes an Earning.
 *
 * `amount` is numeric(12,2) in Postgres, and PostgREST serialises numerics as
 * JSON strings rather than numbers — deliberately, so a value can't lose
 * precision on the way through a float. That means every row arrives with
 * amount: "150.00", and anything that adds them up without coercing first gets
 * string concatenation instead of a total. Coercing once, here, is what lets
 * the rest of the app treat Earning.amount as the number it claims to be.
 */
export function toEarning(row: Record<string, unknown>): Earning {
  return {
    id: String(row.id),
    created_at: String(row.created_at),
    event_date: String(row.event_date),
    amount: Number(row.amount) || 0,
    note: typeof row.note === "string" ? row.note : null,
  };
}

/** PostgREST's code for "that table isn't in the schema", and Postgres' own for
 *  undefined_table underneath it. See getEarnings(). */
const MISSING_TABLE_CODES = new Set(["PGRST205", "42P01"]);

export async function getEarnings(): Promise<Earning[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("earnings")
    .select("*")
    .order("event_date", { ascending: false });

  if (error) {
    // `earnings` is newer than the rest of the schema, so there is a real window
    // — between deploying this and pasting supabase/migration.sql — where the
    // table doesn't exist yet. Throwing here would take the ENTIRE dashboard
    // down with it (this runs in the page's own data fetch), which is a wildly
    // disproportionate failure for one section that would simply be empty.
    // Every other error still throws; only "no such table" degrades.
    if (MISSING_TABLE_CODES.has(error.code ?? "")) {
      console.warn(
        "[myevents] No `earnings` table yet — the Earnings section will be empty. " +
          "Run supabase/migration.sql in the Supabase SQL editor to create it.",
      );
      return [];
    }
    throw new Error(`Failed to load earnings: ${error.message}`);
  }
  return (data ?? []).map(toEarning);
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
