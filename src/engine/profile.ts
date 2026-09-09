/** The player profile and the pure reducer that changes it.
 *  Shared by the browser (guest mode) and the game server (authoritative mode),
 *  so both apply exactly the same rules. No React, no storage, no I/O here. */
import { STARTING_ELO } from './ranking';
import { PACKS, type PackId } from './cards';
import type { SeasonReward } from './season';
import type { ChapterReward } from './story';

export interface MatchRecord {
  id: string;
  at: number;
  mode: 'casual' | 'ranked';
  tier: number | null;
  opponent: string;
  opponentElo: number;
  result: 'win' | 'loss' | 'draw';
  score: number;
  oppScore: number;
  eloDelta: number;
  correct: number;
  wrong: number;
  bestStreak: number;
}

export interface TierStat { games: number; avgScore: number; best: number; }
export interface StoryProgress { cleared: number; stars: number[]; }

export interface Profile {
  version: 2;
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  /** Default casual level chosen at sign-up. Does not affect rating. */
  placement: number;
  elo: number;
  peakElo: number;
  xp: number;
  casualWins: number;
  casualLosses: number;
  rankedWins: number;
  rankedLosses: number;
  draws: number;
  streak: number;
  bestStreak: number;
  /** Progress towards the next Arena Pack: ranked wins count double. */
  packProgress: number;
  packs: Record<PackId, number>;
  packsOpened: number;
  collection: Record<string, number>;
  spotlight: string[];
  history: MatchRecord[];
  tierStats: Record<number, TierStat>;
  titles: string[];
  claimedSeasons: string[];
  /** In-game currency. Earned from story chapters, season rewards and Plus; buyable in the shop. */
  coins: number;
  coinsEarned: number;
  /** Cumulative purchased coins already merged from the server (idempotent merge). */
  coinGrantsApplied: number;
  /** Plus membership expiry (ms since epoch) or null. Server-owned when accounts are connected. */
  plusUntil: number | null;
  /** 'YYYY-MM' months whose Plus drop has been claimed. */
  plusClaims: string[];
  story: Record<string, StoryProgress>;
}

export const PACK_PROGRESS_NEEDED = 10;
export const RANKED_WIN_PROGRESS = 2;
export const CASUAL_WIN_PROGRESS = 1;
export const PREMIUM_EVERY_RANKED_WINS = 25;
export const SPOTLIGHT_SIZE = 5;
export const SPOTLIGHT_SIZE_PLUS = 8;
export const PLUS_MONTHLY = { coins: 600, premium: 1, card: 'sigma-sentinel' };
export const WELCOME_COINS = 200;

/** Actions a client may ask for. The server validates and applies them. */
export type ClientIntent =
  | { type: 'create'; name: string; placement: number }
  | { type: 'setSpotlight'; ids: string[] }
  | { type: 'rename'; name: string }
  | { type: 'claimSeason'; seasonId: string; reward: SeasonReward; newElo: number }
  | { type: 'claimPlusMonthly'; monthKey: string }
  | { type: 'reset' }
  /** Bring a guest-mode save into a fresh server account. The server accepts it once, and only when allowed. */
  | { type: 'import'; profile: Profile };

/** Actions only trusted code (the server, or the browser in guest mode) may apply. */
export type TrustedAction =
  | { type: 'load'; profile: Profile | null }
  | { type: 'matchFinished'; record: MatchRecord; xpGain: number }
  | { type: 'openPack'; pack: PackId; cardIds: string[] }
  | { type: 'buyPack'; pack: PackId }
  | { type: 'grantCoins'; amount: number }
  | { type: 'chapterCleared'; questId: string; chapterIndex: number; stars: number; reward: ChapterReward }
  | { type: 'setPlus'; until: number | null }
  | { type: 'applyServer'; plusUntil: number | null; coinGrants: number };

export type Action = ClientIntent | TrustedAction;

export const CLIENT_INTENT_TYPES: ReadonlySet<string> = new Set(['create', 'setSpotlight', 'rename', 'claimSeason', 'claimPlusMonthly', 'reset', 'import']);
export const isClientIntent = (a: Action): a is ClientIntent => CLIENT_INTENT_TYPES.has(a.type);

export const isPlus = (p: Profile) => p.plusUntil != null && p.plusUntil > Date.now();
export const spotlightSize = (p: Profile) => (isPlus(p) ? SPOTLIGHT_SIZE_PLUS : SPOTLIGHT_SIZE);
export const monthKey = (d = new Date()) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;

