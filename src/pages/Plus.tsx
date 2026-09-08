import { useState } from 'react';
import { Link } from '../router';
import { useProfile, useStore, isPlus, monthKey, PLUS_MONTHLY, SPOTLIGHT_SIZE, SPOTLIGHT_SIZE_PLUS } from '../state/store';
import { useArena } from '../arena';
import { useAuth } from '../cloud/auth';
import { startCheckout, paymentsConfigured } from '../cloud/checkout';
import { cardById } from '../engine/cards';
import { CardView } from '../components/CardView';

const BENEFITS: { title: string; body: string }[] = [
  { title: `${SPOTLIGHT_SIZE_PLUS} spotlight slots`, body: `Show ${SPOTLIGHT_SIZE_PLUS} cards instead of ${SPOTLIGHT_SIZE} on your profile and before every duel.` },
  { title: 'Monthly drop', body: `A Prime Pack and ${PLUS_MONTHLY.coins} coins every month, claimed from this page.` },
  { title: 'Sigma Sentinel', body: 'A Plus-only legendary card that never appears in packs.' },
  { title: 'Plus frame', body: 'A gold frame and PLUS tag on your name across the arena and the ladder.' },
  { title: 'Never pay-to-win', body: 'Plus changes nothing about matchmaking, questions, rating or pack odds. Competitive integrity is the product.' },
];

export function Plus() {
  const { profile, dispatch } = useProfile();
  const { authoritative } = useStore();
  const { toast } = useArena();
  const devPreview = import.meta.env.DEV && !authoritative;
  const { configured, user } = useAuth();
  const [busy, setBusy] = useState(false);
  const plus = isPlus(profile);
  const month = monthKey();
  const claimed = profile.plusClaims.includes(month);
  const card = cardById(PLUS_MONTHLY.card);

  const subscribe = async () => {
    setBusy(true);
    const res = await startCheckout('plus_monthly');
    setBusy(false);
    if (!res.ok) toast(res.message);
  };

  const previewPlus = () => {
    dispatch({ type: 'setPlus', until: Date.now() + 30 * 86_400_000 });
    toast('Plus preview enabled for 30 days (development build only).');
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow gold">Membership</p>
          <h1>Axiom Plus</h1>
          <p className="dim">$5 per month. Cancel any time.</p>
        </div>
        {plus ? <span className="chip plus-chip big">PLUS · until {new Date(profile.plusUntil!).toLocaleDateString()}</span> : null}
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <section className="stack">
          <div className="benefits">
            {BENEFITS.map((b, i) => (
              <div key={b.title} className="benefit" style={{ animationDelay: `${i * 0.07}s` }}>
                <h3>{b.title}</h3>
                <p className="dim">{b.body}</p>
              </div>
            ))}
          </div>
          {!plus && (
            <div className="row">
              <button type="button" className="btn btn-hot btn-lg" disabled={busy || !paymentsConfigured} onClick={subscribe}>{paymentsConfigured ? 'Join Plus · $5/month' : 'Plus · coming soon'}</button>
              {!paymentsConfigured && <span className="chip">Membership opens after launch</span>}
              {paymentsConfigured && configured && !user && <Link to="/account" className="chip">Sign in first</Link>}
              {devPreview && <button type="button" className="btn btn-ghost btn-sm" onClick={previewPlus}>Preview Plus (dev)</button>}
            </div>
          )}
          {plus && (
            <div className="panel">
              <div className="panel-head">
                <div>
                  <p className="eyebrow gold">This month's drop · {month}</p>
                  <h3>Prime Pack + {PLUS_MONTHLY.coins} coins{!(profile.collection[PLUS_MONTHLY.card] > 0) ? ' + Sigma Sentinel' : ''}</h3>
                </div>
                <button type="button" className="btn btn-cool" disabled={claimed} onClick={() => dispatch({ type: 'claimPlusMonthly', monthKey: month })}>{claimed ? 'Claimed' : 'Claim'}</button>
              </div>
              {devPreview && <button type="button" className="btn btn-ghost btn-sm" onClick={() => dispatch({ type: 'setPlus', until: null })}>End preview (dev)</button>}
            </div>
          )}
        </section>
        <section className="stack" style={{ alignItems: 'center' }}>
          <div style={{ width: 240 }}>{card && <CardView card={card} locked={!(profile.collection[PLUS_MONTHLY.card] > 0)} />}</div>
          <p className="dim" style={{ textAlign: 'center', maxWidth: '36ch' }}>{card?.flavor}</p>
        </section>
      </div>
    </div>
  );
}
