import { useEffect, useRef, useState } from 'react';
import { StoreProvider, useStore, loadProfile } from './state/store';
import { ArenaProvider } from './arena';
import { AuthProvider, useAuth } from './cloud/auth';
import { fetchCloudProfile, pushCloudProfile } from './cloud/sync';
import { OnlineProvider, useOnline } from './net/online';
import { onlineEnabled, remoteDispatch } from './net/socket';
import { useRoute } from './router';
import { Nav } from './components/Nav';
import { Modal } from './components/Modal';
import { SEASON, seasonTimeLeft, rewardForElo, rewardTierName } from './engine/season';
import { softReset, rankFor } from './engine/ranking';
import { cardById } from './engine/cards';
import { Onboarding } from './pages/Onboarding';
import { Home } from './pages/Home';
import { Play } from './pages/Play';
import { DuelPage } from './pages/Duel';
import { Collection } from './pages/Collection';
import { Profile } from './pages/Profile';
import { Ladder } from './pages/Ladder';
import { Ranks } from './pages/Ranks';
import { Story } from './pages/Story';
import { Shop } from './pages/Shop';
import { Plus } from './pages/Plus';
import { Account } from './pages/Account';
import { Gallery } from './pages/Gallery';
import { Privacy, Terms } from './pages/Legal';
import { Footer } from './components/Footer';

export const GUEST_KEY = 'axiom-arena.profile.v2:guest';
export const ONLINE_KEY = 'axiom-arena.profile.v2:online';
export const storageKeyFor = (userId: string | null) => (userId ? `axiom-arena.profile.v2:${userId}` : GUEST_KEY);

function Screen() {
  const { path } = useRoute();
  if (path.startsWith('/play')) return <Play />;
  if (path.startsWith('/duel')) return <DuelPage key={window.location.hash} />;
  if (path.startsWith('/story')) return <Story />;
  if (path.startsWith('/collection')) return <Collection />;
  if (path.startsWith('/gallery')) return <Gallery />;
  if (path.startsWith('/privacy')) return <Privacy />;
  if (path.startsWith('/terms')) return <Terms />;
  if (path.startsWith('/shop')) return <Shop />;
  if (path.startsWith('/plus')) return <Plus />;
  if (path.startsWith('/profile')) return <Profile />;
  if (path.startsWith('/ladder')) return <Ladder />;
  if (path.startsWith('/ranks')) return <Ranks />;
  if (path.startsWith('/account')) return <Account />;
  return <Home />;
}

/** Shown once a season has ended and the player has not collected their rewards. */
function SeasonClaim() {
  const { profile, dispatch } = useStore();
  const [dismissed, setDismissed] = useState(false);
  if (!profile || dismissed) return null;
  const { ended } = seasonTimeLeft();
  if (!ended || profile.claimedSeasons.includes(SEASON.id)) return null;
  const reward = rewardForElo(profile.elo);
  const rank = rankFor(profile.elo);
  const newElo = softReset(profile.elo);
  const card = reward.card ? cardById(reward.card) : undefined;
  return (
    <Modal open onClose={() => setDismissed(true)} closable={false}>
      <div className="stack" style={{ textAlign: 'center', alignItems: 'center' }}>
        <p className="eyebrow gold">Season {SEASON.number} · {SEASON.name} has ended</p>
        <h2>You finished <span style={{ color: rank.tier.color }}>{rank.label}</span></h2>
        <p className="dim">Rewards for {rewardTierName(reward.tierKey)}: {reward.coins} coins, {reward.standard} Arena pack{reward.standard !== 1 ? 's' : ''}{reward.premium ? `, ${reward.premium} Prime pack${reward.premium > 1 ? 's' : ''}` : ''}{reward.title ? `, the title “${reward.title}”` : ''}{card ? ` and the exclusive card ${card.name}` : ''}.</p>
        <p className="dim">Your rating soft-resets from <b className="mono">{profile.elo}</b> to <b className="mono">{newElo}</b> for the new season.</p>
        <button type="button" className="btn btn-hot btn-lg" onClick={() => { dispatch({ type: 'claimSeason', seasonId: SEASON.id, reward, newElo }); setDismissed(true); }}>
          Claim rewards
        </button>
      </div>
    </Modal>
  );
}

