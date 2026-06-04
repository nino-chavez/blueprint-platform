---
canonical: true
stage: 0
status: draft
date: 2026-06-04
supersedes: none
extends: ../../blueprint-redesign/decisions/01-prescription.md
informs:
  - "decisions/01-prescription.md"
  - "Stage 1 research (extends blueprint-redesign 9-gap inventory)"
scope_ceiling: "A — methodology-native only (operator-resolved 2026-06-04)"
---

# Charter — Blueprint as a team-adoptable platform

What this initiative is, how it relates to the existing self-application, the full requirement set (operator-named **plus** architect-surfaced), and the one decision that gates the design.

Grounding: a 6-agent recon (2026-06-04) audited the methodology source, the `blueprint-redesign` self-application, the distribution substrate, consumer field evidence, configurability primitives, and the docs/onboarding surface. Evidence base: `research/00-recon-synthesis.md`.

## Relationship to blueprint-redesign — extends, does not supersede

`blueprint-redesign` settled and deployed the **v1-solo** foundation:
- **ADR-0001 dual-protocol distribution** — `@blueprint/cli` (npm) + MCP-over-stdio + a GitHub Actions template, over a single canonical source. **One-way by design**: the source is read-only; consumers PULL via semver-aware `blueprint upgrade`. Hosted Worker / auth / HTTP transport are deferred to v2.
- **ADR-0002 reviewers-as-executable-plugins** — each reviewer ships as a paired `.md` spec + `.mjs` executable with a fixed `review({targetDir, blueprintYml, methodologyHome}) → {status, findings[], metadata}` contract and remediation injection. Makes the enforcement layer runtime-agnostic.

Both are **inherited verbatim.** This initiative does not re-decide CLI-vs-MCP or reviewer portability.

The catch: it is **decided-but-not-built.** As of the recon — zero `.mjs` reviewers (15 `.md` specs, 0 executable pairs), no `@blueprint/cli`, no `VERSION`/`CHANGELOG`/semver tags. And blueprint-redesign **explicitly deferred** exactly the four requirements this initiative now owns: its `pilot_profile` lists "Enterprise platform team adopting Blueprint — DEFER," "Multi-operator beyond ai-hive — Never," and the deferral table pushes hosted server / auth / third-party plugin SDK to "v2 after 5+ external consumers." So this is the **v2 superset the prescription anticipated** — continuous with the same gap inventory (onboarding=Gap 7, docs=Gap 3, portability=Gap 4, distribution=Gaps 1/2), not a parallel concern and not a rewrite.

**Variant: brownfield.** Blueprint exists, works, ships to 6 named consumers, has a deployed portal. Load-bearing risk is preserving what works while extending — there is ratified architecture to inherit, real field-incident evidence to migrate around (the v3 chrome-leak; the rally-hq "restamp unsafe for brownfield" finding), and a methodology-freeze convention governing change. Not greenfield (no blank slate), not midstream (no half-built thing to resume).

## Gap scorecard — the operator's original six

