---
stage: 1
status: evidence
date: 2026-06-04
method: 6-agent canonical-pattern research (5 track researchers + synthesis)
ceiling: "A — methodology-native only"
full_transcript: (local Claude Code session transcript — not published)
feeds:
  - ADR-0003-cost-effort-dial.md
  - ADR-0004-native-access-governance.md
  - ADR-0005-bidirectional-update-protocol.md
  - ADR-0006-native-extensibility.md
  - ADR-0007-versioning-distribution-toolchain.md
---

# Stage 1 canonical research — grounded design basis (ceiling A)

Per the operator's canonical-pattern-first rule, each platform primitive was grounded against (1) the **vendor canonical** doc and (2) an **internal reference impl** under `the dev workspace`. This is the decision basis for ADR-0003..0007. Full per-primitive detail in the workflow transcript (frontmatter).

## Vendor canonical → decision (one line each)

| Primitive | Vendor canonical | Decision (ceiling A) |
|---|---|---|
| CLI distribution | npm `bin` + `files` allowlist + `npx` | `@nino-chavez-labs/blueprint-cli`, `bin: blueprint`, ESM dispatcher (no commander v1) |
| Versioning + CHANGELOG | Changesets (over semantic-release) | `.changeset/*.md` → VERSION+CHANGELOG+tag+publish in CI; conventional prefixes kept |
| Deprecation | Node staged model (doc-only→warn→removed-on-MAJOR) | `BP-DEPR-NNN` register; SessionStart hook + reviewer emit warn |
| Consumer registry | Terraform git-ref pin + Renovate committed-manifest | `consumers.yml` manifest; `blueprint fleet` computes per-version drift |
| Cost effort | Claude Code effort enum `low\|medium\|high\|xhigh\|max` | adopted verbatim, per-stage; `model_tier: opus\|sonnet\|haiku\|inherit` |
| Telemetry | Claude Code `skill-usage.jsonl` local sweep | append-only `.blueprint/telemetry.jsonl` + `blueprint cost` (no collector) |
| Access RBAC | GitHub teams + CODEOWNERS + rulesets | config = intent; enforcement = git host; no identity server |
| Governance | Rust RFC (over KEP/PEP) | substantial→RFC, bug-fix→PR, mapped onto the 4-bucket taxonomy |
| Extensibility | ESLint/Vite plugin naming-convention + fixed-interface validation | dir-convention + npm-keyword discovery; ADR-0002 `review()` IS the interface |
| Catalog | Backstage owned-typed-entity (minus host) | committed `reviewers.yml` |
| Docs | Diataxis (4 modes) | navigation/labeling layer over existing tree (no reorg) |
| Conformance | `brew/npm doctor` (but stronger) | `blueprint doctor` runtime tier via browse-tool (false-green guard) |

## Internal reuse map — reuse beats rebuild

| Path | Reuse for | Reuse vs build |
|---|---|---|
| `template/tools/blueprint-init/stamp.mjs` | `parseArgs` (CLI dispatcher) + `classifyDivergenceCause` (per-file LAG walk → generalize to per-version) | reuse machinery, build the generalization |
| `template/tools/state-derive/index.ts` | `walkCatalog` + `_`-skip + dynamic `import` + duck-type validate = the plugin loader | reuse near-verbatim; only the predicate changes |
| `template/tools/wave-digest/digest.mjs` | read-file → filter → report = the shape for `blueprint cost` + fleet report | reuse as template |
| `template/.github/workflows/owner-spec-lint.yml` | CI skeleton (PR + paths + permissions + tsx runner) for the triage Action | reuse skeleton, build classifier body |
| `tools/specchain/package.json` + `setup.sh` | publishable-scaffolder shape + `--upgrade` precedent | reuse as literal template |
| `tools/specchain/.../execution-profiles.md` | two-axis (strategy×depth) + never-downgrade-silently | reuse pattern; build depth×effort projection |
| `docs/tiered-orchestration-pattern.md` | Opus/Sonnet ladder + "anchors emerge from telemetry" | reuse as `model_tier` defaults source; promote prose→config |
| `blueprint-redesign/decisions/ADR-0002` | the ratified `review()` contract = the plugin interface | reuse as-is; build the validator + the `.mjs` pairs (0 exist) |
| `blueprint-redesign/portal/` | audience pills + theme-switcher + manifest docs viewer + FLOWS | reuse mechanism; build content/reskin |
| `docs/browser-legibility.md` | runtime-not-existence doctrine | reuse as `blueprint doctor` runtime-tier justification |
| `docs/amendment-classification-pattern.md` | 4-bucket taxonomy = the triage classifier + RFC routing | reuse taxonomy; diverge from Copilot-SDK → deterministic glob+keyword |
| `ref/catalyst/.github/CODEOWNERS`, `rally-hq/CONTRIBUTING.md` | team-as-owner + CONTRIBUTING structure | reuse as templates |

**ai-hive**: docs-only in this workspace (no `src/`), and its bearer-token model needs a running Worker → explicitly NOT the access substrate under ceiling A. Recorded so a future session doesn't re-reach for it.

## Canonical divergences (why-not sentences — operator's rule)

