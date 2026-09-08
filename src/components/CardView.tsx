import { useState, type CSSProperties } from 'react';
import { formatOneIn, rarityDef, DOMAIN_COLORS, type CardDef } from '../engine/cards';
import { Emblem } from './Emblem';

interface Props {
  card: CardDef;
  count?: number;
  locked?: boolean;
  size?: 'sm' | 'md';
  isNew?: boolean;
  onClick?: () => void;
  style?: CSSProperties;
}

/** Splash art comes from public/cards (see cards.art.json); a bare <id>.webp also works. Otherwise the generated emblem is shown. */
export const artUrl = (card: CardDef) => card.art ?? `/cards/${card.id}.webp`;

export function CardView({ card, count, locked, size = 'md', isNew, onClick, style }: Props) {
  const [artMissing, setArtMissing] = useState(false);
  const rarity = rarityDef(card.rarity);
  const domainColor = DOMAIN_COLORS[card.domain];
  const cls = ['card', `r-${card.rarity}`, size, locked ? 'locked' : ''].filter(Boolean).join(' ');
  const vars = { ['--r' as string]: rarity.color, ['--d' as string]: domainColor, ...style } as CSSProperties;
  const inner = (
    <>
      <div className="card-top">
        <span>{rarity.name}</span>
        <span>{card.kind === 'character' ? 'Character' : 'Beast'}</span>
      </div>
      <div className={`card-art ${!artMissing ? 'has-art' : ''}`}>
        {!artMissing && <img src={artUrl(card)} alt="" loading="lazy" decoding="async" onError={() => setArtMissing(true)} />}
        {artMissing && <Emblem card={card} locked={locked} />}
        {locked && <span className="card-lock" aria-hidden="true">?</span>}
      </div>
      <div className="card-name">{locked ? 'Undiscovered' : card.name}</div>
      <div className="card-meta">
        <span className="domain">{card.domain}</span>
        <span className="power">PWR {card.power}</span>
      </div>
      <div className="card-odds">{formatOneIn(card)}</div>
      {count != null && count > 1 && <span className="card-count">×{count}</span>}
      {isNew && <span className="card-new">NEW</span>}
    </>
  );
  if (onClick) {
    return (
      <button type="button" className={cls} style={vars} onClick={onClick} aria-label={locked ? `Locked ${rarity.name} card` : card.name}>
        {inner}
      </button>
    );
  }
  return <div className={cls} style={vars}>{inner}</div>;
}
