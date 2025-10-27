-- Supabase SQL schema for poker tracking
-- Run this in Supabase SQL editor or migrations

-- Ensure UUID generator is available
create extension if not exists pgcrypto;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

-- Optional structured tables if you want more granular analytics
create table if not exists public.hands (
  id uuid primary key default gen_random_uuid(),
  hand_number int not null,
  game_state jsonb not null,
  community_cards jsonb not null,
  user_hole_cards jsonb not null,
  pot_size int not null,
  betting_round text not null,
  outcome text,
  players jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_recommendations (
  id uuid primary key default gen_random_uuid(),
  hand_id uuid references public.hands(id) on delete cascade,
  recommendation jsonb not null,
  actual_outcome text,
  was_followed boolean,
  created_at timestamptz not null default now()
);

create table if not exists public.player_actions (
  id uuid primary key default gen_random_uuid(),
  hand_id uuid references public.hands(id) on delete cascade,
  player_id int not null,
  player_name text not null,
  action text not null,
  amount int not null,
  betting_round text not null,
  position text not null,
  stack_before int not null,
  stack_after int not null,
  created_at timestamptz not null default now()
);

-- RLS policies (adjust as needed). For simple write-only public ingestion:
alter table public.events enable row level security;
-- Use WITH CHECK (required for INSERT)
drop policy if exists "ingest events" on public.events;
create policy "ingest events" on public.events for insert to anon, authenticated with check (true);
-- Optional read access
drop policy if exists "read events" on public.events;
create policy "read events" on public.events for select to anon, authenticated using (true);
-- Consider stricter policies for other tables.
