/** Simulated opponents. In production this module is replaced by a matchmaking
 *  service: the Duel screen only needs an Opponent profile plus a stream of
 *  score events, which a WebSocket can supply just as well as this simulation. */
import { Rng, clamp, gaussian, pick, randInt } from './rng';
import { pointsFor, WRONG_PENALTY, DUEL_SECONDS } from './problems';
import { CARDS, rollRarity, packableCards } from './cards';
import { rankFor } from './ranking';

export interface Opponent {
  id: string;
  name: string;
  elo: number;
  level: number;
  /** Probability an attempt is correct. */
  accuracy: number;
  /** Mean seconds per attempt. */
  meanTime: number;
  spotlight: string[];
  title?: string;
}

const ADJ = ['Prime', 'Vector', 'Sigma', 'Delta', 'Quantum', 'Modular', 'Golden', 'Radical', 'Binary', 'Cosmic', 'Turbo', 'Silent', 'Rapid', 'Neon', 'Lunar', 'Clever', 'Swift', 'Brave', 'Chalk', 'Infinite'];
const NOUN = ['Hunter', 'Fox', 'Owl', 'Comet', 'Wizard', 'Knight', 'Otter', 'Falcon', 'Panda', 'Ninja', 'Pixel', 'Sprite', 'Golem', 'Nova', 'Tiger', 'Puzzle', 'Rocket', 'Cipher', 'Scholar', 'Dragon'];
const HUMAN = ['Maya', 'Leo', 'Aisha', 'Noah', 'Sofia', 'Ravi', 'Emma', 'Kenji', 'Zara', 'Mateo', 'Ines', 'Omar', 'Lucia', 'Ethan', 'Priya', 'Hugo', 'Nora', 'Jonas', 'Amara', 'Felix'];

export function randomName(rng: Rng): string {
  const style = rng();
  if (style < 0.45) return `${pick(rng, ADJ)}${pick(rng, NOUN)}`;
  if (style < 0.75) return `${pick(rng, ADJ)}${pick(rng, NOUN)}${randInt(rng, 2, 99)}`;
  if (style < 0.9) return `${pick(rng, HUMAN)}_${pick(rng, NOUN).toLowerCase()}`;
  return `${pick(rng, HUMAN)}${randInt(rng, 7, 2031)}`;
}

/** Baseline speed/accuracy implied by an Elo rating. */
export function skillFromElo(elo: number): { accuracy: number; meanTime: number } {
  const t = clamp((elo - 600) / 2400, 0, 1);
  return { meanTime: 8.5 - 6.3 * t, accuracy: 0.72 + 0.25 * t };
}

/** Expected 60-second score for a bot with these parameters. */
export function expectedScore(meanTime: number, accuracy: number): number {
  const attempts = DUEL_SECONDS / meanTime;
  return attempts * (accuracy * pointsFor(meanTime) - (1 - accuracy) * WRONG_PENALTY);
}

/** Find the mean answer time that lands a bot near a target score. */
export function meanTimeForScore(target: number, accuracy: number): number {
  let best = 8, bestErr = Infinity;
  for (let mt = 1.2; mt <= 14; mt += 0.1) {
    const err = Math.abs(expectedScore(mt, accuracy) - target);
    if (err < bestErr) { bestErr = err; best = mt; }
  }
  return best;
}

function randomSpotlight(rng: Rng, elo: number): string[] {
  const t = clamp((elo - 600) / 2400, 0, 1);
  const count = 1 + Math.floor(t * 4 + rng() * 1.5);
  const ids = new Set<string>();
  let guard = 0;
  while (ids.size < Math.min(5, count) && guard++ < 40) {
    const rarity = rollRarity(rng, rng() < t * 0.6 ? 2 : 0);
    const pool = packableCards.filter((c) => c.rarity === rarity);
    ids.add(pick(rng, pool).id);
  }
  return [...ids];
}

function levelFor(elo: number, rng: Rng) {
  return clamp(Math.round((elo - 500) / 60 + gaussian(rng, 0, 4)), 1, 80);
}

/** Ranked: someone close to the player's rating. */
export function opponentForRanked(playerElo: number, rng: Rng): Opponent {
  const elo = Math.round(clamp(playerElo + gaussian(rng, 0, 80), 400, 3400));
  const base = skillFromElo(elo);
  const jitter = 1 + gaussian(rng, 0, 0.1);
  const rank = rankFor(elo);
  return {
    id: `bot-${Math.floor(rng() * 1e9)}`,
    name: randomName(rng),
    elo,
    level: levelFor(elo, rng),
    accuracy: clamp(base.accuracy * (1 + gaussian(rng, 0, 0.04)), 0.5, 0.99),
    meanTime: clamp(base.meanTime * jitter, 1.2, 14),
    spotlight: randomSpotlight(rng, elo),
    title: rank.tier.key === 'grandmaster' ? 'Grandmaster' : undefined,
  };
}

/** Casual: a sparring partner tuned to how the player usually scores at this level,
 *  falling back to their rating if they have never played it. */
export function opponentForCasual(playerElo: number, history: { games: number; avgScore: number } | undefined, rng: Rng): Opponent {
  const elo = Math.round(clamp(playerElo + gaussian(rng, 0, 120), 400, 3400));
  const accuracy = clamp(0.86 + gaussian(rng, 0, 0.05), 0.6, 0.98);
  let meanTime = skillFromElo(elo).meanTime;
  if (history && history.games > 0) {
    const target = history.avgScore * (1 + gaussian(rng, 0.02, 0.12));
    meanTime = meanTimeForScore(Math.max(150, target), accuracy);
  }
  return {
    id: `bot-${Math.floor(rng() * 1e9)}`,
    name: randomName(rng),
    elo,
    level: levelFor(elo, rng),
    accuracy,
    meanTime: clamp(meanTime, 1.2, 14),
    spotlight: randomSpotlight(rng, elo),
  };
}

/** One attempt duration for the bot: log-normal around its mean. */
export function sampleAttemptTime(bot: Opponent, rng: Rng): number {
  const s = bot.meanTime * Math.exp(gaussian(rng, -0.06, 0.35));
  return clamp(s, 0.6, bot.meanTime * 4);
}

export const ALL_CARD_IDS = CARDS.map((c) => c.id);
