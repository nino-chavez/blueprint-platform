---
canonical: true
adr: 0005
status: proposed
date: 2026-06-04
deciders: ["Nino Chavez"]
scope_ceiling: "A — methodology-native only"
informs: 01-prescription.md
depends_on: 00-charter.md
references:
  - ../research/01-canonical-research.md
  - "vendor: https://docs.renovatebot.com/configuration-options/"
  - "vendor: https://github.com/changesets/changesets"
  - "internal: ~/Workspace/dev/tools/blueprint/template/tools/blueprint-init/stamp.mjs (classifyDivergenceCause:394)"
  - "internal: ~/Workspace/dev/tools/specchain/setup.sh (--upgrade)"
---

# ADR-0005 — Bidirectional non-breaking update protocol

Status: **proposed** — grounded in Stage 1 canonical research; ratify on operator review.

## Context

Charter req #4 (push non-breaking changes DOWN, accept fixes UP) exists today only as hand-driven half-channels: DOWN = `restamp-chrome` over ~9 files via a hand-pasted migration doc (byte-identity, not semantic); UP = an append-only `METHODOLOGY-AMENDMENTS.md` + manual cross-repo grep. There is **no version primitive at all** (tags dogfood-only, no CHANGELOG), and wave-2 proved the one-way restamp model **unsafe** for brownfield consumers. Under ceiling A, no hosted feed/registry service is allowed.

## Decision

A versioned, pull-based bidirectional channel built on committed files + CI — no server.

1. **Consumer registry** — `consumers.yml` committed in the methodology repo: `{repo, pattern, pinned methodology_version, owner}`. Consumers opt in by **PR** (Terraform git-ref pinning + Renovate committed-manifest, fused).
2. **DOWN** — `blueprint fleet` reads `consumers.yml`, diffs each pinned `methodology_version` against the current tag → behind / ahead / on-deprecated report. `blueprint upgrade` is the consumer-side pull: semver-aware, shows the **CHANGELOG delta** (Changesets, ADR-0007) between pin and target, applies migrations. Push stays consumers-pull (accepted tradeoff; "org push stays manual").
3. **Drift computation generalizes `stamp.mjs`** — lift `classifyDivergenceCause`'s `git log`/`git show` history-walk from **file-granularity** (LAG vs CUSTOMIZATION-OR-ROT) to **version-granularity** (a pin is "N tags behind"). `fleet` computes drift from `consumers.yml` + the methodology repo's **own** tag history **alone** — it must NOT clone each consumer (that re-imports the single-machine filesystem-access assumption the charter flags).
4. **UP** — field findings flow via PR + the triage GitHub Action (ADR-0004's 4-bucket classifier on the `owner-spec-lint` CI skeleton). The amendments convention becomes a queryable PR channel, not a manual grep.
5. **Non-breaking contract** — semver + the per-version revision delta express compatibility; a consumer can pin a minor range to receive non-breaking only. A full **semantic-compatibility engine** (schema-aware "is this change compatible") is **deferred** — research-grade scope.

## Why not canonical (divergences)

- **Committed manifest + pull, not a hosted registry/feed** — ceiling A forbids a Blueprint-owned server; Renovate's committed-config-as-manifest + Terraform's git-ref pin deliver fleet visibility without one.
- **Generalized git-history classifier, not a semantic-compat engine for v1** — semver + the revision delta closes the "non-breaking" ask at ~80% for a fraction of the cost; the compatibility engine is deferred, not built.

## Consequences

- **Positive**: closes req #4's structural precondition (a registry — the thing you push to); both directions become standing git/CI pipes, not hand-pasted prompts; semver makes "non-breaking" definable.
- **Negative / reconciliation needed**: **deprecation-clock vs methodology-freeze** — a MAJOR that removes a deprecated primitive can collide with a consumer-migration freeze. **Rule**: the deprecation EOL **slips to the next post-freeze MAJOR**; removal never forces a freeze-waiver during a migration. The deprecation clock yields to the freeze cadence.
- **Reuse**: `stamp.mjs:394` (the classifier to generalize), `specchain/setup.sh --upgrade` (the upgrade shape), Changesets CHANGELOG (the `upgrade` delta source, ADR-0007).

## Follow-ups

- Build order steps 7 (`consumers.yml` + `fleet`) → 8 (`upgrade`). Both depend on the semver baseline (step 1, ADR-0007).
- Fact-Check (Stage 4) verifies a "non-breaking" update against a **real second consumer** by applying it, not asserting it (the wave-2 lesson).
- v2: the semantic-compatibility engine, once a real breaking-change incident motivates it.
