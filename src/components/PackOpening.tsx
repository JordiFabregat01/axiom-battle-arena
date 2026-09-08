import { useState, type CSSProperties } from 'react';
import { rarityDef, type CardDef, type PackDef } from '../engine/cards';
import { CardView } from './CardView';

interface Props {
  pack: PackDef;
  cards: CardDef[];
  newIds: string[];
  onDone: () => void;
}

export function PackOpening({ pack, cards, newIds, onDone }: Props) {
  const [revealed, setRevealed] = useState(false);
  const best = cards.reduce((b, c) => (rarityDef(c.rarity).rank > rarityDef(b.rarity).rank ? c : b), cards[0]);
  const bestDef = rarityDef(best.rarity);
  const fresh = newIds.length;

  return (
    <div className="pack-stage">
      {!revealed ? (
        <>
          <p className="eyebrow hot">{pack.name}</p>
          <button type="button" className={`pack ${pack.id}`} onClick={() => setRevealed(true)} aria-label={`Open ${pack.name}`}>
            <span className="pack-glyph">{pack.id === 'premium' ? '💎' : '🎴'}</span>
            <span>TAP TO OPEN</span>
          </button>
          <p className="dim">{pack.blurb}</p>
        </>
      ) : (
        <>
          <p className="eyebrow" style={{ color: bestDef.color }}>Best pull · {bestDef.name}</p>
          <div className="pack-reveal">
            {cards.map((c, i) => (
              <CardView key={i} card={c} isNew={newIds.includes(c.id)} style={{ ['--i' as string]: i } as CSSProperties} />
            ))}
          </div>
          <p className="dim">{fresh > 0 ? `${fresh} new card${fresh > 1 ? 's' : ''} for your collection.` : 'All duplicates this time. The rare ones are rare for a reason.'}</p>
          <button type="button" className="btn btn-chalk" onClick={onDone}>Done</button>
        </>
      )}
    </div>
  );
}
