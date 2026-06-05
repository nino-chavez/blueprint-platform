# blueprint-platform

**Repo role: I am a Blueprint consumer initiative — the productization pass.** I apply the Blueprint methodology to itself to turn it into a team-adoptable, portable platform. The methodology SOURCE lives at `tools/blueprint/` (that repo is canonical; it must stay the source — no `blueprint.yml`/`research/`/`decisions/` there). This file is a map, not a manual.

This initiative **extends** `wip/blueprint-redesign/`, which ratified the v1-solo architecture (ADR-0001 dual-protocol distribution, ADR-0002 reviewers-as-executable-plugins) and explicitly deferred the four productization requirements this initiative now builds. Those ADRs are **inherited verbatim — do not re-decide them.** See `decisions/00-charter.md`.

## Repo shape — standalone repo (why not the orphan-worktree pattern)

`blueprint-redesign` lives as an orphan-branch worktree of the methodology repo (`dogfood/self-redesign`), influencing `main` only via `METHODOLOGY-AMENDMENTS.md → wave commits`. This initiative instead is a **standalone git repo** under `wip/`. Why diverge from that canonical pattern:

- This initiative's entire thesis is **breaking single-repo / single-machine coupling**. Its planning repo should not re-couple to the methodology repo's git the way the orphan-worktree does (29 template files + the SessionStart hook already hardcode one operator's paths — see the recon).
- Promotion of platform decisions INTO the methodology source is a deliberate, **waiver-gated** act anyway (methodology-freeze rule). An explicit cross-repo PR is more honest than an orphan branch that "must never merge."
- `blueprint-redesign` is at rest (`cc4f62f`); starting a fresh, decoupled line keeps its closed v1 history intact.

Reversible. If the operator prefers the orphan-worktree family pattern, re-init is cheap before history accumulates.

## Variant + tier + pattern (declared in `blueprint.yml`)

- **Variant**: `brownfield` — the methodology is live (6 consumers, deployed portal); audit-first, preserve-what-works.
- **Tier**: 2 — ships real new product surfaces (CLI, executable reviewers, versioned update channel, onboarding hub), not just a portal.
- **Portal pattern**: B — onboarding/enablement hub, reskinned from the blueprint-redesign Pattern B chrome.

## Canonical context (load these first — from the SOURCE repo, not stale `wip/blueprint`)

The methodology was renamed/moved to `tools/blueprint`; blueprint-redesign's docs and the SessionStart hook still point at the **stale** `wip/blueprint/` path. Use these:

1. `tools/blueprint/METHODOLOGY.md`
2. `tools/blueprint/docs/variant-selection.md`
3. `tools/blueprint/docs/portal-and-tier-ladder.md`

## Companion: ai-hive — integrate, do NOT absorb

`wip/ai-hive/` is the multi-operator coordination kit (Worker + D1 + bearer-token auth + origin-allowlist + ~20 MCP coordination tools). The prescription's standing decision is **"companion stays separate / Never absorb."** Blueprint owns methodology; ai-hive owns identity, coordination, persistence. The platform's access-control and multi-operator design build ON ai-hive's substrate — they do not rebuild auth/persistence inside Blueprint (that is the named SaaS-scope-creep failure mode). See `decisions/00-charter.md § Fork 1`.

## Methodology freeze + promotion path (load-bearing)

While this initiative is in flight, **no edits to `tools/blueprint/template/` without an explicit operator waiver.** The methodology repo and consumer migrations advance sequentially. When platform work needs to land in the source (promote an ADR, ship the `.mjs` reviewers, add semver), pause, get the waiver, land it as a cross-repo PR / wave on `tools/blueprint`, then resume. Reason: the 2026-05-25 four-way root-doc drift came from exactly this parallel evolution. See `tools/blueprint/template/CLAUDE.md § Methodology freeze during consumer migration` and `tools/blueprint/CLAUDE.md`.

## Stages (brownfield pipeline)

Per `docs/variant-selection.md § Brownfield` and the charter's stage sequence:

1. **Research** — extend blueprint-redesign's 9-gap inventory with the 4 uncovered + architect-surfaced requirements; classify build-vs-design; cite field evidence.
2. **Design Principles (constraints)** — resolve the boundary forks (scope ceiling, ai-hive integrate, trust model, cost-dial granularity, config inheritance). The stage `bc-subscriptions` skipped and paid for.
3. **Prototype** — runnable slices of the 4 net-new surfaces, smallest-first (semver baseline → thin CLI + one real `.mjs` reviewer → cost-dial schema → access-control identity spike) + onboarding-hub reskin.
4. **Fact-Check** — verify against a REAL second consumer; guard the false-green class (curl-200 passing while broken).
5. **Documents** — the 4+ net-new ADRs (promotable upstream) + audience-routed docs index + day-1/week-1 ramp + end-to-end tutorial.
6. **Deploy** — onboarding hub live, CLI published with a real semver tag, review + amendment-triage Actions live, upstream promotion under waiver.
7. **Iterate** — harvest field amendments through the automated channel; tune the cost dial against telemetry.

## Operating note

Single linear session in this standalone repo: no worktree required (the worktree rule applies to parallel sessions against the *same* repo). If a second session opens here, it must take a worktree.
