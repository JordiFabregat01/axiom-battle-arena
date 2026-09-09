# Axiom Arena

Fast-paced competitive math for every level, from first sums (ages 6–8) to number theory for hardcore mathematicians. Teachers send students to a level; students race each other in 60-second duels; everyone climbs one ranked ladder, plays the story, earns and buys packs, and shows off a spotlight deck.

## Run it

```bash
npm install
npm run server     # game server on ws://localhost:8787 (terminal 1)
npm run dev        # web app on http://localhost:5173 (terminal 2)
```

`.env.local` points the app at the local game server (`VITE_ARENA_WS_URL`). Remove that line and the app runs in **guest mode**: everything in the browser, simulated opponents, saves in localStorage. `npm run build` produces a static site in `dist/`.

## Two modes

| | Guest mode (no server) | Server mode (`VITE_ARENA_WS_URL` set) |
| --- | --- | --- |
| Opponents | Simulated in the browser | Live players matched by rating. Casual falls back to a bot after a few seconds; ranked is real players only |
| Questions, clock, scoring | Browser | **Server** (the client only sends guesses; answers are never sent to it) |
| Elo, XP, packs, coins, story rewards | Browser reducer | **Server**, same reducer, then persisted |
| Profile storage | localStorage (or Supabase cloud sync when signed in) | Server store: JSON file in development, Supabase in production |
| Tamper resistance | None (fine for practice) | Forged actions are rejected; verified by `npm run e2e` |

Both modes share `src/engine/` (rules), so results are identical.

## What is in the game

| Feature | How it works |
| --- | --- |
| **Duel** | 60 seconds, both players get the same seeded question sequence. Correct = 100 + up to 50 speed bonus. Wrong = −25. Skip = −15. Five in a row = +50. |
| **Seven levels** | Sprout (6–8) · Scholar (8–10) · Apprentice (10–12) · Adept (12–14) · Expert (14–18) · Master (university/teachers) · Grandmaster (hardcore). ~70 speed-problem generators, integer answers only. |
| **Casual** | Pick any level. Rating never changes. Wins count 1 point towards packs. |
| **Ranked** | Everyone starts at **1000 Elo** and climbs; no placement into higher tiers. K = 32. Questions scale with your rank tier. |
| **Ladder** | Bronze → Silver → Gold → Platinum → Diamond → Master → Grandmaster. 400 points per tier, four divisions of 100. |
| **Seasons** | Season 1 "Prime Genesis" ends 2026-12-01 with featured topics and new cards. End-of-season rewards by tier; ratings soft-reset 40% towards 1000. |
| **Story mode** | Three quest lines, five chapters each, scaling Sprout → Grandmaster. Untimed exam-style word problems with worked explanations. First clears pay coins and a pack; finales unlock the character's card. |
| **Coins** | From story, season rewards, Plus drops, welcome bonus; buyable in bundles. Arena Pack 400, Prime Pack 1,200. Buying never changes odds. |
| **Cards** | 110 cards, 105 in packs across 7 rarities plus season, story and Plus exclusives. Every card prints its exact pull odds ("1 in 58" to "1 in 100,000"). |
| **Splash art** | Drop `public/cards/<name>_<R>.jpg` (R = rarity letter C/U/R/E/L/M/S) and the file becomes a card, or art for an existing card if the name matches its id. Landscape images, 16:10 window, light plate. Details per card in `src/engine/cards.custom.json`; the folder is synced to `cards.art.json` automatically. The `#/gallery` page shows every card unlocked. `npm run art-brief` writes prompts for cards without art. |
| **Axiom Plus** | $5/month: 8 spotlight slots, monthly Prime Pack + 600 coins, the Sigma Sentinel card, a Plus frame. Never affects matchmaking, questions, rating or odds. |
| **Accounts** | Email + password via Supabase (Google can be added later). In server mode the token is verified by the server. |
| **Usernames** | 3–16 characters, letters/numbers/underscores, must start with a letter, no reserved or offensive words (`src/engine/names.ts`). Unique across all players, case-insensitive, enforced by the server; the sign-up form checks availability as you type. |

## Project layout

