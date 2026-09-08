// Supabase Edge Function: create a Stripe Checkout session for a signed-in player.
// Deploy: supabase functions deploy checkout
// Secrets: STRIPE_SECRET_KEY, STRIPE_PRICE_PLUS, STRIPE_PRICE_COINS_500, STRIPE_PRICE_COINS_1500,
//          STRIPE_PRICE_COINS_4000, STRIPE_PRICE_COINS_10000 (SUPABASE_URL / SUPABASE_ANON_KEY are injected).
// The client posts { sku, returnTo } with the user's access token; we answer { url }.
// NOTE: scaffolding, not yet exercised against a live Stripe account.
import Stripe from 'npm:stripe@17';
import { createClient } from 'npm:@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', { apiVersion: '2024-12-18.acacia' });

const PRICES: Record<string, string | undefined> = {
  plus_monthly: Deno.env.get('STRIPE_PRICE_PLUS'),
  coins_500: Deno.env.get('STRIPE_PRICE_COINS_500'),
  coins_1500: Deno.env.get('STRIPE_PRICE_COINS_1500'),
  coins_4000: Deno.env.get('STRIPE_PRICE_COINS_4000'),
  coins_10000: Deno.env.get('STRIPE_PRICE_COINS_10000'),
};

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  const authHeader = req.headers.get('Authorization') ?? '';
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: 'Sign in first' }, 401);

  const { sku, returnTo } = (await req.json()) as { sku?: string; returnTo?: string };
  const price = sku ? PRICES[sku] : undefined;
  if (!sku || !price) return json({ error: 'Unknown item' }, 400);
  const origin = typeof returnTo === 'string' && /^https?:\/\//.test(returnTo) ? returnTo : '';

  const session = await stripe.checkout.sessions.create({
    mode: sku === 'plus_monthly' ? 'subscription' : 'payment',
    line_items: [{ price, quantity: 1 }],
    success_url: `${origin}/#/shop?paid=1`,
    cancel_url: `${origin}/#/shop`,
    client_reference_id: user.id,
    customer_email: user.email ?? undefined,
    metadata: { sku, user_id: user.id },
    subscription_data: sku === 'plus_monthly' ? { metadata: { user_id: user.id } } : undefined,
  });

  return json({ url: session.url });
});
