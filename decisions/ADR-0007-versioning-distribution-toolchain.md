---
canonical: true
adr: 0007
status: proposed
date: 2026-06-04
deciders: ["Nino Chavez"]
scope_ceiling: "A — methodology-native only"
informs: 01-prescription.md
depends_on:
  - 00-charter.md
  - ../../blueprint-redesign/decisions/ADR-0001-dual-protocol-distribution.md
references:
  - ../research/01-canonical-research.md
  - "vendor: https://docs.npmjs.com/cli/v10/configuring-npm/package-json"
  - "vendor: https://github.com/changesets/changesets"
  - "vendor: https://nodejs.org/api/deprecations.html"
  - "internal: ~/Workspace/dev/tools/specchain/package.json (create-specchain)"
---

# ADR-0007 — Versioning + distribution toolchain (operationalizes ADR-0001)

Status: **proposed** — grounded in Stage 1 canonical research; ratify on operator review.

## Context

ADR-0001 accepted the dual-protocol distribution shape but left the toolchain unbuilt: no root `package.json`, no `CHANGELOG`, no `VERSION`, only dogfood-only tags. Nothing downstream (the bidirectional channel, ADR-0005; the cost dial telemetry; the consumer pins) can be "non-breaking" without a version primitive. This ADR ratifies the concrete toolchain.

## Decision

1. **Package** — `@nino-chavez/blueprint-cli` (claimable now; `blueprint` and `blueprint-cli` unscoped are taken; `@blueprint/cli` is aspirational pending registering the `@blueprint` npm org). `bin: { blueprint: './bin/blueprint.mjs' }` (node shebang) — **the command is `blueprint` regardless of package name**. `files` allowlist = `bin/` + `template/` + `docs/` + `METHODOLOGY.md` + `CHANGELOG.md` (specchain's discipline — `research/`/`decisions/` never publish). `npx @nino-chavez/blueprint-cli init` is the zero-install entry.
2. **CLI framework** — hand-rolled ESM dispatcher reusing `stamp.mjs`'s `parseArgs`. No commander for v1 (thin surface: init / review / upgrade / fleet / cost / doctor). commander is the **named** escalation if the subcommand surface explodes (`forge-signal` is the internal precedent).
3. **Versioning** — **Changesets**: contributors write intent as `.changeset/*.md`; `changeset version` → `VERSION` + `CHANGELOG.md` + tag; `changeset publish` → npm, in GitHub Actions. Conventional-commit prefixes are **kept** (they coexist; changesets become the changelog source of truth).
4. **Deprecation** — Node's staged model mapped onto methodology primitives: **doc-only → warn → removed-on-MAJOR**, with a `BP-DEPR-NNN` code register in the CHANGELOG/docs. The SessionStart hook + a `.mjs` reviewer emit the warn when a deprecated key/stage/reviewer is used. `npm deprecate` is retained for the whole-CLI-version layer. Window: warn ≥1 minor before removal; removal only on MAJOR (and yields to the methodology-freeze cadence per ADR-0005).
5. **`methodology_version`** in `blueprint.yml` is consumed by the SessionStart hook → warn on mismatch vs methodology HEAD/latest tag.

## Why not canonical (divergences)

- **Changesets over semantic-release** — a methodology CHANGELOG entry for a breaking bump **is** a stakeholder-facing migration guide (prescription item 1); semantic-release's commit-parsed notes are the documented lossy/can't-capture-nuance failure, and Changesets' review-PR is exactly where the hand-authored migration note lands. (semantic-release stays the fallback if the operator ever wants zero human-in-loop, at the cost of migration-note quality.)
- **Hand-rolled ESM dispatcher over commander/oclif** — `stamp.mjs` already hand-rolls `parseArgs`; the v1 surface is thin; commander is dependency weight the "thin CLI" prescription resists. Named escalation, not silently skipped.
- **Node staged deprecation over npm-deprecate-alone** — npm-deprecate covers only whole package-version lines; it can't signal deprecation of an internal methodology primitive (a config key, a stage, a reviewer).

## Consequences

- **Positive**: gives the platform its missing version primitive — the foundation ADR-0005's "non-breaking" and the consumer pins require; a claimable package name unblocks publish CI now.
- **Negative**: Changesets is monorepo-oriented; on a single-package repo the `.changeset` workflow is lightly-trodden (supported) and asks the operator to write a changeset markdown per change — the payoff is the migration-note quality. Scoped package (`@nino-chavez/...`) is less clean than `@blueprint/cli`; revisit if the `@blueprint` org is registered.
- **Reuse**: `specchain/package.json` (the literal publishable-scaffolder template + files discipline), `stamp.mjs` `parseArgs` (the dispatcher core).

## Follow-ups

- Build order steps 0–2 (BLUEPRINT_HOME → semver baseline → package.json + dispatcher). Land in `tools/blueprint` under a freeze waiver (root `package.json`/CI are source edits).
- Verify/register the `@blueprint` npm org if the cleaner scope is wanted; otherwise ship `@nino-chavez/blueprint-cli`.
- **Supply-chain security** (charter [MED-HIGH], deferred here): npm provenance/signing + dependency policy + gitleaks baseline — required before cross-department org-reviewer install is encouraged (ADR-0006 negative consequence).
