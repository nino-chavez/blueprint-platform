# Methodology amendments — blueprint-platform

Append-only, reverse-chronological. Methodology learnings specific to this initiative: gaps worked around, candidates for promotion into `tools/blueprint`. Convention: `tools/blueprint/template/docs/methodology/methodology-amendments-convention.md`.

---

## 2026-06-04 — Pattern A portal (`template/apps/portal`) is over-coupled to the methodology's own dogfood substrate

**Candidate for promotion (significant — root cause).**

**Observed:** stamping `--pattern=A` produces a portal that cannot build/render a fresh consumer's deliverables, because the shell is hardwired to a substrate this (and any new) consumer doesn't have:
- `src/lib/repo-root.ts` keys `REPO_ROOT` on `METHODOLOGY.md` — exists only in the methodology source, never in a consumer.
- `src/lib/derived.ts` reads `docs/audits/derived/_state.json` (state-derive), `docs/hive/_board.json` (hive-board-derive), `docs/audits/derived/_epic-footprints.json`, plus GitHub Projects "Ready Queue" / Epic-N trackers (#30–#59).
- `src/lib/content.ts` + `derived.ts` read ADRs from `docs/decisions/NNNN-*.md`; consumers (incl. blueprint-redesign) use `decisions/ADR-NNNN-*.md`.
- `src/lib/scenarios.ts` reads `apps/demos/scenarios.json` — not created by the stamp.
- Pages bake methodology-specific narrative: trust axioms "ratified 2026-05-13 via synthesis #574", METHODOLOGY §8, WAYS-OF-WORKING.md, the five-actor model, `subs-hive-dashboard.pages.dev`.

**Why it matters:** the intent is "Blueprint ships a portal SHELL as the harness to all deliverables." Pattern A does NOT ship a generic harness — it ships the methodology's own dogfood portal with data-coupling + narrative baked in. The stamper substitutes strings but not the structural coupling. A consumer must rewrite the data model (`repo-root`/`content`/`derived`/`scenarios`) AND de-narrate every page before it renders their work. This is the v3-chrome-leak class escalated from CSS to the whole data model.

**Root cause:** `template/apps/portal` conflates reusable harness chrome with the methodology's dogfood content + substrate bindings; the bindings are hardcoded paths, not a config-driven data-source layer.

**Candidate fix (for promotion):** make `template/apps/portal` a genuinely generic harness — (a) `repo-root` marker = `blueprint.yml`, not `METHODOLOGY.md`; (b) a `blueprint.yml portal:` block declaring data sources (decisions dir + filename convention; optional state/board/scenarios paths) so missing sources degrade gracefully instead of throwing; (c) move methodology-specific narrative out of template pages into example content the stamper replaces/omits; (d) ADR catalog reads the consumer's `decisions/` convention.

**RESOLVED 2026-06-04 (template-level, North Star / campsite):** `template/apps/portal` refactored into a genuinely generic, config-driven harness on branch `platform/substrate` (a `tools/blueprint` worktree, under operator waiver). New `portal-config.ts` reads a `blueprint.yml portal:` block; all 5 loaders degrade-to-empty; the phantom `@blueprint/gate-derive` is vendored; the stamper writes a workspace root; `repo-root` keys on `blueprint.yml`. Verified: a fresh `stamp --pattern=A` → `npm install` → `astro check` (0 errors) → `astro build` (14 pages) clean with zero sources. blueprint-platform was re-stamped from it and renders its real deliverables (charter / ADRs / research / 14-step build-order) with no leak. Pending: merge `platform/substrate` → `tools/blueprint` main as a wave (operator's call).

---

## 2026-06-04 — Stamper mechanical-check false-positives on evidence docs that cite the source example project

**Candidate for promotion.**

**Observed:** `stamp.mjs --mode=stamp --pattern=A` into this initiative reported `UNEXPECTED RESIDUAL STRINGS (stamper bug — fix template/tools/blueprint-init/stamp.mjs)` for `CLAUDE.md`, `blueprint.yml`, and `research/00-recon-synthesis.md` — all matching the source-project slug `bc-subscriptions`.

**Why it's a false positive:** those three matches are *intentional references* to bc-subscriptions as the canonical Pattern A example (this is a methodology initiative that cites prior consumers as evidence). They are not leftover template strings. The mechanical check greps the **whole target** for the source slug, but a consumer's evidence docs (`decisions/`, `research/`, root `*.md`, `blueprint.yml`) legitimately name other consumers.

**Impact:** the "stamper bug" label invites an operator to "fix" correct references — exactly the kind of wrong-correction the mechanical check exists to prevent, inverted. For most consumers it never fires (they don't cite bc-subscriptions); for any Blueprint-on-itself initiative it always will.

**Root cause:** the post-stamp grep scans the entire target instead of the **template-copied paths** (`apps/portal/`, `packages/`). Evidence that predates the stamp can't contain leftover template strings by construction — only intentional references.

**Candidate fix (for `stamp.mjs`):** scope the mechanical residual check to the paths the stamper actually wrote (`apps/portal/`, `packages/`), excluding pre-existing evidence dirs (`decisions/`, `research/`) and root docs (`CLAUDE.md`, `blueprint.yml`, `README.md`, `HANDOFF.md`, `*AMENDMENTS*`). Or: classify whole-target matches in evidence files as `INFO (reference to another consumer)` rather than `UNEXPECTED RESIDUAL (bug)`.

**RESOLVED 2026-06-04 (template-level):** `stamp.mjs` `mechanicalCheck` now scopes its residual-string walk to the stamped paths (`apps/portal/` + `packages/` + the root `package.json`), not the whole target — so evidence dirs (`decisions/`, `research/`) and root docs that legitimately cite the example project no longer trip it. Re-stamping blueprint-platform now exits 0. The banner text was also genericized (no longer names the reference project), closing the last name leak in stamped pages.
