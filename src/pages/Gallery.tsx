import { useState } from 'react';
import { Link, useRoute } from '../router';
import { CARDS, RARITIES, cardSortValue, isPackable, rarityDef, type CardDef, type Rarity } from '../engine/cards';
import { CardView } from '../components/CardView';
import { Modal } from '../components/Modal';

type Filter = 'all' | 'art' | Rarity;

/** Every card, shown unlocked: a codex for browsing the roster and checking new splash art. */
export function Gallery() {
  const { params } = useRoute();
  const [filter, setFilter] = useState<Filter>((params.get('filter') as Filter) || 'all');
  const [selected, setSelected] = useState<CardDef | null>(null);
  const sorted = [...CARDS].sort((a, b) => cardSortValue(b) - cardSortValue(a));
  const shown = sorted.filter((c) => (filter === 'all' ? true : filter === 'art' ? !!c.art : c.rarity === filter));
  const withArt = CARDS.filter((c) => c.art).length;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow cool">Gallery</p>
          <h1>{CARDS.length} cards</h1>
          <p className="dim">Every card in the game, unlocked for browsing. {withArt} have splash art; the rest show their generated emblem.</p>
        </div>
        <Link to="/collection" className="btn btn-sm">My collection</Link>
      </div>
      <div className="filters" style={{ marginBottom: '1rem' }}>
        <button type="button" className={filter === 'all' ? 'is-active' : ''} onClick={() => setFilter('all')}>All</button>
        <button type="button" className={filter === 'art' ? 'is-active' : ''} onClick={() => setFilter('art')}>With art</button>
        {RARITIES.map((r) => (
          <button type="button" key={r.key} className={filter === r.key ? 'is-active' : ''} onClick={() => setFilter(r.key)} style={filter === r.key ? { background: r.color, borderColor: r.color } : { color: r.color, borderColor: `${r.color}66` }}>
            {r.name}
          </button>
        ))}
      </div>
      <div className="card-grid">
        {shown.map((c) => <CardView key={c.id} card={c} onClick={() => setSelected(c)} />)}
      </div>
      <Modal open={selected !== null} onClose={() => setSelected(null)}>
        {selected && (
          <div className="grid-2" style={{ alignItems: 'start' }}>
            <div style={{ maxWidth: 300, margin: '0 auto', width: '100%' }}><CardView card={selected} /></div>
            <div className="stack">
              <span className="rarity-pill" style={{ color: rarityDef(selected.rarity).color, borderColor: rarityDef(selected.rarity).color, alignSelf: 'flex-start' }}>{rarityDef(selected.rarity).name} · {selected.kind}</span>
              <h2>{selected.name}</h2>
              {selected.flavor && <p className="dim" style={{ fontStyle: 'italic' }}>“{selected.flavor}”</p>}
              <p className="mono dim" style={{ fontSize: '0.85rem' }}>id: {selected.id} · {selected.domain} · power {selected.power} · {isPackable(selected) ? 'in packs' : `${selected.source} exclusive`}</p>
              {selected.art ? <p className="dim" style={{ fontSize: '0.85rem' }}>Art: <code className="mono">{decodeURIComponent(selected.art.replace('/cards/', 'public/cards/'))}</code></p> : <p className="dim" style={{ fontSize: '0.85rem' }}>No art yet. Add <code className="mono">public/cards/{selected.id}.jpg</code> to give it some.</p>}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
