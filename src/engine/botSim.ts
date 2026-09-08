/** Simulated opponent clock, shared by guest mode and the server. */
import { pointsFor, WRONG_PENALTY } from './problems';
import { sampleAttemptTime, type Opponent } from './bots';
import { STREAK_EVERY, STREAK_BONUS } from './results';
import type { Rng } from './rng';
import type { SideState } from '../shared/protocol';

export interface BotClock {
  /** When the bot started thinking about its current question (ms). */
  qStart: number;
  /** When its next attempt lands (ms). */
  nextAt: number;
}

export function startBotClock(opponent: Opponent, rng: Rng, now: number): BotClock {
  return { qStart: now, nextAt: now + sampleAttemptTime(opponent, rng) * 1000 };
}

/** Advance the bot up to `now` (never past `endAt`), mutating `side` and `clock`. */
export function stepBot(side: SideState, clock: BotClock, opponent: Opponent, rng: Rng, now: number, endAt: number): void {
  const limit = Math.min(now, endAt);
  let guard = 0;
  while (clock.nextAt <= limit && guard++ < 60) {
    const taken = (clock.nextAt - clock.qStart) / 1000;
    if (rng() < opponent.accuracy) {
      side.streak++;
      side.bestStreak = Math.max(side.bestStreak, side.streak);
      side.score += pointsFor(taken) + (side.streak % STREAK_EVERY === 0 ? STREAK_BONUS : 0);
      side.correct++;
      side.index++;
      clock.qStart = clock.nextAt;
      clock.nextAt += sampleAttemptTime(opponent, rng) * 1000;
    } else {
      side.score = Math.max(0, side.score - WRONG_PENALTY);
      side.wrong++;
      side.streak = 0;
      clock.nextAt += sampleAttemptTime(opponent, rng) * 500;
    }
  }
}
