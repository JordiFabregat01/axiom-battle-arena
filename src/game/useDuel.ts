import { useCallback, useEffect, useRef, useState } from 'react';
import { mulberry32, type Rng } from '../engine/rng';
import { generateProblem, pointsFor, DUEL_SECONDS, SKIP_PENALTY, WRONG_PENALTY, type Problem } from '../engine/problems';
import { rankedProblemTier } from '../engine/ranking';
import { type Opponent } from '../engine/bots';
import { emptySide, STREAK_BONUS, STREAK_EVERY } from '../engine/results';
import { startBotClock, stepBot, type BotClock } from '../engine/botSim';
import type { SideState } from '../shared/protocol';

export interface DuelConfig {
  mode: 'casual' | 'ranked';
  /** Fixed problem tier for casual play; null for ranked (scales with rating). */
  tier: number | null;
  seed: number;
  playerElo: number;
  opponent: Opponent;
}

export type DuelPhase = 'idle' | 'countdown' | 'playing' | 'finished';

export interface Flash { kind: 'correct' | 'wrong' | 'skip'; points: number; streakBonus: boolean; id: number; }

export interface DuelView {
  phase: DuelPhase;
  countdown: number;
  timeLeft: number;
  problem: Problem | null;
  me: SideState;
  bot: SideState;
  flash: Flash | null;
  start: () => void;
  submit: (raw: string) => boolean;
  skip: () => void;
}

/**
 * Guest-mode duel: runs entirely in the browser against a simulated opponent.
 * The server's Room uses the same engine functions, so results match.
 */
export function useDuel(config: DuelConfig): DuelView {
  const [phase, setPhase] = useState<DuelPhase>('idle');
  const [countdown, setCountdown] = useState(3);
  const [timeLeft, setTimeLeft] = useState(DUEL_SECONDS);
  const [me, setMe] = useState<SideState>(emptySide);
  const [bot, setBot] = useState<SideState>(emptySide);
  const [flash, setFlash] = useState<Flash | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);

  const problems = useRef<Problem[]>([]);
  const problemRng = useRef<Rng>(mulberry32(config.seed));
  const botRng = useRef<Rng>(mulberry32((config.seed ^ 0x9e3779b9) >>> 0));
  const meRef = useRef<SideState>(emptySide());
  const botRef = useRef<SideState>(emptySide());
  const botClock = useRef<BotClock>({ qStart: 0, nextAt: 0 });
  const endAt = useRef(0);
  const myQStart = useRef(0);
  const timers = useRef<number[]>([]);
  const phaseRef = useRef<DuelPhase>('idle');
  const flashId = useRef(0);

  const getProblem = useCallback((i: number): Problem => {
    while (problems.current.length <= i) {
      const tier = config.mode === 'ranked' ? rankedProblemTier(config.playerElo, problemRng.current()) : (config.tier ?? 1);
      problems.current.push(generateProblem(tier, problemRng.current));
    }
    return problems.current[i];
  }, [config.mode, config.playerElo, config.tier]);

  const clearTimers = () => { timers.current.forEach((t) => window.clearInterval(t)); timers.current = []; };
  useEffect(() => clearTimers, []);

  const finish = useCallback(() => {
    if (phaseRef.current === 'finished') return;
    phaseRef.current = 'finished';
    clearTimers();
    stepBot(botRef.current, botClock.current, config.opponent, botRng.current, endAt.current, endAt.current);
    setTimeLeft(0);
    setMe({ ...meRef.current });
    setBot({ ...botRef.current });
    setPhase('finished');
  }, [config.opponent]);

  const begin = useCallback(() => {
    const now = performance.now();
    endAt.current = now + DUEL_SECONDS * 1000;
    myQStart.current = now;
    botClock.current = startBotClock(config.opponent, botRng.current, now);
    phaseRef.current = 'playing';
    setPhase('playing');
    setProblem(getProblem(0));
    const id = window.setInterval(() => {
      const t = performance.now();
      stepBot(botRef.current, botClock.current, config.opponent, botRng.current, t, endAt.current);
      setBot({ ...botRef.current });
      const left = Math.max(0, (endAt.current - t) / 1000);
      setTimeLeft(left);
      if (left <= 0) finish();
    }, 100);
    timers.current.push(id);
  }, [config.opponent, finish, getProblem]);

  const start = useCallback(() => {
    if (phaseRef.current !== 'idle') return;
    phaseRef.current = 'countdown';
    setPhase('countdown');
    let n = 3;
    setCountdown(n);
    const id = window.setInterval(() => {
      n -= 1;
      if (n <= 0) {
        window.clearInterval(id);
        timers.current = timers.current.filter((t) => t !== id);
        begin();
      } else {
        setCountdown(n);
      }
    }, 900);
    timers.current.push(id);
  }, [begin]);

  const pushFlash = (kind: Flash['kind'], points: number, streakBonus = false) => {
    flashId.current += 1;
    setFlash({ kind, points, streakBonus, id: flashId.current });
  };

  const submit = useCallback((raw: string): boolean => {
    if (phaseRef.current !== 'playing') return false;
    const cleaned = raw.trim().replace(/−/g, '-').replace(/\s+/g, '');
    if (!/^-?\d+$/.test(cleaned)) return false;
    const value = parseInt(cleaned, 10);
    const m = meRef.current;
    const p = getProblem(m.index);
    const now = performance.now();
    if (value === p.answer) {
      const taken = (now - myQStart.current) / 1000;
      m.streak++;
      m.bestStreak = Math.max(m.bestStreak, m.streak);
      const bonus = m.streak % STREAK_EVERY === 0;
      const pts = pointsFor(taken) + (bonus ? STREAK_BONUS : 0);
      m.score += pts;
      m.correct++;
      m.index++;
      myQStart.current = now;
      setProblem(getProblem(m.index));
      pushFlash('correct', pts, bonus);
    } else {
      m.score = Math.max(0, m.score - WRONG_PENALTY);
      m.wrong++;
      m.streak = 0;
      pushFlash('wrong', -WRONG_PENALTY);
    }
    setMe({ ...m });
    return value === p.answer;
  }, [getProblem]);

  const skip = useCallback(() => {
    if (phaseRef.current !== 'playing') return;
    const m = meRef.current;
    m.score = Math.max(0, m.score - SKIP_PENALTY);
    m.skipped++;
    m.streak = 0;
    m.index++;
    myQStart.current = performance.now();
    setProblem(getProblem(m.index));
    pushFlash('skip', -SKIP_PENALTY);
    setMe({ ...m });
  }, [getProblem]);

  return { phase, countdown, timeLeft, problem, me, bot, flash, start, submit, skip };
}
