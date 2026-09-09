/** Connections, matchmaking, intents, packs and story sessions. */
import type { WebSocket } from 'ws';
import { Session } from './session';
import { Room } from './room';
import { identify, type AuthConfig } from './auth';
import type { ProfileStore } from './store';
import { reducer, createProfile, migrateProfile, monthKey, pruneUnknownCards, type ClientIntent, type Profile } from '../../src/engine/profile';
import { CARDS, PACKS, openPack, type PackId } from '../../src/engine/cards';

const KNOWN_CARDS: ReadonlySet<string> = new Set(CARDS.map((c) => c.id));
import { mulberry32, newSeed, clamp } from '../../src/engine/rng';
import { opponentForCasual, opponentForRanked } from '../../src/engine/bots';
import { SEASON, seasonTimeLeft, rewardForElo } from '../../src/engine/season';
import { softReset } from '../../src/engine/ranking';
import { questById, chapterReward } from '../../src/engine/story';
import { generateChapterProblems } from '../../src/engine/wordProblems';
import type { ClientMessage, DuelMode } from '../../src/shared/protocol';

export interface HubConfig extends AuthConfig {
  /** Fall back to a bot opponent after waiting this long (ms). */
  botAfterMs: number;
  /** Let players bring a guest-mode save into a fresh account (development / migration only). */
  allowImport: boolean;
}

export class Hub {
  private sessions = new Set<Session>();
  private byUser = new Map<string, Session>();
  private rooms = new Set<Room>();
  private matcher: NodeJS.Timeout;

  constructor(private store: ProfileStore, private cfg: HubConfig) {
    this.matcher = setInterval(() => this.match(), 500);
  }

  close() {
    clearInterval(this.matcher);
    for (const r of this.rooms) r.destroy();
  }

  /** Number of live connections (for the health endpoint). */
  get size() { return this.sessions.size; }

  attach(ws: WebSocket) {
    const session = new Session(ws);
    this.sessions.add(session);
    // Token bucket: a human sends a few messages per second at most; floods are disconnected.
    let tokens = 40;
    let last = Date.now();
    ws.on('message', (data) => {
      const now = Date.now();
      tokens = Math.min(40, tokens + ((now - last) / 1000) * 20);
      last = now;
      if (tokens < 1) { ws.close(1008, 'Too many messages'); return; }
      tokens -= 1;
      let msg: ClientMessage;
      try { msg = JSON.parse(String(data)) as ClientMessage; } catch { session.error('Bad JSON'); return; }
      if (!msg || typeof msg !== 'object' || typeof msg.type !== 'string') { session.error('Bad message'); return; }
      this.handle(session, msg).catch((e) => {
        // Validation failures are expected (rejected forgeries, wrong state); log one line, no stack.
        console.warn(`[hub] ${msg.type} rejected: ${e instanceof Error ? e.message : String(e)}`);
        session.error(e instanceof Error ? e.message : 'Server error', (msg as { reqId?: string }).reqId);
      });
    });
    ws.on('close', () => this.detach(session));
    ws.on('error', () => this.detach(session));
  }

  private detach(session: Session) {
    if (!session.alive) return;
    session.alive = false;
    this.sessions.delete(session);
    session.queue = null;
    session.room?.onDisconnect(session);
    if (session.userId && this.byUser.get(session.userId) === session) this.byUser.delete(session.userId);
  }

  private async persist(session: Session, profile: Profile | null) {
    session.profile = profile;
    if (!session.userId) return;
    if (profile) await this.store.save(session.userId, profile);
    else await this.store.remove(session.userId);
  }

  private async handle(session: Session, msg: ClientMessage) {
    if (msg.type === 'ping') { session.send({ type: 'pong', serverTime: Date.now() }); return; }
    if (msg.type === 'hello') return this.hello(session, msg);
    if (!session.identity) { session.error('Say hello first', (msg as { reqId?: string }).reqId); return; }

    switch (msg.type) {
      case 'intent': return this.intent(session, msg.action, msg.reqId);
      case 'queue': return this.queue(session, msg.mode, msg.tier);
      case 'cancel_queue': session.queue = null; return;
      case 'answer': session.room?.answer(session, msg.index, msg.value); return;
      case 'skip': session.room?.skip(session, msg.index); return;
      case 'open_pack': return this.openPack(session, msg.pack, !!msg.buy, msg.reqId);
      case 'story_start': return this.storyStart(session, msg.questId, msg.chapterIndex, msg.reqId);
      case 'story_answer': return this.storyAnswer(session, msg.sessionId, msg.index, msg.value, msg.reqId);
      case 'ladder': session.send({ type: 'ladder', rows: await this.store.ladder(100), reqId: msg.reqId }); return;
      default: session.error('Unknown message');
    }
  }

