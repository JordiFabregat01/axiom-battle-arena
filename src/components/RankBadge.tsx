import { rankFor } from '../engine/ranking';

export function RankBadge({ elo, size = 'md', showElo = true }: { elo: number; size?: 'sm' | 'md' | 'lg'; showElo?: boolean }) {
  const rank = rankFor(elo);
  return (
    <span className={`rank-badge ${size}`} style={{ ['--rank' as string]: rank.tier.color }} title={`${rank.label} · ${elo} Elo`}>
      <span className="rank-hex" aria-hidden="true">{rank.tier.glyph}</span>
      <span className="rank-text">
        <b>{rank.label}</b>
        {showElo && <span>{elo} elo</span>}
      </span>
    </span>
  );
}
