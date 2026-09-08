import { hashString, mulberry32 } from '../engine/rng';

/** A deterministic geometric emblem so every card has its own "art" without image assets. */
export function Sigil({ seed, color }: { seed: string; color: string }) {
  const rng = mulberry32(hashString(seed));
  const sides = 3 + Math.floor(rng() * 6);
  const rings = 2 + Math.floor(rng() * 3);
  const rot = rng() * 360;
  const poly = (r: number, n: number, offset: number) =>
    Array.from({ length: n }, (_, i) => {
      const a = ((Math.PI * 2) / n) * i + (offset * Math.PI) / 180;
      return `${50 + r * Math.cos(a)},${50 + r * Math.sin(a)}`;
    }).join(' ');
  const dash = [`${2 + rng() * 6} ${3 + rng() * 6}`, `${1 + rng() * 3} ${6 + rng() * 8}`, `${8 + rng() * 12} ${4 + rng() * 6}`];
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <g fill="none" stroke={color} strokeWidth="0.8">
        {Array.from({ length: rings }, (_, i) => (
          <circle key={i} cx="50" cy="50" r={44 - i * 9} strokeDasharray={dash[i % dash.length]} opacity={0.9 - i * 0.2} />
        ))}
        <polygon points={poly(34, sides, rot)} strokeWidth="1.2" />
        <polygon points={poly(22, sides, rot + 180 / sides)} opacity="0.7" />
        <polygon points={poly(12, sides, rot)} opacity="0.5" fill={color} fillOpacity="0.15" />
        {sides % 2 === 0 && <line x1="6" y1="50" x2="94" y2="50" opacity="0.3" />}
        {sides % 3 === 0 && <line x1="50" y1="6" x2="50" y2="94" opacity="0.3" />}
      </g>
    </svg>
  );
}
