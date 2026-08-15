import { format, parseISO } from "date-fns";

/** `bookings.event_date` (a Postgres `date`, e.g. "2026-09-12") → "Sep 12, 2026",
 * or the muted "Date TBD" fallback the Bookings list and Calendar both use. */
export function formatEventDate(dateStr: string | null): string {
  if (!dateStr) return "Date TBD";
  return format(parseISO(dateStr), "MMM d, yyyy");
}

/** `bookings.created_at` (timestamptz) → "Sep 12, 2026 at 4:05 PM". */
export function formatSubmittedOn(iso: string): string {
  return format(parseISO(iso), "MMM d, yyyy 'at' h:mm a");
}
