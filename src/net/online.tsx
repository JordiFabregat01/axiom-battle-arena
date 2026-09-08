import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { arenaSocket, guestId, onlineEnabled, type SocketStatus } from './socket';
import { useStore } from '../state/store';
import { useAuth } from '../cloud/auth';
import { supabase } from '../cloud/supabase';
import type { ServerMessage } from '../shared/protocol';

interface OnlineApi {
  enabled: boolean;
  status: SocketStatus;
  /** True once the server has said hello back and handed us the profile. */
  ready: boolean;
  userId: string | null;
  error: string | null;
}

const OnlineContext = createContext<OnlineApi>({ enabled: false, status: 'idle', ready: false, userId: null, error: null });
export const useOnline = () => useContext(OnlineContext);

/** Connects to the game server, identifies the player and mirrors every profile the server sends into the store. */
export function OnlineProvider({ children }: { children: ReactNode }) {
  const { dispatch } = useStore();
  const { user, configured } = useAuth();
  const [status, setStatus] = useState<SocketStatus>(arenaSocket?.status ?? 'idle');
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!arenaSocket) return;
    const socket = arenaSocket;
    let cancelled = false;

    const hello = async () => {
      setReady(false);
      let token: string | undefined;
      if (configured && user && supabase) token = (await supabase.auth.getSession()).data.session?.access_token;
      try {
        const welcome = await socket.request<Extract<ServerMessage, { type: 'welcome' }>>({ type: 'hello', token, guestId: token ? undefined : guestId(), reqId: '' });
        if (cancelled) return;
        socket.serverOffset = welcome.serverTime - Date.now();
        setUserId(welcome.userId);
        dispatch({ type: 'load', profile: welcome.profile });
        setError(null);
        setReady(true);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not sign in to the arena');
      }
    };

    const offStatus = socket.onStatus((s) => {
      setStatus(s);
      if (s === 'open') void hello();
      else setReady(false);
    });
    const offMsg = socket.on((msg) => {
      if ('profile' in msg && msg.type !== 'welcome' && (msg.type === 'profile' || msg.type === 'match_end' || msg.type === 'pack_opened' || msg.type === 'story_end')) {
        dispatch({ type: 'load', profile: msg.profile });
      }
      if (msg.type === 'pong') socket.serverOffset = msg.serverTime - Date.now();
    });

    socket.connect();
    if (socket.connected) void hello();
    const keepalive = window.setInterval(() => { if (socket.connected) socket.send({ type: 'ping' }); }, 25_000);

    return () => { cancelled = true; offStatus(); offMsg(); window.clearInterval(keepalive); };
  }, [dispatch, configured, user]);

  const value = useMemo<OnlineApi>(() => ({ enabled: onlineEnabled, status, ready, userId, error }), [status, ready, userId, error]);
  return <OnlineContext.Provider value={value}>{children}</OnlineContext.Provider>;
}
