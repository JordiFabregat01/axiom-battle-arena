-- Axiom Arena · database schema for Supabase (Postgres)
-- Run this in the SQL editor of your Supabase project, or with `supabase db push`.

-- One row per account. The whole game profile lives in `data` (written by the client);
-- `plus_until` and `coin_grants` are server-owned and only changed by payment webhooks.
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null default 'Player',
  elo         integer not null default 1000,
  level       integer not null default 1,
  wins        integer not null default 0,
  data        jsonb not null default '{}'::jsonb,
  plus_until  timestamptz,
  coin_grants integer not null default 0,
  stripe_customer_id text,
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles readable by players" on public.profiles;
create policy "profiles readable by players"
  on public.profiles for select to authenticated using (true);

drop policy if exists "players insert own profile" on public.profiles;
create policy "players insert own profile"
  on public.profiles for insert to authenticated with check (auth.uid() = id);

drop policy if exists "players update own profile" on public.profiles;
create policy "players update own profile"
  on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Clients may never change entitlements; the service role (webhooks) may.
create or replace function public.protect_entitlements()
returns trigger language plpgsql as $$
begin
  if auth.role() = 'authenticated' then
    new.plus_until := old.plus_until;
    new.coin_grants := old.coin_grants;
    new.stripe_customer_id := old.stripe_customer_id;
  end if;
  return new;
end $$;

drop trigger if exists profiles_protect_entitlements on public.profiles;
create trigger profiles_protect_entitlements
  before update on public.profiles
  for each row execute function public.protect_entitlements();

-- ▶ When the game server (server/) is deployed it becomes the only writer, using the service role.
--   Run these two lines then, so browsers can no longer write profiles at all:
--     drop policy if exists "players insert own profile" on public.profiles;
--     drop policy if exists "players update own profile" on public.profiles;

-- Public standings (no game data).
create or replace view public.ladder as
  select id, name, elo, level, wins from public.profiles;
grant select on public.ladder to authenticated;

-- Purchase log, keyed by Stripe event id so webhooks are idempotent.
create table if not exists public.purchases (
  id          text primary key,
  user_id     uuid references auth.users (id) on delete set null,
  sku         text not null,
  amount_cents integer,
  created_at  timestamptz not null default now()
);
alter table public.purchases enable row level security;
drop policy if exists "players see own purchases" on public.purchases;
create policy "players see own purchases"
  on public.purchases for select to authenticated using (auth.uid() = user_id);

-- Helpers used by the webhook (service role only).
create or replace function public.grant_coins(p_user uuid, p_amount integer)
returns void language sql security definer as $$
  update public.profiles set coin_grants = coin_grants + p_amount where id = p_user;
$$;
revoke all on function public.grant_coins(uuid, integer) from public;

create or replace function public.set_plus(p_user uuid, p_until timestamptz, p_customer text)
returns void language sql security definer as $$
  update public.profiles
    set plus_until = greatest(coalesce(plus_until, p_until), p_until),
        stripe_customer_id = coalesce(p_customer, stripe_customer_id)
  where id = p_user;
$$;
revoke all on function public.set_plus(uuid, timestamptz, text) from public;
