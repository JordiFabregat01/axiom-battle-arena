/** One duel. The room owns the clock, the question sequence and both scores.
 *  Clients only send guesses; nothing they send is trusted beyond "which index, which value". */
import { mulberry32, newSeed, type Rng } from '../../src/engine/rng';
import { generateProblem, pointsFor, DUEL_SECONDS, SKIP_PENALTY, WRONG_PENALTY, type Problem } from '../../src/engine/problems';
import { rankedProblemTier, levelFromXp } from '../../src/engine/ranking';
import { settleDuel, emptySide, STREAK_BONUS, STREAK_EVERY } from '../../src/engine/results';
import { startBotClock, stepBot, type BotClock } from '../../src/engine/botSim';
import type { Opponent } from '../../src/engine/bots';
import { reducer } from '../../src/engine/profile';
import { DUEL_COUNTDOWN_MS, DUEL_VERSUS_MS, type DuelMode, type OpponentInfo, type SideState } from '../../src/shared/protocol';
import type { Session } from './session';
import type { ProfileStore } from './store';

/** Answers faster than this are physically implausible; the speed bonus is capped here. */
const MIN_ANSWER_SECONDS = 0.35;
const TICK_MS = 200;

interface Human { kind: 'human'; session: Session; side: SideState; qStart: number; eloAtStart: number; name: string; }
interface Bot { kind: 'bot'; opponent: Opponent; rng: Rng; side: SideState; clock: BotClock; }
type Participant = Human | Bot;

