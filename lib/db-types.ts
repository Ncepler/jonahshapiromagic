// Row shapes for the three /myevents tables (see supabase/migration.sql).
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
