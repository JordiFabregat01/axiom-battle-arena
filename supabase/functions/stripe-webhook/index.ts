// Supabase Edge Function: Stripe webhook that grants purchases server-side.
// Deploy: supabase functions deploy stripe-webhook --no-verify-jwt
// Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected).
// Stripe events to send: checkout.session.completed, invoice.paid.
// NOTE: scaffolding, not yet exercised against a live Stripe account.
import Stripe from 'npm:stripe@17';
import { createClient } from 'npm:@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', { apiVersion: '2024-12-18.acacia' });
const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

const COINS: Record<string, number> = { coins_500: 500, coins_1500: 1500, coins_4000: 4000, coins_10000: 10000 };
const MONTH_MS = 32 * 24 * 60 * 60 * 1000;

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature ?? '', Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '');
  } catch (e) {
    return new Response(`Bad signature: ${e instanceof Error ? e.message : e}`, { status: 400 });
  }

  // Idempotency: each Stripe event is applied at most once.
  const { error: dupe } = await admin.from('purchases').insert({ id: event.id, sku: event.type, user_id: null });
  if (dupe) return new Response('already processed', { status: 200 });

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const sku = session.metadata?.sku ?? '';
    const userId = session.metadata?.user_id ?? session.client_reference_id ?? '';
    if (!userId) return new Response('no user', { status: 200 });
    await admin.from('purchases').update({ user_id: userId, sku, amount_cents: session.amount_total ?? null }).eq('id', event.id);

    if (COINS[sku]) {
      await admin.rpc('grant_coins', { p_user: userId, p_amount: COINS[sku] });
    } else if (sku === 'plus_monthly') {
      const customer = typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null;
      await admin.rpc('set_plus', { p_user: userId, p_until: new Date(Date.now() + MONTH_MS).toISOString(), p_customer: customer });
    }
  }

  if (event.type === 'invoice.paid') {
    // Subscription renewals: extend Plus for the customer on file.
    const invoice = event.data.object as Stripe.Invoice;
    const customer = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
    const periodEnd = invoice.lines.data[0]?.period?.end;
    if (customer && periodEnd) {
      const { data: profile } = await admin.from('profiles').select('id').eq('stripe_customer_id', customer).maybeSingle();
      if (profile) await admin.rpc('set_plus', { p_user: profile.id, p_until: new Date(periodEnd * 1000).toISOString(), p_customer: customer });
    }
  }

  return new Response('ok', { status: 200 });
});
