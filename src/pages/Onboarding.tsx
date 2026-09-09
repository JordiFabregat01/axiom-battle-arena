import { useCallback, useState, type FormEvent } from 'react';
import { TIERS } from '../engine/problems';
import { STARTING_ELO, rankFor } from '../engine/ranking';
import { useStore, WELCOME_COINS, loadProfile, type Profile } from '../state/store';
import { useAuth } from '../cloud/auth';
import { Link } from '../router';
import { NameField, type NameState } from '../components/NameField';

const GUEST_KEY = 'axiom-arena.profile.v2:guest';

export function Onboarding() {
  const { dispatch, authoritative } = useStore();
  const { configured, user } = useAuth();
  void user;
  const [name, setName] = useState('');
  const [nameState, setNameState] = useState<NameState>({ status: 'empty' });
  const [placement, setPlacement] = useState(2);
  const [localSave] = useState<Profile | null>(() => (authoritative ? loadProfile(GUEST_KEY) : null));
  const rank = rankFor(STARTING_ELO);
  const onNameState = useCallback((s: NameState) => setNameState(s), []);
  const canSubmit = nameState.status === 'ok';

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (nameState.status !== 'ok') return;
    dispatch({ type: 'create', name: nameState.name, placement });
  };

  return (
    <div className="onboard">
      <div>
        <p className="eyebrow hot">Welcome to the arena</p>
        <h1>Sixty seconds. <em className="hot" style={{ fontStyle: 'normal' }}>One opponent.</em> Every answer counts.</h1>
        <p className="dim" style={{ marginTop: '1rem', maxWidth: '62ch', fontSize: '1.05rem' }}>
          Axiom Arena is fast-paced competitive math for every level, from first sums to number theory.
          Pick a name and the level you want to practise at. Everyone starts ranked at the same rating and climbs.
        </p>
      </div>
      {localSave && (
        <div className="notice">
          <div style={{ flex: 1 }}>
            <b>Found a local save for {localSave.name}</b>
            <p className="dim" style={{ fontSize: '0.9rem' }}>This server keeps profiles itself. Bring that progress over, or start fresh below.</p>
          </div>
          <button type="button" className="btn btn-cool" onClick={() => dispatch({ type: 'import', profile: localSave })}>Continue as {localSave.name}</button>
        </div>
      )}
      <form className="stack" onSubmit={submit} style={{ gap: '1.4rem' }}>
        <div className="stack" style={{ gap: '0.5rem' }}>
          <label className="eyebrow" htmlFor="name">Your username</label>
          <NameField value={name} onChange={setName} onState={onNameState} autoFocus />
        </div>
        <div className="stack" style={{ gap: '0.6rem' }}>
          <p className="eyebrow">Your casual practice level</p>
          <div className="tiles">
            {TIERS.map((t) => (
              <button type="button" key={t.id} className={`tile ${placement === t.id ? 'is-selected' : ''}`} onClick={() => setPlacement(t.id)}>
                <span className="t-num">LEVEL {t.id}</span>
                <span className="t-name">{t.name}</span>
                <span className="t-ages">{t.ages}</span>
                <span className="t-blurb">{t.blurb}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <p className="dim">
            Ranked starts at <b className="mono" style={{ color: 'var(--chalk)' }}>{STARTING_ELO}</b> · <b style={{ color: rank.tier.color }}>{rank.label}</b> for everyone. You get a welcome pack and {WELCOME_COINS} coins.
          </p>
          <button className="btn btn-hot btn-lg" type="submit" disabled={!canSubmit}>Enter the arena →</button>
        </div>
      </form>
      <p className="faint" style={{ fontSize: '0.8rem' }}>
        {authoritative
          ? (configured && !user
              ? <>Duels, packs and rewards are scored by the game server. Already have an account? <Link to="/account" className="cool">Sign in</Link> and your profile comes with you.</>
              : 'Duels, packs and rewards are scored by the game server; your profile lives there.')
          : configured
            ? (user ? 'Your progress is saved to your account.' : <>Progress is saved in this browser until you <Link to="/account" className="cool">sign in</Link>; you can do that later and keep everything.</>)
            : 'Progress is saved in this browser. Teachers: students can each create a name on their own device.'}
      </p>
    </div>
  );
}