  private async hello(session: Session, msg: Extract<ClientMessage, { type: 'hello' }>) {
    const identity = await identify({ token: msg.token, guestId: msg.guestId }, this.cfg);
    if (!identity) { session.error('Could not verify who you are', msg.reqId); return; }
    session.identity = identity;
    // One live connection per account: a newer tab replaces the older one.
    const previous = this.byUser.get(identity.id);
    if (previous && previous !== session) { previous.error('Signed in from another tab'); previous.ws.close(); }
    this.byUser.set(identity.id, session);
    const loaded = await this.store.load(identity.id);
    let profile = loaded.profile;
    if (profile) {
      let next = reducer(profile, { type: 'applyServer', plusUntil: loaded.entitlements.plusUntil, coinGrants: loaded.entitlements.coinGrants }) ?? profile;
      next = pruneUnknownCards(next, KNOWN_CARDS);
      if (next !== profile) { profile = next; await this.store.save(identity.id, next); }
    }
    session.profile = profile;
    session.send({ type: 'welcome', serverTime: Date.now(), profile, userId: identity.id, reqId: msg.reqId });
  }

  /** Client intents are re-validated here; the reducer is the single source of rules. */
  private async intent(session: Session, action: ClientIntent, reqId: string) {
    const p = session.profile;
    let next: Profile | null = p;
    switch (action.type) {
      case 'create': {
        if (p) throw new Error('You already have a profile');
        if (typeof action.name !== 'string' || !action.name.trim()) throw new Error('Pick a name');
        next = createProfile(action.name, Number(action.placement));
        break;
      }
      case 'setSpotlight':
        if (!Array.isArray(action.ids)) throw new Error('Bad spotlight');
        next = reducer(p, { type: 'setSpotlight', ids: action.ids.slice(0, 16) });
        break;
      case 'rename':
        if (typeof action.name !== 'string' || !action.name.trim()) throw new Error('Pick a name');
        next = reducer(p, { type: 'rename', name: action.name });
        break;
      case 'claimSeason': {
        if (!p) throw new Error('No profile');
        if (action.seasonId !== SEASON.id || !seasonTimeLeft().ended) throw new Error('The season has not ended');
        next = reducer(p, { type: 'claimSeason', seasonId: SEASON.id, reward: rewardForElo(p.elo), newElo: softReset(p.elo) });
        break;
      }
      case 'claimPlusMonthly':
        next = reducer(p, { type: 'claimPlusMonthly', monthKey: monthKey() });
        break;
      case 'reset':
        next = null;
        break;
      case 'import': {
        if (p) throw new Error('You already have a profile on this server');
        if (!this.cfg.allowImport) throw new Error('Importing local saves is disabled on this server');
        const imported = migrateProfile(action.profile);
        if (!imported) throw new Error('That save could not be read');
        // Entitlements are server-owned; a local save cannot bring them along.
        next = { ...imported, plusUntil: null, plusClaims: [], coinGrantsApplied: 0, updatedAt: Date.now() };
        break;
      }
      default:
        throw new Error('Unknown intent');
    }
    await this.persist(session, next);
    session.send({ type: 'profile', profile: next, reqId });
  }

  private queue(session: Session, mode: DuelMode, tier?: number) {
    if (!session.profile) { session.error('Create a profile first'); return; }
    if (session.room) { session.error('You are already in a duel'); return; }
    const m: DuelMode = mode === 'ranked' ? 'ranked' : 'casual';
    const t = m === 'casual' ? clamp(Number(tier) || session.profile.placement, 1, 7) : null;
    session.queue = { mode: m, tier: t, since: Date.now() };
    session.send({ type: 'queued', mode: m, tier: t });
  }

