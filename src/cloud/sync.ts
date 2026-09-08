import { supabase } from './supabase';
import { migrateProfile, totalWins, type Profile } from '../state/store';
import { levelFromXp } from '../engine/ranking';

export interface CloudRow {
  profile: Profile | null;
  /** Server-owned entitlements (set by payment webhooks, never by the client). */
  plusUntil: number | null;
  coinGrants: number;
}

export async function fetchCloudProfile(userId: string): Promise<CloudRow | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from('profiles').select('data, plus_until, coin_grants').eq('id', userId).maybeSingle();
  if (error) { console.warn('[cloud] load failed', error.message); return null; }
  if (!data) return { profile: null, plusUntil: null, coinGrants: 0 };
  return {
    profile: migrateProfile(data.data),
    plusUntil: data.plus_until ? new Date(data.plus_until as string).getTime() : null,
    coinGrants: (data.coin_grants as number) ?? 0,
  };
}

export async function pushCloudProfile(userId: string, profile: Profile): Promise<void> {
  if (!supabase) return;
  const row = {
    id: userId,
    name: profile.name,
    elo: profile.elo,
    level: levelFromXp(profile.xp).level,
    wins: totalWins(profile),
    data: profile,
    updated_at: new Date(profile.updatedAt).toISOString(),
  };
  const { error } = await supabase.from('profiles').upsert(row, { onConflict: 'id' });
  if (error) console.warn('[cloud] save failed', error.message);
}

export interface CloudLadderRow { id: string; name: string; elo: number; level: number; wins: number; }

export async function fetchCloudLadder(limit = 100): Promise<CloudLadderRow[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from('ladder').select('id, name, elo, level, wins').order('elo', { ascending: false }).limit(limit);
  if (error) { console.warn('[cloud] ladder failed', error.message); return null; }
  return (data as CloudLadderRow[]) ?? [];
}
