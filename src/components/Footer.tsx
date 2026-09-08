import { Link } from '../router';
import { SEASON } from '../engine/season';

export function Footer() {
  return (
    <footer className="footer">
      <span>Axiom Arena · Season {SEASON.number}</span>
      <nav className="row" style={{ gap: '1rem' }}>
        <Link to="/gallery">Gallery</Link>
        <Link to="/ranks">Ranks</Link>
        <Link to="/privacy">Privacy</Link>
        <Link to="/terms">Terms</Link>
      </nav>
    </footer>
  );
}
