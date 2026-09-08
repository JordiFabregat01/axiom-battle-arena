import { useProfile, PACK_PROGRESS_NEEDED, PREMIUM_EVERY_RANKED_WINS } from '../state/store';
import { RANK_TIERS, DIVISIONS, K_FACTOR, STARTING_ELO, rankFor } from '../engine/ranking';
import { tierById } from '../engine/problems';
import { SEASON, seasonTimeLeft, rewardTierName } from '../engine/season';
import { RARITIES, packableCards, cardById, PACKS } from '../engine/cards';
import { CardView } from '../components/CardView';

export function Ranks() {
  const { profile } = useProfile();
  const mine = rankFor(profile.elo);
  const left = seasonTimeLeft();
  const golem = cardById('genesis-golem');

  return (
    <div className="page stack" style={{ gap: '1.6rem' }}>
      <div className="page-head">
        <div>
          <p className="eyebrow cool">Competitive</p>
          <h1>Ranks & seasons</h1>
        </div>
      </div>

      <section>
        <p className="eyebrow" style={{ marginBottom: '0.8rem' }}>The ladder</p>
        <div className="ladder-tiers">
          {RANK_TIERS.map((t, i) => {
            const next = RANK_TIERS[i + 1];
            const [lo, hi] = t.bracket;
            return (
              <div key={t.key} className={`ladder-tier ${mine.tier.key === t.key ? 'is-you' : ''}`} style={{ ['--rank' as string]: t.color, animationDelay: `${i * 0.06}s` }}>
                <span style={{ fontSize: '1.6rem', color: t.color }}>{t.glyph}</span>
                <span className="lt-name">{t.name}</span>
                <span className="lt-range">{next ? `${t.base} – ${next.base - 1}` : `${t.base}+`} elo</span>
                <span className="lt-bracket">{t.key === 'grandmaster' ? 'No divisions' : `Divisions ${DIVISIONS[0]} → ${DIVISIONS[3]}`}</span>
                <span className="lt-bracket">Questions: {tierById(lo).name}{lo !== hi ? ` → ${tierById(hi).name}` : ''}</span>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid-2">
        <section className="panel">
          <h3 style={{ marginBottom: '0.6rem' }}>How ranked works</h3>
          <ul className="dim" style={{ margin: 0, paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <li>Everyone starts at {STARTING_ELO} ({rankFor(STARTING_ELO).label}). There is no placement into higher tiers: you climb.</li>
            <li>Ranked matchmaking finds an opponent within roughly 100 rating points of you.</li>
            <li>After each duel your rating moves by up to {K_FACTOR} points using the Elo formula: beating a stronger opponent pays more.</li>
            <li>Each tier spans 400 points with four divisions of 100. Cross the line and you are promoted on the spot.</li>
            <li>The questions scale with your tier: higher divisions draw more often from the harder level in the bracket.</li>
            <li>Casual duels never touch your rating, so practise freely. Nothing you can buy changes matchmaking or questions.</li>
          </ul>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow gold">Season {SEASON.number}</p>
              <h3>{SEASON.name}</h3>
            </div>
            <span className="chip">{left.ended ? 'Ended' : `${left.days}d ${left.hours}h ${left.minutes}m left`}</span>
          </div>
          <p className="dim" style={{ fontSize: '0.9rem', marginBottom: '0.6rem' }}>Every season features new math topics and new collectibles. When it ends you receive rewards for the tier you finish in, then ratings soft-reset 40% of the way towards 1000 for a fresh climb.</p>
          <div className="row" style={{ gap: '0.4rem', marginBottom: '0.8rem' }}>
            {SEASON.featuredTopics.map((t) => <span key={t} className="chip">{t}</span>)}
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Finish</th><th>Coins</th><th>Arena</th><th>Prime</th><th>Title</th><th>Card</th></tr></thead>
              <tbody>
                {SEASON.rewards.map((r) => (
                  <tr key={r.tierKey} className={mine.tier.key === r.tierKey ? 'is-you' : ''}>
                    <td style={{ color: RANK_TIERS.find((t) => t.key === r.tierKey)?.color }}>{rewardTierName(r.tierKey)}</td>
                    <td className="num">{r.coins}</td>
                    <td className="num">{r.standard}</td>
                    <td className="num">{r.premium || '—'}</td>
                    <td>{r.title ?? '—'}</td>
                    <td>{r.card ? cardById(r.card)?.name.split(' ·')[0] : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="grid-2">
        <section className="panel">
          <h3 style={{ marginBottom: '0.6rem' }}>Packs</h3>
          <ul className="dim" style={{ margin: 0, paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <li><b style={{ color: 'var(--chalk)' }}>{PACKS.standard.name}</b>: every {PACK_PROGRESS_NEEDED} progress points. A casual win is 1 point, a ranked win is 2, so that is five ranked wins or ten casual ones. {PACKS.standard.blurb} Also {PACKS.standard.price} coins in the shop.</li>
            <li><b style={{ color: 'var(--chalk)' }}>{PACKS.premium.name}</b>: every {PREMIUM_EVERY_RANKED_WINS} ranked wins, story finales, season rewards and the monthly Plus drop. {PACKS.premium.blurb} Also {PACKS.premium.price} coins in the shop.</li>
            <li>Every card prints its own odds. Per slot, each rarity is shared evenly among its cards:</li>
          </ul>
          <div className="table-wrap" style={{ marginTop: '0.8rem' }}>
            <table>
              <thead><tr><th>Rarity</th><th>Slot chance</th><th>Cards</th><th>Each card</th></tr></thead>
              <tbody>
                {RARITIES.map((r) => {
                  const n = packableCards.filter((c) => c.rarity === r.key).length;
                  return (
                    <tr key={r.key}>
                      <td style={{ color: r.color, fontWeight: 600 }}>{r.name}</td>
                      <td className="num">{(r.weight * 100).toPrecision(r.weight < 0.01 ? 2 : 3)}%</td>
                      <td className="num">{n}</td>
                      <td className="num">1 in {Math.round(n / r.weight).toLocaleString('en-US')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel" style={{ display: 'flex', gap: '1.2rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ width: 170 }}>{golem && <CardView card={golem} locked={!(profile.collection['genesis-golem'] > 0)} />}</div>
          <div className="stack" style={{ flex: 1, minWidth: 200 }}>
            <p className="eyebrow gold">Season exclusive</p>
            <h3>{golem?.name}</h3>
            <p className="dim" style={{ fontSize: '0.9rem' }}>Never drops from packs. Finish Season {SEASON.number} at Platinum or above and it is yours forever, with the season stamped on it.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