Each is a deliberate divergence from vendor canonical with its disqualifier named:
- **Changesets over semantic-release** — a methodology CHANGELOG entry for a breaking bump IS a stakeholder migration guide; commit-parsed notes can't carry the hand-authored nuance, and Changesets' review-PR is where it lands. Conventional prefixes coexist.
- **Hand-rolled ESM CLI over commander** — `stamp.mjs` already hand-rolls `parseArgs`; v1 surface is thin; commander is the named escalation if subcommands explode.
- **Node staged deprecation over npm-deprecate-alone** — npm-deprecate covers only whole package versions; methodology primitives (a config key, a stage) need the staged model via the SessionStart hook.
- **Per-stage cost vector over Claude Code's session-global** — Blueprint's unit of work is the stage; subagent frontmatter already carries per-agent effort+model, so per-stage is the faithful projection, not a divergence of substance.
- **Skip-justification gate (no vendor analog)** — Claude Code honors any effort silently; charter risk #3 (solo calibration shipped as team default) makes silence the failure mode. Built as a CI reviewer (headless), on specchain's never-downgrade-silently discipline.
- **Local JSONL telemetry over OpenTelemetry** — OTel needs a collector service (out by ceiling A); chosen pattern is the vendor's own lightweight `skill-usage.jsonl` shape.
- **Git-host identity over ai-hive bearer token** — ai-hive's token model needs a running Worker (a server, out by ceiling A).
- **Repository rulesets over classic branch protection** — rulesets are the canonical successor (layerable, readable); docs must tell admins to migrate off classic.
- **Rust-RFC-lite over KEP/PEP** — a single-maintainer repo has no SIGs/editor corps; KEP/PEP ceremony would bottleneck the field contributions the UP-channel exists to accept.
- **Deterministic triage classifier over Copilot-SDK** — the 4-bucket tree resolves most cases mechanically; a model call is reserved for the genuinely-ambiguous pre-fix case only.
- **Dir-convention + npm-keyword discovery over ESLint's explicit central-array** — a central registration array recreates the manual-grep coordination the platform removes and becomes a merge-conflict choke point at department scale; the naming convention + interface validation are kept, only central-array registration is dropped (binding stays explicit per-reviewer).
- **No plugin SDK (validator + starter template instead)** — ADR-0002 Alt 3 already rejected an SDK with zero external authors; the `review()` signature IS the SDK.
- **Committed `reviewers.yml` catalog over Backstage host** — ceiling A forbids a Blueprint-owned server; keep the owned-typed-entity idea, drop the host.
- **Diataxis as navigation layer over filesystem reorg** — re-foldering breaks ~30 internal links + the manifest viewer; labeling closes the same audience-routing gap without the blast radius.
- **`blueprint doctor` runtime tier (browser) over static-only doctor** — `brew doctor`-style advisory checks are too weak for a deliverable a VP must trust; browse-tool is a local CLI, still ceiling-A clean.

## Resolved open questions

- **npm name** → `@nino-chavez-labs/blueprint-cli` (claimable now; `blueprint`/`blueprint-cli` unscoped taken; `@blueprint/cli` aspirational pending org registration). `bin` is `blueprint` regardless.
- **Changesets per-change markdown overhead** → accepted (the migration-note discipline is the point).
- **Deprecation-clock vs methodology-freeze** → EOL slips to the next post-freeze MAJOR; removal never forces a waiver during a consumer-migration freeze (ADR-0005).
- **Reviewer precedence (local `.mjs` vs installed package)** → local overrides the package, but the loader emits a WARN finding when a local reviewer shadows a packaged one (discovery automatic, binding visible) (ADR-0006).
- **GitLab parity** → design-only for v1; `blueprint.yml` role config is host-agnostic, apply-scripts are GitHub-shaped (ADR-0004).

## Refined build order (smallest-first; substrate before design slices)

0. `BLUEPRINT_HOME` resolver (gates the CLI — researchers underweighted; build first)
1. Semver baseline (Changesets wired + first VERSION + CHANGELOG)
2. `@nino-chavez-labs/blueprint-cli` root package.json + thin dispatcher (subcommands stubbed)
3. `.mjs` reviewer pairs + CI (unblocks the gate AND the plugin channel — sequence before 5/11)
4. Cost-dial config (`cost:` block; dispatch-time frontmatter materialization)
5. Telemetry + `blueprint cost` sweep (anchors emerge here, before defaults calibrate)
6. Skip-justification gate (`.mjs` reviewer; needs 3 + 4)
7. `consumers.yml` + `blueprint fleet` (generalize the classifier)
8. `blueprint upgrade` (needs 1 + 7)
9. Access + governance artifacts (CODEOWNERS + ruleset JSON + `access.roles` + CONTRIBUTING + RFC template) — batch as ONE wave under a freeze waiver
10. Triage Action (needs 9)
11. Extensibility (loader + validator + starter template + `reviewers.yml`) — needs 3
12. `blueprint doctor` (tiered; needs 3 + 0) — trust-at-scale capstone
13. Enablement reskin (portal start-here + 5-role pills + the one tutorial + Diataxis tags) — land in consumer, promote via wave
