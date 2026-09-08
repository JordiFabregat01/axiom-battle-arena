/** Settling a duel: result, Elo, XP, record. Used by guest mode and by the server. */
import { eloDelta, rankFor } from './ranking';
import type { MatchRecord } from './profile';
import type { SideState } from '../shared/protocol';

export interface SettleInput {
  mode: 'ranked' | 'casual';
  tier: number | null;
  playerElo: number;
  opponentName: string;
  opponentElo: number;
  me: SideState;
  opp: SideState;
  matchId?: string;
}

export interface Settlement {
  result: 'win' | 'loss' | 'draw';
  eloDelta: number;
  newElo: number;
  xp: number;
  packGain: number;
  promoted: string | null;
  demoted: string | null;
  record: MatchRecord;
}

export function settleDuel(input: SettleInput): Settlement {
  const { mode, tier, playerElo, opponentName, opponentElo, me, opp } = input;
  const result: Settlement['result'] = me.score > opp.score ? 'win' : me.score < opp.score ? 'loss' : 'draw';
  const ranked = mode === 'ranked';
  const delta = ranked ? eloDelta(playerElo, opponentElo, result === 'win' ? 1 : result === 'loss' ? 0 : 0.5) : 0;
  const xp = 40 + Math.round(me.score / 8) + (result === 'win' ? 60 : 0) + (ranked ? 20 : 0);
  const newElo = Math.max(100, playerElo + delta);
  const before = rankFor(playerElo).label;
  const after = rankFor(newElo).label;
  const record: MatchRecord = {
    id: input.matchId ?? `m-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`,
    at: Date.now(),
    mode,
    tier,
    opponent: opponentName,
    opponentElo,
    result,
    score: me.score,
    oppScore: opp.score,
    eloDelta: delta,
    correct: me.correct,
    wrong: me.wrong,
    bestStreak: me.bestStreak,
  };
  return {
    result,
    eloDelta: delta,
    newElo,
    xp,
    packGain: result === 'win' ? (ranked ? 2 : 1) : 0,
    promoted: ranked && delta > 0 && after !== before ? after : null,
    demoted: ranked && delta < 0 && after !== before ? after : null,
    record,
  };
}

export const STREAK_EVERY = 5;
export const STREAK_BONUS = 50;

export const emptySide = (): SideState => ({ score: 0, correct: 0, wrong: 0, skipped: 0, streak: 0, bestStreak: 0, index: 0 });
