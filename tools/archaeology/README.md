---
canonical: true
---

# Archaeology substrate — template

Append-only event log across all six project history streams, with explicit refs that join them. Answers archaeological questions — "what did we know on date T, why did we pick X, who decided Z" — without a new tool per question.

**Pattern doc:** [`docs/archaeology-substrate-pattern.md`](../../../docs/archaeology-substrate-pattern.md) — design + decision boundaries
**Reference implementation:** [`bc-subscriptions/tools/archaeology/`](https://github.com/nino-chavez/bc-subscriptions/tree/dev/tools/archaeology) — the proving ground (Phase 6 passed 2026-05-22)

## What this directory provides

This is a **scaffolded template** — copy into your project, run `scaffold-archaeology.sh`, and you have a working archaeology substrate.

```
tools/archaeology/
├── worker/                # CF Worker — POST /events, /embed; GET /timeline, /derive, /derive/stream, /embed/stats, /admin/derive-stats, /health
│   ├── src/index.ts
│   ├── schema/0001-events.sql
│   ├── schema/0002-embed-state.sql
│   ├── wrangler.toml      # {{PROJECT_SLUG}} placeholder, filled by scaffold
│   ├── package.json
│   └── tsconfig.json
├── embed_drive.py         # Driver: loops POST /embed until queue drained
├── scaffold.sh            # One-shot provisioning + first deploy
├── web/                   # Interrogation surface (chat island)
│   ├── ArchaeologyChat.tsx  # Drop-in React island; mount in your portal layout
│   └── README.md           # Integration recipes (Astro / Next / vanilla React)
└── ingesters/             # One per source stream
    ├── _common.py         # Shared Event/Ref dataclasses + batched POST
    ├── sessions.py        # FULL — Claude Code JSONLs (SessionEnd hook for tail)
    ├── inputs.py          # FULL — docs/inputs/_manifest.yaml provenance entries
    ├── iterations.py      # FULL — docs/iterations/_history.md (ADR lineage + IPs)
    ├── audits.py          # FULL — docs/audits/*.md (categorized by filename heuristic)
    ├── adr.py             # SKELETON — docs/decisions/*.md (contract finalized)
    ├── github.py          # SKELETON — issues/PRs/comments/reviews
    ├── hive.py            # SKELETON — proposals/synthesis/decisions/tasks
    ├── git.py             # SKELETON — commits/branches/merges
    └── memory.py          # SKELETON — auto-memory entries
```

## Quick start

```bash
# From the consuming project's root, after blueprint scaffold drops this in:
cd tools/archaeology

# 1. Provision + deploy (one-time)
bash scaffold.sh

# 2. Backfill curated sources
export ARCHAEOLOGY_INGEST_TOKEN=$(cat ~/.config/archaeology/ingest-token)
python3 ingesters/sessions.py    backfill
python3 ingesters/inputs.py      backfill
python3 ingesters/iterations.py  backfill
python3 ingesters/audits.py      backfill

# 3. Embed for /derive semantic retrieval
python3 embed_drive.py --batch 25 --daily-limit 9500

# 4. Query
curl "https://${PROJECT_SLUG}-archaeology.${CF_WORKERS_SUBDOMAIN}.workers.dev/derive?question=..."

# 5. (Optional) Mount the chat surface in your portal — see web/README.md
cp web/ArchaeologyChat.tsx <your-portal>/src/components/
# Then mount as a global island:
#   <ArchaeologyChat client:idle pageContext={currentPath} />
```

## Cost monitoring

Once `/derive/stream` is in use, hit `GET /admin/derive-stats` (token-gated; reuses `ARCHAEOLOGY_INGEST_TOKEN`) to inspect what visitors are asking and how much budget is being consumed. Returns JSON with:

- Daily call counts over the last N days (default 30)
- Top-N questions by frequency (default 10)
- Top-N IP-hashes by call count (privacy-preserving — `sha256(ip)[:16]`)
- Synthesis vs retrieval-only breakdown
- Retrieval depth + duration stats (avg/min/max)
- Page-context popularity (which portal pages drive the most questions)
- Today's headroom against the daily cap

Example:

```bash
curl -H "X-Archaeology-Token: $(cat ~/.config/archaeology/ingest-token)" \
  "https://${PROJECT_SLUG}-archaeology.${CF_WORKERS_SUBDOMAIN}.workers.dev/admin/derive-stats?days=14&top=10" \
  | jq
```

Query params: `?days=<1-90>` (default 30), `?top=<1-50>` (default 10). Use this to surface drift in what visitors care about, spot questions that keep recurring (candidate for a FAQ surface), and watch for IP fan-out that signals abuse.

## Interrogation surface (chat)

`web/ArchaeologyChat.tsx` is a drop-in React island that streams answers from the Worker's `/derive/stream` SSE endpoint, with inline `[E:event_id]` citation chips that open a secondary drawer showing the underlying event. Mount it as a global island in your portal layout — every page gets the "ask the substrate" surface contextually scoped to its own path. Integration recipes for Astro / Next / vanilla React are in [`web/README.md`](web/README.md).

The chat surface is **optional**. The substrate itself is fully functional via the JSON `/derive` and `/timeline` endpoints; the chat is a UI affordance on top.

## Freshness (tail mode)

Backfill gets the initial state in. Tail mode keeps it current. Wires that ship with this template:

- **Sessions** — `~/.claude/hooks/archaeology-session-end.py` on Claude Code `SessionEnd`. Project-scoped by cwd.
- **Track 1–3 docs** — `.github/workflows/archaeology-tail-docs.yml` on push touching `docs/inputs/`, `docs/iterations/`, `docs/audits/`.

Remaining tail wires per source are documented in the skeleton ingesters; each is incremental work that doesn't change the substrate API.

## Synthesis (Anthropic API)

`/derive` is **retrieval-only** by default. Set `ANTHROPIC_API_KEY` via `wrangler secret put ANTHROPIC_API_KEY` to enable full synthesis with inline `[E:event_id]` citations. The model defaults to `claude-sonnet-4-6`; override with `ANTHROPIC_MODEL`.

## Known issues / gotchas

Captured from the bc-subscriptions production hydration:

1. **CF token Vectorize scope is not implied by D1/R2 scope.** Tokens minted for "edit D1/R2/Workers" do *not* include Vectorize. Mint with Account / Vectorize / Edit explicitly or you'll hit error code 10000 on `vectorize create`.
2. **Cloudflare bot protection (code 1010) rejects default `urllib` User-Agent.** Python ingesters must set `User-Agent: <name>/<version>`; the template's `_common.py` already does this.
3. **Workers AI free tier is 10K requests/day.** The embed driver's `--daily-limit` flag exists to stop before crossing into paid territory; default 9500.
4. **Initial backfill is the only meaningful embedding cost.** ~17K chunks per project = 2 days at free tier or ~$0.50 paid; ongoing tail is well within free tier.
5. **Two-phase install is mandatory.** Backfill first, tail wires second. Tail without backfill produces a permanent gap from project-start to tail-wiring date.
