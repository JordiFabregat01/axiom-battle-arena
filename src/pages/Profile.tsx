import { useState } from 'react';
import { Link } from '../router';
import { useProfile, totalGames, totalWins, ownedCount, storyCleared, isPlus } from '../state/store';
import { rankFor, levelFromXp } from '../engine/ranking';
import { TIERS, tierById } from '../engine/problems';
import { QUESTS } from '../engine/story';
import { CARDS, cardById, type CardDef } from '../engine/cards';
import { RankBadge } from '../components/RankBadge';
import { CardView } from '../components/CardView';

export function Profile() {
  const { profile, dispatch } = useProfile();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile.name);
  const rank = rankFor(profile.elo);
  const lvl = levelFromXp(profile.xp);
  const games = totalGames(profile);
  const wins = totalWins(profile);
  const winRate = games ? Math.round((wins / games) * 100) : 0;
  const spotlight = profile.spotlight.map(cardById).filter((c): c is CardDef => !!c);
  const since = new Date(profile.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  const chaptersTotal = QUESTS.reduce((s, q) => s + q.chapters.length, 0);
  const plus = isPlus(profile);

  const reset = () => {
    if (window.confirm('Delete this profile and all progress on this device? This cannot be undone.')) dispatch({ type: 'reset' });
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow cool">{profile.titles.length ? profile.titles.join(' · ') : 'Competitor'} · since {since}{plus ? ' · Plus member' : ''}</p>
          {editing ? (
            <form className="row" onSubmit={(e) => { e.preventDefault(); dispatch({ type: 'rename', name }); setEditing(false); }}>
              <input className="text-input" style={{ width: 260 }} maxLength={20} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
              <button type="submit" className="btn btn-sm btn-chalk">Save</button>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => { setEditing(false); setName(profile.name); }}>Cancel</button>
            </form>
          ) : (
            <h1 className={plus ? 'plus-name' : ''}>{profile.name} {plus && <span className="chip plus-chip">PLUS</span>} <button type="button" className="btn btn-sm btn-ghost" onClick={() => setEditing(true)} aria-label="Rename">✎</button></h1>
          )}
          <p className="dim mono" style={{ fontSize: '0.9rem' }}>Level {lvl.level} · {lvl.into}/{lvl.need} xp</p>
          <div className="bar" style={{ marginTop: '0.4rem', maxWidth: 320 }}><i style={{ width: `${(lvl.into / lvl.need) * 100}%` }} /></div>
        </div>
        <RankBadge elo={profile.elo} size="lg" />
      </div>

      <div className="grid-2">
        <section className="panel">
          <div className="panel-head">
            <h3>Ranked standing</h3>
            <span className="chip">Peak {profile.peakElo}</span>
          </div>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="eyebrow" style={{ color: rank.tier.color }}>{rank.label}</span>
            <span className="mono dim" style={{ fontSize: '0.8rem' }}>{rank.nextAt ? `${profile.elo} / ${rank.nextAt}` : `${profile.elo} · top tier`}</span>
          </div>
          <div className="bar" style={{ marginTop: '0.4rem' }}><i style={{ width: `${rank.progress * 100}%`, background: rank.tier.color }} /></div>
          <div className="stat-grid" style={{ marginTop: '1.2rem' }}>
            <div className="stat"><span className="value">{profile.rankedWins}–{profile.rankedLosses}</span><span className="label">ranked W–L</span></div>
            <div className="stat"><span className="value">{profile.casualWins}–{profile.casualLosses}</span><span className="label">casual W–L</span></div>
            <div className="stat"><span className="value">{winRate}%</span><span className="label">win rate</span></div>
            <div className="stat"><span className="value">{profile.streak}</span><span className="label">streak</span></div>
            <div className="stat"><span className="value">{profile.bestStreak}</span><span className="label">best streak</span></div>
            <div className="stat"><span className="value">{profile.packsOpened}</span><span className="label">packs opened</span></div>
            <div className="stat"><span className="value">{ownedCount(profile)}<span className="faint" style={{ fontSize: '0.9rem' }}>/{CARDS.length}</span></span><span className="label">cards</span></div>
            <div className="stat"><span className="value">{storyCleared(profile)}<span className="faint" style={{ fontSize: '0.9rem' }}>/{chaptersTotal}</span></span><span className="label">chapters</span></div>
            <div className="stat"><span className="value gold">{profile.coins.toLocaleString('en-US')}</span><span className="label">coins</span></div>
            <div className="stat"><span className="value">{tierById(profile.placement).name}</span><span className="label">casual level</span></div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h3>Spotlight deck</h3>
            <Link to="/collection" className="btn btn-sm">Edit</Link>
          </div>
          {spotlight.length ? (
            <div className={`card-grid spotlight ${spotlight.length > 5 ? 'wide' : ''}`}>{spotlight.map((c) => <CardView key={c.id} card={c} size="sm" />)}</div>
          ) : (
            <p className="dim">No cards in the spotlight yet. Open a pack and pick your favourites in the collection.</p>
          )}
        </section>
      </div>

      <div className="grid-2" style={{ marginTop: '1.2rem' }}>
        <section className="panel">
          <div className="panel-head"><h3>Recent duels</h3><span className="chip">{profile.history.length}</span></div>
          {profile.history.length === 0 ? <p className="dim">No duels yet. <Link to="/play" className="cool">Play your first.</Link></p> : (
            <div className="history">
              {profile.history.map((m) => (
                <div key={m.id} className="history-row">
                  <span className={`res ${m.result}`}>{m.result.toUpperCase()}</span>
                  <span>
                    <b>{m.opponent}</b> <span className="faint">· {m.mode === 'ranked' ? `ranked · ${m.opponentElo} elo` : `casual · ${tierById(m.tier ?? 1).name}`}</span>
                  </span>
                  <span className="mono">{m.score}–{m.oppScore}</span>
                  <span className={`delta ${m.eloDelta > 0 ? 'up' : m.eloDelta < 0 ? 'down' : 'faint'}`}>{m.mode === 'ranked' ? `${m.eloDelta > 0 ? '+' : ''}${m.eloDelta}` : '—'}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-head"><h3>By level</h3></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Level</th><th>Games</th><th>Avg score</th><th>Best</th></tr></thead>
              <tbody>
                {TIERS.map((t) => {
                  const s = profile.tierStats[t.id];
                  return (
                    <tr key={t.id}>
                      <td>{t.id} · {t.name}</td>
                      <td className="num">{s?.games ?? 0}</td>
                      <td className="num">{s?.avgScore ?? '—'}</td>
                      <td className="num">{s?.best ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="panel" style={{ marginTop: '1.2rem' }}>
        <div className="panel-head"><h3>Story progress</h3><Link to="/story" className="btn btn-sm">Play</Link></div>
        <div className="grid-3">
          {QUESTS.map((q) => {
            const p = profile.story[q.id] ?? { cleared: 0, stars: [] };
            return (
              <div key={q.id} className="stack" style={{ gap: '0.3rem' }}>
                <div className="row" style={{ justifyContent: 'space-between' }}><b>{q.title}</b><span className="mono dim" style={{ fontSize: '0.8rem' }}>{p.cleared}/{q.chapters.length}</span></div>
                <div className="bar"><i style={{ width: `${(p.cleared / q.chapters.length) * 100}%`, background: q.color }} /></div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel" style={{ marginTop: '1.2rem', borderColor: 'rgba(255,77,109,0.35)' }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <h3>Danger zone</h3>
            <p className="dim" style={{ fontSize: '0.9rem' }}>Wipe this profile from this device and start over.</p>
          </div>
          <button type="button" className="btn btn-danger" onClick={reset}>Reset progress</button>
        </div>
      </section>
    </div>
  );
}
