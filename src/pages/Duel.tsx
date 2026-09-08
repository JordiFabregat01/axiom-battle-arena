import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Link, navigate, useRoute } from '../router';
import { useProfile, PACK_PROGRESS_NEEDED } from '../state/store';
import { useLocalDuel, useRemoteDuel, type DuelController } from '../game/duelController';
import { clamp } from '../engine/rng';
import { DUEL_SECONDS, tierById } from '../engine/problems';
import { cardById } from '../engine/cards';
import { onlineEnabled } from '../net/socket';
import { RankBadge } from '../components/RankBadge';
import { CardView } from '../components/CardView';
import { Numpad, type NumpadKey } from '../components/Numpad';
import { useArena } from '../arena';
import type { DuelMode, OpponentInfo } from '../shared/protocol';

const coarsePointer = () => typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;

export function DuelPage() {
  const { params } = useRoute();
  const { profile } = useProfile();
  const mode: DuelMode = params.get('mode') === 'ranked' ? 'ranked' : 'casual';
  const tier = mode === 'casual' ? clamp(Number(params.get('tier')) || profile.placement, 1, 7) : null;
  return onlineEnabled ? <RemoteDuel mode={mode} tier={tier} /> : <LocalDuel mode={mode} tier={tier} />;
}

function LocalDuel({ mode, tier }: { mode: DuelMode; tier: number | null }) {
  const controller = useLocalDuel(mode, tier);
  return <DuelScreen mode={mode} tier={tier} c={controller} />;
}

function RemoteDuel({ mode, tier }: { mode: DuelMode; tier: number | null }) {
  const controller = useRemoteDuel(mode, tier);
  return <DuelScreen mode={mode} tier={tier} c={controller} />;
}

