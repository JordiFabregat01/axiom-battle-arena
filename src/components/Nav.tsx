import { Link, useRoute } from '../router';
import { useStore, isPlus } from '../state/store';
import { useArena } from '../arena';
import { useAuth } from '../cloud/auth';
import { useOnline } from '../net/online';
import { RankBadge } from './RankBadge';

const LINKS: [string, string][] = [
  ['/', 'Home'],
  ['/play', 'Play'],
  ['/story', 'Story'],
  ['/collection', 'Cards'],
  ['/shop', 'Shop'],
  ['/ladder', 'Ladder'],
  ['/profile', 'Profile'],
];

export function Nav() {
  const { path } = useRoute();
  const { profile } = useStore();
  const { openPack } = useArena();
  const { configured, user } = useAuth();
  const online = useOnline();
  const packs = profile ? profile.packs.standard + profile.packs.premium : 0;

  return (
    <header className="nav">
      <Link to="/" className="brand" aria-label="Axiom Arena home">
        <span className="brand-mark" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 64 64"><path d="M14 48 L32 14 L50 48" fill="none" stroke="#ff5c3a" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" /><path d="M22 38 H42" stroke="#3ee0c7" strokeWidth="7" strokeLinecap="round" /></svg>
        </span>
        AXIOM <small>ARENA</small>
      </Link>
      <nav className="nav-links" aria-label="Main">
        {LINKS.map(([to, label]) => (
          <Link key={to} to={to} active={to === '/' ? path === '/' : path.startsWith(to)}>{label}</Link>
        ))}
      </nav>
      <div className="nav-right">
        {profile && (
          <Link to="/shop" className="chip coin-chip" title="Coins">
            <span className="coin" aria-hidden="true">¢</span>{profile.coins.toLocaleString('en-US')}
          </Link>
        )}
        {profile && packs > 0 && (
          <button type="button" className="chip pack-chip" onClick={() => openPack(profile.packs.standard > 0 ? 'standard' : 'premium')}>
            🎴 {packs}
          </button>
        )}
        {profile && <Link to="/profile" className="nav-rank"><RankBadge elo={profile.elo} size="sm" showElo={false} /></Link>}
        {configured && (
          <Link to="/account" className={`chip account-chip ${user ? 'signed' : ''}`} title={user ? user.email ?? 'Account' : 'Sign in'}>
            {user ? (user.name ?? user.email ?? 'A').slice(0, 1).toUpperCase() : 'Sign in'}
          </Link>
        )}
        {!configured && profile && <Link to="/account" className="chip guest-chip" title="Guest mode">Guest</Link>}
        {online.enabled && <span className={`live-dot ${online.ready ? 'on' : ''}`} title={online.ready ? 'Connected to the game server' : 'Reconnecting'} aria-label={online.ready ? 'Online' : 'Offline'} />}
        {profile && isPlus(profile) && <span className="chip plus-chip">PLUS</span>}
      </div>
    </header>
  );
}
