import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/** Accounts and cloud saves switch on when both env vars exist (see .env.example).
 *  Without them the game runs in guest mode with progress kept in this browser. */
/** The dashboard sometimes shows the URL with a /rest/v1/ suffix; the client needs the bare project origin. */
const url = ((import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? '').trim().replace(/\/(rest|auth)\/v1\/?$/, '').replace(/\/+$/, '') || undefined;
const anonKey = ((import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? '').trim() || undefined;

export const supabase: SupabaseClient | null = url && anonKey ? createClient(url, anonKey) : null;
export const cloudConfigured = supabase !== null;
