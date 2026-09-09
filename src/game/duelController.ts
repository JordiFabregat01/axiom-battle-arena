/** One interface for the duel screen, two implementations: guest mode (in-browser) and server mode. */
import { useEffect, useRef, useState } from 'react';
import { useDuel, type Flash } from './useDuel';
import { useProfile } from '../state/store';
import { clamp, mulberry32, newSeed } from '../engine/rng';
import { opponentForCasual, opponentForRanked } from '../engine/bots';
import { levelFromXp } from '../engine/ranking';
import { settleDuel, emptySide } from '../engine/results';
import { DUEL_SECONDS } from '../engine/problems';
import { PACK_PROGRESS_NEEDED } from '../engine/profile';
import { arenaSocket } from '../net/socket';
import { DUEL_COUNTDOWN_MS, type DuelMode, type OpponentInfo, type ServerMessage, type SideState } from '../shared/protocol';

export type Stage = 'searching' | 'versus' | 'countdown' | 'playing' | 'finished';

export interface ProblemView { text: string; hint: string; tier: number; }

export interface Outcome {
  result: 'win' | 'loss' | 'draw';
  eloDelta: number;
  newElo: number;
  xp: number;
  packEarned: boolean;
  promoted: string | null;
  demoted: string | null;
}

export interface QueueInfo { waiting: number; online: number; seconds: number; band: number | null; botsAllowed: boolean; }

export interface DuelController {
  stage: Stage;
  opponent: OpponentInfo | null;
  /** Live matchmaking info while searching (server mode only). */
  queue: QueueInfo | null;
  countdown: number;
  timeLeft: number;
  problem: ProblemView | null;
  me: SideState;
  opp: SideState;
  flash: Flash | null;
  outcome: Outcome | null;
  error: string | null;
  submit: (raw: string) => void;
  skip: () => void;
}

const VERSUS_MS = 2600;

/** Guest mode: everything happens in this browser. */
export function useLocalDuel(mode: DuelMode, tier: number | null): DuelController {
  const { profile, dispatch } = useProfile();
  const [config] = useState(() => {
    const seed = newSeed();
    const rng = mulberry32((seed ^ 0x5bd1e995) >>> 0);
    const t = mode === 'casual' ? clamp(tier ?? profile.placement, 1, 7) : null;
    const opponent = mode === 'ranked'
      ? opponentForRanked(profile.elo, rng)
      : opponentForCasual(profile.elo, t != null ? profile.tierStats[t] : undefined, rng);
    return { mode, tier: t, seed, playerElo: profile.elo, opponent };
  });
  const duel = useDuel(config);
  const [stage, setStage] = useState<Stage>('searching');
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const reported = useRef(false);
  const { start } = duel;

  useEffect(() => {
    const t = window.setTimeout(() => setStage('versus'), 1400 + Math.random() * 1200);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (stage !== 'versus') return;
    const t = window.setTimeout(() => start(), VERSUS_MS);
    return () => window.clearTimeout(t);
  }, [stage, start]);

  useEffect(() => {
    if (duel.phase === 'countdown') setStage('countdown');
    else if (duel.phase === 'playing') setStage('playing');
    else if (duel.phase === 'finished') setStage('finished');
  }, [duel.phase]);

  useEffect(() => {
    if (duel.phase !== 'finished' || reported.current) return;
    reported.current = true;
    const s = settleDuel({ mode: config.mode, tier: config.tier, playerElo: config.playerElo, opponentName: config.opponent.name, opponentElo: config.opponent.elo, me: duel.me, opp: duel.bot });
    dispatch({ type: 'matchFinished', record: s.record, xpGain: s.xp });
    setOutcome({ result: s.result, eloDelta: s.eloDelta, newElo: s.newElo, xp: s.xp, packEarned: profile.packProgress + s.packGain >= PACK_PROGRESS_NEEDED && s.packGain > 0, promoted: s.promoted, demoted: s.demoted });
  }, [duel.phase, duel.me, duel.bot, config, dispatch, profile.packProgress]);

  const opponent: OpponentInfo = { name: config.opponent.name, elo: config.opponent.elo, level: config.opponent.level, spotlight: config.opponent.spotlight, isBot: true };

  return {
    stage, opponent, queue: null, countdown: duel.countdown, timeLeft: duel.timeLeft,
    problem: duel.problem ? { text: duel.problem.text, hint: duel.problem.hint, tier: duel.problem.tier } : null,
    me: duel.me, opp: duel.bot, flash: duel.flash, outcome, error: null,
    submit: (raw) => { duel.submit(raw); },
    skip: duel.skip,
  };
}

