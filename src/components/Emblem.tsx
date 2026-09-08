import { hashString, mulberry32 } from '../engine/rng';
import { DOMAIN_COLORS, rarityDef, type CardDef } from '../engine/cards';

/**
 * Generated placeholder art: a domain-coloured field, a deterministic geometric
 * sigil and the card's mathematical symbol. Replaced automatically by a file in
 * /public/cards (see that folder's README).
 */
export function Emblem({ card, locked }: { card: CardDef; locked?: boolean }) {
  const rng = mulberry32(hashString(card.id));
  const color = locked ? '#7a8090' : DOMAIN_COLORS[card.domain];
  const rarity = rarityDef(card.rarity);
  const accent = locked ? '#5a6070' : rarity.color;
  const sides = 3 + Math.floor(rng() * 6);
  const rings = 2 + Math.floor(rng() * 3);
  const rot = rng() * 360;
  const spokes = 4 + Math.floor(rng() * 8);
  const cx = 80, cy = 50;
  const poly = (r: number, n: number, offset: number) =>
    Array.from({ length: n }, (_, i) => {
      const a = ((Math.PI * 2) / n) * i + (offset * Math.PI) / 180;
      return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
    }).join(' ');
  const gid = `g-${card.id}`;
  const symbolSize = card.symbol.length >= 4 ? 20 : card.symbol.length === 3 ? 26 : card.symbol.length === 2 ? 34 : 44;

  return (
    <svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true" className="emblem">
      <defs>
        <radialGradient id={`${gid}-bg`} cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor={color} stopOpacity="0.55" />
          <stop offset="55%" stopColor={color} stopOpacity="0.12" />
          <stop offset="100%" stopColor="#0b1020" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${gid}-sym`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f3f1e8" />
          <stop offset="100%" stopColor={color} />
        </linearGradient>
      </defs>
      <rect width="160" height="100" fill={`url(#${gid}-bg)`} />
      <g fill="none" stroke={color} strokeWidth="0.7" opacity="0.7">
        {Array.from({ length: rings }, (_, i) => (
          <circle key={i} cx={cx} cy={cy} r={44 - i * 9} strokeDasharray={`${2 + i * 3} ${4 + i * 2}`} opacity={0.9 - i * 0.22} />
        ))}
        <polygon points={poly(36, sides, rot)} strokeWidth="1" />
        <polygon points={poly(24, sides, rot + 180 / sides)} opacity="0.6" />
        {Array.from({ length: spokes }, (_, i) => {
          const a = ((Math.PI * 2) / spokes) * i + (rot * Math.PI) / 180;
          return <line key={i} x1={cx + 12 * Math.cos(a)} y1={cy + 12 * Math.sin(a)} x2={cx + 70 * Math.cos(a)} y2={cy + 70 * Math.sin(a)} opacity="0.2" />;
        })}
      </g>
      <polygon points={poly(17, sides, rot)} fill={accent} opacity="0.18" />
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={symbolSize} fontWeight="900" fontFamily="'Unbounded', 'IBM Plex Mono', 'Segoe UI Symbol', sans-serif" fill={`url(#${gid}-sym)`} style={{ filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.6))' }}>
        {card.symbol}
      </text>
    </svg>
  );
}
