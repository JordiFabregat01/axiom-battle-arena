# Deploying Axiom Arena, step by step

One fixed path, no choices to make:

| Piece | Where | Why |
| --- | --- | --- |
| Code | **GitHub** | Both hosts below deploy straight from it; every `git push` redeploys. |
| Game server | **Railway** | Reads the `Dockerfile` in the repo, gives you an `https://…up.railway.app` address with TLS, so WebSockets work as `wss://`. About $5/month. |
| Web app | **Netlify** | Free static hosting, reads `netlify.toml` from the repo. |
| Accounts + database | **Supabase** | Already set up (project `ozqfhpwiaqejqdokpjja`). |

Total time: about 30 minutes. Do the steps in order; each one uses something from the one before.

---

## Step 1 — Put the code on GitHub (5 min)

1. Go to https://github.com/new (sign in or create a free account).
2. Repository name: `axiom-arena`. Leave everything else as it is (Private is fine). Click **Create repository**.
3. In a terminal in this folder, run these two commands (replace `YOUR-GITHUB-USERNAME`):

```bash
git remote add origin https://github.com/YOUR-GITHUB-USERNAME/axiom-arena.git
```

```bash
git push -u origin main
```

GitHub may open a browser window to sign you in the first time. When the push finishes, reload the GitHub page: you should see the files.

---

## Step 2 — Deploy the game server on Railway (10 min)

1. Go to https://railway.app and sign in **with GitHub**.
2. Click **New Project** → **Deploy from GitHub repo** → choose `axiom-arena`. (If it asks to "Configure GitHub App", allow access to that repository.)
3. Railway starts building using the `Dockerfile`. Wait for the build to finish (2–3 minutes; the log ends with `listening on ws://0.0.0.0:8787`).
4. Click the service box, open the **Variables** tab, click **Raw Editor**, paste exactly this and replace the two keys with the ones from Supabase → Project Settings → API (**service_role**, not anon):

```
NODE_ENV=production
PORT=8787
SUPABASE_URL=https://ozqfhpwiaqejqdokpjja.supabase.co
SUPABASE_SERVICE_ROLE_KEY=PASTE-THE-SERVICE-ROLE-KEY
ALLOW_GUESTS=1
BOT_AFTER_MS=5000
```

   Click **Update variables**. Railway redeploys automatically.
5. Open the **Settings** tab → **Networking** → **Generate Domain**. When it asks for a port, type `8787`. You get an address like `axiom-arena-production-1a2b.up.railway.app`. **Write it down; call it SERVER-DOMAIN.**
6. Check it: open `https://SERVER-DOMAIN/healthz` in a browser. You must see `{"ok":true,"store":"supabase",…}`. If `store` says `memory`, the Supabase variables are wrong.

(`ALLOWED_ORIGINS` is added in step 4, once the website address exists.)

---

## Step 3 — Deploy the website on Netlify (10 min)

1. Go to https://app.netlify.com and sign in **with GitHub**.
2. Click **Add new site** → **Import an existing project** → **GitHub** → choose `axiom-arena`.
3. Build settings are read from `netlify.toml`; leave them. Before clicking Deploy, open **Add environment variables** (or **Site configuration → Environment variables** afterwards) and add these three, replacing SERVER-DOMAIN from step 2:

```
VITE_ARENA_WS_URL=wss://SERVER-DOMAIN
VITE_SUPABASE_URL=https://ozqfhpwiaqejqdokpjja.supabase.co
VITE_SUPABASE_ANON_KEY=PASTE-THE-ANON-KEY
```

   (`wss://`, not `ws://`, and no slash at the end.) The anon key is in Supabase → Project Settings → API → **anon public**.
4. Click **Deploy**. The build takes about 2 minutes.
5. Netlify gives the site a random name like `sparkly-otter-123456.netlify.app`. Change it: **Site configuration** → **Site details** → **Change site name** → `axiom-arena` (or anything free). **Write down the final address `https://….netlify.app`; call it SITE-URL.**

---

## Step 4 — Connect the pieces (5 min)

1. **Railway** → your service → **Variables** → add:

```
ALLOWED_ORIGINS=SITE-URL
```

   (the full `https://….netlify.app` address, no slash at the end). Railway redeploys.
2. **Supabase** → **Authentication** → **URL Configuration**:
   - **Site URL**: SITE-URL
   - **Redirect URLs**: add SITE-URL (keep `http://localhost:5173` too if you still develop locally). Save.
3. **Supabase** → **SQL Editor** → **New query** → paste the contents of `supabase/migrations/20260909100000_server_only.sql` → **Run**. This stops browsers from writing profiles directly; from now on only the game server can.

---

## Step 5 — Check it (2 min)

Run this from the project folder, with your two addresses:

```bash
npm run check:deploy -- https://SITE-URL https://SERVER-DOMAIN
```

It confirms the site is up, that it was built with the right server address and Supabase project, and that the server answers with the Supabase store. Then open SITE-URL in a browser:

- the dot in the top-right corner is green,
- **Sign in → New here? Create an account** works with your email,
- a casual duel finds an opponent within about 5 seconds and ends with a result,
- the ladder shows real players.

**You are live.** Share SITE-URL.

---

## Later, whenever you want

- **Your own domain** (e.g. `axiomarena.com`): buy it anywhere, then Netlify → **Domain management** → **Add a domain**; follow its DNS instructions. Afterwards update `ALLOWED_ORIGINS` on Railway and the Supabase Site URL to the new address.
- **Email confirmation**: Supabase → Authentication → Providers → Email → turn **Confirm email** off if students should sign in without checking their inbox.
- **Payments**: Stripe products → deploy `supabase/functions/checkout` and `supabase/functions/stripe-webhook` → set `VITE_CHECKOUT_URL` on Netlify. Until then the shop shows "Coming soon".
- **Google sign-in**: not wired in; add later if wanted.
- **Legal pages**: `src/pages/Legal.tsx` still has two placeholders to fill: the Supabase hosting region (Supabase → Project Settings → General) and "Railway" as the hosting provider. Have the privacy policy checked; the game is used by children.
- **New cards or a new season**: add art to `public/cards`, run `npm run cards:optimize`, commit, push. GitHub redeploys both Railway and Netlify. Deploy order is automatic, but the server must finish before players see new cards in packs.
- **Supabase free tier** pauses the project after a week without traffic; upgrade to the Pro plan before promoting the game.

## If something is wrong

| Symptom | Fix |
| --- | --- |
| Top-right dot stays red, "Connecting to the arena server" | `VITE_ARENA_WS_URL` on Netlify is wrong (must be `wss://SERVER-DOMAIN`), or the Railway service is down (check `/healthz`). Redeploy the Netlify site after changing variables. |
| "Origin not allowed" | `ALLOWED_ORIGINS` on Railway doesn't match SITE-URL exactly. |
| `/healthz` says `"store":"memory"` | Supabase variables missing on Railway. |
| Sign-in says "Invalid path" | `VITE_SUPABASE_URL` must be exactly `https://ozqfhpwiaqejqdokpjja.supabase.co`. |
| Sign-in email link goes to localhost | Supabase Site URL still points at localhost (step 4.2). |