function DuelScreen({ mode, tier, c }: { mode: DuelMode; tier: number | null; c: DuelController }) {
  const { profile } = useProfile();
  const { openPack } = useArena();
  const [value, setValue] = useState('');
  const [fx, setFx] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (c.stage === 'playing') inputRef.current?.focus(); }, [c.stage]);
  useEffect(() => {
    if (!c.flash) return;
    setFx(`flash-${c.flash.kind}`);
    if (c.flash.kind !== 'wrong') setValue('');
    const t = window.setTimeout(() => setFx(''), 380);
    return () => window.clearTimeout(t);
  }, [c.flash]);

  const submit = () => {
    if (!value.trim()) return;
    c.submit(value);
    if (!onlineEnabled) setValue('');
    inputRef.current?.focus();
  };
  const skip = () => { c.skip(); setValue(''); inputRef.current?.focus(); };
  const onKey = (k: NumpadKey) => {
    if (k === 'enter') return submit();
    if (k === 'skip') return skip();
    if (k === 'back') return setValue((v) => v.slice(0, -1));
    if (k === 'neg') return setValue((v) => (v.startsWith('-') ? v.slice(1) : `-${v}`));
    setValue((v) => (v.length < 9 ? v + k : v));
  };
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); skip(); }
    if (e.key === 'Enter') { e.preventDefault(); submit(); }
  };
  const rematch = () => navigate(`/duel?mode=${mode}${tier ? `&tier=${tier}` : ''}&n=${Date.now().toString(36)}`);
  const modeLabel = mode === 'ranked' ? 'Ranked duel' : `Casual · ${tierById(tier ?? 1).name}`;

  if (c.error) {
    return (
      <div className="page matchmaking">
        <p className="eyebrow hot">Could not start the duel</p>
        <p className="dim">{c.error}</p>
        <Link to="/play" className="btn">Back</Link>
      </div>
    );
  }

  if (c.stage === 'searching') {
    return (
      <div className="page matchmaking">
        <div className="radar"><span>{mode === 'ranked' ? profile.elo : tier}</span></div>
        <p className="eyebrow" style={{ animation: 'pulse 1.2s infinite' }}>{mode === 'ranked' ? `Searching near ${profile.elo} elo` : `Finding a ${tierById(tier ?? 1).name} sparring partner`}</p>
        <p className="dim">{modeLabel}{onlineEnabled ? ' · live matchmaking' : ''}</p>
        <Link to="/play" className="btn btn-ghost btn-sm">Cancel</Link>
      </div>
    );
  }

  if (c.stage === 'versus' && c.opponent) {
    return (
      <div className="page matchmaking">
        <p className="eyebrow hot">{modeLabel} · opponent found</p>
        <div className="versus">
          <Side name={profile.name} elo={profile.elo} spotlight={profile.spotlight} />
          <div className="vs">VS</div>
          <Side opponent={c.opponent} right />
        </div>
        <p className="dim">Same questions for both. {DUEL_SECONDS} seconds. Go.</p>
      </div>
    );
  }

  const { me, opp, problem, stage, timeLeft, countdown, flash, outcome, opponent } = c;
  const total = me.score + opp.score || 1;

  return (
    <div className="page duel">
      <div className="duel-top">
        <div className="fighter">
          <span className="f-name">{profile.name}</span>
          <span className="f-score cool">{me.score}</span>
          <span className="f-sub">{me.correct} ✓ · {me.wrong} ✗ · streak {me.streak}</span>
        </div>
        <TimerRing timeLeft={timeLeft} />
        <div className="fighter right">
          <span className="f-name">{opponent?.name ?? '…'}</span>
          <span className="f-score hot">{opp.score}</span>
          <span className="f-sub">{opp.correct} ✓ · {opp.wrong} ✗ · {opponent?.elo ?? '?'} elo{opponent && !opponent.isBot ? ' · human' : ''}</span>
        </div>
      </div>
      <div className="score-race" aria-hidden="true">
        <i className="mine"><b style={{ width: `${(me.score / total) * 100}%` }} /></i>
        <i className="theirs"><b style={{ width: `${(opp.score / total) * 100}%` }} /></i>
      </div>

      <div className={`arena ${fx}`}>
        {stage === 'countdown' && <div className="countdown" key={`count-${countdown}`}>{countdown}</div>}

        {stage === 'playing' && problem && (
          <>
            {me.streak >= 3 && <span className="streak-tag">🔥 {me.streak} STREAK</span>}
            {flash && (
              <div key={`flash-${flash.id}`} className={`float ${flash.kind}`}>
                {flash.points > 0 ? '+' : ''}{flash.points}
                {flash.streakBonus && <small>STREAK BONUS</small>}
              </div>
            )}
            <p className="problem-hint">{problem.hint} · {tierById(problem.tier).name}</p>
            <div className="problem" key={`q-${me.index}`}>{problem.text}</div>
            <form className="answer-form" onSubmit={(e) => { e.preventDefault(); submit(); }}>
              <input
                ref={inputRef}
                className="answer-input"
                inputMode={coarsePointer() ? 'none' : 'numeric'}
                autoComplete="off"
                placeholder="?"
                aria-label="Your answer"
                value={value}
                onChange={(e) => setValue(e.target.value.replace(/[^0-9-]/g, ''))}
                onKeyDown={onKeyDown}
              />
              <button type="button" className="btn btn-ghost btn-sm" onClick={skip}>Skip −15</button>
            </form>
            <Numpad onKey={onKey} />
          </>
        )}

        {stage === 'finished' && outcome && opponent && (
          <Result outcome={outcome} me={me} opp={opp} opponent={opponent} mode={mode}
            packProgress={profile.packProgress} packs={profile.packs.standard + profile.packs.premium}
            onRematch={rematch} onOpenPack={() => openPack(profile.packs.standard > 0 ? 'standard' : 'premium')} />
        )}
        {stage === 'finished' && !outcome && <p className="eyebrow" style={{ animation: 'pulse 1.2s infinite' }}>Settling the duel…</p>}
      </div>
      <p className="faint" style={{ textAlign: 'center', fontSize: '0.8rem' }}>Enter to answer · → to skip · correct +100 and up to +50 for speed · wrong −25 · five in a row +50{onlineEnabled ? ' · scored by the server' : ''}</p>
    </div>
  );
}

function Side({ name, elo, spotlight, opponent, right }: { name?: string; elo?: number; spotlight?: string[]; opponent?: OpponentInfo; right?: boolean }) {
  const n = opponent?.name ?? name ?? '';
  const e = opponent?.elo ?? elo ?? 0;
  const ids = opponent?.spotlight ?? spotlight ?? [];
  const cards = ids.map(cardById).filter((c): c is NonNullable<typeof c> => !!c).slice(0, 5);
  return (
    <div className={`side ${right ? 'right' : ''}`}>
      <span className="name">{n}</span>
      <RankBadge elo={e} />
      {opponent && <span className="mono faint" style={{ fontSize: '0.75rem' }}>Level {opponent.level}{opponent.isBot ? '' : ' · live player'}</span>}
      {cards.length > 0 ? (
        <div className="card-grid" style={{ gridTemplateColumns: `repeat(${cards.length}, 74px)`, gap: '0.4rem' }}>
          {cards.map((c) => <CardView key={c.id} card={c} size="sm" />)}
        </div>
      ) : (
        <span className="faint" style={{ fontSize: '0.8rem' }}>No spotlight deck yet</span>
      )}
    </div>
  );
}