export function createProfile(name: string, placement: number): Profile {
  const now = Date.now();
  return {
    version: 2,
    id: `p-${now.toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`,
    name: name.trim().slice(0, 20) || 'Player',
    createdAt: now,
    updatedAt: now,
    placement: Math.min(7, Math.max(1, Math.round(placement) || 2)),
    elo: STARTING_ELO,
    peakElo: STARTING_ELO,
    xp: 0,
    casualWins: 0, casualLosses: 0, rankedWins: 0, rankedLosses: 0, draws: 0,
    streak: 0, bestStreak: 0,
    packProgress: 0,
    packs: { standard: 1, premium: 0 }, // welcome pack
    packsOpened: 0,
    collection: {},
    spotlight: [],
    history: [],
    tierStats: {},
    titles: [],
    claimedSeasons: [],
    coins: WELCOME_COINS,
    coinsEarned: WELCOME_COINS,
    coinGrantsApplied: 0,
    plusUntil: null,
    plusClaims: [],
    story: {},
  };
}

/** Accepts any stored version and returns a v2 profile, or null if unusable. */
export function migrateProfile(raw: unknown): Profile | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Partial<Profile> & { version?: number };
  if (p.version === 2) return p as Profile;
  if (p.version === 1) {
    // v1 seeded rating from placement; v2 makes everyone climb from 1000.
    const base = createProfile(p.name ?? 'Player', p.placement ?? 2);
    return {
      ...base,
      ...p,
      version: 2,
      elo: STARTING_ELO,
      peakElo: STARTING_ELO,
      packs: p.packs ?? base.packs,
      coins: WELCOME_COINS,
      coinsEarned: WELCOME_COINS,
      coinGrantsApplied: 0,
      plusUntil: null,
      plusClaims: [],
      story: {},
      updatedAt: Date.now(),
    };
  }
  return null;
}

function stamp(p: Profile): Profile {
  return { ...p, updatedAt: Date.now() };
}

