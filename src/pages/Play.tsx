import { useState } from 'react';
import { Link, useRoute, navigate } from '../router';
import { useProfile } from '../state/store';
import { TIERS, tierById } from '../engine/problems';
import { rankFor } from '../engine/ranking';
import { clamp } from '../engine/rng';
import { RankBadge } from '../components/RankBadge';

export function Play() {
  const { params } = useRoute();
  const { profile } = useProfile();
  const [tier, setTier] = useState(() => clamp(Number(params.get('tier')) || profile.placement, 1, 7));
  const rank = rankFor(profile.elo);
  const [lo, hi] = rank.tier.bracket;
  const stats = profile.tierStats[tier];
  const chosen = tierById(tier);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow cool">Choose your duel</p>
          <h1>Play</h1>
        </div>
      </div>

      <div className="grid-2">
        <section className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Casual · by level</p>
              <h2>Practice at your pace</h2>
            </div>
          </div>
          <p className="dim" style={{ marginBottom: '1rem' }}>Pick a level. Rating never changes here, and wins still count towards packs.</p>
          <div className="tiles" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))' }}>
            {TIERS.map((t) => (
              <button type="button" key={t.id} className={`tile ${tier === t.id ? 'is-selected' : ''}`} onClick={() => setTier(t.id)}>
                <span className="t-num">LEVEL {t.id}</span>
                <span className="t-name">{t.name}</span>
                <span className="t-ages">{t.ages}</span>
              </button>
            ))}
          </div>
          <div className="divider" />
          <p className="dim" style={{ fontSize: '0.9rem' }}><b style={{ color: 'var(--chalk)' }}>{chosen.name}</b> · {chosen.topics.join(' · ')}</p>
          <div className="row" style={{ marginTop: '1rem', justifyContent: 'space-between' }}>
            <span className="mono dim" style={{ fontSize: '0.85rem' }}>
              {stats ? `${stats.games} game${stats.games > 1 ? 's' : ''} · avg ${stats.avgScore} · best ${stats.best}` : 'No games at this level yet'}
            </span>
            <button type="button" className="btn btn-cool btn-lg" onClick={() => navigate(`/duel?mode=casual&tier=${tier}`)}>Start casual duel</button>
          </div>
        </section>

        <section className="panel" style={{ borderColor: 'rgba(255,92,58,0.45)' }}>
          <div className="panel-head">
            <div>
              <p className="eyebrow hot">Ranked · Elo matchmaking</p>
              <h2>Climb the ladder</h2>
            </div>
            <RankBadge elo={profile.elo} />
          </div>
          <p className="dim">You will be matched with an opponent near <b className="mono" style={{ color: 'var(--chalk)' }}>{profile.elo}</b> rating. Questions at {rank.label} draw from <b style={{ color: 'var(--chalk)' }}>{tierById(lo).name}</b>{lo !== hi && <> and <b style={{ color: 'var(--chalk)' }}>{tierById(hi).name}</b></>} level{lo !== hi ? 's' : ''}{lo !== hi ? `, with the harder one appearing ${20 + rank.divisionIndex * 20}% of the time` : ''}.</p>
          <div className="stat-grid" style={{ margin: '1.2rem 0' }}>
            <div className="stat"><span className="value">{profile.rankedWins}</span><span className="label">ranked wins</span></div>
            <div className="stat"><span className="value">{profile.rankedLosses}</span><span className="label">losses</span></div>
            <div className="stat"><span className="value">{profile.peakElo}</span><span className="label">peak elo</span></div>
          </div>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <Link to="/ranks" className="dim" style={{ fontSize: '0.85rem', textDecoration: 'underline' }}>How ranks and seasons work</Link>
            <button type="button" className="btn btn-hot btn-lg" onClick={() => navigate('/duel?mode=ranked')}>⚔ Queue ranked</button>
          </div>
        </section>
      </div>
    </div>
  );
}
