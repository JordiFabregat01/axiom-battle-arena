-- Usernames are unique, case-insensitively, within accounts and within guests.
-- (Uniqueness across the two tables is enforced by the game server before every create/rename.)
create unique index if not exists profiles_name_unique on public.profiles (lower(name));
create unique index if not exists guest_profiles_name_unique on public.guest_profiles (lower(name));
