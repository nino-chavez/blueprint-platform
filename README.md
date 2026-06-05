# blueprint-platform

Blueprint applied to itself — the **productization pass.** Turns the Blueprint methodology from a single-operator workflow into a team-adoptable, portable platform.

**Methodology source** (canonical, do not edit without waiver): `tools/blueprint/`
**Extends:** `wip/blueprint-redesign/` (v1-solo foundation: ADR-0001/0002, inherited verbatim)

## What it builds

The operator's six requirements + architect-surfaced additions, grouped into six tracks:

| Track | Operator-named | Architect-surfaced [+] |
|---|---|---|
| A. Distribution & Versioning | portable, bidirectional updates | consumer registry/fleet, semver + deprecation, contract tests |
| B. Configurability & Cost | configurable cost dial | telemetry/observability, FinOps budgets |
| C. Access & Governance | access control | promotion governance, security/supply-chain, licensing, identity |
| D. Extensibility | — | plugin model (org-authored reviewers/stages), catalog |
| E. Adoption & Enablement | documented, onboarding ramp | role-based paths, support/escalation, conformance certification |
| F. Team / Multi-operator | team-adoptable | ai-hive integration (integrate, not absorb) |

## Status

**Stage 0 — charter drafted; one decision gates Stage 2.** Variant: brownfield. Tier: 2. Pattern: B.

Read in order:
1. `decisions/00-charter.md` — requirements, gap scorecard, expansion, the open scope-ceiling decision, defaults, risks
2. `research/00-recon-synthesis.md` — the 6-agent recon evidence base
3. `CLAUDE.md` — repo charter, methodology-freeze + promotion path, stage sequence

**Blocking decision:** the scope ceiling (methodology-native / native-core-+-thin-control-plane / full SaaS). See charter § Open decision.
