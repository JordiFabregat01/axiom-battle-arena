import { useState } from 'react';
import { useProfile, ownedCount, spotlightSize, isPlus } from '../state/store';
import { useArena } from '../arena';
import { Link } from '../router';
import { CARDS, RARITIES, cardById, cardOdds, cardSortValue, formatOneIn, rarityDef, isPackable, PACKS, type CardDef, type Rarity } from '../engine/cards';
import { CardView } from '../components/CardView';
import { Modal } from '../components/Modal';

type Filter = 'all' | 'owned' | 'exclusive' | Rarity;

export function Collection() {
  const { profile, dispatch } = useProfile();
  const { openPack } = useArena();
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<CardDef | null>(null);

  const owned = ownedCount(profile);
  const slots = spotlightSize(profile);
  const sorted = [...CARDS].sort((a, b) => cardSortValue(b) - cardSortValue(a));
  const shown = sorted.filter((c) => {
    if (filter === 'all') return true;
    if (filter === 'owned') return profile.collection[c.id] > 0;
    if (filter === 'exclusive') return !isPackable(c);
    return c.rarity === filter;
  });
  const spotlight = profile.spotlight.map(cardById).filter((c): c is CardDef => !!c);
  const has = (id: string) => (profile.collection[id] ?? 0) > 0;

  const toggleSpotlight = (id: string) => {
    if (profile.spotlight.includes(id)) dispatch({ type: 'setSpotlight', ids: profile.spotlight.filter((x) => x !== id) });
    else if (profile.spotlight.length < slots) dispatch({ type: 'setSpotlight', ids: [...profile.spotlight, id] });
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow cool">Collection</p>
          <h1>{owned} <span className="faint">/ {CARDS.length}</span> collected</h1>
        </div>
        <div className="row">
          {profile.packs.standard > 0 && <button type="button" className="btn btn-hot" onClick={() => openPack('standard')}>🎴 Open {PACKS.standard.name} ({profile.packs.standard})</button>}
          {profile.packs.premium > 0 && <button type="button" className="btn btn-cool" onClick={() => openPack('premium')}>💎 Open {PACKS.premium.name} ({profile.packs.premium})</button>}
          {profile.packs.standard + profile.packs.premium === 0 && <Link to="/shop" className="chip">Win duels or visit the shop for packs</Link>}
          <Link to="/gallery" className="btn btn-sm">Gallery</Link>
        </div>
      </div>

      <section className="panel" style={{ marginBottom: '1.4rem' }}>
        <div className="panel-head">
          <div>
            <h3>Spotlight deck</h3>
            <p className="dim" style={{ fontSize: '0.9rem' }}>{slots} cards shown on your profile and to every opponent before a duel. Tap a card below to add it.{!isPlus(profile) && <> <Link to="/plus" className="gold">Plus members get 8 slots.</Link></>}</p>
          </div>
          <span className="chip">{spotlight.length}/{slots}</span>
        </div>
        <div className={`card-grid spotlight ${slots > 5 ? 'wide' : ''}`}>
          {Array.from({ length: slots }, (_, i) => spotlight[i]
            ? <CardView key={spotlight[i].id} card={spotlight[i]} size="sm" onClick={() => setSelected(spotlight[i])} />
            : <div key={`empty-${i}`} className="slot-empty">Empty</div>)}
        </div>
      </section>

      <div className="filters" style={{ marginBottom: '1rem' }}>
        <button type="button" className={filter === 'all' ? 'is-active' : ''} onClick={() => setFilter('all')}>All</button>
        <button type="button" className={filter === 'owned' ? 'is-active' : ''} onClick={() => setFilter('owned')}>Owned</button>
        <button type="button" className={filter === 'exclusive' ? 'is-active' : ''} onClick={() => setFilter('exclusive')}>Exclusives</button>
        {RARITIES.map((r) => (
          <button type="button" key={r.key} className={filter === r.key ? 'is-active' : ''} onClick={() => setFilter(r.key)} style={filter === r.key ? { background: r.color, borderColor: r.color } : { color: r.color, borderColor: `${r.color}66` }}>
            {r.name}
          </button>
        ))}
      </div>

      <div className="card-grid">
        {shown.map((c) => (
          <CardView key={c.id} card={c} count={profile.collection[c.id]} locked={!has(c.id)} onClick={() => setSelected(c)} />
        ))}
      </div>

      <Modal open={selected !== null} onClose={() => setSelected(null)}>
        {selected && (
          <CardDetail
            card={selected}
            count={profile.collection[selected.id] ?? 0}
            inSpotlight={profile.spotlight.includes(selected.id)}
            spotlightFull={profile.spotlight.length >= slots}
            onToggle={() => toggleSpotlight(selected.id)}
          />
        )}
      </Modal>
    </div>
  );
}

function CardDetail({ card, count, inSpotlight, spotlightFull, onToggle }: { card: CardDef; count: number; inSpotlight: boolean; spotlightFull: boolean; onToggle: () => void }) {
  const r = rarityDef(card.rarity);
  const odds = cardOdds(card);
  const perPack = isPackable(card) ? 1 - (1 - odds.p) ** PACKS.standard.size : 0;
  const owned = count > 0;
  const sourceText = { pack: '', season: 'Awarded for finishing a season at Platinum or above.', story: 'Unlocked by finishing its quest line in Story mode.', plus: 'Claimed from the monthly Plus drop.' }[card.source];
  return (
    <div className="grid-2" style={{ alignItems: 'start' }}>
      <div style={{ maxWidth: 260, margin: '0 auto', width: '100%' }}>
        <CardView card={card} count={count} locked={!owned} />
      </div>
      <div className="stack">
        <span className="rarity-pill" style={{ color: r.color, borderColor: r.color, alignSelf: 'flex-start' }}>{r.name} · {card.kind}</span>
        <h2>{owned ? card.name : 'Undiscovered'}</h2>
        <p className="dim" style={{ fontStyle: 'italic' }}>{owned ? `“${card.flavor}”` : (sourceText || 'Open packs to discover this card.')}</p>
        <div className="stat-grid">
          <div className="stat"><span className="value">{card.power}</span><span className="label">power</span></div>
          <div className="stat"><span className="value" style={{ fontSize: '1.05rem' }}>{card.domain}</span><span className="label">domain</span></div>
          <div className="stat"><span className="value">{count}</span><span className="label">owned</span></div>
        </div>
        <div className="panel tight">
          <p className="eyebrow" style={{ marginBottom: '0.3rem' }}>Pull odds</p>
          {isPackable(card) ? (
            <>
              <p><b className="mono" style={{ color: r.color }}>{formatOneIn(card)}</b> <span className="dim">per card slot</span></p>
              <p className="dim" style={{ fontSize: '0.85rem' }}>About {(perPack * 100).toPrecision(2)}% of five-card packs contain it.</p>
            </>
          ) : (
            <p className="dim">Not available in packs. {sourceText}</p>
          )}
        </div>
        <button type="button" className={`btn ${inSpotlight ? '' : 'btn-cool'}`} disabled={!owned || (!inSpotlight && spotlightFull)} onClick={onToggle}>
          {inSpotlight ? 'Remove from spotlight' : spotlightFull ? 'Spotlight is full' : owned ? 'Add to spotlight' : 'Not owned yet'}
        </button>
      </div>
    </div>
  );
}