/**
 * Guest/cloud mode without a game server: keeps the signed-in player's profile in sync with Supabase.
 * Cloud copy wins if newer; a guest profile is adopted into a new account; changes are pushed debounced.
 */
function CloudBridge({ userId }: { userId: string | null }) {
  const { profile, dispatch } = useStore();
  const ready = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  const localAtMount = useRef(profile);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const row = await fetchCloudProfile(userId);
      if (cancelled) return;
      const local = localAtMount.current;
      if (row?.profile) {
        if (!local || row.profile.updatedAt >= local.updatedAt) dispatch({ type: 'load', profile: row.profile });
      } else if (!local) {
        const guest = loadProfile(GUEST_KEY);
        if (guest) dispatch({ type: 'load', profile: { ...guest, updatedAt: Date.now() } });
      }
      if (row) dispatch({ type: 'applyServer', plusUntil: row.plusUntil, coinGrants: row.coinGrants });
      ready.current = true;
    })();
    return () => { cancelled = true; };
  }, [userId, dispatch]);

  useEffect(() => {
    if (!userId || !ready.current || !profile) return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => { void pushCloudProfile(userId, profile); }, 1200);
    return () => window.clearTimeout(timer.current);
  }, [profile, userId]);

  return null;
}

function Shell() {
  const { profile } = useStore();
  const { path } = useRoute();
  // Public pages: browsable before creating a profile.
  if (!profile && path.startsWith('/gallery')) return <div className="app"><Nav /><Gallery /><Footer /></div>;
  if (!profile && path.startsWith('/privacy')) return <div className="app"><Nav /><Privacy /><Footer /></div>;
  if (!profile && path.startsWith('/terms')) return <div className="app"><Nav /><Terms /><Footer /></div>;
  if (!profile && path.startsWith('/account')) return <div className="app"><Nav /><Account /><Footer /></div>;
  if (!profile) return <div className="app"><Nav /><Onboarding /><Footer /></div>;
  return (
    <ArenaProvider>
      <div className="app">
        <Nav />
        <Screen />
        <Footer />
        <SeasonClaim />
      </div>
    </ArenaProvider>
  );
}

const PUBLIC_PATHS = ['/account', '/gallery', '/privacy', '/terms'];

/** With a game server configured, play waits until it has identified us and sent the profile.
 *  Account and information pages stay reachable so a player can always sign in. */
function OnlineGate({ children }: { children: React.ReactNode }) {
  const { ready, status, error } = useOnline();
  const { configured, user } = useAuth();
  const { path } = useRoute();
  if (ready || PUBLIC_PATHS.some((p) => path.startsWith(p))) return <>{children}</>;
  return (
    <div className="matchmaking">
      <div className="radar"><span>∑</span></div>
      <p className="eyebrow" style={{ animation: 'pulse 1.2s infinite' }}>{status === 'open' ? 'Signing in to the arena' : 'Connecting to the arena server'}</p>
      {error && <p className="notice">{error}</p>}
      {status === 'closed' && <p className="dim">The arena server is unreachable. Retrying…{import.meta.env.DEV && <> Start it with <code className="mono">npm run server</code>.</>}</p>}
      {error && configured && !user && <a href="#/account" className="btn btn-chalk">Sign in with an account</a>}
    </div>
  );
}

function ProfileRoot() {
  const { user, loading, configured } = useAuth();
  if (configured && loading) {
    return <div className="matchmaking"><div className="radar"><span>∑</span></div><p className="eyebrow" style={{ animation: 'pulse 1.2s infinite' }}>Signing you in</p></div>;
  }
  if (onlineEnabled) {
    return (
      <StoreProvider key={ONLINE_KEY} storageKey={ONLINE_KEY} remote={remoteDispatch}>
        <OnlineProvider>
          <OnlineGate>
            <Shell />
          </OnlineGate>
        </OnlineProvider>
      </StoreProvider>
    );
  }
  const key = storageKeyFor(user?.id ?? null);
  return (
    <StoreProvider key={key} storageKey={key}>
      <CloudBridge userId={user?.id ?? null} />
      <Shell />
    </StoreProvider>
  );
}

export function App() {
  return (
    <AuthProvider>
      <ProfileRoot />
    </AuthProvider>
  );
}
