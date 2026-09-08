import { useEffect, useMemo, useState } from 'react';
import { Link } from '../router';
import { useProfile, totalWins } from '../state/store';
import { ladderWithPlayer, type LadderEntry } from '../engine/leaderboard';
import { levelFromXp } from '../engine/ranking';
import { SEASON } from '../engine/season';
import { useAuth } from '../cloud/auth';
import { fetchCloudLadder } from '../cloud/sync';
import { useOnline } from '../net/online';
import { arenaSocket } from '../net/socket';
import { RankBadge } from '../components/RankBadge';
import type { ServerMessage } from '../shared/protocol';

const TOP = 50;

export function Ladder() {
  const { profile } = useProfile();
  const { configured, user } = useAuth();
  const online = useOnline();
  const [live, setLive] = useState<LadderEntry[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (online.enabled && arenaSocket) {
      arenaSocket.request<Extract<ServerMessage, { type: 'ladder' }>>({ type: 'ladder', reqId: '' })
        .then((m) => { if (!cancelled) setLive(m.rows.map((r) => ({ ...r, isYou: r.id === online.userId }))); })
        .catch(() => {});
    } else if (configured) {
      fetchCloudLadder(200).then((rows) => {
        if (cancelled || !rows) return;
        setLive(rows.map((r) => ({ ...r, isYou: r.id === user?.id })));
      });
    }
    return () => { cancelled = true; };
  }, [online.enabled, online.userId, configured, user?.id]);

  const simulated = useMemo(
    () => ladderWithPlayer({ name: profile.name, elo: profile.elo, level: levelFromXp(profile.xp).level, wins: totalWins(profile) }),
    [profile],
  );

  const rows = live ?? simulated;
  const youIndex = rows.findIndex((r) => r.isYou);
  const visible = rows.slice(0, TOP);
  const youBelow = youIndex >= TOP;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow cool">Season {SEASON.number} · {SEASON.name}</p>
          <h1>Ladder</h1>
        </div>
        <div className="row">
          {youIndex >= 0 && <span className="chip">You are #{youIndex + 1} of {rows.length}</span>}
          <Link to="/ranks" className="btn btn-sm">Ranks & rewards</Link>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>#</th><th>Player</th><th>Rank</th><th>Elo</th><th>Level</th><th>Wins</th></tr>
          </thead>
          <tbody>
            {visible.map((r, i) => <Row key={r.id} i={i} r={r} />)}
            {youBelow && (
              <>
                <tr><td colSpan={6} className="faint" style={{ textAlign: 'center' }}>· · ·</td></tr>
                <Row i={youIndex} r={rows[youIndex]} />
              </>
            )}
          </tbody>
        </table>
      </div>
      <p className="faint" style={{ marginTop: '1rem', fontSize: '0.8rem' }}>
        {live ? 'Live standings of every player on this server.' : 'Other players shown here are simulated until accounts and the game server are connected.'}
      </p>
    </div>
  );
}

function Row({ i, r }: { i: number; r: LadderEntry }) {
  return (
    <tr className={r.isYou ? 'is-you' : ''}>
      <td className="num">{i + 1}</td>
      <td>{r.name}{r.isYou && <span className="faint"> (you)</span>}</td>
      <td><RankBadge elo={r.elo} size="sm" showElo={false} /></td>
      <td className="num">{r.elo}</td>
      <td className="num">{r.level}</td>
      <td className="num">{r.wins}</td>
    </tr>
  );
}