function TimerRing({ timeLeft }: { timeLeft: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(1, timeLeft / DUEL_SECONDS));
  const warn = timeLeft > 0 && timeLeft < 10;
  return (
    <div className="timer-ring" role="timer" aria-live="off">
      <svg viewBox="0 0 116 116" aria-hidden="true">
        <circle className="track" cx="58" cy="58" r={r} />
        <circle className="fill" cx="58" cy="58" r={r} strokeDasharray={c} strokeDashoffset={c * (1 - frac)} style={warn ? { stroke: 'var(--hot)' } : undefined} />
      </svg>
      <span className={`timer ${warn ? 'warn' : ''}`}>{Math.ceil(timeLeft)}</span>
    </div>
  );
}

interface ResultProps {
  outcome: NonNullable<DuelController['outcome']>;
  me: DuelController['me'];
  opp: DuelController['opp'];
  opponent: OpponentInfo;
  mode: DuelMode;
  packProgress: number;
  packs: number;
  onRematch: () => void;
  onOpenPack: () => void;
}

function Result({ outcome, me, opp, opponent, mode, packProgress, packs, onRematch, onOpenPack }: ResultProps) {
  const attempts = me.correct + me.wrong;
  const accuracy = attempts ? Math.round((me.correct / attempts) * 100) : 0;
  const title = outcome.result === 'win' ? 'VICTORY' : outcome.result === 'loss' ? 'DEFEAT' : 'DRAW';
  return (
    <div className="result" style={{ width: '100%' }}>
      <p className="eyebrow">{mode} duel · vs {opponent.name}</p>
      <h2 className={outcome.result}>{title}</h2>
      <div className="result-scores">
        <div><small>YOU</small>{me.score}</div>
        <div className="faint">–</div>
        <div><small>{opponent.name.toUpperCase()}</small>{opp.score}</div>
      </div>
      <div className="stat-grid" style={{ width: '100%', maxWidth: 620 }}>
        <div className="stat"><span className="value">{me.correct}</span><span className="label">correct</span></div>
        <div className="stat"><span className="value">{accuracy}%</span><span className="label">accuracy</span></div>
        <div className="stat"><span className="value">{me.bestStreak}</span><span className="label">best streak</span></div>
        {mode === 'ranked' && (
          <div className="stat">
            <span className={`value delta ${outcome.eloDelta >= 0 ? 'up' : 'down'}`}>{outcome.eloDelta > 0 ? '+' : ''}{outcome.eloDelta}</span>
            <span className="label">rating → {outcome.newElo}</span>
          </div>
        )}
        <div className="stat"><span className="value">+{outcome.xp}</span><span className="label">xp</span></div>
      </div>
      {outcome.promoted && <p className="gold" style={{ fontFamily: 'var(--font-display)', fontWeight: 800 }}>▲ Promoted to {outcome.promoted}</p>}
      {outcome.demoted && <p className="hot" style={{ fontFamily: 'var(--font-display)', fontWeight: 800 }}>▼ Demoted to {outcome.demoted}</p>}
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="eyebrow hot">Next pack</span>
          <span className="mono dim" style={{ fontSize: '0.8rem' }}>{packProgress}/{PACK_PROGRESS_NEEDED}</span>
        </div>
        <div className="bar hot" style={{ marginTop: '0.4rem' }}><i style={{ width: `${(packProgress / PACK_PROGRESS_NEEDED) * 100}%` }} /></div>
        {outcome.packEarned && <p className="hot" style={{ marginTop: '0.5rem', fontWeight: 600 }}>🎴 Pack earned!</p>}
      </div>
      <div className="row" style={{ justifyContent: 'center' }}>
        <button type="button" className="btn btn-hot btn-lg" onClick={onRematch}>Play again</button>
        {packs > 0 && <button type="button" className="btn btn-cool" onClick={onOpenPack}>Open pack ({packs})</button>}
        <Link to="/play" className="btn">Change mode</Link>
      </div>
    </div>
  );
}
