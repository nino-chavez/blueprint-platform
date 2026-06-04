---
stage: 1
status: evidence
date: 2026-06-04
method: 6-agent recon workflow (5 parallel domain readers + 1 synthesis)
full_transcript: ~/.claude/projects/-Users-nino-Workspace-dev-tools-blueprint/8269db3c-a731-4915-9281-c2c4551810a7/subagents/workflows/wf_d7cf9906-489
---

# Recon synthesis — current Blueprint vs the productization requirements

Evidence base for `decisions/00-charter.md`. Five parallel domain readers audited the methodology source, the `blueprint-redesign` self-application, the distribution substrate, consumer field evidence, configurability primitives, and the docs/onboarding surface; a synthesis agent produced the gap analysis and project framing. 6 agents, ~612k tokens, 102 tool uses.

This is the **decision-lineage** record (what we found, with evidence paths). The forward-looking decisions live in the charter. Extends — does not duplicate — blueprint-redesign's `research/current-state/02-blueprint-production-quality-gaps.md`.

## Per-domain findings

### 1. Self-application (blueprint-redesign)
- **ADR-0001 is a one-way invocation-surface decision, NOT a bidirectional update channel.** "Dual-protocol" = CLI + MCP coexisting over a single read-only source. Updates are unidirectional: consumers PULL via `blueprint upgrade`. No shape for consumer fixes flowing back, no non-breaking negotiation. HTTP transport, hosted Worker, bearer-auth all "deferred to v2."
- **ADR-0002 IS the portability decision** — paired `.md` + `.mjs` reviewer contract with remediation injection makes enforcement runtime-agnostic. Third-party/org-authored reviewers (the plugin SDK) named-but-deferred.
- **The prescription solves "methodology drift across solo-operator initiatives" — not team adoption, cost, or access.** `pilot_profile` explicitly DEFERS enterprise-team adoption and says "multi-operator beyond ai-hive — Never."
- **Decided-but-not-built.** 0 `.mjs` reviewers (15 `.md` specs), no `@blueprint/cli`, no `VERSION`/`CHANGELOG`/semver. Confirmed in `tools/blueprint`.
- Evidence: `blueprint-redesign/decisions/{ADR-0001,ADR-0002,01-prescription}.md`, `HANDOFF.md`, `WAVE-2-BACKLOG.md`.

### 2. Distribution substrate
- Adoption today: stamp via `stamp.mjs` for Pattern A; **Pattern B initial stamp hard-fails** (`stamp.mjs:708`) → dominant Pattern B path is hand-copy, which is how the v3 chrome-leak happened (a consumer inherited another consumer's drift as de-facto canonical).
- Updates DOWN: `restamp-chrome` covers ~9 chrome files via a hand-pasted 13-section migration doc; a sophisticated git-history classifier labels LAG vs CUSTOMIZATION-OR-ROT but on **byte identity, not semantic compat**.
- Updates UP: append-only `METHODOLOGY-AMENDMENTS.md` + manual cross-repo grep + human convergence-spotting. Triage GitHub Action **sketched but deferred**.
- No version field, no semver, no breaking-change detection anywhere.
- Evidence: `tools/blueprint/template/tools/blueprint-init/stamp.mjs`, `docs/decisions/0003-portal-docs-manifest-driven-sync.md`, `docs/prompts/pick-up-blueprint-updates.md`.

### 3. Consumer field evidence
- **v3 chrome-leak** — website-nc-v3 lost 268 lines of chrome mid-edit, restored from a peer consumer's deployed URL, promoting another consumer's 832-line drift into a de-facto "canonical" no doc declared. Root pattern: template ships files mixing canonical chrome with project data; consumers either edit chrome (drift) or copy verbatim (inherit leak).
- **bc-subscriptions skipped Stages 2–4** and paid 12+ Sonnet-hours fixing what the constraints stage would have caught.
- **Multi-operator attribution loss** — operators sharing one `.git/` lose authorship (`multi-operator-collab-pattern.md`).
- **Process asymmetry** — documented 738-vs-48-line gold-plate-vs-under-process gap → the cost dial must have skip-justification gates.
- Evidence: `tools/blueprint/docs/case-study-{v3-portal-css-gap,bc-subscriptions-skipped-stages-2-4,pp-cx}.md`, `multi-operator-collab-pattern.md`.

### 4. Configurability primitives
- One real operator-set dial: `execution.depth: lean|standard|thorough` — but it scales **deliverable count** (which docs/stages run), not reasoning depth, tokens, or model tier.
- The real cost model (Opus-vs-Sonnet, "~10x cost") lives as **prose** in `tiered-orchestration-pattern.md`, applied by judgment.
- `METHODOLOGY.md:85` browse-tool-vs-Chrome-MCP is the only token-economics reasoning — a fixed default, not a budget.
- Access control: **zero** role/department/RBAC/seat concept. Closest adjacents: tool_surface operator-vs-stakeholder auth split; archaeology `federation: per_project|org_shared` + `ALLOWED_PROJECTS`.
- Evidence: `tools/blueprint/template/blueprint.yml`, `docs/tiered-orchestration-pattern.md`, `docs/skill-categories-pattern.md`, `docs/clustered-tool-surface-pattern.md`.

### 5. Docs & onboarding
- Deep REFERENCE coverage (~50 docs, deployed portal) — but ~90% reference/explanation mode, scoped to the solo-operator v1 story.
- **Zero** getting-started/tutorial/quickstart/walkthrough files repo-wide. Only sequencing is an agent-facing paste-prompt + a SessionStart hook injecting ~9,700 words of dense reference.
- Blueprint **self-diagnosed** the gap: `2026-05-27-loom-inspiration-candidates.md` records the operator reaching for a 20-min Loom because "the portal answers questions for someone already asking them; it doesn't onboard a colleague."
- No audience-routed index — a newcomer cannot tell which 3 of ~50 docs to read first.
- Evidence: `tools/blueprint/{README.md,docs/prompts/add-blueprint-to-project.md,docs/2026-05-27-loom-inspiration-candidates.md}`, `blueprint-redesign/portal/`.

## Net assessment

The methodology has a strong, deployed REFERENCE + EXPLANATION surface and a ratified-but-unbuilt distribution architecture. Every productization requirement either (a) inherits a settled-but-unbuilt decision (portability, distribution shape), (b) has a clear graft seam but no mechanism (cost dial on `execution.depth`; access-control on ai-hive bearer tokens), or (c) is genuinely absent (onboarding ramp, consumer registry, telemetry, governance). The dominant risk across all of it: the four uncovered requirements are the prescription's deliberately-deferred set because they SaaS-ify a methodology — see the charter's scope-ceiling decision.