  private match() {
    const now = Date.now();
    const waiting = [...this.sessions].filter((s) => s.queue && s.alive && s.profile && !s.room).sort((a, b) => a.queue!.since - b.queue!.since);
    const taken = new Set<Session>();
    for (const s of waiting) {
      if (taken.has(s)) continue;
      const q = s.queue!;
      const waited = (now - q.since) / 1000;
      const partner = waiting.find((o) => {
        if (o === s || taken.has(o) || o.queue!.mode !== q.mode) return false;
        if (q.mode === 'casual') return o.queue!.tier === q.tier;
        const band = Math.min(600, 100 + 40 * Math.max(waited, (now - o.queue!.since) / 1000));
        return Math.abs(o.profile!.elo - s.profile!.elo) <= band;
      });
      if (partner) {
        taken.add(s); taken.add(partner);
        this.createRoom(q.mode, q.tier, s, partner);
      } else if (waited * 1000 >= this.cfg.botAfterMs) {
        taken.add(s);
        const rng = mulberry32(newSeed());
        const bot = q.mode === 'ranked'
          ? opponentForRanked(s.profile!.elo, rng)
          : opponentForCasual(s.profile!.elo, q.tier != null ? s.profile!.tierStats[q.tier] : undefined, rng);
        this.createRoom(q.mode, q.tier, s, bot);
      }
    }
  }

  private createRoom(mode: DuelMode, tier: number | null, a: Session, b: Session | ReturnType<typeof opponentForRanked>) {
    a.queue = null;
    if ('ws' in b) b.queue = null;
    const room = new Room(this.store, (r) => this.rooms.delete(r), mode, tier, a, b);
    this.rooms.add(room);
    room.start();
  }

  private async openPack(session: Session, pack: PackId, buy: boolean, reqId: string) {
    const def = PACKS[pack];
    if (!def) throw new Error('Unknown pack');
    let p = session.profile;
    if (!p) throw new Error('No profile');
    if (buy) {
      const bought = reducer(p, { type: 'buyPack', pack });
      if (bought === p) throw new Error(`You need ${def.price - p.coins} more coins`);
      p = bought!;
    }
    if (p.packs[pack] <= 0) throw new Error('You have no such pack');
    const cards = openPack(def, mulberry32(newSeed()));
    const newIds: string[] = [];
    for (const c of cards) if (!(p.collection[c.id] > 0) && !newIds.includes(c.id)) newIds.push(c.id);
    const next = reducer(p, { type: 'openPack', pack, cardIds: cards.map((c) => c.id) })!;
    await this.persist(session, next);
    session.send({ type: 'pack_opened', pack, cards: cards.map((c) => c.id), newIds, profile: next, reqId });
  }

  private storyStart(session: Session, questId: string, chapterIndex: number, reqId: string) {
    const p = session.profile;
    if (!p) throw new Error('No profile');
    const quest = questById(questId);
    if (!quest) throw new Error('Unknown quest');
    const index = Number(chapterIndex);
    const cleared = p.story[questId]?.cleared ?? 0;
    if (!Number.isInteger(index) || index < 0 || index >= quest.chapters.length) throw new Error('Unknown chapter');
    if (index > cleared) throw new Error('Clear the previous chapter first');
    const chapter = quest.chapters[index];
    const problems = generateChapterProblems(chapter.band, chapter.questions, mulberry32(newSeed()));
    session.story = { id: `st-${Math.floor(Math.random() * 1e9).toString(36)}`, questId, chapterIndex: index, problems, answers: [] };
    session.send({ type: 'story_problems', sessionId: session.story.id, problems: problems.map((q) => ({ text: q.text })), reqId });
  }

  private async storyAnswer(session: Session, sessionId: string, index: number, value: number, reqId: string) {
    const st = session.story;
    if (!st || st.id !== sessionId) throw new Error('No chapter in progress');
    if (index !== st.answers.length) throw new Error('Answer the current problem');
    const q = st.problems[index];
    const correct = Number.isInteger(value) && value === q.answer;
    st.answers.push(correct);
    session.send({ type: 'story_result', sessionId, index, correct, answer: q.answer, explanation: q.explanation, reqId });
    if (st.answers.length < st.problems.length) return;

    const quest = questById(st.questId)!;
    const chapter = quest.chapters[st.chapterIndex];
    const right = st.answers.filter(Boolean).length;
    const passed = right >= chapter.passMark;
    const stars = right >= chapter.questions ? 3 : right >= chapter.passMark + 1 ? 2 : passed ? 1 : 0;
    const reward = chapterReward(quest, st.chapterIndex);
    const p = session.profile!;
    const first = st.chapterIndex >= (p.story[st.questId]?.cleared ?? 0);
    let next = p;
    if (passed) {
      next = reducer(p, { type: 'chapterCleared', questId: st.questId, chapterIndex: st.chapterIndex, stars, reward })!;
      await this.persist(session, next);
    }
    session.story = null;
    session.send({ type: 'story_end', sessionId, correct: right, stars, passed, first: passed && first, reward, profile: next });
  }
}
