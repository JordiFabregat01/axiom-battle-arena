-- Run this once the game server is deployed: it becomes the only writer of profiles
-- (through the service role), so browsers lose direct write access.
drop policy if exists "players insert own profile" on public.profiles;
drop policy if exists "players update own profile" on public.profiles;