```
src/engine/        Rules: problems, word problems, story, ranking, cards, season, bots, botSim, results, profile (reducer)
src/shared/        WebSocket protocol shared with the server
src/net/           Socket client + OnlineProvider (server mode)
src/game/          useDuel (guest), duelController (local + remote), useChapterSession (local + remote)
src/state/         Store provider (localStorage cache; routes intents to the server in server mode)
src/cloud/         Supabase auth, cloud sync (guest mode only), checkout client
src/pages/, src/components/, src/styles.css
server/src/        index (boot) · hub (connections, matchmaking, intents, packs, story) · room (one duel) · store · auth
supabase/          schema.sql, edge functions for Stripe (scaffolding)
scripts/           e2e.mjs (headless-browser + server checks), art-brief.mjs
```

## Game server

`npm run server` bundles `server/src` with esbuild and runs it on port 8787. Environment:

| Variable | Meaning |
| --- | --- |
| `PORT` | default 8787 |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | persist profiles in Supabase and verify sign-in tokens. Without them: in-memory store mirrored to `server/data/profiles.json`, guests allowed |
| `ALLOW_GUESTS=1` | with Supabase, also accept anonymous guest ids (development) |
| `ALLOW_IMPORT=1` | with Supabase, let a fresh account import a guest-mode save once (migration) |
| `BOT_AFTER_MS` | casual matchmaking waits this long for a human before spawning a bot (default 5000) |
| `RANKED_BOTS=1` | also let ranked fall back to bots. Off by default: ranked pairs real players only, with a rating window of ±100 that widens 40 points per second and opens to anyone after a minute |

How a duel works in server mode: the client sends `queue`; the server pairs players within ±100 Elo (widening 40/s; casual spawns a bot after `BOT_AFTER_MS`, ranked waits for a human); the room generates the shared question sequence from a secret seed, sends one question at a time, timestamps every answer on its own clock, applies penalties and streak bonuses, ends the duel at 60 s, settles Elo/XP/pack progress with `settleDuel`, saves, and sends `match_end`. Answers faster than 350 ms get no extra speed bonus. Story chapters and pack openings follow the same pattern (`story_start`/`story_answer`, `open_pack`).

Deploy the server anywhere that runs Node 20+ with WebSockets (Railway, Fly.io, Render, a VPS) and set `VITE_ARENA_WS_URL=wss://…` for the web build. Once deployed, run the two `drop policy` lines noted in `supabase/schema.sql` so browsers can no longer write profiles directly.

## Deploying

Follow [RELEASE.md](RELEASE.md): Supabase → game server (Dockerfile, `npm start`) → web app (`netlify.toml` / `vercel.json`, hash routing so no rewrites) → Stripe (optional) → card images last (`npm run cards:optimize`, `npm run og`, deploy server then web). CI (`.github/workflows/ci.yml`) runs typecheck, both builds and the end-to-end suite on every push.

## Tests

```bash
npm run typecheck   # browser + server
npm run e2e         # needs `vite preview --port 4173` running for the UI part
```

`scripts/e2e.mjs` starts its own game server on port 8790 and checks: Escape closes modals in headless Chrome/Edge; forged `grantCoins`, `matchFinished`, `openPack`, `setPlus`, `chapterCleared` and `load` actions are rejected and leave the profile untouched; a real duel is matched, scored and recorded by the server with answers computed client-side from the question text only.

## Accounts and cloud saves (Supabase)

1. Create a project at https://supabase.com and run `supabase/schema.sql` in the SQL editor.
2. Authentication → Sign In / Providers: enable Email and, unless you connect a real mailer, turn **Confirm email** off. Add your site to Authentication → URL Configuration.
3. Put `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local`; give the server `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

Without the game server, signed-in players sync their profile JSON to `profiles.data` themselves (trusted-client). With the game server, the server is the only writer.

## Payments (Stripe) — scaffolded, not yet tested live

The client never grants purchases. `supabase/functions/checkout` creates a Stripe Checkout session; `supabase/functions/stripe-webhook` grants coins (`coin_grants`) or Plus (`plus_until`) with the service role. Set `VITE_CHECKOUT_URL` to the checkout function URL when deployed. The game server merges those server-owned columns into the profile on sign-in.
