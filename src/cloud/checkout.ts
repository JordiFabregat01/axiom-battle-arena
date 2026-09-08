import { supabase } from './supabase';

/** Things money can buy. Prices are display-only here; the checkout server owns the real ones. */
export type Sku = 'plus_monthly' | 'coins_500' | 'coins_1500' | 'coins_4000' | 'coins_10000';

export interface SkuDef { sku: Sku; name: string; priceUsd: number; coins?: number; blurb: string; }

export const SKUS: SkuDef[] = [
  { sku: 'plus_monthly', name: 'Axiom Plus', priceUsd: 5, blurb: 'Monthly membership.' },
  { sku: 'coins_500', name: '500 coins', priceUsd: 1.99, coins: 500, blurb: 'One Arena Pack and change.' },
  { sku: 'coins_1500', name: '1,500 coins', priceUsd: 4.99, coins: 1500, blurb: 'A Prime Pack, or three Arena Packs.' },
  { sku: 'coins_4000', name: '4,000 coins', priceUsd: 9.99, coins: 4000, blurb: 'Best value for collectors.' },
  { sku: 'coins_10000', name: '10,000 coins', priceUsd: 19.99, coins: 10000, blurb: 'For the completionists.' },
];

export type CheckoutResult = { ok: true } | { ok: false; reason: 'not-configured' | 'not-signed-in' | 'error'; message: string };

const checkoutUrl = import.meta.env.VITE_CHECKOUT_URL as string | undefined;
export const paymentsConfigured = !!checkoutUrl;

/** Asks the checkout server for a Stripe Checkout URL and sends the browser there.
 *  Purchases are granted by the payment webhook (see supabase/functions), never by the client. */
export async function startCheckout(sku: Sku): Promise<CheckoutResult> {
  if (!checkoutUrl) return { ok: false, reason: 'not-configured', message: 'Payments are not connected on this deployment yet.' };
  if (!supabase) return { ok: false, reason: 'not-signed-in', message: 'Sign in to buy things; purchases are tied to your account.' };
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { ok: false, reason: 'not-signed-in', message: 'Sign in to buy things; purchases are tied to your account.' };
  try {
    const res = await fetch(checkoutUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ sku, returnTo: window.location.origin }),
    });
    if (!res.ok) return { ok: false, reason: 'error', message: `Checkout failed (${res.status}).` };
    const body = (await res.json()) as { url?: string };
    if (!body.url) return { ok: false, reason: 'error', message: 'Checkout did not return a payment page.' };
    window.location.assign(body.url);
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: 'error', message: e instanceof Error ? e.message : 'Checkout failed.' };
  }
}
