import { rankFor, RANK_TIERS } from './ranking';

export interface SeasonReward {
  tierKey: string;
  standard: number;
  premium: number;
  coins: number;
  title?: string;
  card?: string;
}

export interface Season {
  id: string;
  number: number;
  name: string;
  start: string;
  end: string;
  /** Math topics the season puts in the spotlight (ranked question mix, story chapters, events). */
  featuredTopics: string[];
  /** Cards introduced this season. */
  newCards: string[];
  rewards: SeasonReward[];
}

/** Every season ships featured topics and new collectibles; this is the content template. */
export const SEASON: Season = {
  id: 's1',
  number: 1,
  name: 'Prime Genesis',
  start: '2026-09-01T00:00:00Z',
  end: '2026-12-01T00:00:00Z',
  featuredTopics: ['Prime numbers', 'Divisibility', 'Modular arithmetic'],
  newCards: ['death', 'scaly-emperor', 'clockwork', 'lydia', 'genesis-golem', 'sigma-sentinel'],
  rewards: [
    { tierKey: 'bronze', standard: 1, premium: 0, coins: 200 },
    { tierKey: 'silver', standard: 2, premium: 0, coins: 400 },
    { tierKey: 'gold', standard: 2, premium: 1, coins: 700, title: 'Gilded · S1' },
    { tierKey: 'platinum', standard: 3, premium: 1, coins: 1000, title: 'Platinum · S1', card: 'genesis-golem' },
    { tierKey: 'diamond', standard: 3, premium: 2, coins: 1500, title: 'Diamond · S1', card: 'genesis-golem' },
    { tierKey: 'master', standard: 4, premium: 3, coins: 2200, title: 'Master · S1', card: 'genesis-golem' },
    { tierKey: 'grandmaster', standard: 5, premium: 4, coins: 3000, title: 'Grandmaster · S1', card: 'genesis-golem' },
  ],
};

export function seasonTimeLeft(now = Date.now()): { ended: boolean; days: number; hours: number; minutes: number } {
  const ms = new Date(SEASON.end).getTime() - now;
  if (ms <= 0) return { ended: true, days: 0, hours: 0, minutes: 0 };
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  return { ended: false, days, hours, minutes };
}

export function rewardForElo(elo: number): SeasonReward {
  const key = rankFor(elo).tier.key;
  return SEASON.rewards.find((r) => r.tierKey === key) ?? SEASON.rewards[0];
}

export const rewardTierName = (key: string) => RANK_TIERS.find((t) => t.key === key)?.name ?? key;
