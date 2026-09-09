/** Messages between the browser and the game server. Shared by both sides. */
import type { Profile, ClientIntent } from '../engine/profile';
import type { PackId } from '../engine/cards';
import type { ChapterReward } from '../engine/story';

export type DuelMode = 'ranked' | 'casual';

export interface SideState {
  score: number;
  correct: number;
  wrong: number;
  skipped: number;
  streak: number;
  bestStreak: number;
  index: number;
}

export interface OpponentInfo {
  name: string;
  elo: number;
  level: number;
  spotlight: string[];
  isBot: boolean;
}

export interface LadderRow { id: string; name: string; elo: number; level: number; wins: number; }

export type ClientMessage =
  | { type: 'hello'; token?: string; guestId?: string; reqId?: string }
  | { type: 'intent'; action: ClientIntent; reqId: string }
  | { type: 'queue'; mode: DuelMode; tier?: number }
  | { type: 'cancel_queue' }
  | { type: 'answer'; matchId: string; index: number; value: number }
  | { type: 'skip'; matchId: string; index: number }
  | { type: 'open_pack'; pack: PackId; buy?: boolean; reqId: string }
  | { type: 'story_start'; questId: string; chapterIndex: number; reqId: string }
  | { type: 'story_answer'; sessionId: string; index: number; value: number; reqId: string }
  | { type: 'ladder'; reqId: string }
  | { type: 'check_name'; name: string; reqId: string }
  | { type: 'ping' };

export type ServerMessage =
  | { type: 'welcome'; serverTime: number; profile: Profile | null; userId: string; reqId?: string }
  | { type: 'profile'; profile: Profile | null; reqId?: string }
  | { type: 'error'; message: string; reqId?: string }
  | { type: 'queued'; mode: DuelMode; tier: number | null }
  | { type: 'match'; matchId: string; mode: DuelMode; tier: number | null; opponent: OpponentInfo; startsAt: number; endsAt: number }
  | { type: 'problem'; matchId: string; index: number; text: string; hint: string; tier: number }
  | { type: 'answer_result'; matchId: string; index: number; correct: boolean; skipped: boolean; points: number; streakBonus: boolean; me: SideState }
  | { type: 'state'; matchId: string; timeLeft: number; me: SideState; opponent: SideState }
  | { type: 'match_end'; matchId: string; result: 'win' | 'loss' | 'draw'; me: SideState; opponent: SideState; eloDelta: number; newElo: number; xp: number; packEarned: boolean; promoted: string | null; demoted: string | null; profile: Profile }
  | { type: 'pack_opened'; pack: PackId; cards: string[]; newIds: string[]; profile: Profile; reqId?: string }
  | { type: 'story_problems'; sessionId: string; problems: { text: string }[]; reqId?: string }
  | { type: 'story_result'; sessionId: string; index: number; correct: boolean; answer: number; explanation: string; reqId?: string }
  | { type: 'story_end'; sessionId: string; correct: number; stars: number; passed: boolean; first: boolean; reward: ChapterReward; profile: Profile }
  | { type: 'ladder'; rows: LadderRow[]; reqId?: string }
  | { type: 'name_status'; name: string; available: boolean; reason?: string; reqId?: string }
  | { type: 'pong'; serverTime: number };

export const DUEL_COUNTDOWN_MS = 3000;
export const DUEL_VERSUS_MS = 2600;
