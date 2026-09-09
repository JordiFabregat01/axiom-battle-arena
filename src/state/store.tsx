import { createContext, useCallback, useContext, useEffect, useReducer, useRef, useState, type ReactNode } from 'react';
import { reducer, migrateProfile, isClientIntent, type Action, type ClientIntent, type Profile } from '../engine/profile';

export * from '../engine/profile';

const LEGACY_KEY = 'axiom-arena.profile.v1';

export function loadProfile(storageKey: string): Profile | null {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) return migrateProfile(JSON.parse(raw));
    // First run after the v2 upgrade: adopt the old single-profile save as the guest profile.
    if (storageKey.endsWith(':guest')) {
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy) {
        const migrated = migrateProfile(JSON.parse(legacy));
        if (migrated) {
          saveProfile(storageKey, migrated);
          localStorage.removeItem(LEGACY_KEY);
          return migrated;
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function saveProfile(storageKey: string, p: Profile | null) {
  try {
    if (p) localStorage.setItem(storageKey, JSON.stringify(p));
    else localStorage.removeItem(storageKey);
  } catch {
    /* storage unavailable: play without persistence */
  }
}

/** When the game server is connected, client intents go there instead of the local reducer. */
export type RemoteDispatch = (intent: ClientIntent) => Promise<Profile | null>;

interface Store {
  profile: Profile | null;
  dispatch: (a: Action) => void;
  storageKey: string;
  /** True when a server owns this profile (the browser only displays it). */
  authoritative: boolean;
  /** Last rejection from the server for a client intent (e.g. "That name is already taken."). */
  error: { message: string; id: number } | null;
}
const StoreContext = createContext<Store | null>(null);

interface ProviderProps {
  storageKey: string;
  children: ReactNode;
  /** Present when the game server is connected: intents are sent there. */
  remote?: RemoteDispatch | null;
  /** Called after every local change. */
  onChange?: (profile: Profile | null) => void;
}

export function StoreProvider({ storageKey, children, remote, onChange }: ProviderProps) {
  const [profile, localDispatch] = useReducer(reducer, storageKey, loadProfile);
  const [error, setError] = useState<{ message: string; id: number } | null>(null);
  const first = useRef(true);
  const remoteRef = useRef(remote);
  remoteRef.current = remote;

  useEffect(() => {
    saveProfile(storageKey, profile);
    if (first.current) { first.current = false; return; }
    onChange?.(profile);
  }, [profile, storageKey, onChange]);

  const dispatch = useCallback((action: Action) => {
    const r = remoteRef.current;
    if (r && isClientIntent(action)) {
      r(action)
        .then((p) => localDispatch({ type: 'load', profile: p }))
        .catch((e) => setError({ message: e instanceof Error ? e.message : 'The server rejected that', id: Date.now() }));
      return;
    }
    localDispatch(action);
  }, []);

  return <StoreContext.Provider value={{ profile, dispatch, storageKey, authoritative: !!remote, error }}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const s = useContext(StoreContext);
  if (!s) throw new Error('useStore must be used inside StoreProvider');
  return s;
}

/** Use only on screens that are guaranteed to have a profile. */
export function useProfile(): { profile: Profile; dispatch: (a: Action) => void } {
  const { profile, dispatch } = useStore();
  if (!profile) throw new Error('No profile yet');
  return { profile, dispatch };
}
