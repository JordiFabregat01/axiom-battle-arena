import { mulberry32, gaussian, clamp } from './rng';
import { randomName } from './bots';

export interface LadderEntry {
  id: string;
  name: string;
  elo: number;
  level: number;
  wins: number;
  isYou?: boolean;
}

/** A stable, fictional ladder. A real deployment replaces this with a query. */
export function generateLadder(seed = 20260901, size = 150): LadderEntry[] {
  const rng = mulberry32(seed);
  const out: LadderEntry[] = [];
  for (let i = 0; i < size; i++) {
    const elo = Math.round(clamp(gaussian(rng, 1300, 520), 520, 3380));
    out.push({
      id: `npc-${i}`,
      name: randomName(rng),
      elo,
      level: clamp(Math.round((elo - 500) / 60 + gaussian(rng, 0, 5)), 1, 80),
      wins: Math.round(clamp((elo - 400) / 9 + gaussian(rng, 0, 25), 3, 400)),
    });
  }
  return out.sort((a, b) => b.elo - a.elo);
}

export function ladderWithPlayer(player: { name: string; elo: number; level: number; wins: number }): LadderEntry[] {
  const you: LadderEntry = { id: 'you', name: player.name, elo: player.elo, level: player.level, wins: player.wins, isYou: true };
  return [...generateLadder(), you].sort((a, b) => b.elo - a.elo);
}
