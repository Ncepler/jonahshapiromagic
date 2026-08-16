// Row shapes for the four /myevents tables (see supabase/migration.sql).
// Shared between server routes and the dashboard's client components.

export type BookingStatus = "pending" | "accepted" | "declined";

export type Booking = {
  id: string;
  created_at: string;
  status: BookingStatus;
  name: string;
  email: string;
  event_type: string | null;
  event_date: string | null; // YYYY-MM-DD
  location: string | null;
  headcount: number | null;
  notes: string | null;
  wants_branded_decks: boolean;
};

export type CustomTemplate = {
  id: string;
  created_at: string;
  title: string;
  body: string;
  sort_order: number;
};

export type Snippet = {
  id: string;
  created_at: string;
  label: string;
  body: string;
  sort_order: number;
};

export type Earning = {
  id: string;
  created_at: string;
  event_date: string; // YYYY-MM-DD
  /** Dollars. The column is numeric(12,2), and PostgREST hands numerics back as
   *  JSON *strings* to avoid float rounding — so this is a number only because
   *  toEarning() in lib/myevents-data.ts coerces it at the boundary. Nothing
   *  should read a raw earnings row without going through that. */
  amount: number;
  note: string | null;
};