export class Room {
  readonly id = `r-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
  private readonly seed = newSeed();
  private readonly problemRng = mulberry32(this.seed);
  private readonly problems: Problem[] = [];
  private readonly tierElo: number;
  private a: Human;
  private b: Participant;
  private phase: 'pending' | 'playing' | 'finished' = 'pending';
  private startsAt = 0;
  private endsAt = 0;
  private timers: NodeJS.Timeout[] = [];

  constructor(
    private store: ProfileStore,
    private onFinished: (room: Room) => void,
    readonly mode: DuelMode,
    readonly tier: number | null,
    a: Session,
    b: Session | Opponent,
  ) {
    const pa = a.profile!;
    this.a = { kind: 'human', session: a, side: emptySide(), qStart: 0, eloAtStart: pa.elo, name: pa.name };
    if ('ws' in b) {
      const pb = b.profile!;
      this.b = { kind: 'human', session: b, side: emptySide(), qStart: 0, eloAtStart: pb.elo, name: pb.name };
      this.tierElo = Math.round((pa.elo + pb.elo) / 2);
    } else {
      this.b = { kind: 'bot', opponent: b, rng: mulberry32((this.seed ^ 0x9e3779b9) >>> 0), side: emptySide(), clock: { qStart: 0, nextAt: 0 } };
      this.tierElo = pa.elo;
    }
  }

  get humans(): Human[] {
    return this.b.kind === 'human' ? [this.a, this.b] : [this.a];
  }

  private info(p: Participant): OpponentInfo {
    if (p.kind === 'bot') return { name: p.opponent.name, elo: p.opponent.elo, level: p.opponent.level, spotlight: p.opponent.spotlight, isBot: true };
    const prof = p.session.profile!;
    return { name: prof.name, elo: prof.elo, level: levelFromXp(prof.xp).level, spotlight: prof.spotlight, isBot: false };
  }

  private other(p: Human): Participant {
    return p === this.a ? this.b : this.a;
  }

  private problem(i: number): Problem {
    while (this.problems.length <= i) {
      const tier = this.mode === 'ranked' ? rankedProblemTier(this.tierElo, this.problemRng()) : (this.tier ?? 1);
      this.problems.push(generateProblem(tier, this.problemRng));
    }
    return this.problems[i];
  }

  start() {
    const now = Date.now();
    this.startsAt = now + DUEL_VERSUS_MS + DUEL_COUNTDOWN_MS;
    this.endsAt = this.startsAt + DUEL_SECONDS * 1000;
    for (const h of this.humans) {
      h.session.room = this;
      h.session.send({ type: 'match', matchId: this.id, mode: this.mode, tier: this.tier, opponent: this.info(this.other(h)), startsAt: this.startsAt, endsAt: this.endsAt });
    }
    this.timers.push(setTimeout(() => this.begin(), this.startsAt - now));
  }

  private begin() {
    const now = Date.now();
    this.phase = 'playing';
    for (const h of this.humans) {
      h.qStart = now;
      this.sendProblem(h);
    }
    if (this.b.kind === 'bot') this.b.clock = startBotClock(this.b.opponent, this.b.rng, now);
    this.timers.push(setInterval(() => this.tick(), TICK_MS));
    this.timers.push(setTimeout(() => this.finish(), this.endsAt - now + 50));
  }

  private sendProblem(h: Human) {
    const p = this.problem(h.side.index);
    h.session.send({ type: 'problem', matchId: this.id, index: h.side.index, text: p.text, hint: p.hint, tier: p.tier });
  }

  private tick() {
    if (this.phase !== 'playing') return;
    const now = Date.now();
    if (this.b.kind === 'bot') stepBot(this.b.side, this.b.clock, this.b.opponent, this.b.rng, now, this.endsAt);
    const timeLeft = Math.max(0, (this.endsAt - now) / 1000);
    for (const h of this.humans) {
      h.session.send({ type: 'state', matchId: this.id, timeLeft, me: h.side, opponent: this.other(h).side });
    }
  }

  private humanFor(session: Session): Human | null {
    if (this.a.session === session) return this.a;
    if (this.b.kind === 'human' && this.b.session === session) return this.b;
    return null;
  }

  answer(session: Session, index: number, value: number) {
    const h = this.humanFor(session);
    if (!h || this.phase !== 'playing') return;
    const now = Date.now();
    if (now > this.endsAt || index !== h.side.index || !Number.isInteger(value)) return;
    const p = this.problem(index);
    const s = h.side;
    if (value === p.answer) {
      const taken = Math.max(MIN_ANSWER_SECONDS, (now - h.qStart) / 1000);
      s.streak++;
      s.bestStreak = Math.max(s.bestStreak, s.streak);
      const bonus = s.streak % STREAK_EVERY === 0;
      const pts = pointsFor(taken) + (bonus ? STREAK_BONUS : 0);
      s.score += pts;
      s.correct++;
      s.index++;
      h.qStart = now;
      h.session.send({ type: 'answer_result', matchId: this.id, index, correct: true, skipped: false, points: pts, streakBonus: bonus, me: s });
      this.sendProblem(h);
    } else {
      s.score = Math.max(0, s.score - WRONG_PENALTY);
      s.wrong++;
      s.streak = 0;
      h.session.send({ type: 'answer_result', matchId: this.id, index, correct: false, skipped: false, points: -WRONG_PENALTY, streakBonus: false, me: s });
    }
  }

  skip(session: Session, index: number) {
    const h = this.humanFor(session);
    if (!h || this.phase !== 'playing') return;
    const now = Date.now();
    if (now > this.endsAt || index !== h.side.index) return;
    const s = h.side;
    s.score = Math.max(0, s.score - SKIP_PENALTY);
    s.skipped++;
    s.streak = 0;
    s.index++;
    h.qStart = now;
    h.session.send({ type: 'answer_result', matchId: this.id, index, correct: false, skipped: true, points: -SKIP_PENALTY, streakBonus: false, me: s });
    this.sendProblem(h);
  }

  onDisconnect(_session: Session) {
    // The duel keeps running; a player who leaves simply stops scoring and still gets a result.
  }

  private async finish() {
    if (this.phase === 'finished') return;
    this.phase = 'finished';
    this.timers.forEach((t) => clearTimeout(t));
    this.timers = [];
    if (this.b.kind === 'bot') stepBot(this.b.side, this.b.clock, this.b.opponent, this.b.rng, this.endsAt, this.endsAt);

    for (const h of this.humans) {
      const opp = this.other(h);
      const oppName = opp.kind === 'bot' ? opp.opponent.name : opp.name;
      const oppElo = opp.kind === 'bot' ? opp.opponent.elo : opp.eloAtStart;
      const settlement = settleDuel({ mode: this.mode, tier: this.tier, playerElo: h.eloAtStart, opponentName: oppName, opponentElo: oppElo, me: h.side, opp: opp.side, matchId: this.id });
      const before = h.session.profile;
      const packEarned = !!before && settlement.packGain > 0 && before.packProgress + settlement.packGain >= 10;
      const next = reducer(before, { type: 'matchFinished', record: settlement.record, xpGain: settlement.xp });
      if (next && h.session.userId) {
        h.session.profile = next;
        try { await this.store.save(h.session.userId, next); } catch (e) { console.warn('[room] save failed', e); }
      }
      h.session.room = null;
      if (next) {
        h.session.send({
          type: 'match_end', matchId: this.id, result: settlement.result, me: h.side, opponent: opp.side,
          eloDelta: settlement.eloDelta, newElo: settlement.newElo, xp: settlement.xp, packEarned,
          promoted: settlement.promoted, demoted: settlement.demoted, profile: next,
        });
      }
    }
    this.onFinished(this);
  }

  destroy() {
    this.timers.forEach((t) => clearTimeout(t));
    this.timers = [];
    for (const h of this.humans) if (h.session.room === this) h.session.room = null;
  }
}