export function reducer(state: Profile | null, action: Action): Profile | null {
  switch (action.type) {
    case 'create':
      return createProfile(action.name, action.placement);
    case 'load':
      return action.profile;
    case 'reset':
      return null;
    case 'rename':
      return state ? stamp({ ...state, name: action.name.trim().slice(0, 20) || state.name }) : state;
    case 'matchFinished': {
      if (!state) return state;
      const { record, xpGain } = action;
      const won = record.result === 'win';
      const ranked = record.mode === 'ranked';
      const next: Profile = {
        ...state,
        xp: state.xp + xpGain,
        elo: Math.max(100, state.elo + record.eloDelta),
        streak: won ? state.streak + 1 : 0,
        history: [record, ...state.history].slice(0, 30),
        packs: { ...state.packs },
        tierStats: { ...state.tierStats },
      };
      next.peakElo = Math.max(next.peakElo, next.elo);
      next.bestStreak = Math.max(next.bestStreak, next.streak);
      if (record.result === 'draw') next.draws++;
      else if (ranked) { if (won) next.rankedWins++; else next.rankedLosses++; }
      else { if (won) next.casualWins++; else next.casualLosses++; }

      if (won) {
        next.packProgress += ranked ? RANKED_WIN_PROGRESS : CASUAL_WIN_PROGRESS;
        while (next.packProgress >= PACK_PROGRESS_NEEDED) {
          next.packProgress -= PACK_PROGRESS_NEEDED;
          next.packs.standard++;
        }
        if (ranked && next.rankedWins % PREMIUM_EVERY_RANKED_WINS === 0) next.packs.premium++;
      }
      if (record.tier != null) {
        const prev = state.tierStats[record.tier] ?? { games: 0, avgScore: 0, best: 0 };
        next.tierStats[record.tier] = {
          games: prev.games + 1,
          avgScore: Math.round((prev.avgScore * prev.games + record.score) / (prev.games + 1)),
          best: Math.max(prev.best, record.score),
        };
      }
      return stamp(next);
    }
    case 'openPack': {
      if (!state || state.packs[action.pack] <= 0) return state;
      const collection = { ...state.collection };
      for (const id of action.cardIds) collection[id] = (collection[id] ?? 0) + 1;
      return stamp({
        ...state,
        packs: { ...state.packs, [action.pack]: state.packs[action.pack] - 1 },
        packsOpened: state.packsOpened + 1,
        collection,
      });
    }
    case 'buyPack': {
      if (!state) return state;
      const price = PACKS[action.pack].price;
      if (state.coins < price) return state;
      return stamp({ ...state, coins: state.coins - price, packs: { ...state.packs, [action.pack]: state.packs[action.pack] + 1 } });
    }
    case 'setSpotlight': {
      if (!state) return state;
      const ids = action.ids.filter((id, i, arr) => typeof id === 'string' && state.collection[id] > 0 && arr.indexOf(id) === i).slice(0, spotlightSize(state));
      return stamp({ ...state, spotlight: ids });
    }
    case 'claimSeason': {
      if (!state || state.claimedSeasons.includes(action.seasonId)) return state;
      const collection = { ...state.collection };
      if (action.reward.card) collection[action.reward.card] = (collection[action.reward.card] ?? 0) + 1;
      return stamp({
        ...state,
        elo: action.newElo,
        packs: { standard: state.packs.standard + action.reward.standard, premium: state.packs.premium + action.reward.premium },
        titles: action.reward.title ? [...state.titles, action.reward.title] : state.titles,
        coins: state.coins + action.reward.coins,
        coinsEarned: state.coinsEarned + action.reward.coins,
        collection,
        claimedSeasons: [...state.claimedSeasons, action.seasonId],
      });
    }
    case 'grantCoins': {
      if (!state || action.amount <= 0) return state;
      return stamp({ ...state, coins: state.coins + action.amount, coinsEarned: state.coinsEarned + action.amount });
    }
    case 'chapterCleared': {
      if (!state) return state;
      const progress = state.story[action.questId] ?? { cleared: 0, stars: [] };
      const first = action.chapterIndex >= progress.cleared;
      const stars = progress.stars.slice();
      stars[action.chapterIndex] = Math.max(stars[action.chapterIndex] ?? 0, action.stars);
      const coins = first ? action.reward.coins : Math.round(action.reward.coins * 0.2);
      const packs = { ...state.packs };
      const collection = { ...state.collection };
      if (first && action.reward.pack) packs[action.reward.pack]++;
      if (first && action.reward.card) collection[action.reward.card] = (collection[action.reward.card] ?? 0) + 1;
      return stamp({
        ...state,
        coins: state.coins + coins,
        coinsEarned: state.coinsEarned + coins,
        packs,
        collection,
        story: { ...state.story, [action.questId]: { cleared: first ? action.chapterIndex + 1 : progress.cleared, stars } },
      });
    }
    case 'setPlus':
      return state ? stamp({ ...state, plusUntil: action.until }) : state;
    case 'claimPlusMonthly': {
      if (!state || !isPlus(state) || state.plusClaims.includes(action.monthKey)) return state;
      const collection = { ...state.collection };
      if (!(collection[PLUS_MONTHLY.card] > 0)) collection[PLUS_MONTHLY.card] = 1;
      return stamp({
        ...state,
        coins: state.coins + PLUS_MONTHLY.coins,
        coinsEarned: state.coinsEarned + PLUS_MONTHLY.coins,
        packs: { ...state.packs, premium: state.packs.premium + PLUS_MONTHLY.premium },
        collection,
        plusClaims: [...state.plusClaims, action.monthKey],
      });
    }
    case 'import':
      // Only the server applies imports (see hub.ts); locally this is a no-op.
      return state;
    case 'applyServer': {
      if (!state) return state;
      const extra = Math.max(0, action.coinGrants - state.coinGrantsApplied);
      if (extra === 0 && action.plusUntil === state.plusUntil) return state;
      return stamp({ ...state, plusUntil: action.plusUntil, coins: state.coins + extra, coinGrantsApplied: Math.max(state.coinGrantsApplied, action.coinGrants) });
    }
    default:
      return state;
  }
}

/** Drop collection entries and spotlight slots that point at cards no longer in the catalog (e.g. removed test art). */
export function pruneUnknownCards(p: Profile, known: ReadonlySet<string>): Profile {
  const stale = Object.keys(p.collection).some((id) => !known.has(id)) || p.spotlight.some((id) => !known.has(id));
  if (!stale) return p;
  const collection: Record<string, number> = {};
  for (const [id, n] of Object.entries(p.collection)) if (known.has(id)) collection[id] = n;
  return { ...p, collection, spotlight: p.spotlight.filter((id) => known.has(id)), updatedAt: Date.now() };
}

export const totalWins = (p: Profile) => p.casualWins + p.rankedWins;
export const totalGames = (p: Profile) => p.casualWins + p.casualLosses + p.rankedWins + p.rankedLosses + p.draws;
export const ownedCount = (p: Profile) => Object.values(p.collection).filter((n) => n > 0).length;
export const storyCleared = (p: Profile) => Object.values(p.story).reduce((s, q) => s + q.cleared, 0);
