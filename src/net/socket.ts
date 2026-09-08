/** WebSocket client for the game server, with reconnects and request/response helpers. */
import type { ClientMessage, ServerMessage } from '../shared/protocol';
import type { ClientIntent, Profile } from '../engine/profile';

export type SocketStatus = 'idle' | 'connecting' | 'open' | 'closed';
type Handler = (msg: ServerMessage) => void;

interface Pending { resolve: (m: ServerMessage) => void; reject: (e: Error) => void; timer: number; }

export class ArenaSocket {
  status: SocketStatus = 'idle';
  /** serverTime − Date.now(), so the client can show the server's clock. */
  serverOffset = 0;
  private ws: WebSocket | null = null;
  private handlers = new Set<Handler>();
  private statusListeners = new Set<(s: SocketStatus) => void>();
  private pending = new Map<string, Pending>();
  private seq = 0;
  private backoff = 500;
  private wantOpen = false;

  constructor(readonly url: string) {}

  connect() {
    this.wantOpen = true;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;
    this.setStatus('connecting');
    const ws = new WebSocket(this.url);
    this.ws = ws;
    ws.onopen = () => { this.backoff = 500; this.setStatus('open'); };
    ws.onmessage = (ev) => {
      let msg: ServerMessage;
      try { msg = JSON.parse(String(ev.data)) as ServerMessage; } catch { return; }
      if ('reqId' in msg && msg.reqId) {
        const p = this.pending.get(msg.reqId);
        if (p) {
          this.pending.delete(msg.reqId);
          window.clearTimeout(p.timer);
          if (msg.type === 'error') p.reject(new Error(msg.message)); else p.resolve(msg);
        }
      }
      for (const h of this.handlers) h(msg);
    };
    ws.onclose = () => {
      this.setStatus('closed');
      for (const [id, p] of this.pending) { window.clearTimeout(p.timer); p.reject(new Error('Disconnected')); this.pending.delete(id); }
      if (this.wantOpen) {
        window.setTimeout(() => this.connect(), this.backoff);
        this.backoff = Math.min(8000, this.backoff * 2);
      }
    };
    ws.onerror = () => { /* onclose follows */ };
  }

  disconnect() {
    this.wantOpen = false;
    this.ws?.close();
  }

  get connected() { return this.status === 'open'; }
  now() { return Date.now() + this.serverOffset; }

  send(msg: ClientMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
    else console.warn('[socket] not connected, dropped', msg.type);
  }

  request<T extends ServerMessage = ServerMessage>(msg: ClientMessage, timeoutMs = 10_000): Promise<T> {
    const reqId = `q${++this.seq}`;
    return new Promise<T>((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) { reject(new Error('Not connected to the arena server')); return; }
      const timer = window.setTimeout(() => { this.pending.delete(reqId); reject(new Error('The server did not answer in time')); }, timeoutMs);
      this.pending.set(reqId, { resolve: (m) => resolve(m as T), reject, timer });
      this.ws.send(JSON.stringify({ ...msg, reqId }));
    });
  }

  on(handler: Handler): () => void {
    this.handlers.add(handler);
    return () => { this.handlers.delete(handler); };
  }

  onStatus(listener: (s: SocketStatus) => void): () => void {
    this.statusListeners.add(listener);
    return () => { this.statusListeners.delete(listener); };
  }

  private setStatus(s: SocketStatus) {
    this.status = s;
    for (const l of this.statusListeners) l(s);
  }
}

export const ARENA_WS_URL = import.meta.env.VITE_ARENA_WS_URL as string | undefined;
/** True when this build talks to a game server (authoritative mode). */
export const onlineEnabled = !!ARENA_WS_URL;
export const arenaSocket: ArenaSocket | null = ARENA_WS_URL ? new ArenaSocket(ARENA_WS_URL) : null;

/** Sends a client intent to the server and returns the profile it decided on. */
export const remoteDispatch = arenaSocket
  ? (intent: ClientIntent): Promise<Profile | null> =>
      arenaSocket.request<Extract<ServerMessage, { type: 'profile' }>>({ type: 'intent', action: intent, reqId: '' }).then((m) => m.profile)
  : null;

const GUEST_KEY = 'axiom-arena.guest-id';
export function guestId(): string {
  try {
    let id = localStorage.getItem(GUEST_KEY);
    if (!id) {
      const bytes = new Uint8Array(12);
      crypto.getRandomValues(bytes);
      id = `g-${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`;
      localStorage.setItem(GUEST_KEY, id);
    }
    return id;
  } catch {
    return `g-${Math.random().toString(36).slice(2, 14)}${Math.random().toString(36).slice(2, 14)}`;
  }
}
