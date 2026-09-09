import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { PACKS, cardById, openPack as rollPack, type CardDef, type PackDef, type PackId } from './engine/cards';
import { mulberry32, newSeed } from './engine/rng';
import { useStore } from './state/store';
import { arenaSocket } from './net/socket';
import type { ServerMessage } from './shared/protocol';
import { Modal } from './components/Modal';
import { PackOpening } from './components/PackOpening';

interface ArenaApi {
  /** Open a pack the player owns and show the reveal. */
  openPack: (id: PackId) => void;
  /** Spend coins on a pack and open it straight away. Resolves false if it could not be bought. */
  buyAndOpen: (id: PackId) => Promise<boolean>;
  /** Small transient message at the bottom of the screen. */
  toast: (message: string) => void;
}

const ArenaContext = createContext<ArenaApi>({ openPack: () => {}, buyAndOpen: async () => false, toast: () => {} });
export const useArena = () => useContext(ArenaContext);

interface Opening { pack: PackDef; cards: CardDef[]; newIds: string[]; }

export function ArenaProvider({ children }: { children: ReactNode }) {
  const { profile, dispatch, authoritative, error } = useStore();
  const [opening, setOpening] = useState<Opening | null>(null);
  const [message, setMessage] = useState<{ text: string; id: number } | null>(null);

  const toast = useCallback((text: string) => setMessage({ text, id: Date.now() }), []);
  // Server rejections of intents (bad name, name taken…) surface as toasts.
  useEffect(() => { if (error) setMessage({ text: error.message, id: error.id }); }, [error]);

  /** Guest mode: roll here. Server mode: ask the server, which rolls and records. */
  const open = useCallback(async (id: PackId, buy: boolean): Promise<boolean> => {
    if (!profile) return false;
    const pack = PACKS[id];
    if (authoritative && arenaSocket) {
      try {
        const m = await arenaSocket.request<Extract<ServerMessage, { type: 'pack_opened' }>>({ type: 'open_pack', pack: id, buy, reqId: '' });
        setOpening({ pack, cards: m.cards.map((c) => cardById(c)!).filter(Boolean), newIds: m.newIds });
        return true;
      } catch (e) {
        toast(e instanceof Error ? e.message : 'Could not open the pack');
        return false;
      }
    }
    if (buy) {
      if (profile.coins < pack.price) return false;
      dispatch({ type: 'buyPack', pack: id });
    } else if (profile.packs[id] <= 0) {
      return false;
    }
    const cards = rollPack(pack, mulberry32(newSeed()));
    const newIds: string[] = [];
    for (const c of cards) if (!(profile.collection[c.id] > 0) && !newIds.includes(c.id)) newIds.push(c.id);
    dispatch({ type: 'openPack', pack: id, cardIds: cards.map((c) => c.id) });
    setOpening({ pack, cards, newIds });
    return true;
  }, [profile, dispatch, authoritative, toast]);

  const openPack = useCallback((id: PackId) => { void open(id, false); }, [open]);
  const buyAndOpen = useCallback((id: PackId) => open(id, true), [open]);

  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(() => setMessage(null), 3600);
    return () => window.clearTimeout(t);
  }, [message]);

  return (
    <ArenaContext.Provider value={{ openPack, buyAndOpen, toast }}>
      {children}
      <Modal open={opening !== null} onClose={() => setOpening(null)} wide>
        {opening && <PackOpening pack={opening.pack} cards={opening.cards} newIds={opening.newIds} onDone={() => setOpening(null)} />}
      </Modal>
      {message && <div key={message.id} className="toast" role="status">{message.text}</div>}
    </ArenaContext.Provider>
  );
}
