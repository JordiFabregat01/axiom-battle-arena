import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, navigate, useRoute } from '../router';
import { useProfile, storyCleared } from '../state/store';
import { QUESTS, questById, chapterReward, REPLAY_COIN_SHARE, type QuestLine, type Chapter } from '../engine/story';
import { tierById } from '../engine/problems';
import { cardById, PACKS } from '../engine/cards';
import { useLocalChapter, useRemoteChapter, type ChapterResult, type ChapterSession } from '../game/useChapterSession';
import { onlineEnabled } from '../net/socket';
import { CardView } from '../components/CardView';
import { useArena } from '../arena';

export function Story() {
  const { params } = useRoute();
  const questId = params.get('quest');
  const chapterParam = params.get('chapter');
  const quest = questId ? questById(questId) : undefined;
  if (quest && chapterParam != null) {
    const index = Math.max(0, Math.min(quest.chapters.length - 1, Number(chapterParam) || 0));
    const key = `${quest.id}-${index}-${params.get('n') ?? ''}`;
    return onlineEnabled ? <RemoteChapter key={key} quest={quest} index={index} /> : <LocalChapter key={key} quest={quest} index={index} />;
  }
  if (quest) return <QuestView quest={quest} />;
  return <QuestList />;
}

function LocalChapter({ quest, index }: { quest: QuestLine; index: number }) {
  const session = useLocalChapter(quest, index);
  return <ChapterPlay quest={quest} index={index} session={session} />;
}

function RemoteChapter({ quest, index }: { quest: QuestLine; index: number }) {
  const session = useRemoteChapter(quest, index);
  return <ChapterPlay quest={quest} index={index} session={session} />;
}

