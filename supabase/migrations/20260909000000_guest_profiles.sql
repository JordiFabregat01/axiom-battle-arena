-- Anonymous guests (ids like g-…) are not auth users, so they get their own table.
-- Only the game server (service role) reads or writes it; browsers have no access.
create table if not exists public.guest_profiles (
  id          text primary key check (id ~ '^g-[a-z0-9]{8,48}$'),
  name        text not null default 'Player',
  elo         integer not null default 1000,
  level       integer not null default 1,
  wins        integer not null default 0,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);
alter table public.guest_profiles enable row level security;

-- The ladder shows accounts and guests together.
drop view if exists public.ladder;
create view public.ladder as
  select id::text as id, name, elo, level, wins from public.profiles
  union all
  select id, name, elo, level, wins from public.guest_profiles;
grant select on public.ladder to authenticated;
