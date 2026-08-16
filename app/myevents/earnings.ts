// Everything the Earnings section computes, kept out of the components that
// render it. Pure functions over the rows — no fetching, no state — so the
// definitions below are in one readable place rather than spread across JSX.

import { format, parseISO, startOfWeek } from "date-fns";
import type { Booking, Earning } from "@/lib/db-types";

/** Every entry filed under a given day, keyed by "yyyy-MM-dd". A day can hold
 *  several: one row is one payment, not one day's takings. */
export function earningsByDay(earnings: Earning[]): Map<string, Earning[]> {
  const byDay = new Map<string, Earning[]>();
  for (const e of earnings) {
    byDay.set(e.event_date, [...(byDay.get(e.event_date) ?? []), e]);
  }
  return byDay;
}

export function sumAmounts(earnings: Earning[]): number {
  return earnings.reduce((total, e) => total + e.amount, 0);
}

/**
 * The mean of the per-BUCKET totals, over buckets that have at least one entry.
 *
 * The "at least one entry" part is the whole definition and it is worth being
 * explicit about: this is not total ÷ elapsed months. A month Jonah didn't work
 * is not a month that averaged zero — it isn't in the sample at all. Dividing by
 * the calendar instead would mean a quiet January permanently dragging down what
 * a working month looks like, which is the opposite of what the number is for.
 */
function averagePerBucket(earnings: Earning[], keyOf: (e: Earning) => string): number {
  const totals = new Map<string, number>();
  for (const e of earnings) {
    const key = keyOf(e);
    totals.set(key, (totals.get(key) ?? 0) + e.amount);
  }
  if (totals.size === 0) return 0;
  let sum = 0;
  for (const value of totals.values()) sum += value;
  return sum / totals.size;
}

const monthKey = (e: Earning) => format(parseISO(e.event_date), "yyyy-MM");
// Sunday-start, matching the calendar's own week (CalendarWeek/CalendarMonth
// both use date-fns' default) — so "this week" means the same thing in the
// stats as it does in the grid above them.
const weekKey = (e: Earning) => format(startOfWeek(parseISO(e.event_date)), "yyyy-MM-dd");

export function averageMonthly(earnings: Earning[]): number {
  return averagePerBucket(earnings, monthKey);
}

export function averageWeekly(earnings: Earning[]): number {
  return averagePerBucket(earnings, weekKey);
}

/** How many distinct months / weeks are actually in the sample — shown under
 *  each average, because "$800 a month" means something different across two
 *  months than across twenty. */
export function bucketCounts(earnings: Earning[]): { months: number; weeks: number } {
  return {
    months: new Set(earnings.map(monthKey)).size,
    weeks: new Set(earnings.map(weekKey)).size,
  };
}

/**
 * One person, one key. Email first, then phone, then name.
 *
 * The booking form doesn't collect a phone number today — there is no phone
 * column in `bookings` (see supabase/migration.sql) — so in practice this runs
 * email → name. The middle rung reads the field defensively rather than being
 * dropped, so adding one later is a schema change and nothing else.
 *
 * Normalising matters more than the order does: "Sam@Gmail.com " and
 * "sam@gmail.com" are one customer, and so are "Sam  Vance" and "sam vance".
 * Without that, the count is a count of spellings.
 */
export function customerKey(booking: Booking): string {
  const email = booking.email?.trim().toLowerCase();
  if (email) return `email:${email}`;

  const rawPhone = (booking as Booking & { phone?: string | null }).phone;
  const phone = typeof rawPhone === "string" ? rawPhone.replace(/\D/g, "") : "";
  if (phone) return `phone:${phone}`;

  return `name:${booking.name.trim().toLowerCase().replace(/\s+/g, " ")}`;
}

/**
 * How many customers have booked more than once. Counts every row in
 * `bookings` regardless of status — someone who booked twice and was declined
 * once is still someone who came back, which is the thing being measured.
 */
export function repeatCustomerCount(bookings: Booking[]): number {
  const seen = new Map<string, number>();
  for (const b of bookings) {
    const key = customerKey(b);
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  let repeats = 0;
  for (const count of seen.values()) if (count > 1) repeats++;
  return repeats;
}

/** "$150", "$1,250.50" — cents only when there are any, so a whole-dollar
 *  booking doesn't render as "$150.00" everywhere. */
export function formatMoney(amount: number): string {
  const cents = Math.abs(Math.round(amount * 100) % 100) !== 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  }).format(amount);
}

/** The same number in the width of a calendar cell: "$150", "$1.2k". */
export function formatMoneyCompact(amount: number): string {
  if (amount >= 10000) return `$${Math.round(amount / 1000)}k`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}k`;
  return `$${Math.round(amount)}`;
}