function QuestList() {
  const { profile } = useProfile();
  const total = QUESTS.reduce((s, q) => s + q.chapters.length, 0);
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow cool">Story mode</p>
          <h1>Quest lines</h1>
        </div>
        <span className="chip">{storyCleared(profile)} / {total} chapters cleared</span>
      </div>
      <p className="dim" style={{ maxWidth: '64ch', marginBottom: '1.4rem' }}>
        No timer, no opponent. Each chapter is a handful of exam-style problems that take a little thinking. Clear a chapter for coins and a pack; clear the whole line to add the character you helped to your collection.
      </p>
      <div className="quests">
        {QUESTS.map((q) => {
          const progress = profile.story[q.id] ?? { cleared: 0, stars: [] };
          const done = progress.cleared >= q.chapters.length;
          const card = cardById(q.character);
          return (
            <Link key={q.id} to={`/story?quest=${q.id}`} className="quest-card" style={{ ['--q' as string]: q.color }}>
              <div className="quest-art">{card && <CardView card={card} size="sm" locked={!(profile.collection[q.character] > 0)} />}</div>
              <div className="quest-body">
                <p className="eyebrow" style={{ color: q.color }}>{q.setting}</p>
                <h2>{q.title}</h2>
                <p className="dim">{q.tagline}</p>
                <div className="row" style={{ marginTop: '0.6rem', justifyContent: 'space-between' }}>
                  <span className="mono dim" style={{ fontSize: '0.8rem' }}>{tierById(q.chapters[0].band).name} → {tierById(q.chapters[q.chapters.length - 1].band).name}</span>
                  <span className="chip">{done ? 'Complete' : `${progress.cleared}/${q.chapters.length}`}</span>
                </div>
                <div className="bar" style={{ marginTop: '0.5rem' }}><i style={{ width: `${(progress.cleared / q.chapters.length) * 100}%`, background: q.color }} /></div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function QuestView({ quest }: { quest: QuestLine }) {
  const { profile } = useProfile();
  const progress = profile.story[quest.id] ?? { cleared: 0, stars: [] };
  const card = cardById(quest.character);
  const owned = profile.collection[quest.character] > 0;
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <Link to="/story" className="dim" style={{ fontSize: '0.85rem' }}>← All quests</Link>
          <p className="eyebrow" style={{ color: quest.color, marginTop: '0.4rem' }}>{quest.setting}</p>
          <h1>{quest.title}</h1>
          <p className="dim">{quest.tagline}</p>
        </div>
        <div style={{ width: 150 }}>{card && <CardView card={card} locked={!owned} />}</div>
      </div>
      <div className="chapters">
        {quest.chapters.map((ch, i) => {
          const cleared = i < progress.cleared;
          const unlocked = i <= progress.cleared;
          const reward = chapterReward(quest, i);
          const stars = progress.stars[i] ?? 0;
          return (
            <div key={ch.id} className={`chapter ${cleared ? 'is-cleared' : ''} ${unlocked ? '' : 'is-locked'}`} style={{ ['--q' as string]: quest.color }}>
              <div className="ch-num">{String(i + 1).padStart(2, '0')}</div>
              <div className="ch-body">
                <h3>{ch.title}</h3>
                <p className="dim" style={{ fontSize: '0.85rem' }}>
                  {tierById(ch.band).name} · {ch.questions} problems · clear with {ch.passMark}
                  {' · '}<span className="gold">{reward.coins} coins</span>{reward.pack ? ` + ${PACKS[reward.pack].name}` : ''}{reward.card ? ` + ${cardById(reward.card)?.name.split(',')[0]}` : ''}
                </p>
              </div>
              <div className="ch-stars" aria-label={`${stars} of 3 stars`}>{'★'.repeat(stars)}<span className="faint">{'★'.repeat(3 - stars)}</span></div>
              {unlocked
                ? <button type="button" className={`btn btn-sm ${cleared ? '' : 'btn-hot'}`} onClick={() => navigate(`/story?quest=${quest.id}&chapter=${i}&n=${Date.now().toString(36)}`)}>{cleared ? 'Replay' : 'Play'}</button>
                : <span className="chip">Locked</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

type Phase = 'intro' | 'play' | 'outro' | 'result';

function ChapterPlay({ quest, index, session }: { quest: QuestLine; index: number; session: ChapterSession }) {
  const { profile } = useProfile();
  const { openPack } = useArena();
  const chapter: Chapter = quest.chapters[index];
  const [phase, setPhase] = useState<Phase>('intro');
  const [line, setLine] = useState(0);
  const [q, setQ] = useState(0);
  const [value, setValue] = useState('');
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [feedback, setFeedback] = useState<ChapterResult | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const problems = session.problems;
  const correct = answers.filter(Boolean).length;

  useEffect(() => { if (phase === 'play' && feedback === null) inputRef.current?.focus(); }, [phase, q, feedback]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (feedback !== null || busy || !problems) return;
    const cleaned = value.trim().replace(/−/g, '-');
    if (!/^-?\d+$/.test(cleaned)) return;
    setBusy(true);
    try {
      const res = await session.answer(q, parseInt(cleaned, 10));
      setAnswers((a) => [...a, res.correct]);
      setFeedback(res);
    } catch (err) {
      setFeedback({ correct: false, answer: NaN, explanation: err instanceof Error ? err.message : 'Something went wrong' });
    } finally {
      setBusy(false);
    }
  };

  const next = () => {
    setFeedback(null);
    setValue('');
    if (problems && q + 1 < problems.length) setQ(q + 1);
    else { setLine(0); setPhase('outro'); }
  };

  const advanceDialogue = (lines: number, after: Phase) => {
    if (line + 1 < lines) setLine(line + 1);
    else { setLine(0); setPhase(after); }
  };

  const lines = phase === 'intro' ? chapter.intro : chapter.outro;
  const nextIndex = index + 1 < quest.chapters.length ? index + 1 : null;
  const packs = profile.packs.standard + profile.packs.premium;
  const end = session.end;
  const character = cardById(quest.character);

  if (session.error) {
    return (
      <div className="page matchmaking">
        <p className="eyebrow hot">Could not start the chapter</p>
        <p className="dim">{session.error}</p>
        <Link to={`/story?quest=${quest.id}`} className="btn">Back to quest</Link>
      </div>
    );
  }

  return (
    <div className="page story-play">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <Link to={`/story?quest=${quest.id}`} className="dim" style={{ fontSize: '0.85rem' }}>← {quest.title}</Link>
        <span className="chip">Chapter {index + 1} · {chapter.title} · {tierById(chapter.band).name}</span>
      </div>

      {(phase === 'intro' || phase === 'outro') && (
        <div className="dialogue" style={{ ['--q' as string]: quest.color }}>
          <div className="dialogue-portrait">{character && <CardView card={character} size="sm" />}</div>
          <div className="dialogue-box" key={`${phase}-${line}`}>
            <p className="eyebrow" style={{ color: lines[line].speaker === 'You' ? 'var(--cool)' : quest.color }}>{lines[line].speaker}</p>
            <p className="dialogue-text">{lines[line].text}</p>
            <div className="row" style={{ justifyContent: 'flex-end', marginTop: '0.8rem' }}>
              <span className="faint mono" style={{ fontSize: '0.75rem' }}>{line + 1}/{lines.length}</span>
              <button type="button" className="btn btn-sm btn-chalk" disabled={phase === 'intro' && line + 1 >= lines.length && !problems} onClick={() => advanceDialogue(lines.length, phase === 'intro' ? 'play' : 'result')} autoFocus>
                {line + 1 < lines.length ? 'Next' : phase === 'intro' ? (problems ? 'Begin' : 'Loading…') : 'See results'}
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === 'play' && problems && (
        <div className="problem-card" style={{ ['--q' as string]: quest.color }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="eyebrow">Problem {q + 1} of {problems.length}</span>
            <span className="mono dim" style={{ fontSize: '0.8rem' }}>{correct} correct so far</span>
          </div>
          <p className="problem-text">{problems[q]}</p>
          <form className="answer-form" onSubmit={submit} style={{ margin: '0 auto' }}>
            <input ref={inputRef} className="answer-input" inputMode="numeric" autoComplete="off" placeholder="?" aria-label="Your answer" value={value} disabled={feedback !== null || busy} onChange={(e) => setValue(e.target.value.replace(/[^0-9-]/g, ''))} onKeyDown={(e) => { if (e.key === 'Enter') void submit(e); }} />
            {feedback === null ? <button type="submit" className="btn btn-hot" disabled={busy}>{busy ? '…' : 'Answer'}</button> : <button type="button" className="btn btn-chalk" onClick={next} autoFocus>{q + 1 < problems.length ? 'Next' : 'Finish'}</button>}
          </form>
          {feedback && (
            <div className={`feedback ${feedback.correct ? 'correct' : 'wrong'}`}>
              <b>{feedback.correct ? 'Correct.' : Number.isNaN(feedback.answer) ? 'Problem' : `Not quite. The answer is ${feedback.answer}.`}</b>
              <span>{feedback.explanation}</span>
            </div>
          )}
          <div className="dots" aria-hidden="true">
            {problems.map((_, i) => <i key={i} className={i < answers.length ? (answers[i] ? 'ok' : 'bad') : i === q ? 'now' : ''} />)}
          </div>
        </div>
      )}

      {phase === 'result' && !end && (
        <div className="matchmaking"><p className="eyebrow" style={{ animation: 'pulse 1.2s infinite' }}>Settling the chapter…</p></div>
      )}

      {phase === 'result' && end && (
        <div className="result panel" style={{ alignItems: 'center' }}>
          <p className="eyebrow">{quest.title} · Chapter {index + 1}</p>
          <h2 className={end.passed ? 'win' : 'loss'}>{end.passed ? 'Chapter cleared' : 'Not this time'}</h2>
          <div className="ch-stars big" aria-label={`${end.stars} of 3 stars`}>{'★'.repeat(end.stars)}<span className="faint">{'★'.repeat(3 - end.stars)}</span></div>
          <p className="dim">{end.correct} of {chapter.questions} correct{end.passed ? '' : ` · you need ${chapter.passMark}`}.</p>
          {end.passed && (
            <div className="stack" style={{ alignItems: 'center', gap: '0.4rem' }}>
              {end.first ? (
                <>
                  <p className="gold">+{end.reward.coins} coins{end.reward.pack ? ` · ${PACKS[end.reward.pack].name} added` : ''}</p>
                  {end.reward.card && cardById(end.reward.card) && (
                    <div className="stack" style={{ alignItems: 'center' }}>
                      <p className="eyebrow hot">Character unlocked</p>
                      <div style={{ width: 170 }}><CardView card={cardById(end.reward.card)!} isNew /></div>
                    </div>
                  )}
                </>
              ) : (
                <p className="dim">Replay bonus: +{Math.round(end.reward.coins * REPLAY_COIN_SHARE)} coins</p>
              )}
            </div>
          )}
          <div className="row" style={{ justifyContent: 'center' }}>
            {end.passed && nextIndex != null && <button type="button" className="btn btn-hot btn-lg" onClick={() => navigate(`/story?quest=${quest.id}&chapter=${nextIndex}&n=${Date.now().toString(36)}`)}>Next chapter</button>}
            {!end.passed && <button type="button" className="btn btn-hot btn-lg" onClick={() => navigate(`/story?quest=${quest.id}&chapter=${index}&n=${Date.now().toString(36)}`)}>Try again</button>}
            {packs > 0 && <button type="button" className="btn btn-cool" onClick={() => openPack(profile.packs.premium > 0 ? 'premium' : 'standard')}>Open pack ({packs})</button>}
            <Link to={`/story?quest=${quest.id}`} className="btn">Back to quest</Link>
          </div>
        </div>
      )}
    </div>
  );
}
