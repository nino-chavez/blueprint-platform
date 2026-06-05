# HANDOFF — blueprint-platform

**Date:** 2026-06-04
**State:** Stages 0–2 + ADRs done. Stage-3 substrate: steps 0–1 done (BLUEPRINT_HOME, semver) on `platform/substrate`; step 2 (CLI) paused. **Portal harness: DONE** — `template/apps/portal` is now a genuinely generic, config-driven harness (Phase A/B/C), and blueprint-platform's portal renders its real deliverables (verified: npm install + astro check 0 errors + astro build 14 pages green, zero leak). Both methodology amendments RESOLVED. Next: merge the `platform/substrate` wave → `tools/blueprint` main (operator's call), then resume CLI (step 2).

## What landed
- Project scaffolded at `~/Workspace/dev/wip/blueprint-platform/` (standalone repo — rationale in `CLAUDE.md`).
- `blueprint.yml` — brownfield / Tier 2 / Pattern B; pinned to methodology HEAD `010945a`; 6 productization tracks declared.
- `decisions/00-charter.md` — relationship to blueprint-redesign (extends), gap scorecard (6), the expanded requirement set (architect-surfaced additions across tracks A–F), proposed stage sequence, defaults taken, risks, reusable-foundation table.
- `research/00-recon-synthesis.md` — 6-agent recon evidence base (full transcript path in frontmatter).

## Blocking decision — RESOLVED
**Scope ceiling: A (methodology-native only)** (operator, 2026-06-04). No hosted service. See charter § Resolved + `decisions/01-prescription.md § Design invariant`.

## Stage 3 build — IN PROGRESS (freeze waiver granted 2026-06-04)

Building in a **worktree of `tools/blueprint`** at `~/Workspace/dev/wip/blueprint-substrate-build` on branch **`platform/substrate`** (base `main` 010945a). Source-touching work lands there; the operator merges to `main` as a wave when the substrate is reviewed.

- [x] **Step 0 — `BLUEPRINT_HOME` resolver** (`ca273d2`). Hook resolves env → `blueprint.yml methodology_home` → local canonical → npm-installed `@nino-chavez/blueprint-cli` (candidate must hold METHODOLOGY.md); stale `wip/blueprint` default + `stamp.mjs` generated-path leaks + `big-blueprint` ref killed. Tested (syntax + 4 resolver cases + end-to-end JSON).
- [x] **Step 1 — semver baseline** (`3a22923`). `package.json` `@nino-chavez/blueprint-cli` 0.1.0 (single version source, no VERSION file); `.changeset/` config + README (migration-note discipline); `CHANGELOG.md` 0.1.0 baseline; `.github/workflows/release.yml` (dormant until `NPM_TOKEN`); hook version-banner (flags consumer pin drift → `blueprint upgrade`). Tested. `@blueprint/cli` still pending org claim — shipped scoped.
- [ ] **Step 2 — CLI dispatcher** — `bin/blueprint.mjs` thin ESM dispatcher (reuse `stamp.mjs` parseArgs) + a JS resolver lib (`template/tools/lib/blueprint-home.mjs`) mirroring the hook's resolution order; subcommands stubbed (init/review/upgrade/fleet/cost/doctor); add `bin` to package.json.
- [ ] **Step 3 — first `.mjs` reviewer** — prove the ADR-0002 contract runs outside Claude Code.

## Portal harness track (parallel to the substrate build)

The Blueprint portal SHELL is the canonical harness/index to all deliverables (not a bespoke analysis portal — see memory `blueprint-portal-is-the-harness`). Flipped `portal_pattern` **B → A** (platform-portal fits a platform; bc-subscriptions is the Pattern A reference).

- [x] **Shell stamped** (`e38ddb7`) — `apps/portal` (Astro IA contract discover/try/build/operate/inspect/roadmap) + `packages/{ui,design-tokens}` via `stamp.mjs --pattern=A`. `blueprint.yml` preserved; evidence untouched. Amendment filed (stamper mechanical-check false-positives on evidence docs citing the example project).
- [x] **Generic harness refactor + populate** (blueprint-platform `d27adc5`; template fixes on `platform/substrate`: `b9ce8af` Phase A, `e264f4e` Phase B, `cc8e340` banner). The Pattern A portal template was made a genuinely generic, config-driven harness (North Star / campsite): `portal-config.ts` contract (a `blueprint.yml portal:` block), all loaders degrade-to-empty, `@blueprint/gate-derive` vendored, workspace-root scaffold, `repo-root` keys on `blueprint.yml`, ~22 pages de-narrated. blueprint-platform re-stamped from it + its `portal:` block authored: `discover` ← charter excerpts, `inspect` ← doc cards + live ADR catalog (0003–0007), `roadmap` ← the 14-step `build-order.json` (`apps/portal/src/data/`), hero ← productization thesis; substrate sections hidden (ceiling A, no Hive). **Verified: npm install + astro check (0 errors) + astro build (14 pages) green; renders all real deliverables; zero leak.** Both methodology amendments RESOLVED. **To view:** `cd apps/portal && npm run dev`. Optional remaining: a CLI `scenarios.json` for `/try`, and Cloudflare Pages deploy.

## Pending operator inputs (non-blocking)
- npm scope: defaulted to `@nino-chavez/blueprint-cli`; redirect if registering the `@blueprint` org.
- Merge `platform/substrate` → `tools/blueprint` main as a wave once the substrate is reviewed.

## Standing constraints
- **Methodology freeze:** no edits to `tools/blueprint/template/` without an explicit operator waiver. Promote upstream via cross-repo PR / wave.
- **Build v1 substrate before v2 design slices** (0 `.mjs` reviewers, no CLI, no semver today) — or new ADRs verify against vapor.
- **ai-hive: integrate, not absorb.** Hold the line against SaaS-scope-creep.
