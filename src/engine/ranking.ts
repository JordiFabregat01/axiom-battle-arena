/** Elo rating and the ranked ladder (tiers, divisions, difficulty brackets). */

export const K_FACTOR = 32;
/** Everyone starts here. There is no placement into higher tiers: you climb. */
export const STARTING_ELO = 1000;

export function expectedScore(rating: number, opponent: number): number {
  return 1 / (1 + 10 ** ((opponent - rating) / 400));
}

/** Rating change for a result of 1 (win), 0.5 (draw) or 0 (loss). */
export function eloDelta(rating: number, opponent: number, result: 0 | 0.5 | 1, k = K_FACTOR): number {
  const delta = Math.round(k * (result - expectedScore(rating, opponent)));
  // Never let a win lose points or a loss gain points, even after rounding.
  if (result === 1) return Math.max(1, delta);
  if (result === 0) return Math.min(-1, delta);
  return delta;
}

export interface RankTier {
  key: string;
  name: string;
  /** Elo at which the lowest division of this tier starts. */
  base: number;
  color: string;
  /** Problem tiers this rank draws from: [easier, harder]. */
  bracket: [number, number];
  glyph: string;
}

export const RANK_TIERS: RankTier[] = [
  { key: 'bronze', name: 'Bronze', base: 600, color: '#c98a5a', bracket: [1, 2], glyph: '◆' },
  { key: 'silver', name: 'Silver', base: 1000, color: '#c3cddd', bracket: [2, 3], glyph: '◆' },
  { key: 'gold', name: 'Gold', base: 1400, color: '#f2c14e', bracket: [3, 4], glyph: '◆' },
  { key: 'platinum', name: 'Platinum', base: 1800, color: '#5fe3d0', bracket: [4, 5], glyph: '⬢' },
  { key: 'diamond', name: 'Diamond', base: 2200, color: '#7db3ff', bracket: [5, 6], glyph: '⬢' },
  { key: 'master', name: 'Master', base: 2600, color: '#c47dff', bracket: [6, 7], glyph: '★' },
  { key: 'grandmaster', name: 'Grandmaster', base: 3000, color: '#ff5c3a', bracket: [7, 7], glyph: '✦' },
];

export const DIVISIONS = ['IV', 'III', 'II', 'I'] as const;

export interface Rank {
  tier: RankTier;
  /** 0 = IV … 3 = I. Grandmaster has no divisions (always 3). */
  divisionIndex: number;
  division: string;
  /** 0..1 progress inside the current division. */
  progress: number;
  label: string;
  /** Elo needed for the next division/tier, or null at the top. */
  nextAt: number | null;
}

export function rankFor(elo: number): Rank {
  let tier = RANK_TIERS[0];
  for (const t of RANK_TIERS) if (elo >= t.base) tier = t;
  if (tier.key === 'grandmaster') {
    return { tier, divisionIndex: 3, division: '', progress: 1, label: tier.name, nextAt: null };
  }
  const into = Math.max(0, elo - tier.base);
  const divisionIndex = Math.min(3, Math.floor(into / 100));
  const progress = Math.min(1, Math.max(0, (into - divisionIndex * 100) / 100));
  const division = DIVISIONS[divisionIndex];
  const nextAt = tier.base + (divisionIndex + 1) * 100;
  return { tier, divisionIndex, division, progress, label: `${tier.name} ${division}`, nextAt };
}

/** Which problem tier a ranked question should use for a player at this rank.
 *  Higher divisions draw more often from the harder half of the bracket. */
export function rankedProblemTier(elo: number, roll: number): number {
  const rank = rankFor(elo);
  const [lo, hi] = rank.tier.bracket;
  if (lo === hi) return lo;
  const pHard = 0.2 + 0.2 * rank.divisionIndex; // IV: 20% … I: 80%
  return roll < pHard ? hi : lo;
}

/** Season soft reset: pull ratings 40% of the way back towards 1000. */
export function softReset(elo: number): number {
  return Math.round(STARTING_ELO + (elo - STARTING_ELO) * 0.6);
}

/** Account level (separate from Elo): steady progression for everyone. */
export function levelFromXp(xp: number): { level: number; into: number; need: number } {
  let level = 1, need = 200, rest = xp;
  while (rest >= need) { rest -= need; level++; need += 100; }
  return { level, into: rest, need };
}
