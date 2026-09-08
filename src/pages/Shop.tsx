import { useState } from 'react';
import { Link } from '../router';
import { useProfile, isPlus } from '../state/store';
import { useArena } from '../arena';
import { PACKS, rarityDef, type PackId } from '../engine/cards';
import { SKUS, startCheckout, paymentsConfigured, type Sku } from '../cloud/checkout';
import { useAuth } from '../cloud/auth';

export function Shop() {
  const { profile } = useProfile();
  const { buyAndOpen, toast } = useArena();
  const { configured, user } = useAuth();
  const [busy, setBusy] = useState<Sku | null>(null);

  const buy = async (id: PackId) => {
    const ok = await buyAndOpen(id);
    if (!ok && profile.coins < PACKS[id].price) toast(`You need ${PACKS[id].price - profile.coins} more coins for a ${PACKS[id].name}.`);
  };

  const purchase = async (sku: Sku) => {
    setBusy(sku);
    const res = await startCheckout(sku);
    setBusy(null);
    if (!res.ok) toast(res.message);
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow gold">Shop</p>
          <h1>Coins & packs</h1>
        </div>
        <span className="chip coin-chip big"><span className="coin">¢</span>{profile.coins.toLocaleString('en-US')} coins</span>
      </div>
      <p className="dim" style={{ maxWidth: '66ch', marginBottom: '1.4rem' }}>
        Coins come from story chapters, season rewards and Plus drops, and can be bought here. Packs bought with coins open immediately. Every card's odds are printed on it, and nothing in the shop changes those odds.
      </p>

      <div className="grid-2">
        {(Object.values(PACKS)).map((pack) => (
          <section key={pack.id} className="panel shop-pack" style={{ ['--r' as string]: rarityDef(pack.guaranteed).color }}>
            <div className={`pack mini ${pack.id}`} aria-hidden="true"><span className="pack-glyph">{pack.id === 'premium' ? '💎' : '🎴'}</span></div>
            <div className="stack" style={{ flex: 1, gap: '0.4rem' }}>
              <h2>{pack.name}</h2>
              <p className="dim">{pack.blurb}</p>
              <p className="mono dim" style={{ fontSize: '0.8rem' }}>Last slot guaranteed <span style={{ color: rarityDef(pack.guaranteed).color }}>{rarityDef(pack.guaranteed).name}+</span> · you own {profile.packs[pack.id]}</p>
              <div className="row">
                <button type="button" className={`btn ${pack.id === 'premium' ? 'btn-cool' : 'btn-hot'}`} disabled={profile.coins < pack.price} onClick={() => void buy(pack.id)}>
                  Buy & open · {pack.price.toLocaleString('en-US')} ¢
                </button>
              </div>
            </div>
          </section>
        ))}
      </div>

      <section style={{ marginTop: '2rem' }}>
        <div className="panel-head">
          <div>
            <p className="eyebrow cool">Coin bundles</p>
            <h2>Top up</h2>
          </div>
          {!paymentsConfigured && <span className="chip">Coming soon</span>}
          {paymentsConfigured && configured && !user && <Link to="/account" className="chip">Sign in to purchase</Link>}
        </div>
        <div className="bundles">
          {SKUS.filter((s) => s.coins).map((s) => (
            <button type="button" key={s.sku} className="bundle" disabled={busy !== null || !paymentsConfigured} onClick={() => purchase(s.sku)} title={paymentsConfigured ? undefined : 'Coin bundles are coming soon'}>
              <span className="bundle-coins"><span className="coin">¢</span>{s.coins!.toLocaleString('en-US')}</span>
              <span className="dim" style={{ fontSize: '0.85rem' }}>{s.blurb}</span>
              <span className="bundle-price">{paymentsConfigured ? `$${s.priceUsd.toFixed(2)}` : 'Coming soon'}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel plus-promo" style={{ marginTop: '2rem' }}>
        <div>
          <p className="eyebrow gold">Axiom Plus · $5 / month</p>
          <h2>{isPlus(profile) ? 'You are a Plus member' : 'More room to show off'}</h2>
          <p className="dim">Eight spotlight slots, a monthly Prime Pack and 600 coins, the Sigma Sentinel card, and a Plus frame on your name.</p>
        </div>
        <Link to="/plus" className="btn btn-chalk">{isPlus(profile) ? 'Manage Plus' : 'See Plus'}</Link>
      </section>
    </div>
  );
}
