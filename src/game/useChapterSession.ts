/** Story chapters: local (guest) or server-validated. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useProfile } from '../state/store';
import { generateChapterProblems, type WordProblem } from '../engine/wordProblems';
import { chapterReward, type ChapterReward, type QuestLine } from '../engine/story';
import { mulberry32, newSeed } from '../engine/rng';
import { arenaSocket } from '../net/socket';
import type { ServerMessage } from '../shared/protocol';

export interface ChapterResult { correct: boolean; answer: number; explanation: string; }
export interface ChapterEnd { correct: number; stars: number; passed: boolean; first: boolean; reward: ChapterReward; }

export interface ChapterSession {
  /** Problem texts, or null while loading. */
  problems: string[] | null;
  answer: (index: number, value: number) => Promise<ChapterResult>;
  end: ChapterEnd | null;
  error: string | null;
}

export function useLocalChapter(quest: QuestLine, index: number): ChapterSession {
  const { profile, dispatch } = useProfile();
  const chapter = quest.chapters[index];
  const [problems] = useState<WordProblem[]>(() => generateChapterProblems(chapter.band, chapter.questions, mulberry32(newSeed())));
  const answers = useRef<boolean[]>([]);
  const [end, setEnd] = useState<ChapterEnd | null>(null);
  const first = useRef(index >= (profile.story[quest.id]?.cleared ?? 0));

  const answer = useCallback(async (i: number, value: number): Promise<ChapterResult> => {
    const q = problems[i];
    const correct = value === q.answer;
    if (i === answers.current.length) answers.current.push(correct);
    if (answers.current.length === problems.length && !end) {
      const right = answers.current.filter(Boolean).length;
      const passed = right >= chapter.passMark;
      const stars = right >= chapter.questions ? 3 : right >= chapter.passMark + 1 ? 2 : passed ? 1 : 0;
      const reward = chapterReward(quest, index);
      if (passed) dispatch({ type: 'chapterCleared', questId: quest.id, chapterIndex: index, stars, reward });
      setEnd({ correct: right, stars, passed, first: passed && first.current, reward });
    }
    return { correct, answer: q.answer, explanation: q.explanation };
  }, [problems, chapter, quest, index, dispatch, end]);

  return { problems: problems.map((p) => p.text), answer, end, error: null };
}

export function useRemoteChapter(quest: QuestLine, index: number): ChapterSession {
  const [problems, setProblems] = useState<string[] | null>(null);
  const [end, setEnd] = useState<ChapterEnd | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sessionId = useRef<string | null>(null);

  useEffect(() => {
    const socket = arenaSocket;
    if (!socket) { setError('No game server configured'); return; }
    let cancelled = false;
    socket.request<Extract<ServerMessage, { type: 'story_problems' }>>({ type: 'story_start', questId: quest.id, chapterIndex: index, reqId: '' })
      .then((m) => { if (cancelled) return; sessionId.current = m.sessionId; setProblems(m.problems.map((p) => p.text)); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Could not start the chapter'); });
    const off = socket.on((msg) => {
      if (msg.type === 'story_end' && msg.sessionId === sessionId.current) {
        setEnd({ correct: msg.correct, stars: msg.stars, passed: msg.passed, first: msg.first, reward: msg.reward });
      }
    });
    return () => { cancelled = true; off(); };
  }, [quest.id, index]);

  const answer = useCallback(async (i: number, value: number): Promise<ChapterResult> => {
    const socket = arenaSocket;
    if (!socket || !sessionId.current) throw new Error('Chapter not started');
    const m = await socket.request<Extract<ServerMessage, { type: 'story_result' }>>({ type: 'story_answer', sessionId: sessionId.current, index: i, value, reqId: '' });
    return { correct: m.correct, answer: m.answer, explanation: m.explanation };
  }, []);

  return { problems, answer, end, error };
}
