import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase, cloudConfigured } from './supabase';

export interface AuthUser { id: string; email: string | null; name: string | null; }

interface AuthApi {
  configured: boolean;
  loading: boolean;
  user: AuthUser | null;
  signInEmail: (email: string, password: string) => Promise<string | null>;
  signUpEmail: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthApi>({
  configured: false, loading: false, user: null,
  signInEmail: async () => 'Accounts are not configured', signUpEmail: async () => 'Accounts are not configured',
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

function toUser(u: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null | undefined): AuthUser | null {
  if (!u) return null;
  const meta = u.user_metadata ?? {};
  const name = (meta.full_name as string | undefined) ?? (meta.name as string | undefined) ?? null;
  return { id: u.id, email: u.email ?? null, name };
}

/** Email + password accounts through Supabase. Other providers (Google, etc.) can be added here later. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(cloudConfigured);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setUser(toUser(data.session?.user));
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(toUser(session?.user));
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signInEmail = useCallback(async (email: string, password: string) => {
    if (!supabase) return 'Accounts are not configured on this deployment.';
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? error.message : null;
  }, []);

  const signUpEmail = useCallback(async (email: string, password: string) => {
    if (!supabase) return 'Accounts are not configured on this deployment.';
    const { error, data } = await supabase.auth.signUp({ email, password });
    if (error) return error.message;
    if (data.user && !data.session) return 'Check your inbox to confirm your email, then sign in.';
    return null;
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<AuthApi>(() => ({ configured: cloudConfigured, loading, user, signInEmail, signUpEmail, signOut }), [loading, user, signInEmail, signUpEmail, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
