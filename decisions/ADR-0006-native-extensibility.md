---
canonical: true
adr: 0006
status: proposed
date: 2026-06-04
deciders: ["Nino Chavez"]
scope_ceiling: "A — methodology-native only"
informs: 01-prescription.md
depends_on:
  - 00-charter.md
  - ../../blueprint-redesign/decisions/ADR-0002-reviewers-as-executable-plugins.md
references:
  - ../research/01-canonical-research.md
  - "vendor: https://eslint.org/docs/latest/extend/plugins"
  - "vendor: https://vite.dev/guide/api-plugin"
  - "vendor: https://backstage.io/docs/features/software-catalog/system-model"
  - "internal: tools/blueprint/template/tools/state-derive/index.ts (walkCatalog:48)"
---

# ADR-0006 — Native extensibility (org-authored reviewers/stages)

Status: **proposed** — grounded in Stage 1 canonical research; ratify on operator review.

## Context

"Scalable across departments" means a department adds its own reviewers/stages **without forking** the methodology — the difference between a methodology and a platform (Backstage's thesis). ADR-0002 ratified the `.mjs` reviewer contract and (Alt 3) reserved third-party reviewers to "the same paired-file convention, no SDK." Under ceiling A there is no hosted plugin registry.

## Decision

Org-authored reviewers are distributed and discovered git/npm-natively against the existing contract.

1. **The interface is ADR-0002's `review()`** — `({targetDir, blueprintYml, methodologyHome}) → {status, findings[], metadata}`. No SDK is invented; the signature **is** the SDK.
2. **Discovery** — two sources, convention-based: (a) local `.claude/agents/blueprint/reviewers/*.mjs` (skip `_`-prefix), (b) npm-keyword — installed `blueprint-reviewer-*` packages declaring `keywords: ['blueprint-reviewer']`. Lift `state-derive`'s `walkCatalog` + dynamic-`import` + duck-type loop near-verbatim; only the predicate changes (default export is a function returning a valid `ReviewResult`).
3. **Validation** — a load-time `validateReviewerModule` against a fixture (the deferred "SDK" reframed as a validator, not codegen).
4. **Distribution** — npm package OR git dep; `files: ['reviewers/']`; peerDep on `@nino-chavez/blueprint-cli` for version pinning. (`specchain/package.json` is the literal template.)
5. **Catalog** — a committed `reviewers.yml` (Backstage's owned-typed-entity idea, minus the host).
6. **Binding stays explicit** — discovery is automatic, but a reviewer declares its gate + variant explicitly; **canonical reviewers run before org reviewers**, and an org reviewer can only *tighten*, never relax, a canonical gate.
7. **Precedence** — when the same reviewer exists both as a local `.mjs` and an installed package, **local overrides the package**, and the loader emits a WARN finding flagging the shadow (discovery automatic, binding visible).

## Why not canonical (divergences)

- **Dir-convention + npm-keyword discovery, not ESLint/Vite's explicit central-array registration** — a central registration array recreates the manual-grep coordination the platform exists to remove and becomes a merge-conflict choke point at department scale. The naming convention + fixed-interface validation are kept; only central-array registration is dropped, with explicit per-reviewer gate/variant declaration so **binding stays explicit**.
- **No plugin SDK — a validator + a starter-template package instead** — ADR-0002 Alt 3 already rejected an SDK with zero external authors; revisit only after the first real external author exists.
- **Committed `reviewers.yml`, not Backstage's hosted ingest+UI** — ceiling A forbids a Blueprint-owned server; keep the catalog idea, drop the host.

## Consequences

- **Positive**: departments extend Blueprint without forking; org reviewers distribute through the same npm channel as everything else; the `state-derive` loader is reused near-verbatim (reuse beats rebuild).
- **Negative / design-debt for v1**: (a) auto-discovery removes the explicit-registration audit point — the canonical-before-org ordering + tighten-only rule is a **design** mitigation that must be built, not assumed; without it, auto-discovery is a department-scale footgun. (b) Org `.mjs` run with full Node privileges — the v1 trust model is "you trust whoever you `npm install`"; cross-department install should wait for npm provenance/signing (ADR-0007 security follow-up). ADR-0002 Alt 4 already rejected WASM sandboxing for v1.
- **Reuse**: `state-derive/index.ts:48` (the loader), ADR-0002 (the contract), `specchain/package.json` (the starter package shape).

## Follow-ups

- Build order step 11 — needs the canonical `.mjs` reviewer set (step 3) to have run in production first, so the contract is proven before org authors mirror it.
- Gate-binding ordering (canonical-before-org, tighten-only) is the load-bearing design item — specify it before encouraging cross-department authoring.
- Untrusted-code execution + provenance: tie to ADR-0007's supply-chain follow-up before cross-department install is encouraged.
