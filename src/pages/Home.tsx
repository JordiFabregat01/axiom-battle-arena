import { useMemo } from 'react';
import { Link } from '../router';
import { useProfile, PACK_PROGRESS_NEEDED, totalWins, ownedCount, storyCleared, isPlus } from '../state/store';
import { useArena } from '../arena';
import { rankFor, levelFromXp } from '../engine/ranking';
import { SEASON, seasonTimeLeft } from '../engine/season';
import { TIERS, generateProblem } from '../engine/problems';
import { QUESTS } from '../engine/story';
import { mulberry32 } from '../engine/rng';
import { CARDS, cardById } from '../engine/cards';
import { RankBadge } from '../components/RankBadge';
import { CardView } from '../components/CardView';

export function Home() {
  const { profile } = useProfile();
  const { openPack } = useArena();
  const rank = rankFor(profile.elo);
  const lvl = levelFromXp(profile.xp);
  const left = seasonTimeLeft();
  const packs = profile.packs.standard + profile.packs.premium;
  const spotlight = profile.spotlight.map(cardById).filter((c): c is NonNullable<typeof c> => !!c);
  const chaptersTotal = QUESTS.reduce((s, q) => s + q.chapters.length, 0);
  const nextQuest = QUESTS.find((q) => (profile.story[q.id]?.cleared ?? 0) < q.chapters.length);

  const sample = useMemo(() => {
    const rng = mulberry32(42);
    const out: string[] = [];
    for (let round = 0; round < 3; round++) for (const t of TIERS) out.push(generateProblem(t.id, rng).text);
    return out;
  }, []);

  return (
    <div className="page">
      <section className="hero">
        <div>
          <p className="eyebrow hot">Season {SEASON.number} · {SEASON.name} · {left.ended ? 'ended' : `${left.days}d ${left.hours}h left`}</p>
          <h1 style={{ marginTop: '0.6rem' }}>Fast-paced math duels. <em>Climb the ladder.</em></h1>
          <p className="lede">
            Sixty seconds, one opponent, the same questions for both of you. Win to earn packs, collect beasts and legendary mathematicians, and fight your way from Bronze to Grandmaster.
          </p>
          <div className="cta">
            <Link to="/duel?mode=ranked" className="btn btn-hot btn-lg">⚔ Ranked duel</Link>
            <Link to="/play" className="btn btn-lg">Casual by level</Link>
            <Link to={nextQuest ? `/story?quest=${nextQuest.id}` : '/story'} className="btn btn-lg btn-ghost">📖 Story</Link>
            {packs > 0 && (
              <button type="button" className="btn btn-cool btn-lg" onClick={() => openPack(profile.packs.standard > 0 ? 'standard' : 'premium')}>
                🎴 Open pack ({packs})
              </button>
            )}
          </div>
        </div>

        <div className="panel hero-card">
          <span className="hero-eq" aria-hidden="true">∑</span>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p className="eyebrow">{profile.titles.length ? profile.titles[profile.titles.length - 1] : 'Competitor'}</p>
              <h2 className={isPlus(profile) ? 'plus-name' : ''}>{profile.name}</h2>
              <p className="dim mono" style={{ fontSize: '0.85rem' }}>Level {lvl.level} · {lvl.into}/{lvl.need} xp</p>
            </div>
            <RankBadge elo={profile.elo} size="lg" />
          </div>
          <div className="bar" style={{ marginTop: '0.8rem' }}><i style={{ width: `${(lvl.into / lvl.need) * 100}%` }} /></div>
          <div className="divider" />
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="eyebrow">{rank.nextAt ? `${rank.nextAt - profile.elo} elo to next division` : 'Top of the ladder'}</span>
            <span className="mono dim" style={{ fontSize: '0.8rem' }}>{Math.round(rank.progress * 100)}%</span>
          </div>
          <div className="bar gold" style={{ marginTop: '0.4rem' }}><i style={{ width: `${rank.progress * 100}%`, background: rank.tier.color }} /></div>
          <div className="row" style={{ justifyContent: 'space-between', marginTop: '1rem' }}>
            <span className="eyebrow hot">Next pack</span>
            <span className="mono dim" style={{ fontSize: '0.8rem' }}>{profile.packProgress}/{PACK_PROGRESS_NEEDED} · ranked wins count double</span>
          </div>
          <div className="bar hot" style={{ marginTop: '0.4rem' }}><i style={{ width: `${(profile.packProgress / PACK_PROGRESS_NEEDED) * 100}%` }} /></div>
          <div className="stat-grid" style={{ marginTop: '1.2rem' }}>
            <div className="stat"><span className="value">{totalWins(profile)}</span><span className="label">wins</span></div>
            <div className="stat"><span className="value gold">{profile.coins.toLocaleString('en-US')}</span><span className="label">coins</span></div>
            <div className="stat"><span className="value">{ownedCount(profile)}<span className="faint" style={{ fontSize: '0.9rem' }}>/{CARDS.length}</span></span><span className="label">cards</span></div>
            <div className="stat"><span className="value">{storyCleared(profile)}<span className="faint" style={{ fontSize: '0.9rem' }}>/{chaptersTotal}</span></span><span className="label">chapters</span></div>
          </div>
          {spotlight.length > 0 && (
            <>
              <div className="divider" />
              <p className="eyebrow" style={{ marginBottom: '0.5rem' }}>Spotlight</p>
              <div className="card-grid spotlight">
                {spotlight.slice(0, 5).map((c) => <CardView key={c.id} card={c} size="sm" />)}
              </div>
            </>
          )}
        </div>
      </section>

      <div className="marquee" aria-hidden="true">
        <div>
          {[...sample, ...sample].map((s, i) => <span key={i}>{s}</span>)}
        </div>
      </div>

      <section style={{ padding: '3rem 0 1rem' }}>
        <p className="eyebrow cool" style={{ marginBottom: '1rem' }}>How it works</p>
        <div className="steps">
          <div className="step"><h3>Pick a level or queue ranked</h3><p>Seven levels from Sprout (ages 6–8) to Grandmaster. Ranked starts everyone at 1000, matches you near your rating and scales the questions as you climb.</p></div>
          <div className="step"><h3>Sixty-second duel</h3><p>Both players get the same questions. Correct answers score 100 plus a speed bonus; wrong answers cost 25. Five in a row triggers a streak bonus.</p></div>
          <div className="step"><h3>Win packs, play the story</h3><p>Every ten progress points earns an Arena Pack: casual wins count one, ranked wins count two. Story chapters pay coins and packs, and each quest line ends with a character card.</p></div>
          <div className="step"><h3>Collect and show off</h3><p>{CARDS.length} beasts and mathematicians across seven rarities, each printing its exact pull odds. Put your favourites in the spotlight deck for everyone to see.</p></div>
        </div>
      </section>

      <section className="panel" style={{ marginTop: '2rem' }}>
        <div className="panel-head">
          <div>
            <p className="eyebrow gold">Season {SEASON.number} spotlight</p>
            <h3>Featured this season</h3>
          </div>
          <Link to="/ranks" className="btn btn-sm">Ranks & rewards</Link>
        </div>
        <div className="row" style={{ gap: '0.5rem' }}>
          {SEASON.featuredTopics.map((t) => <span key={t} className="chip">{t}</span>)}
          {SEASON.newCards.map((id) => cardById(id)).filter(Boolean).map((c) => <span key={c!.id} className="chip" style={{ borderColor: 'rgba(242,193,78,0.5)' }}>New card · {c!.name.split(' ·')[0]}</span>)}
        </div>
      </section>

      <section className="panel" style={{ marginTop: '1.2rem' }}>
        <div className="panel-head">
          <div>
            <p className="eyebrow gold">For teachers</p>
            <h3>Send your class to the right level</h3>
          </div>
        </div>
        <p className="dim" style={{ marginBottom: '1rem' }}>Casual duels never change rating and always use the level you choose, so students can drill exactly what you are teaching. Share a level link and let them race.</p>
        <div className="tiles">
          {TIERS.map((t) => (
            <Link key={t.id} to={`/play?tier=${t.id}`} className="tile">
              <span className="t-num">LEVEL {t.id}</span>
              <span className="t-name">{t.name}</span>
              <span className="t-ages">{t.ages}</span>
              <span className="t-blurb">{t.topics.slice(0, 3).join(' · ')}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
