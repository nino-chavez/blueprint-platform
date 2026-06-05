---
tool: archaeology
last_attested: 2026-05-23
max_unattested_days: 60
couples_with:
  - docs/methodology/archaeology-substrate-pattern.md
  - docs/runbooks/archaeology-hydration.md
  - .github/workflows/archaeology-reindex.yml
convention_version: 1
---

# Owner-spec: archaeology (template)

> **Template OWNER-SPEC.** When a project is scaffolded from blueprint and enables `archaeology.enabled: true`, this OWNER-SPEC is the starting point. Bump `last_attested:` to scaffold-date; customize the project-specific sections (event counts, deployed Worker URL, ingester list) on first hydration.

## Purpose

Append-only event log across project history streams (commits, PRs, issues, ADRs, sessions, doc corpora) with explicit `refs` joining them. Cloudflare Worker + D1 backing store. Powers the chat island — the surface stakeholders use to interrogate the project via natural language.

## Why this shape

### Alternatives considered + rejected

| Approach | Why rejected |
|---|---|
| **Per-question SQL/grep scripts** | One-off tools sprawl; impossible to answer cross-stream questions |
| **Pure embeddings without structured refs** | RAG without join keys can't answer "show me everything that references PR #N" — vector search alone is fuzzy |
| **In-repo SQLite** | Doesn't scale to chat island request volume; doesn't enable real-time append |
| **External RAG service** | Cost + vendor lock + latency |

### Design constraints

1. **Append-only** — events never mutate. Corrections are new events with `corrects: [event_id]` ref.
2. **Structured + unstructured** — every event has typed fields (kind, refs, payload) AND vector embedding.
3. **Ingest at the boundary** — sessions ingest via SessionEnd hook; CI ingests via workflow; merges trigger reindex.

## Inputs / outputs

### Ingest endpoints (Worker)
- `POST /events` — accept event batches
- `POST /embed` — compute/persist embeddings (sweeper)

### Query endpoints
- `GET /timeline` — chronological event stream
- `GET /derive?question=...` — RAG-style answer
- `GET /embed/stats` — ingest health
- `GET /health` — liveness

### Ingesters (per stream)
Mirror the pattern: `commits.py`, `prs.py`, `issues.py` (or `hive.py`), `adrs.py`, `sessions.py`, plus one per `docs/<category>/` corpus.

## Failure modes seen

(Populate on first incident. Reference pattern: bc-subscriptions saw the silent-failure mode where `docs/strategy/` shipped without an ingester — chat island returned nothing when interrogated. Codified the wire-up rule afterward.)

## Coupling

- `docs/methodology/archaeology-substrate-pattern.md` — design doc
- `docs/runbooks/archaeology-hydration.md` — operator runbook
- `apps/portal/` (or equivalent) — chat island consumer
- `.github/workflows/archaeology-reindex.yml` — ingest on push
- Harness hook for SessionEnd if operator wants session ingest

## Maintainer playbook

### Add a new `docs/<category>/` corpus

**The two-artifacts rule (codified after bc-subscriptions' silent-failure incident):**
1. Ingester at `tools/archaeology/ingesters/<category>.py` emitting `<category>_doc` events
2. Path filter + ingest step in `.github/workflows/archaeology-reindex.yml`

Both MUST land in the same PR. Otherwise the docs render in the portal but the chat island returns nothing — silent failure.

### Schema migration on the Worker D1

1. Add `worker/schema/000N-<name>.sql`
2. Test with `wrangler d1 migrations apply --local`
3. Deploy via wrangler against production binding
4. Backfill if needed; NEVER mutate existing event rows (append-only is the contract)

### Re-attest schedule

`max_unattested_days: 60` — load-bearing substrate; tight cadence.

## Danger zones

- **Worker code in `worker/src/`** — production endpoint; bad deploy breaks the chat island
- **Schema migrations** — D1 doesn't support all SQL; test locally first
- **Refs format drift** — if ingesters emit inconsistent ref shapes, queries break silently
- **PII / secrets in payloads** — append-only means removal requires manual D1 admin op

## Known limits

1. **Embedding model lock-in** — current model encoded in Worker; switching requires re-embedding the corpus
2. **No cross-project federation** — each project has its own substrate; cross-project queries not yet supported
3. **Session ingest is operator-machine-bound** — SessionEnd hook runs only on operator's local machine
4. **No deletion mechanism** — append-only; sanitize at ingester boundary

## Layer-B skill

A skill-mediated expert at `~/.claude/skills/archaeology-expert/SKILL.md` (operator-machine) carries the load-bearing append-only + ingest-wire-up reminders. Don't define the skill before this OWNER-SPEC is validated against real questions on the project.
