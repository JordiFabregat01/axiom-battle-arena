// End-to-end checks that need a real browser or a real server:
//   1. Escape closes a modal (native <dialog> cancel + our key handler) in headless Chrome/Edge.
//   2. The game server ignores forged results: a client cannot change its own rating, coins or cards.
//   3. A full duel against the server: answers are validated and scored server-side.
// Usage: npm run e2e   (expects `vite preview --port 4173` for the UI test; starts its own server on port 8790)
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import WebSocket from 'ws';
import puppeteer from 'puppeteer-core';

const BROWSERS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];
const UI_URL = process.env.E2E_UI_URL ?? 'http://localhost:4173';
const SERVER_PORT = Number(process.env.E2E_SERVER_PORT ?? 8790);

let failures = 0;
const rnd = () => Math.random().toString(36).slice(2, 7);
const ok = (name) => console.log(`  ✓ ${name}`);
const fail = (name, detail) => { failures++; console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); };
const assert = (cond, name, detail) => (cond ? ok(name) : fail(name, detail));

// ─────────────────────────────────────────────────────────── 1. Escape closes modals
async function testEscape() {
  console.log('\nEscape closes modals');
  const exe = BROWSERS.find((p) => existsSync(p));
  if (!exe) { fail('browser found', 'no Chrome/Edge installed'); return; }
  const browser = await puppeteer.launch({ executablePath: exe, headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1100, height: 800 });
    await page.goto(UI_URL, { waitUntil: 'networkidle2' });
    // Fresh guest profile.
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle2' });
    await page.waitForSelector('#name');
    await page.type('#name', `Esc${rnd()}`);
    await page.waitForFunction(() => !document.querySelector('button[type=submit]')?.disabled, { timeout: 10000 });
    await page.click('button[type=submit]');
    await page.waitForSelector('.pack-chip');
    await page.click('.pack-chip');
    await page.waitForFunction(() => document.querySelector('dialog')?.open === true);
    ok('pack modal opened');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.querySelector('dialog')?.open === false, { timeout: 3000 });
    ok('Escape closed the pack modal');

    await page.goto(`${UI_URL}/#/collection`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('.card-grid button.card');
    await page.click('.card-grid button.card');
    await page.waitForFunction(() => document.querySelector('dialog')?.open === true);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.querySelector('dialog')?.open === false, { timeout: 3000 });
    ok('Escape closed the card detail modal');

    // Enter submits a duel answer (works in guest mode and, with the game server running, in server mode).
    console.log('\nEnter submits a duel answer');
    await page.goto(`${UI_URL}/#/duel?mode=casual&tier=1`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('.problem', { timeout: 20000 });
    const text = await page.$eval('.problem', (el) => el.textContent);
    const missing = text.match(/^(\d+) \+ \? = (\d+)$/);
    const answer = missing ? Number(missing[2]) - Number(missing[1]) : Function(`return (${text.replace(/−/g, '-')})`)();
    await page.click('.answer-input');
    await page.keyboard.type(String(answer));
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => /^1 ✓/.test(document.querySelector('.fighter .f-sub')?.textContent ?? ''), { timeout: 4000 });
    ok(`"${text}" answered with ${answer} via Enter and scored`);
  } catch (e) {
    fail('escape test', e.message);
  } finally {
    await browser.close();
  }
}

