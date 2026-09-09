/** Where profiles live. The server is the only writer. */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { migrateProfile, totalWins, type Profile } from '../../src/engine/profile';
import { levelFromXp } from '../../src/engine/ranking';
import type { LadderRow } from '../../src/shared/protocol';

export interface Entitlements { plusUntil: number | null; coinGrants: number; }
export interface Loaded { profile: Profile | null; entitlements: Entitlements; }

export interface ProfileStore {
  readonly kind: 'memory' | 'supabase';
  load(userId: string): Promise<Loaded>;
  save(userId: string, profile: Profile): Promise<void>;
  remove(userId: string): Promise<void>;
  ladder(limit: number): Promise<LadderRow[]>;
  /** Is this name (case-insensitively) already used by someone other than `exceptUserId`? */
  nameTaken(name: string, exceptUserId: string | null): Promise<boolean>;
}

const ladderRow = (id: string, p: Profile): LadderRow => ({ id, name: p.name, elo: p.elo, level: levelFromXp(p.xp).level, wins: totalWins(p) });

/** Development store: keeps everything in memory and mirrors it to a JSON file so restarts keep data. */
export class MemoryStore implements ProfileStore {
  readonly kind = 'memory' as const;
  private profiles = new Map<string, Profile>();
  private timer: NodeJS.Timeout | null = null;

  constructor(private file: string | null) {}

  async init() {
    if (!this.file) return;
    try {
      const raw = JSON.parse(await readFile(this.file, 'utf8')) as Record<string, unknown>;
      for (const [id, p] of Object.entries(raw)) {
        const m = migrateProfile(p);
        if (m) this.profiles.set(id, m);
      }
      console.log(`[store] loaded ${this.profiles.size} profiles from ${this.file}`);
    } catch {
      /* no file yet */
    }
  }

  private flush() {
    if (!this.file || this.timer) return;
    this.timer = setTimeout(async () => {
      this.timer = null;
      try {
        await mkdir(dirname(this.file!), { recursive: true });
        await writeFile(this.file!, JSON.stringify(Object.fromEntries(this.profiles)), 'utf8');
      } catch (e) {
        console.warn('[store] could not write', e);
      }
    }, 500);
  }

  async load(userId: string): Promise<Loaded> {
    return { profile: this.profiles.get(userId) ?? null, entitlements: { plusUntil: null, coinGrants: 0 } };
  }
  async save(userId: string, profile: Profile) { this.profiles.set(userId, profile); this.flush(); }
  async remove(userId: string) { this.profiles.delete(userId); this.flush(); }
  async ladder(limit: number) {
    return [...this.profiles.entries()].map(([id, p]) => ladderRow(id, p)).sort((a, b) => b.elo - a.elo).slice(0, limit);
  }
  async nameTaken(name: string, exceptUserId: string | null) {
    const key = name.trim().toLowerCase();
    for (const [id, p] of this.profiles) if (id !== exceptUserId && p.name.trim().toLowerCase() === key) return true;
    return false;
  }
}

/** Production store: Supabase with the service role key (bypasses row-level security). */
export class SupabaseStore implements ProfileStore {
  readonly kind = 'supabase' as const;
  private db: SupabaseClient;
  constructor(url: string, serviceKey: string) {
    this.db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  get client() { return this.db; }

  /** Accounts live in `profiles` (keyed by auth uuid); anonymous guests in `guest_profiles`. */
  private table(userId: string) { return userId.startsWith('g-') ? 'guest_profiles' : 'profiles'; }

  async load(userId: string): Promise<Loaded> {
    const none = { profile: null, entitlements: { plusUntil: null, coinGrants: 0 } };
    if (this.table(userId) === 'guest_profiles') {
      const { data, error } = await this.db.from('guest_profiles').select('data').eq('id', userId).maybeSingle();
      if (error) throw new Error(`load failed: ${error.message}${/guest_profiles/.test(error.message) ? ' (run supabase/migrations/20260909000000_guest_profiles.sql)' : ''}`);
      return data ? { profile: migrateProfile(data.data), entitlements: none.entitlements } : none;
    }
    const { data, error } = await this.db.from('profiles').select('data, plus_until, coin_grants').eq('id', userId).maybeSingle();
    if (error) throw new Error(`load failed: ${error.message}`);
    if (!data) return none;
    return {
      profile: migrateProfile(data.data),
      entitlements: { plusUntil: data.plus_until ? new Date(data.plus_until as string).getTime() : null, coinGrants: (data.coin_grants as number) ?? 0 },
    };
  }
  async save(userId: string, profile: Profile) {
    const row = { id: userId, name: profile.name, elo: profile.elo, level: levelFromXp(profile.xp).level, wins: totalWins(profile), data: profile, updated_at: new Date(profile.updatedAt).toISOString() };
    const { error } = await this.db.from(this.table(userId)).upsert(row, { onConflict: 'id' });
    if (error) throw new Error(`save failed: ${error.message}`);
  }
  async remove(userId: string) {
    const { error } = await this.db.from(this.table(userId)).delete().eq('id', userId);
    if (error) throw new Error(`remove failed: ${error.message}`);
  }
  async ladder(limit: number) {
    const { data, error } = await this.db.from('ladder').select('id, name, elo, level, wins').order('elo', { ascending: false }).limit(limit);
    if (error) throw new Error(`ladder failed: ${error.message}`);
    return (data ?? []) as LadderRow[];
  }
  async nameTaken(name: string, exceptUserId: string | null) {
    // ilike without wildcards is an exact, case-insensitive match; underscores are escaped so they are not treated as wildcards.
    const pattern = name.trim().replace(/[\\%_]/g, (c) => `\\${c}`);
    for (const table of ['profiles', 'guest_profiles'] as const) {
      const { data, error } = await this.db.from(table).select('id').ilike('name', pattern).limit(2);
      if (error) throw new Error(`name check failed: ${error.message}`);
      if ((data ?? []).some((r) => r.id !== exceptUserId)) return true;
    }
    return false;
  }
}

export async function createStore(): Promise<ProfileStore> {
  // SUPABASE_URL is the server's own setting; VITE_SUPABASE_URL is accepted so one .env.local serves both sides locally.
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    console.log('[store] using Supabase');
    return new SupabaseStore(url, key);
  }
  const file = process.env.DATA_FILE ?? 'server/data/profiles.json';
  const store = new MemoryStore(file);
  await store.init();
  console.log(`[store] using in-memory store (mirrored to ${file})`);
  return store;
}
