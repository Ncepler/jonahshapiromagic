-- Jonah Shapiro Magic — /myevents dashboard schema
-- Run this once in the Supabase SQL editor (Project → SQL Editor → New query).
--
-- This is the WHOLE schema, not a patch: paste the entire file and run it. Every
-- statement is idempotent (`create table if not exists`, and RLS is already on
-- once it's on), so running it again on a project that already has some of these
-- tables is safe and won't touch existing rows.
--
-- All four tables are locked down with Row Level Security and NO policies
-- for the anon/authenticated roles — meaning nothing in here is readable or
-- writable from the public site's browser client. The dashboard and the
-- booking-form API route both use the service role key from the server only
-- (see lib/supabase.ts), and the service role bypasses RLS by design, so it
-- doesn't need its own policy to work.

create extension if not exists pgcrypto;

-- ── bookings ─────────────────────────────────────────────────────────────
-- Written by the public booking form (app/api/book/route.ts) and read/updated
-- by the dashboard. Also the source for the repeat-customer count in the
-- Earnings section, which groups these rows by email → name.
create table if not exists public.bookings (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  status              text not null default 'pending'
                        check (status in ('pending', 'accepted', 'declined')),
  name                text not null,
  email               text not null,
  event_type          text,
  event_date          date,
  location            text,
  headcount           int,
  notes               text,
  wants_branded_decks boolean not null default false
);

alter table public.bookings enable row level security;

-- ── custom_templates ─────────────────────────────────────────────────────
create table if not exists public.custom_templates (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  title       text not null,
  body        text not null,
  sort_order  int not null default 0
);

alter table public.custom_templates enable row level security;

-- ── snippets ─────────────────────────────────────────────────────────────
create table if not exists public.snippets (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  label       text not null,
  body        text not null,
  sort_order  int not null default 0
);

alter table public.snippets enable row level security;

-- ── earnings ─────────────────────────────────────────────────────────────
-- What Jonah made, entered by hand against a date on the dashboard calendar.
-- Deliberately NOT linked to `bookings`: plenty of paid work never came through
-- the form, and a booking can be worth a different number than whatever was
-- quoted. One row is one payment on one day; a day can hold several.
--
-- `amount` is numeric(12, 2) rather than a float — money in binary floating
-- point accumulates rounding error, and the Earnings section sums and averages
-- this column.
create table if not exists public.earnings (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  event_date  date not null,
  amount      numeric(12, 2) not null,
  note        text
);

-- The calendar reads these a month or a week at a time, so the lookup is always
-- by date.
create index if not exists earnings_event_date_idx on public.earnings (event_date);

alter table public.earnings enable row level security;

-- No policies are created for anon/authenticated on any of the four tables
-- above — with RLS enabled and zero policies, those roles get zero rows and
-- zero writes. Only the service role (used server-side in lib/supabase.ts)
-- can read or write, because it bypasses RLS entirely.
