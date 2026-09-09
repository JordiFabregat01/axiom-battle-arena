/** Axiom Arena game server: authoritative duels, packs, story and profiles over WebSocket.
 *
 *  Run locally:  npm run server
 *  Production:   node server/dist/index.mjs   (see Dockerfile and RELEASE.md)
 *
 *  Environment
 *    PORT                       default 8787
 *    HOST                       default 0.0.0.0
 *    SUPABASE_URL               with SUPABASE_SERVICE_ROLE_KEY: persist profiles in Supabase, verify sign-in tokens
 *    SUPABASE_SERVICE_ROLE_KEY
 *    ALLOWED_ORIGINS            comma-separated browser origins allowed to connect (e.g. https://axiomarena.app). Empty = any.
 *    ALLOW_GUESTS=1             with Supabase, also accept anonymous guest ids
 *    ALLOW_IMPORT=1             with Supabase, let a fresh account import a guest-mode save once
 *    ALLOW_MEMORY_STORE=1       let NODE_ENV=production start without Supabase (not recommended)
 *    BOT_AFTER_MS               matchmaking waits this long for a human before spawning a bot (default 5000)
 *    DATA_FILE                  where the in-memory store mirrors itself (default server/data/profiles.json)
 *
 *  HTTP GET /healthz answers {"ok":true} for load balancers; everything else is WebSocket.
 */
import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import { createStore, SupabaseStore } from './store';
import { Hub } from './hub';
import { CARDS, packableCards } from '../../src/engine/cards';

const production = process.env.NODE_ENV === 'production';
const host = process.env.HOST ?? '0.0.0.0';
const port = Number(process.env.PORT ?? 8787);
const flag = (name: string) => process.env[name] === '1' || process.env[name] === 'true';

const store = await createStore();
if (production && store.kind === 'memory' && !flag('ALLOW_MEMORY_STORE')) {
  console.error('[arena] refusing to start: NODE_ENV=production without SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Profiles would vanish on restart.');
  console.error('[arena] Add those two variables in your host (Railway: service → Variables → Raw Editor) and it will restart by itself. See RELEASE.md step 2.');
  process.exit(1);
}

if (packableCards.length === 0) {
  console.error('[arena] refusing to start: the card catalog has no pack cards. src/engine/cards.art.json is empty; run `npm run cards:sync` with the images present in public/cards and rebuild.');
  process.exit(1);
}
const supabase = store instanceof SupabaseStore ? store.client : null;
const allowGuests = supabase ? flag('ALLOW_GUESTS') : true;
const allowImport = supabase ? flag('ALLOW_IMPORT') : true;
const botAfterMs = Number(process.env.BOT_AFTER_MS ?? 5000);
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim().replace(/\/+$/, '')).filter(Boolean);
if (production && allowedOrigins.length === 0) console.warn('[arena] ALLOWED_ORIGINS is empty: any website may open sockets to this server.');

const hub = new Hub(store, { supabase, allowGuests, botAfterMs, allowImport });

const http = createServer((req, res) => {
  if (req.method === 'GET' && (req.url === '/healthz' || req.url === '/')) {
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    res.end(JSON.stringify({ ok: true, store: store.kind, uptime: Math.round(process.uptime()), online: hub.size, cards: CARDS.length, packCards: packableCards.length }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({
  server: http,
  maxPayload: 32 * 1024, // the largest legitimate message is an imported profile; everything else is tiny
  verifyClient: ({ origin }, done) => {
    if (allowedOrigins.length === 0) return done(true);
    const o = (origin ?? '').replace(/\/+$/, '');
    done(allowedOrigins.includes(o), 403, 'Origin not allowed');
  },
});
wss.on('connection', (ws) => hub.attach(ws));

http.listen(port, host, () => {
  console.log(`[arena] listening on ws://${host}:${port} · store ${store.kind} · guests ${allowGuests ? 'allowed' : 'disabled'} · import ${allowImport ? 'allowed' : 'disabled'} · bot fallback ${botAfterMs}ms · origins ${allowedOrigins.length ? allowedOrigins.join(', ') : 'any'}`);
});

const shutdown = () => {
  console.log('[arena] shutting down');
  hub.close();
  wss.close();
  http.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 2000).unref();
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
