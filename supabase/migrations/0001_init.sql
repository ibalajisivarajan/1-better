-- =============================================================================
-- Migration: 0001_init.sql
-- "1% Better" PWA — initial schema
-- =============================================================================

-- ---------------------------------------------------------------------------
-- TABLES
-- ---------------------------------------------------------------------------

create table public.profiles (
  user_id        uuid        primary key references auth.users(id) on delete cascade,
  start_date     date        not null default '2026-06-14',
  timezone       text        not null default 'America/Vancouver',
  nudge_times    text[]      not null default array['08:00','13:00','18:00','21:00'],
  nudges_enabled boolean     not null default true,
  created_at     timestamptz not null default now()
);

create table public.daily_log (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references auth.users(id) on delete cascade,
  done_date      date        not null,
  week_number    int         not null,
  mission_area   text        not null,
  mission_action text        not null,
  done_at        timestamptz not null default now(),
  unique (user_id, done_date)
);

create table public.push_subscriptions (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  endpoint   text        not null,
  p256dh     text        not null,
  auth_key   text        not null,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

create table public.missions (
  week_number int  primary key,
  area        text not null,
  action      text not null,
  why         text not null,
  micro       text not null
);

-- ---------------------------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------------------------

create index idx_daily_log_user_date
  on public.daily_log (user_id, done_date);

create index idx_daily_log_user_week
  on public.daily_log (user_id, week_number);

create index idx_push_subscriptions_user
  on public.push_subscriptions (user_id);

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------

alter table public.profiles          enable row level security;
alter table public.daily_log         enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.missions          enable row level security;

-- profiles -----------------------------------------------------------------

create policy "profiles: own row select"
  on public.profiles
  for select
  using (auth.uid() = user_id);

create policy "profiles: own row insert"
  on public.profiles
  for insert
  with check (auth.uid() = user_id);

create policy "profiles: own row update"
  on public.profiles
  for update
  using (auth.uid() = user_id);

create policy "profiles: own row delete"
  on public.profiles
  for delete
  using (auth.uid() = user_id);

-- daily_log ----------------------------------------------------------------

create policy "daily_log: own rows select"
  on public.daily_log
  for select
  using (auth.uid() = user_id);

create policy "daily_log: own rows insert"
  on public.daily_log
  for insert
  with check (auth.uid() = user_id);

create policy "daily_log: own rows update"
  on public.daily_log
  for update
  using (auth.uid() = user_id);

create policy "daily_log: own rows delete"
  on public.daily_log
  for delete
  using (auth.uid() = user_id);

-- push_subscriptions -------------------------------------------------------

create policy "push_subscriptions: own rows select"
  on public.push_subscriptions
  for select
  using (auth.uid() = user_id);

create policy "push_subscriptions: own rows insert"
  on public.push_subscriptions
  for insert
  with check (auth.uid() = user_id);

create policy "push_subscriptions: own rows update"
  on public.push_subscriptions
  for update
  using (auth.uid() = user_id);

create policy "push_subscriptions: own rows delete"
  on public.push_subscriptions
  for delete
  using (auth.uid() = user_id);

-- missions -----------------------------------------------------------------
-- Any authenticated user may read; writes are admin-only (no user policy)

create policy "missions: authenticated read"
  on public.missions
  for select
  using (auth.uid() is not null);

-- ---------------------------------------------------------------------------
-- AUTO-CREATE PROFILE TRIGGER
-- ---------------------------------------------------------------------------

-- Function runs with elevated privileges so it can write to public.profiles
-- even before the user's own RLS policies are in effect.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id)
  values (new.id)
  on conflict do nothing;
  return new;
end;
$$;

-- Revoke default PUBLIC execute, then grant only to supabase_auth_admin
-- (the role that fires auth-level triggers in hosted Supabase).
revoke execute on function public.handle_new_user() from public;
grant  execute on function public.handle_new_user() to supabase_auth_admin;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();
