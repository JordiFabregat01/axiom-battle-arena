// Verifies a deployed Axiom Arena: the website, the game server and how they are wired.
// Usage: npm run check:deploy -- https://your-site.netlify.app https://your-server.up.railway.app
import WebSocket from 'ws';

const [site, server] = process.argv.slice(2).map((s) => (s ?? '').trim().replace(/\/+$/, ''));
if (!site || !server) { console.error('usage: npm run check:deploy -- https://SITE https://SERVER'); process.exit(1); }

let failed = 0;
const ok = (m) => console.log(`  ✓ ${m}`);
const bad = (m, hint) => { failed++; console.log(`  ✗ ${m}${hint ? `\n    → ${hint}` : ''}`); };

console.log(`Website ${site}`);
let html = '';
try {
  const res = await fetch(site);
  html = await res.text();
  if (res.ok && html.includes('id="root"')) ok('site is up'); else bad(`site answered ${res.status}`, 'Check the Netlify deploy log');
} catch (e) { bad(`cannot reach the site: ${e.message}`); }

const scripts = [...html.matchAll(/src="([^"]+\.js)"/g)].map((m) => m[1]);
let js = '';
for (const s of scripts) {
  try { js += await (await fetch(s.startsWith('http') ? s : site + s)).text(); } catch { /* ignore */ }
}
if (js) {
  const wsMatch = js.match(/wss?:\/\/[a-zA-Z0-9.-]+(?::\d+)?/);
  const wsUrl = wsMatch ? wsMatch[0] : null;
  const wantWs = server.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:');
  if (wsUrl === wantWs) ok(`built with VITE_ARENA_WS_URL=${wsUrl}`);
  else bad(`site was built with VITE_ARENA_WS_URL=${wsUrl ?? '(none)'}, expected ${wantWs}`, 'Fix the variable on Netlify, then trigger a new deploy (Deploys → Trigger deploy)');
  if (/[a-z0-9]{20}\.supabase\.co/.test(js)) ok('built with a Supabase project URL'); else bad('site was built without VITE_SUPABASE_URL', 'Add it on Netlify and redeploy');
  if (/\.supabase\.co\/rest\/v1/.test(js)) bad('VITE_SUPABASE_URL contains /rest/v1', 'Use https://PROJECT.supabase.co only');
} else bad('could not download the site bundle to inspect it');

console.log(`\nGame server ${server}`);
try {
  const res = await fetch(`${server}/healthz`);
  const body = await res.json();
  if (res.ok && body.ok) ok('server is up'); else bad(`healthz answered ${res.status}`);
  if (body.store === 'supabase') ok('server stores profiles in Supabase'); else bad(`server store is "${body.store}"`, 'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing on Railway');
} catch (e) { bad(`cannot reach ${server}/healthz: ${e.message}`, 'Is the Railway service running? Did you generate a domain on port 8787?'); }

await new Promise((resolve) => {
  const url = server.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:');
  const ws = new WebSocket(url, { headers: { origin: site } });
  const timer = setTimeout(() => { bad('WebSocket did not answer within 8s'); ws.terminate(); resolve(); }, 8000);
  ws.on('open', () => ws.send(JSON.stringify({ type: 'ping' })));
  ws.on('message', (d) => { const m = JSON.parse(String(d)); if (m.type === 'pong') { ok(`WebSocket accepts connections from ${site}`); clearTimeout(timer); ws.close(); resolve(); } });
  ws.on('error', (e) => { bad(`WebSocket refused: ${e.message}`, /403/.test(e.message) ? `ALLOWED_ORIGINS on Railway must include ${site}` : 'Check the server address'); clearTimeout(timer); resolve(); });
  ws.on('unexpected-response', (_req, res) => { bad(`WebSocket refused with HTTP ${res.statusCode}`, res.statusCode === 403 ? `ALLOWED_ORIGINS on Railway must include ${site}` : undefined); clearTimeout(timer); resolve(); });
});

console.log(failed ? `\n${failed} problem(s) to fix` : '\nEverything is wired correctly');
process.exitCode = failed ? 1 : 0;
