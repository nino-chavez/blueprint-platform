---
canonical: true
stage: 2
status: draft
date: 2026-06-04
supersedes: none
scope_ceiling: "A — methodology-native only"
extends: ../../blueprint-redesign/decisions/01-prescription.md
informs:
  - "ADR-0003 cost/effort dial"
  - "ADR-0004 native access + governance"
  - "ADR-0005 bidirectional non-breaking update protocol"
  - "ADR-0006 native extensibility (org-authored reviewers)"
ratified_by: "pending — first non-Nino team consumer (per charter solo-degrade path)"
---

# Prescription — Blueprint platform v1 (methodology-native)

What v1 of the team-adoptable platform ships, what defers, what's out, and the order. Scope ceiling is **A — methodology-native only**: no hosted service; everything rides git-host + npm + CI. That constraint is an invariant for every item below.

Inherits `blueprint-redesign/decisions/01-prescription.md` (Wedge 1 distribution shape, Wedge 2 agent portability) and builds the productization superset on top. ADR-0001/0002 are inherited verbatim.

## Design invariant (ceiling A)

> No primitive requires a running Blueprint-owned server. Distribution = npm. Versioning = semver tags + CHANGELOG. Access = git-host identity + CODEOWNERS + branch rulesets + role config. Registry = a manifest file. Telemetry = local files + local sweep. Coordination (optional) = ai-hive, integrated not absorbed.

A primitive that cannot be built within this invariant is **deferred**, not smuggled in as "thin hosted." Reopening the ceiling is an explicit operator decision.

## What v1 ships — in build order