// ─────────────────────────────────────────────────────────── helpers for the server tests
function connect() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${SERVER_PORT}`);
    const inbox = [];
    const waiters = [];
    ws.on('message', (data) => {
      const msg = JSON.parse(String(data));
      const i = waiters.findIndex((w) => w.pred(msg));
      if (i >= 0) waiters.splice(i, 1)[0].resolve(msg); else inbox.push(msg);
    });
    ws.on('open', () => resolve({
      ws,
      send: (m) => ws.send(JSON.stringify(m)),
      next: (pred, timeout = 8000) => new Promise((res, rej) => {
        const i = inbox.findIndex(pred);
        if (i >= 0) return res(inbox.splice(i, 1)[0]);
        const w = { pred, resolve: res };
        waiters.push(w);
        setTimeout(() => { const k = waiters.indexOf(w); if (k >= 0) { waiters.splice(k, 1); rej(new Error('timeout waiting for message')); } }, timeout);
      }),
      close: () => ws.close(),
    }));
    ws.on('error', reject);
  });
}

async function startServer() {
  const child = spawn(process.execPath, ['server/dist/index.mjs'], {
    env: { ...process.env, PORT: String(SERVER_PORT), DATA_FILE: '', BOT_AFTER_MS: '300', SUPABASE_URL: '', SUPABASE_SERVICE_ROLE_KEY: '' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stderr.on('data', (d) => process.stderr.write(`[server] ${d}`));
  await new Promise((resolve, reject) => {
    child.stdout.on('data', (d) => { if (String(d).includes('listening')) resolve(); });
    child.on('exit', (code) => reject(new Error(`server exited early (${code})`)));
  });
  return child;
}

// ─────────────────────────────────────────────────────────── 2. Forged results are ignored
async function testTamper() {
  console.log('\nServer ignores forged results');
  const c = await connect();
  const guestId = `g-tamper${Math.random().toString(36).slice(2, 12)}`;
  c.send({ type: 'hello', guestId, reqId: 'h' });
  const welcome = await c.next((m) => m.type === 'welcome');
  assert(welcome.profile === null, 'new guest has no profile');
  c.send({ type: 'intent', action: { type: 'create', name: `Tamper${rnd()}`, placement: 2 }, reqId: 'c' });
  const created = await c.next((m) => m.reqId === 'c');
  assert(created.profile?.elo === 1000, 'profile created at 1000 elo');

  // A client cannot apply trusted actions: these are not intents and the server rejects them.
  for (const action of [
    { type: 'grantCoins', amount: 999999 },
    { type: 'matchFinished', record: { id: 'x', at: 0, mode: 'ranked', tier: null, opponent: 'x', opponentElo: 3000, result: 'win', score: 9999, oppScore: 0, eloDelta: 400, correct: 1, wrong: 0, bestStreak: 1 }, xpGain: 99999 },
    { type: 'openPack', pack: 'premium', cardIds: ['omega', 'omega', 'omega', 'omega', 'omega'] },
    { type: 'setPlus', until: Date.now() + 1e9 },
    { type: 'chapterCleared', questId: 'scaly-emperor', chapterIndex: 4, stars: 3, reward: { coins: 99999, pack: 'premium', card: 'scaly-emperor' } },
    { type: 'load', profile: { ...created.profile, elo: 3500, coins: 1e9 } },
  ]) {
    c.send({ type: 'intent', action, reqId: `t-${action.type}` });
    const res = await c.next((m) => m.reqId === `t-${action.type}`);
    assert(res.type === 'error', `forged "${action.type}" rejected`, JSON.stringify(res).slice(0, 120));
  }
  // Even a forged match_end / answer for a match that does not exist changes nothing.
  c.send({ type: 'answer', matchId: 'nope', index: 0, value: 1 });
  c.send({ type: 'open_pack', pack: 'premium', reqId: 'p' });
  const packRes = await c.next((m) => m.reqId === 'p');
  assert(packRes.type === 'error', 'cannot open a pack you do not own');
  c.send({ type: 'intent', action: { type: 'rename', name: `Still${rnd()}` }, reqId: 'r' });
  const after = await c.next((m) => m.reqId === 'r');
  assert(after.profile.elo === 1000 && after.profile.coins === 200 && Object.keys(after.profile.collection).length === 0 && after.profile.plusUntil === null, 'profile unchanged after all forgeries');
  c.close();
}

// ─────────────────────────────────────────────────────────── 3. A real duel, scored by the server
async function testDuel() {
  console.log('\nDuel scored by the server');
  const c = await connect();
  c.send({ type: 'hello', guestId: `g-duel${Math.random().toString(36).slice(2, 12)}`, reqId: 'h' });
  await c.next((m) => m.type === 'welcome');
  c.send({ type: 'intent', action: { type: 'create', name: `Dueler${rnd()}`, placement: 1 }, reqId: 'c' });
  await c.next((m) => m.reqId === 'c');
  c.send({ type: 'queue', mode: 'casual', tier: 1 });
  await c.next((m) => m.type === 'queued');
  const match = await c.next((m) => m.type === 'match', 10000);
  assert(match.opponent?.isBot === true, `matched with a bot after the wait (${match.opponent?.name})`);
  const first = await c.next((m) => m.type === 'problem', 10000);
  ok(`first problem arrived: "${first.text}" (answer not sent to the client: ${first.answer === undefined})`);

  // Wrong answer first, then solve level-1 problems by evaluating them (server never sent answers).
  c.send({ type: 'answer', matchId: match.matchId, index: first.index, value: -999999 });
  const wrong = await c.next((m) => m.type === 'answer_result');
  assert(wrong.correct === false && wrong.me.wrong === 1 && wrong.me.score === 0, 'wrong answer penalised (floored at 0)');

  const solve = (text) => {
    const missing = text.match(/^(\d+) \+ \? = (\d+)$/);
    if (missing) return Number(missing[2]) - Number(missing[1]);
    return Function(`return (${text.replace(/−/g, '-').replace(/×/g, '*').replace(/÷/g, '/')})`)();
  };
  let problem = first;
  let correct = 0;
  for (let i = 0; i < 6; i++) {
    c.send({ type: 'answer', matchId: match.matchId, index: problem.index, value: solve(problem.text) });
    const res = await c.next((m) => m.type === 'answer_result');
    if (res.correct) correct++;
    problem = await c.next((m) => m.type === 'problem');
  }
  assert(correct === 6, `six computed answers accepted (${correct}/6)`);
  // Replaying an old index is ignored.
  c.send({ type: 'answer', matchId: match.matchId, index: 0, value: solve(first.text) });
  const state = await c.next((m) => m.type === 'state');
  assert(state.me.correct === 6, 'replayed answer for an old index ignored');

  const end = await c.next((m) => m.type === 'match_end', 70000);
  assert(end.me.correct === 6 && end.profile.history.length === 1, `match ended and recorded (${end.result}, ${end.me.score}–${end.opponent.score})`);
  assert(end.profile.xp === end.xp, 'xp on the profile equals what the server reported');
  c.close();
}

const server = await startServer();
try {
  await testEscape();
  await testTamper();
  await testDuel();
} finally {
  server.kill();
  await sleep(200);
}
console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