| # | Requirement | Status | Evidence | Closing move |
|---|---|---|---|---|
| 1 | Documented | **present** | ~50 `docs/`, 4,987-word METHODOLOGY.md, deployed Pattern B portal — but ~90% reference/explanation mode (Diataxis), solo-operator story | Extend content to the new requirements; add an **audience-routed** index (newcomer can't tell which 3 of 50 docs to read first) |
| 2 | Team-adoptable & portable | **partial** | Contract settled (ADR-0002) but unbuilt; 29 template files + SessionStart hook hardcode one operator's paths (hook default is the STALE pre-rename path); dominant Pattern B adoption path is hand-copy + reviewer-caught-drift | Build the `.mjs` pairs + CLI; one `BLUEPRINT_HOME` resolver replacing all hardcoded paths; ship a Pattern B initial stamper |
| 3 | Configurable cost dial ("like Claude Code effort levels") | **partial** | Only `execution.depth: lean\|standard\|thorough` — scales deliverable COUNT, not reasoning/spend; the real Opus-vs-Sonnet cost model lives as PROSE in `tiered-orchestration-pattern.md`, applied by judgment, never config | Refine `execution.depth` into a per-stage effort vector + a config-driven model-tier field; add enforced budget |
| 4 | Bidirectional non-breaking updates | **partial** | Both directions exist as hand-driven half-channels: DOWN = `stamp.mjs restamp-chrome` (~9 chrome files, hand-pasted migration doc, byte-identity not semantic); UP = append-only `METHODOLOGY-AMENDMENTS.md` + manual cross-repo grep. NO version primitive at all (tags dogfood-only, no CHANGELOG). Wave-2 proved the one-way restamp UNSAFE for brownfield consumers | Ship semver baseline first; generalize the byte classifier to a per-consumer revision delta; build the deferred triage Action |
| 5 | Access control across departments/org | **absent** | Exhaustive grep returns ZERO role/department/RBAC/seat concept for Blueprint-the-tool. Hive sessions are anonymous; field evidence shows attribution-loss across operators sharing one `.git/` | Net-new ADR. Attach identity at the ai-hive session layer; extend the operator-vs-stakeholder tool_surface split into a real role matrix; build on ai-hive bearer-token + origin-allowlist — do NOT invent auth |
| 6 | Onboarding / enablement ramp | **absent** | ZERO getting-started/tutorial/quickstart files repo-wide. Blueprint SELF-diagnosed this (`2026-05-27-loom-inspiration-candidates.md`: "the portal answers questions for someone already asking them; it doesn't onboard a colleague"). The designed `npx init` flow does not exist | Build a vocabulary on-ramp + end-to-end tutorial + the unbuilt interactive init; reskin the portal to "start here"; role-based paths |

## Expansion — what the original six miss (architect-surfaced)

The operator asked to "expand for things I didn't think of." A productized, team-scale Blueprint needs the following. Each is tagged **[CORE]** (blocks an operator requirement — not optional), **[HIGH]**, **[MED]**, or **[DECISION]** (a fork to resolve, not a build).

**Track A — Distribution & Versioning**
- **[CORE] Consumer registry / fleet view.** "Push operational updates to consumers" structurally requires knowing *who the consumers are* and *what version each is pinned to*. Today updates are pushed by hand-grepping repos on one machine. No registry = no fleet = no real DOWN channel. This is the **precondition** for requirement #4, not an add-on.
- **[CORE] Versioning + deprecation governance.** "Non-breaking" is undefined without a semver contract **and** a deprecation lifecycle (warn → deprecate → EOL), a compatibility matrix, and migration guides. Today: zero semver, no CHANGELOG. Blocks #4.
- **[HIGH] Contract / compatibility testing.** Prove a stamped consumer survives a methodology version bump *before* it ships. The prescription's deferred "independent item 2." Without it, "non-breaking" is asserted, not verified — the exact wave-2 failure.

**Track B — Configurability & Cost**
- **[HIGH] Telemetry & observability.** You cannot tune a cost dial or fix onboarding drop-off without measuring real spend, per-stage cycle time, reviewer pass/fail rates, and where teams stall. `tiered-orchestration-pattern.md` *explicitly* says cost anchors must emerge from per-project telemetry, not ship as defaults. Today: none. Requirements #3 and #6 are unsteerable without this.
- **[MED] Cost attribution / budgets (FinOps).** Org adoption with a cost dial means departments want to see, attribute, and cap spend per initiative. Extends #3 to the org.

**Track C — Access & Governance**
- **[CORE] Identity layer.** ai-hive sessions are anonymous today. Access control, attribution, *and* contribution governance all require identity attached at the Hive session layer. Foundational for #5.
- **[CORE] Contribution & promotion governance.** UP-flow ("accept feature requests + bug fixes from the field") needs a review/approval boundary — RFC, CODEOWNERS, maintainer SLAs — or contributions bottleneck on Nino (kills scalability) **or** land unreviewed (kills safety). The recon flagged this as a top risk. Today promotion is one operator's unilateral judgment over a manual grep.
- **[MED-HIGH] Security & supply-chain posture.** Org adoption makes secret handling (1Password CLI convention), npm package provenance/signing, dependency policy, and the gitleaks baseline table stakes. The chat surfaces already carry API keys.
- **[DECISION] Licensing / IP / distribution model.** Open-source? internal-only? commercial/per-seat? This shapes the entire distribution channel and the registry/auth model. Must be decided early (Stage 2).

**Track D — Extensibility**
- **[HIGH] Plugin model for org-authored reviewers & stages.** "Scalable across departments" means a department adds its own reviewers/stages **without forking** the methodology. This is Backstage's whole thesis and the difference between *a methodology* and *a platform*. The deferred v2 plugin SDK extends ADR-0002's contract — design it AFTER access-control + bidirectional land so org-authored plugins distribute through the same authenticated channel.
- **[MED] Pattern / reviewer catalog & discoverability.** Beyond docs: a searchable catalog of variants, tiers, patterns, reviewers, stages teams browse and adopt (Backstage software-catalog analog).

**Track E — Adoption & Enablement**
- **[HIGH] Conformance / quality certification (trust at scale).** A Blueprint health score / conformance check so a VP trusts a stamped deliverable — guarding the false-green class (curl-200 / structural checks passing while the deliverable is broken: v3 unstyled chrome, bc-subs throwing charge path). At team scale these false-greens multiply across consumers who lack the flagship's compensating knowledge.
- **[MED] Role-based onboarding paths.** Onboarding differs by role: operator, contributor, reviewer, admin, stakeholder. Extends #6.
- **[MED] Support & escalation model.** Enablement ≠ support. Issue templates, office hours, support tiers, an escalation path when a team is blocked.

**Track F — Team / Multi-operator**
- (Operator requirement #2's team half + ai-hive integration. Covered under Fork 1.)

## Resolved — scope ceiling: A (methodology-native only)

**Resolved 2026-06-04 (operator).** No hosted service. Everything ships on git-host + npm + CI primitives. This reshapes the architect-surfaced additions to a no-server form (and simplifies several):

- **Access control / identity** → the git host's own identity (GitHub/GitLab users) + CODEOWNERS + branch rulesets + role config in `blueprint.yml`. No identity server; the [CORE] identity layer collapses into "use the git host's." ai-hive is NOT the access substrate under A.
- **Consumer registry / fleet view** → a declarative manifest (`consumers.yml`) in the methodology repo; consumers opt in by PR with repo + pinned `methodology_version`. `blueprint fleet` generates the behind/ahead report. Push-to-fleet becomes publish + consumers-pull (accepted tradeoff: org push stays manual).
- **Telemetry** → local `.blueprint/telemetry.jsonl` per initiative; aggregation is a local CLI sweep over repos the operator can reach. No central collector.
- **Bidirectional updates** → DOWN = semver publish + `blueprint upgrade` (pull). UP = amendments formalized into a PR channel + the triage GitHub Action (CI, not a server).
- **Plugin model** → org-authored `.mjs` reviewers distributed via npm/git, discovered by convention (extends ADR-0002). No hosted plugin registry.
- **ai-hive** → optional coordination companion for live multi-operator work; integrate-not-absorb still holds, but it is not load-bearing for access-control under A.

What was considered (for the record):

- **A — Methodology-native only.** Everything ships as config + CLI + CI + git/repo permissions. Access control = role config + repo/CI perms. No hosted service. Holds the "Blueprint is a methodology, not a SaaS" line hardest. **Risk:** "push updates to a fleet" and "org access-control" structurally need *some* shared surface — pure-native may under-deliver the literal ask.
- **B — Native core + thin hosted control plane (recommended).** Methodology-native CLI/reviewers/config, PLUS a lightweight hosted surface for the things that *structurally need a server*: consumer registry/fleet, the bidirectional update feed, org access-control, telemetry aggregation — built on the **existing ai-hive Worker + D1 + bearer-token** substrate, NOT a new auth/multi-tenant/billing stack. This is what the recon's own recommendations imply ("build access-control on ai-hive's bearer token," "build the triage Action in CI"). The guardrail that keeps B from becoming C: reuse ai-hive; no billing, no SOC2, no multi-tenant isolation product.
- **C — Full hosted platform / SaaS.** Multi-tenant, auth, billing, SOC2 — the thing the prescription put explicitly out of scope and named as the failure mode.

**Chosen: A.** B and C are not revisited unless the operator reopens the ceiling. The native-only constraint is now a design invariant for every track — see `decisions/01-prescription.md`.

## Defaults taken (redirect any of these)

These had a clear canonical answer; taken as defaults to keep moving, reversible:
- **Extends blueprint-redesign** (not supersede/parallel) — inherit ADR-0001/0002 verbatim.
- **ai-hive: integrate, not absorb** (Fork 1) — prescription's standing "companion stays separate / Never." Absorbing identity/persistence/billing is the named SaaS-creep failure mode.
- **Cost dial: per-stage effort vector + model-tier routing** (Fork 2) — operator said "like the effort level of Claude Code," a tunable dial, not 3 presets. Numeric-budget enforcement scoped as a later slice.
- **Bidirectional: semver + manifest contract first** (Fork 3) — a full semantic-compatibility engine is research-grade; ship the versioned pipe + generalized git-history classifier (80% of the ask) before compatibility theory.
- **Standalone repo** (see `CLAUDE.md`) — decouples from the methodology repo's git; reversible.

## Risks (from recon)

1. **Scope explosion into SaaS** — four requirements are the prescription's deferred set *because* they SaaS-ify a methodology. Hold the line: Blueprint owns methodology, ai-hive owns coordination/identity.
2. **Building on unbuilt foundations** — ADR-0001/0002 are decided-but-not-built (0 `.mjs`, no CLI, no semver). Sequence the v1 substrate build AHEAD of v2 design slices or new ADRs verify against vapor.
3. **Cost-dial mis-calibration** — shipping Nino's solo calibration as the team default gold-plates small initiatives and under-processes large ones (the documented 738-vs-48-line asymmetry). The dial needs skip-justification gates so under-processing is a recorded conscious choice.
4. **Single-machine assumptions leak into the team product** — 29 hardcoded paths + a git-history classifier assuming local clone access to ALL repos. "Portable to a team" is false until `BLUEPRINT_HOME` replaces every path and cross-consumer ops stop assuming one operator with filesystem access to everything.
5. **False-green validation at team scale** — existence/curl-200 checks pass while deliverables are broken; the Fact-Check stage must gate on runtime/browser verification or the platform certifies broken adoptions.
6. **Promotion-authority ambiguity** — a channel that accepts contributions UP needs a review boundary that does not exist; without it, contributions bottleneck on Nino or land unreviewed.
7. **Methodology-freeze collision** — promoting ADRs / `.mjs` reviewers INTO the source needs explicit waiver authority per the freeze rule; batch upstream promotions under waiver.

## Reusable foundation — build ON, don't reinvent

| Asset | Path | Supports |
|---|---|---|
| ADR-0001 dual-protocol distribution | `blueprint-redesign/decisions/ADR-0001-*.md` | Distribution architecture (inherit verbatim) |
| ADR-0002 reviewers-as-executable-plugins | `blueprint-redesign/decisions/ADR-0002-*.md` | Portability contract (build `.mjs` against it) |
| `stamp.mjs` + git-history divergence classifier + chrome manifest | `tools/blueprint/template/tools/blueprint-init/stamp.mjs` | Bidirectional sync; the "how far behind" computation to generalize |
| `execution.depth` + tiered-orchestration model ladder + archaeology 3-layer flag gate | `tools/blueprint/template/blueprint.yml`, `docs/tiered-orchestration-pattern.md` | Cost dial graft seam + enforcement shape |
| ai-hive (Worker + D1 + bearer-token + origin-allowlist + ~20 MCP tools) | `wip/ai-hive/`, `blueprint-redesign/research/current-state/01-ai-hive-as-companion.md` | Team adoption + access-control substrate (integrate) |
| Amendments convention + `/blueprint-amendment` skill + triage Action sketch | `tools/blueprint/docs/amendment-classification-pattern.md` | Bidirectional UP feed |
| blueprint-redesign portal chrome (Pattern B shell, docs viewer, themes, audience pills) | `blueprint-redesign/portal/` | Onboarding/enablement hub seed (reskin "start here") |
| 9-gap inventory + extended consumer audit + field case studies | `blueprint-redesign/research/current-state/02-*.md`, `tools/blueprint/docs/2026-05-27-extended-audit-findings.md`, case studies | Stage 1 evidence (extend, don't re-derive) |
| tool_surface clustering + archaeology federation `per_project\|org_shared` + ALLOWED_PROJECTS | `tools/blueprint/docs/clustered-tool-surface-pattern.md` | Access-control precedents (operator-vs-stakeholder split, org-vs-project scoping) |
