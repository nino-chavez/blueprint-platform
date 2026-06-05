# Deploy — durable portal hosting

> **Status: live (2026-06-05).** Wired to the **abelino.chavez** Cloudflare
> account (id `b6ffcf2…58d2`) — `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`
> are set as repo secrets, and `blueprint-platform.pages.dev` serves that
> account's `blueprint-platform` project. Pushes to the portal auto-deploy. The
> setup steps below are the record of how it was wired (and how to rotate creds).

The portal (`apps/portal`) deploys to Cloudflare Pages. The durable path is the
GitHub Action `.github/workflows/deploy-portal.yml`: every push to `main` that
touches the portal rebuilds and redeploys automatically — no manual `wrangler`
from a local session.

## One-time setup (operator)

Pick a **durable** Cloudflare account (not the hackathon one), then:

1. **Create an API token** — Cloudflare dashboard → My Profile → API Tokens →
   Create Token → permission **Account · Cloudflare Pages : Edit**. Copy it.
2. **Get the account ID** — Cloudflare dashboard → any domain/Workers&Pages → the
   Account ID in the right sidebar.
3. **Add both as repo secrets** — github.com/nino-chavez/blueprint-platform →
   Settings → Secrets and variables → Actions → New repository secret:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
4. **Trigger it** — Actions tab → "Deploy portal" → Run workflow (or push any
   portal change). The first run creates the `blueprint-platform` Pages project
   on that account and deploys it. Subsequent pushes auto-deploy.

Until the secrets exist the workflow runs **green and skips** the deploy (with a
notice) — it never red-X's the repo.

## What it does

`npm ci` at the repo root (resolves the `@blueprint/*` workspace packages) →
`npm run build -w apps/portal` (Astro static build, ~8 pages) → `wrangler pages
deploy apps/portal/dist`. Verified to build clean from a fresh checkout.

## Alternative — Cloudflare-native git integration (less to maintain)

Instead of the Action, connect the repo directly in the Cloudflare Pages
dashboard:

- Framework preset: none / Astro
- Build command: `npm run build -w apps/portal`
- Build output directory: `apps/portal/dist`
- Root directory: `/`

CF then builds on every push with zero workflow to maintain. Use **one** path
(Action or native git integration), not both.

## Moving off the hackathon account

The portal currently lives on a hackathon Cloudflare account (so the
`*.pages.dev` URL may not be permanent). Pointing the token/account above at a
durable account and running the deploy recreates `blueprint-platform` there; the
new URL is `blueprint-platform.pages.dev` on that account (or attach a custom
domain in the Pages project for a stable, account-independent URL).
