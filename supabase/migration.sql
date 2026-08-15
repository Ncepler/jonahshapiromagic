-- Jonah Shapiro Magic — /myevents dashboard schema
-- Run this once in the Supabase SQL editor (Project → SQL Editor → New query).
--
-- All three tables are locked down with Row Level Security and NO policies
-- for the anon/authenticated roles — meaning nothing in here is readable or
-- writable from the public site's browser client. The dashboard and the
-- booking-form API route both use the service role key from the server only
-- (see lib/supabase.ts), and the service role bypasses RLS by design, so it
-- doesn't need its own policy to work.

create extension if not exists pgcrypto;

-- ── bookings ─────────────────────────────────────────────────────────────
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

-- No policies are created for anon/authenticated on any of the three tables
-- above — with RLS enabled and zero policies, those roles get zero rows and
-- zero writes. Only the service role (used server-side in lib/supabase.ts)
-- can read or write, because it bypasses RLS entirely.
