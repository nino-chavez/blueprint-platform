---
canonical: true
adr: 0004
status: proposed
date: 2026-06-04
deciders: ["Nino Chavez"]
scope_ceiling: "A — methodology-native only"
informs: 01-prescription.md
depends_on: 00-charter.md
references:
  - ../research/01-canonical-research.md
  - "vendor: https://docs.github.com/en/organizations/managing-peoples-access-to-your-organization-with-roles"
  - "vendor: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners"
  - "vendor: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets"
  - "vendor: https://rust-lang.github.io/rfcs/0002-rfc-process.html"
  - "internal: tools/blueprint/docs/amendment-classification-pattern.md"
---

# ADR-0004 — Native access control + governance

Status: **proposed** — grounded in Stage 1 canonical research; ratify on operator review.

## Context

Charter req #5 (access control across departments/org) is **absent** today — zero role/RBAC concept for Blueprint-the-tool. The UP half of req #4 (accept fixes from the field) has no review/approval boundary; promotion is one operator's unilateral judgment over a manual grep (charter risk #6). Under ceiling A there is **no Blueprint-owned server** — so access cannot be a hosted identity service.

## Decision

**Access = the git host's own identity and controls. Blueprint carries intent; the host enforces.**

1. **Roles** — `blueprint.yml` `access.roles` maps four roles (`admin` / `contributor` / `reviewer` / `stakeholder`) to git-host **team** names + GitHub built-in repo roles (admin / write / triage / read). Config is intent only; enforcement is 100% the host's.
2. **Promotion authority is mechanical** — `CODEOWNERS` scopes promotion-sensitive paths (`METHODOLOGY.md`, `docs/`, `template/`, `*AMENDMENTS*`) to the admins team. A change to the methodology requires an admin review, structurally.
3. **Merge gate** — a repository **ruleset** (committed JSON + an idempotent `gh api` apply-script), not classic branch protection.
4. **UP-governance** — **Rust-RFC-lite**: substantial changes (new reviewer, methodology shape) need an RFC; bug-fixes and consumer-local/template-trivial changes are plain PRs. Routing maps 1:1 onto the existing 4-bucket amendment taxonomy. A `CONTRIBUTING.md` + an amendment-RFC issue template encode it.
5. **ai-hive is explicitly NOT the access substrate** — its bearer-token model needs a running Worker (a server, out by ceiling A). Recorded here so a future session doesn't re-reach for it.

## Why not canonical (divergences)

- **Repository rulesets over classic branch protection** — rulesets are the canonical successor (layerable, readable by all developers, most-restrictive-wins); docs must tell admins to migrate **off** classic (the two layer = two sources of truth).
- **Rust-RFC-lite over KEP/PEP** — a single-maintainer methodology repo has no SIGs or editor corps; KEP/PEP ceremony would bottleneck the exact field contributions the UP-channel exists to accept. Rust's substantial→RFC / fix→PR split maps onto the 4-bucket taxonomy with zero new machinery.
- **GitHub-shaped apply-scripts; GitLab design-only for v1** — `blueprint.yml` role config is host-agnostic, but the ruleset/CODEOWNERS apply-scripts are GitHub-API-shaped. The repo is `github.com:nino-chavez/blueprint`; GitLab parity is a v1 scope cut, reversible.

## Consequences

- **Positive**: closes req #5 with zero new auth code; promotion authority becomes mechanical (CODEOWNERS), closing charter risk #6; the UP-channel gets a real review boundary.
- **Negative / known degrade**: CODEOWNERS-as-promotion-authority collapses to a self-approval no-op while the admins team is Nino-only — the model is correct but only *binds* when team membership > 1 (matches the charter's "ratified by first non-Nino consumer" gate). Documented, not a bug.
- **Reuse**: `ref/catalyst/.github/CODEOWNERS` (team-as-owner shape), `rally-hq/CONTRIBUTING.md` (structure), `amendment-classification-pattern.md` (the 4-bucket classifier = the RFC router).

## Follow-ups

- Build order step 9 — batch CODEOWNERS + ruleset JSON + `access.roles` schema + CONTRIBUTING + RFC template as **one wave under a freeze waiver** (they're `template/` edits).
- Step 10 — the triage Action consumes the issue template (ADR-0005 references the same Action for the UP feed).
- GitLab apply-script parity: revisit when the first GitLab consumer appears.
