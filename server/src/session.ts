import type { WebSocket } from 'ws';
import type { Profile } from '../../src/engine/profile';
import type { ServerMessage, DuelMode } from '../../src/shared/protocol';
import type { WordProblem } from '../../src/engine/wordProblems';
import type { Identity } from './auth';
import type { Room } from './room';

export interface StorySession {
  id: string;
  questId: string;
  chapterIndex: number;
  problems: WordProblem[];
  answers: boolean[];
}

export interface QueueEntry { mode: DuelMode; tier: number | null; since: number; }

export class Session {
  readonly id = `s-${Math.floor(Math.random() * 1e9).toString(36)}`;
  identity: Identity | null = null;
  profile: Profile | null = null;
  room: Room | null = null;
  queue: QueueEntry | null = null;
  story: StorySession | null = null;
  alive = true;

  constructor(readonly ws: WebSocket) {}

  get userId(): string | null {
    return this.identity?.id ?? null;
  }

  send(msg: ServerMessage) {
    if (this.ws.readyState === this.ws.OPEN) this.ws.send(JSON.stringify(msg));
  }

  error(message: string, reqId?: string) {
    this.send({ type: 'error', message, reqId });
  }
}
