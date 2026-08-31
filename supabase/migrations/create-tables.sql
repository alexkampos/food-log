-- ============================================================================
-- Food Log App — Supabase schema
-- Run this in: Supabase Dashboard -> SQL Editor -> New query -> Run
-- ----------------------------------------------------------------------------
-- Tables:
--   profiles  : one row per user (created automatically on sign-up)
--   logs      : one row per logged food entry
-- Row Level Security ensures each user only sees/edits their own rows.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) profiles table
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  username   text,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- 2) logs table
-- ---------------------------------------------------------------------------
-- The "items" array (food name, quantity, unit, c/p/c/f, source) is stored as
-- a single jsonb column, matching the shape the app already produces.
create table if not exists public.logs (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users(id) on delete cascade,
  date      date not null,
  meal      text not null default 'snack',
  items     jsonb not null default '[]'::jsonb,
  raw_input text,
  created_at timestamptz default now()
);

create index if not exists logs_user_date_idx on public.logs (user_id, date);

-- ---------------------------------------------------------------------------
-- 3) Auto-create a profile row when a new user signs up
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 4) ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.logs    enable row level security;

-- profiles: a user can read/update their own profile
drop policy if exists "own profile read" on public.profiles;
create policy "own profile read" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles
  for update using (auth.uid() = id);

-- logs: a user can do anything with their own logs only
drop policy if exists "own logs select" on public.logs;
create policy "own logs select" on public.logs
  for select using (auth.uid() = user_id);

drop policy if exists "own logs insert" on public.logs;
create policy "own logs insert" on public.logs
  for insert with check (auth.uid() = user_id);

drop policy if exists "own logs update" on public.logs;
create policy "own logs update" on public.logs
  for update using (auth.uid() = user_id);

drop policy if exists "own logs delete" on public.logs;
create policy "own logs delete" on public.logs
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 5) GRANT table privileges to Supabase roles
--    RLS filters rows; these grants let the REST/Data API (PostgREST) access
--    the tables at all. Without them you'll see "permission denied for table".
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant all on public.logs to authenticated, anon;
grant all on public.profiles to authenticated, anon;
grant usage on all sequences in schema public to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6) Auto-set user_id on insert (so the client never has to send it and RLS
--    never rejects an insert for a missing/mismatched user_id).
-- ---------------------------------------------------------------------------
create or replace function public.set_log_user_id()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  new.user_id := auth.uid();
  return new;
end;
$$;

drop trigger if exists set_log_user_id on public.logs;
create trigger set_log_user_id
  before insert on public.logs
  for each row execute function public.set_log_user_id();

