-- Fixes for the Supabase Security Advisor findings. Safe to run more than once.

-- 1. "Security Definer View": the ladder view must run with the caller's privileges so
--    row-level security applies. The game server reads it with the service role (unaffected).
alter view public.ladder set (security_invoker = true);

-- 2. "Auth RLS Initialization Plan": evaluate auth.uid() once per query, not once per row.
drop policy if exists "profiles readable by players" on public.profiles;
create policy "profiles readable by players"
  on public.profiles for select to authenticated using (true);

drop policy if exists "players see own purchases" on public.purchases;
create policy "players see own purchases"
  on public.purchases for select to authenticated using ((select auth.uid()) = user_id);

-- The browser-side insert/update policies on profiles were removed by 20260909100000_server_only.sql
-- (the game server is the only writer). If you ever re-enable them, write them as
--   with check ((select auth.uid()) = id)

-- 3. "Function Search Path Mutable": pin the search path (all objects inside are schema-qualified).
alter function public.protect_entitlements() set search_path = '';
alter function public.grant_coins(uuid, integer) set search_path = '';
alter function public.set_plus(uuid, timestamptz, text) set search_path = '';

-- 4. "Public / Signed-In Users Can Execute SECURITY DEFINER Function": Supabase grants execute to
--    anon and authenticated by default, so revoking from PUBLIC alone is not enough.
revoke execute on function public.grant_coins(uuid, integer) from public, anon, authenticated;
revoke execute on function public.set_plus(uuid, timestamptz, text) from public, anon, authenticated;
grant execute on function public.grant_coins(uuid, integer) to service_role;
grant execute on function public.set_plus(uuid, timestamptz, text) to service_role;

-- 5. "Leaked Password Protection Disabled" is a dashboard switch, not SQL:
--    Authentication → Settings → Password security → enable "Leaked password protection".
