// Shared UI-only types for the dashboard (not DB row shapes — see
// lib/db-types.ts for those).

/** The three Bookings-section tabs (Group 7). "archived" is presentation
 * only — it maps to the underlying `declined` booking status. */
export type BookingsTab = "pending" | "accepted" | "archived";
