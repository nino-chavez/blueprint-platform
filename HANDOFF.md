# HANDOFF — blueprint-platform

**Date:** 2026-06-04
**State:** Stages 0–2 done + ADRs drafted. Project committed (`2c31137`). Scope ceiling A resolved. Stage 1 canonical research complete (`research/01`). ADR-0003..0007 drafted (status: proposed, grounded). Prescription carries the research-refined 14-step build order. Next: Stage 3 build.

## What landed
- Project scaffolded at `~/Workspace/dev/wip/blueprint-platform/` (standalone repo — rationale in `CLAUDE.md`).
- `blueprint.yml` — brownfield / Tier 2 / Pattern B; pinned to methodology HEAD `010945a`; 6 productization tracks declared.
- `decisions/00-charter.md` — relationship to blueprint-redesign (extends), gap scorecard (6), the expanded requirement set (architect-surfaced additions across tracks A–F), proposed stage sequence, defaults taken, risks, reusable-foundation table.
- `research/00-recon-synthesis.md` — 6-agent recon evidence base (full transcript path in frontmatter).

## Blocking decision — RESOLVED
**Scope ceiling: A (methodology-native only)** (operator, 2026-06-04). No hosted service. See charter § Resolved + `decisions/01-prescription.md § Design invariant`.

## Next move — Stage 3 build (substrate first)
Per the prescription's refined order, smallest-first, each source-touching step under a freeze waiver:
1. **Step 0 — `BLUEPRINT_HOME` resolver** — one resolver replacing 29 hardcoded paths + the stale SessionStart hook default. Portability precondition; gates the CLI.
2. **Step 1 — semver baseline** — Changesets wired + first `VERSION` + `CHANGELOG.md` (ADR-0007).
3. **Step 2 — `@nino-chavez/blueprint-cli`** — root `package.json` + thin ESM dispatcher (reuse `stamp.mjs` parseArgs), subcommands stubbed.
4. **Step 3 — first `.mjs` reviewer** — prove the ADR-0002 contract runs outside Claude Code.

Source-touching steps (1/2/3/9) need a **methodology-freeze waiver** before landing in `tools/blueprint`. Confirm waiver authority before step 1.

## Pending operator inputs (non-blocking)
- npm scope: defaulted to `@nino-chavez/blueprint-cli`; redirect if registering the `@blueprint` org.
- Freeze waiver for the source-touching build steps.

## Standing constraints
- **Methodology freeze:** no edits to `tools/blueprint/template/` without an explicit operator waiver. Promote upstream via cross-repo PR / wave.
- **Build v1 substrate before v2 design slices** (0 `.mjs` reviewers, no CLI, no semver today) — or new ADRs verify against vapor.
- **ai-hive: integrate, not absorb.** Hold the line against SaaS-scope-creep.
