# Release checklist

Everything below is scripted or documented; do the steps in order. The card images are deliberately the last step.

## 0. Before you start

- [ ] `npm run typecheck && npm run build && npm run server:build` pass locally.
- [ ] `npx vite preview --port 4173` in one terminal, `npm run e2e` in another: all checks pass.
- [ ] Fill the placeholders in `src/pages/Legal.tsx` (operator, contact email, hosting region) and have the privacy policy reviewed. Children use this product through schools; guest mode keeps them anonymous, accounts need a parent's or school's permission.
- [ ] Decide the public domains: the web app (e.g. `https://axiomarena.app`) and the game server (e.g. `wss://arena.axiomarena.app`).

## 1. Supabase (accounts + profile storage)

- [ ] Create a project at https://supabase.com. Note the project URL, the anon key and the service role key (Settings → API).
- [ ] SQL editor → run `supabase/schema.sql`.
- [ ] Because the game server will be the only writer, also run the two `drop policy` lines noted in that file.
- [ ] Authentication → Providers: enable Email. For Google, create OAuth credentials in Google Cloud Console (authorized redirect URI: `https://YOUR-PROJECT.supabase.co/auth/v1/callback`) and paste the client id/secret.
- [ ] Authentication → URL configuration: Site URL = your web domain; add it (and `http://localhost:5173`) to Redirect URLs.

## 2. Game server

Any host that runs a Node 22 container with WebSockets works (Railway, Fly.io, Render, a VPS). The repo has a `Dockerfile`; hosts that build from the repo will pick it up.

- [ ] Environment variables:
  - `NODE_ENV=production`
  - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
  - `ALLOWED_ORIGINS=https://axiomarena.app` (your web domain, comma-separated if several)
  - optional: `ALLOW_GUESTS=1` (anonymous play, recommended for classrooms), `BOT_AFTER_MS=5000`
- [ ] Expose port 8787 behind TLS so the URL is `wss://…`. Health check: `GET /healthz`.
- [ ] Open `https://arena.yourdomain/healthz` in a browser: `{"ok":true,"store":"supabase",…}`.

## 3. Web app

- [ ] Set the production variables from `.env.production.example` in the host (Netlify and Vercel configs are included; any static host works, the app uses hash routing so no rewrites are needed):
  - `VITE_ARENA_WS_URL=wss://arena.yourdomain`
  - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
  - `VITE_CHECKOUT_URL` empty for now
- [ ] Deploy (`npm run build` → `dist/`).
- [ ] Open the site: the nav shows the green live dot, sign-up works, a casual duel matches a bot after ~5 s and ends with a server-scored result, a story chapter pays coins, the ladder shows live players.

## 4. Payments (can be after launch)

- [ ] Stripe: create the Plus recurring price and the coin bundle prices.
- [ ] `supabase functions deploy checkout` and `supabase functions deploy stripe-webhook --no-verify-jwt`; set the secrets listed at the top of each function.
- [ ] Add the Stripe webhook endpoint for `checkout.session.completed` and `invoice.paid`.
- [ ] Set `VITE_CHECKOUT_URL` to the checkout function URL and redeploy the web app. The shop switches from "Coming soon" to live prices.
- [ ] Test with Stripe test cards before switching to live keys.

## 5. Last step: the card images

Card art is data, not code, but both the web app and the game server read the generated manifest (`src/engine/cards.art.json`), because the server rolls packs from it. So adding cards means one commit and two deploys.

- [ ] Copy the finished art into `public/cards/` as `<name>_<R>.jpg|png` (see `public/cards/README.md`).
- [ ] `npm run cards:optimize` → converts to WebP at ≤1000 px wide (≈60–120 KB each), moves the originals to `art/originals/` (not committed) and regenerates the manifest.
- [ ] Fill `src/engine/cards.custom.json` for the new cards (kind, domain, flavor). Optional but worth it.
- [ ] `npm run build` and open `#/gallery?filter=art` in `npx vite preview` to eyeball every card.
- [ ] `npm run og` (with the preview running) to refresh `public/og.png`, the image shown when the site is shared.
- [ ] Commit, then deploy the **game server** first (so packs can roll the new cards) and the **web app** second.

## 6. After launch

- Season 1 ends 2026-12-01 (`src/engine/season.ts`). Prepare Season 2 content (featured topics, new cards, rewards) and deploy it before that date; end-of-season claims happen automatically when players sign in after the end.
- Watch `/healthz` and the server logs; `[hub] … rejected` lines are expected (they are rejected forgeries and wrong-state messages).
- Keep `npm run e2e` green in CI (`.github/workflows/ci.yml`).