Built smallest-first; substrate before design slices (charter risk #2: don't verify new ADRs against vapor).

### 1. Semver baseline  *(foundation — nothing downstream is "non-breaking" without it)*
- `VERSION` + `CHANGELOG.md` on `tools/blueprint`; semver tags (the repo already uses conventional-commit prefixes — wire changelog generation to them).
- `methodology_version` in `blueprint.yml` consumed by the SessionStart hook → warn on mismatch vs methodology HEAD.
- Deprecation lifecycle: `deprecated → removed` with a documented window; migration note per breaking bump.

### 2. `BLUEPRINT_HOME` resolver  *(portability precondition)*
- One resolver replaces the 29 hardcoded `~/Workspace/dev` paths + the **stale** SessionStart hook default (points at pre-rename `wip/blueprint`).
- Resolution order: `$BLUEPRINT_HOME` → `blueprint.yml` field → npm-installed package path → error with remediation. No path assumes one operator's filesystem.

### 3. `@blueprint/cli` (thin)  *(the distribution surface ADR-0001 specified)*
- `init` — interactive scaffold; Pattern A **and** Pattern B stampers (Pattern B initial-stamp currently hard-fails at `stamp.mjs:708` — fix it). Strips project data; mechanical post-stamp grep.
- `review <reviewer> --target=<dir> [--json]` — runs the `.mjs`; exit code = status.
- `upgrade` — semver-aware pull; reads `methodology_version`, shows the changelog delta, applies migrations.
- `fleet` — reads the consumer manifest, reports each consumer's behind/ahead state (see #6).

### 4. `.mjs` reviewer pairs + CI  *(closes ADR-0002 / the "decided-but-not-built" gap)*
- Build the executable pairs against the `review({targetDir, blueprintYml, methodologyHome}) → {status, findings[], metadata}` contract, remediation injected. One first to prove it runs in a non-Claude shell, then the set.
- `.github/workflows/blueprint-review.yml` runs the CLI on PRs; findings as PR comments; blocking findings fail the check.

### 5. Cost / effort dial  *(requirement #3, "like Claude Code effort levels")*
- `execution.depth` → a **per-stage effort vector** + a `model_tier` field per stage (lift the Orchestrator/Specialist/Implementer/Janitor Opus-vs-Sonnet ladder from prose into config).
- **Skip-justification gates**: under-processing a stage is a recorded conscious choice, not a silent default (charter risk #3).
- Local `.blueprint/telemetry.jsonl` — per-stage timings, model tier, reviewer pass/fail. `blueprint cost` sweeps it. Anchors emerge from telemetry, never ship as defaults.

### 6. Consumer registry (manifest)  *(precondition for "operational updates to consumers")*
- `consumers.yml` in the methodology repo; a consumer opts in via PR adding `{repo, pattern, pinned methodology_version, owner}`.
- `blueprint fleet` diffs each pinned version against current → who's behind, who's on a deprecated version. Visibility layer; push remains consumers-pull.

### 7. Access + governance (git-host-native)  *(requirements #5 + the UP half of #4)*
- Roles in `blueprint.yml` (`admin` / `contributor` / `reviewer` / `stakeholder`) mapped to git-host teams + CODEOWNERS + branch rulesets. Enforcement is the git host's, not Blueprint's.
- `CONTRIBUTING.md` + an amendment RFC/issue template + the **deferred triage Action** built (CI classifies incoming amendments per the 4-bucket taxonomy). Promotion authority is explicit, not a manual grep.

### 8. Onboarding / enablement hub  *(requirement #6)*
- Reskin the blueprint-redesign Pattern B portal chrome from "our v1 gaps" → "start here."
- Diataxis: a vocabulary on-ramp (variant/tier/pattern BEFORE the decision trees), an **audience-routed index**, and an **end-to-end tutorial** (first initiative, stage-by-stage, against a sample repo). The interactive `init` IS the first onboarding step.
- Role-based paths: operator / contributor / reviewer / admin / stakeholder.

### 9. Native extensibility  *(requirement: scalable across departments)*
- Convention-discovered reviewer dir; org-authored `.mjs` reviewers distributed as npm packages or git deps, validated against the ADR-0002 contract. Extends, does not fork.

### 10. Conformance check  *(trust at scale — guards the false-green class)*
- `blueprint doctor` / health score that gates on **runtime/browser verification**, not curl-200 / existence checks (charter risk #5). A stamped deliverable a VP can trust.

## Defers to v2 (not built now, not smuggled in)

- Any hosted control plane (registry-as-service, telemetry collector, update feed, org RBAC server) — would require reopening the ceiling.
- Cross-org FinOps budgets/chargeback beyond the local `blueprint cost` sweep.
- A catalog UI beyond the docs index (Backstage software-catalog analog).
- Semantic compatibility engine (schema-aware "is this change compatible") — v1 ships semver + the generalized git-history revision delta; semantic compat is research-grade.

## Out of scope (ceiling A)

Multi-tenant SaaS, auth server, billing, SOC2, hosted multi-tenant isolation. Absorbing auth/persistence/billing is the named failure mode (`multi-operator-collab-pattern.md`).

## Forks resolved

| Fork | Resolution (under ceiling A) |
|---|---|
| **1. ai-hive integrate vs absorb** | Integrate as optional coordination companion. NOT the access substrate (A uses git-host identity). Absorb stays "Never." |
| **2. cost-dial granularity** | Per-stage effort vector + `model_tier` routing + local telemetry + skip-justification gates. Not 3 presets. |
| **3. bidirectional channel** | Semver + manifest contract. DOWN = publish + `upgrade`. UP = PR + triage Action. Semantic-compat engine deferred. |
| **+ identity** | Git-host users (GitHub/GitLab). No identity server. |
| **+ registry** | Manifest (`consumers.yml`) + `blueprint fleet`. No registry service. |

## Order rationale

Items 1–4 are the unbuilt v1 substrate (semver, paths, CLI, reviewers) — they must exist before 5–10 can be validated against anything real. 5–10 are the productization superset; each ships as a runnable artifact a non-Nino operator on a different machine can execute. Stage 4 Fact-Check verifies the bidirectional channel against a **real second consumer**, not by assertion (the wave-2 lesson).
