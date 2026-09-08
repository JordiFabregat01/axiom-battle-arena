// Checks a Supabase project against what the game needs, using the keys in .env.local
// (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) and, if present, SUPABASE_SERVICE_ROLE_KEY.
// Usage: npm run check:supabase
import { existsSync, readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = { ...process.env };
for (const file of ['.env.local', '.env']) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in env)) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const url = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const anon = env.VITE_SUPABASE_ANON_KEY;
const service = env.SUPABASE_SERVICE_ROLE_KEY;
let failed = 0;
const ok = (m) => console.log(`  ✓ ${m}`);
const bad = (m, hint) => { failed++; console.log(`  ✗ ${m}${hint ? `\n    → ${hint}` : ''}`); };

console.log('Supabase check');
if (!url || !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)) { bad('VITE_SUPABASE_URL missing or not like https://xxxx.supabase.co', 'Supabase dashboard → Settings → API → Project URL, paste into .env.local'); }
else ok(`project URL ${url}`);
if (!anon) bad('VITE_SUPABASE_ANON_KEY missing', 'Settings → API → "anon public" key, paste into .env.local');
else ok('anon key present');

if (url && anon) {
  const client = createClient(url, anon);
  // 1. Reachable + anon key valid: the auth settings endpoint answers for valid keys.
  try {
    const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: anon } });
    if (res.ok) {
      const settings = await res.json();
      ok('project reachable, anon key accepted');
      const ext = settings.external ?? {};
      if (ext.email) ok('Email sign-in enabled'); else bad('Email sign-in disabled', 'Authentication → Providers → Email → enable');
      if (ext.google) ok('Google sign-in enabled'); else bad('Google sign-in not enabled (optional)', 'Authentication → Providers → Google → add client id/secret');
    } else bad(`auth endpoint answered ${res.status}`, 'Check the URL and anon key');
  } catch (e) { bad(`cannot reach ${url}: ${e.message}`); }

  // 2. Schema applied: the ladder view exists and is readable (empty is fine).
  const { error } = await client.from('ladder').select('id').limit(1);
  if (!error) ok('schema applied: public.ladder view is readable');
  else if (/relation|does not exist|schema cache/i.test(error.message)) bad('schema not applied: public.ladder view not found', 'SQL editor → paste supabase/schema.sql → Run');
  else if (/permission|denied|row-level/i.test(error.message)) ok('schema applied (ladder is restricted to signed-in players, as intended)');
  else bad(`ladder query failed: ${error.message}`);
}

if (service && url) {
  const admin = createClient(url, service, { auth: { persistSession: false } });
  const { error } = await admin.from('profiles').select('id, plus_until, coin_grants, stripe_customer_id').limit(1);
  if (!error) ok('service role key works and profiles table has the expected columns');
  else bad(`service role check failed: ${error.message}`, 'Settings → API → "service_role" key (server only, never in the web build)');
  const { error: rpc } = await admin.rpc('grant_coins', { p_user: '00000000-0000-0000-0000-000000000000', p_amount: 0 });
  if (!rpc) ok('grant_coins function callable by the server role');
  else bad(`grant_coins not callable: ${rpc.message}`, 'Re-run supabase/schema.sql (it grants execute to service_role)');
} else {
  console.log('  · SUPABASE_SERVICE_ROLE_KEY not set locally: skipped the server-side checks (set it where the game server runs)');
}

console.log(failed ? `\n${failed} problem(s) to fix` : '\nSupabase is ready');
process.exit(failed ? 1 : 0);