/** Server mode: the browser sends guesses; the server keeps the clock, the questions and the scores. */
export function useRemoteDuel(mode: DuelMode, tier: number | null): DuelController {
  const [stage, setStage] = useState<Stage>('searching');
  const [opponent, setOpponent] = useState<OpponentInfo | null>(null);
  const [countdown, setCountdown] = useState(3);
  const [timeLeft, setTimeLeft] = useState(DUEL_SECONDS);
  const [problem, setProblem] = useState<ProblemView | null>(null);
  const [me, setMe] = useState<SideState>(emptySide);
  const [opp, setOpp] = useState<SideState>(emptySide);
  const [flash, setFlash] = useState<Flash | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [queue, setQueue] = useState<QueueInfo | null>(null);
  const matchId = useRef<string | null>(null);
  const startsAt = useRef(0);
  const meRef = useRef<SideState>(emptySide());
  const flashId = useRef(0);

  useEffect(() => {
    const socket = arenaSocket;
    if (!socket) { setError('No game server configured'); return; }
    const off = socket.on((msg: ServerMessage) => {
      switch (msg.type) {
        case 'queue_status':
          if (!matchId.current) setQueue({ waiting: msg.waiting, online: msg.online, seconds: msg.seconds, band: msg.band, botsAllowed: msg.botsAllowed });
          break;
        case 'match':
          matchId.current = msg.matchId;
          startsAt.current = msg.startsAt;
          setOpponent(msg.opponent);
          setStage('versus');
          break;
        case 'problem':
          if (msg.matchId !== matchId.current) return;
          setProblem({ text: msg.text, hint: msg.hint, tier: msg.tier });
          setStage('playing');
          break;
        case 'answer_result':
          if (msg.matchId !== matchId.current) return;
          meRef.current = msg.me;
          setMe(msg.me);
          flashId.current += 1;
          setFlash({ kind: msg.skipped ? 'skip' : msg.correct ? 'correct' : 'wrong', points: msg.points, streakBonus: msg.streakBonus, id: flashId.current });
          break;
        case 'state':
          if (msg.matchId !== matchId.current) return;
          meRef.current = msg.me;
          setMe(msg.me);
          setOpp(msg.opponent);
          setTimeLeft(msg.timeLeft);
          break;
        case 'match_end':
          if (msg.matchId !== matchId.current) return;
          setMe(msg.me);
          setOpp(msg.opponent);
          setTimeLeft(0);
          setOutcome({ result: msg.result, eloDelta: msg.eloDelta, newElo: msg.newElo, xp: msg.xp, packEarned: msg.packEarned, promoted: msg.promoted, demoted: msg.demoted });
          setStage('finished');
          break;
        case 'error':
          if (!msg.reqId) setError(msg.message);
          break;
      }
    });
    socket.send({ type: 'queue', mode, tier: tier ?? undefined });
    return () => { off(); if (!matchId.current) socket.send({ type: 'cancel_queue' }); };
  }, [mode, tier]);

  // Versus → countdown is driven by the server's start time.
  useEffect(() => {
    if (stage !== 'versus' && stage !== 'countdown') return;
    const socket = arenaSocket!;
    const id = window.setInterval(() => {
      const untilStart = startsAt.current - socket.now();
      if (untilStart <= DUEL_COUNTDOWN_MS) {
        setStage((s) => (s === 'versus' ? 'countdown' : s));
        setCountdown(Math.max(1, Math.ceil(untilStart / 1000)));
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [stage]);

  const submit = (raw: string) => {
    const socket = arenaSocket;
    if (!socket || !matchId.current) return;
    const cleaned = raw.trim().replace(/−/g, '-').replace(/\s+/g, '');
    if (!/^-?\d+$/.test(cleaned)) return;
    socket.send({ type: 'answer', matchId: matchId.current, index: meRef.current.index, value: parseInt(cleaned, 10) });
  };
  const skip = () => {
    const socket = arenaSocket;
    if (!socket || !matchId.current) return;
    socket.send({ type: 'skip', matchId: matchId.current, index: meRef.current.index });
  };

  return { stage, opponent, queue, countdown, timeLeft, problem, me, opp, flash, outcome, error, submit, skip };
}

export const myOpponentInfo = (name: string, elo: number, xp: number, spotlight: string[]): OpponentInfo =>
  ({ name, elo, level: levelFromXp(xp).level, spotlight, isBot: false });
