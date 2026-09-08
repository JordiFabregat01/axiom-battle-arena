/** Who is on the other end of a socket. */
import type { SupabaseClient } from '@supabase/supabase-js';

export interface Identity {
  id: string;
  guest: boolean;
  email: string | null;
  name: string | null;
}

export interface AuthConfig {
  /** Supabase admin client, when accounts are configured. */
  supabase: SupabaseClient | null;
  /** Accept anonymous guest ids. Always true without Supabase; opt-in with it. */
  allowGuests: boolean;
}

const GUEST_ID = /^g-[a-z0-9]{8,48}$/;

export async function identify(input: { token?: string; guestId?: string }, cfg: AuthConfig): Promise<Identity | null> {
  if (input.token && cfg.supabase) {
    const { data, error } = await cfg.supabase.auth.getUser(input.token);
    if (error || !data.user) return null;
    const meta = (data.user.user_metadata ?? {}) as Record<string, unknown>;
    return {
      id: data.user.id,
      guest: false,
      email: data.user.email ?? null,
      name: (meta.full_name as string | undefined) ?? (meta.name as string | undefined) ?? null,
    };
  }
  if (input.guestId && cfg.allowGuests && GUEST_ID.test(input.guestId)) {
    return { id: input.guestId, guest: true, email: null, name: null };
  }
  return null;
}
