---
canonical: true
adr: 0003
status: proposed
date: 2026-06-04
deciders: ["Nino Chavez"]
scope_ceiling: "A — methodology-native only"
informs: 01-prescription.md
depends_on: 00-charter.md
references:
  - ../research/01-canonical-research.md
  - "vendor: https://platform.claude.com/docs/en/build-with-claude/effort"
  - "vendor: https://code.claude.com/docs/en/sub-agents"
  - "internal: tools/blueprint/docs/tiered-orchestration-pattern.md"
  - "internal: tools/specchain/specchain/docs/execution-profiles.md"
---

# ADR-0003 — Configurable cost/effort dial

Status: **proposed** — grounded in Stage 1 canonical research; ratify on operator review.

## Context

The operator asked for cost-efficiency "configurable like the effort level of Claude Code." Today the only operator-set knob is `execution.depth: lean|standard|thorough`, which scales deliverable **count** (which docs/stages run), not reasoning depth or model spend. The real cost model — the Opus/Sonnet/Haiku ladder, "Opus ~10x Sonnet" — lives as prose in `tiered-orchestration-pattern.md`, applied by operator judgment, never config (charter req #3, partial).

## Decision

Add a `cost:` block to `blueprint.yml` with a **per-stage** effort + model vector, orthogonal to `execution.depth`.

- **effort** uses Claude Code's enum **verbatim**: `low | medium | high | xhigh | max`. The operator named that exact dial; a custom preset or numeric scale would fail canonical-pattern-first against the named vendor.
- **model_tier**: `opus | sonnet | haiku | inherit`, defaults anchored to the tiered-orchestration ladder (Orchestrator=opus, Implementer/Janitor=sonnet) and **labeled provisional** — anchors emerge from telemetry after ~10 cycles, never ship as defaults.
- **Orthogonality**: `execution.depth` answers "how many docs"; `cost.effort` answers "how hard each stage thinks." Two axes (the specchain strategy×depth precedent).
- **Materialization**: the value only takes effect if Blueprint writes it into subagent/skill frontmatter at dispatch (or sets the per-stage env var). Inline-orchestrator stages are advisory-only — documented as such.
- **Skip-justification gate**: a `.mjs` reviewer emits a BLOCK finding when a stage's resolved effort/model_tier is below its anchored default and no `skip_justification` string is present. Under-processing becomes a recorded conscious choice (charter risk #3).
- **Telemetry**: append-only `.blueprint/telemetry.jsonl` (stage, effort, model_tier, duration_ms, reviewer pass/fail); `blueprint cost` sweeps it. `duration_ms` is a tier-weighted **time proxy**, not dollars (Claude Code doesn't expose per-turn tokens to a skill) — labeled to prevent misreading.

```yaml
cost:
  default: { effort: medium, model_tier: inherit }
  stages:
    research:      { effort: high,   model_tier: opus }     # arbitration-heavy
    prototype:     { effort: high,   model_tier: sonnet }
    fact_check:    { effort: xhigh,  model_tier: opus }      # false-green guard
    deploy:        { effort: low,    model_tier: sonnet, skip_justification: "mechanical" }
```

## Why not canonical (divergences)

- **Per-stage vector vs Claude Code's session-global `effortLevel`/`model`** — Blueprint's unit of work is the stage; subagent frontmatter already carries per-agent effort+model in the vendor model, so per-stage is the *faithful projection*, not a divergence of substance.
- **Skip-justification gate has no vendor analog** — Claude Code honors any effort silently; charter risk #3 makes silence the failure mode. Built as a headless CI reviewer (not an interactive prompt), on specchain's never-downgrade-silently discipline.
- **Local JSONL telemetry, not OpenTelemetry** — OTel needs a collector service, out by ceiling A; chosen pattern is the vendor's own lightweight `skill-usage.jsonl` shape.

## Consequences

- **Positive**: closes req #3 with the exact dial the operator named; the cost model moves from prose-judgment to config; the gate prevents the documented 738-vs-48-line gold-plate/under-process asymmetry.
- **Negative**: per-stage frontmatter materialization is real wiring; advisory-only on inline-orchestrator stages is a partial. Defaults are provisional until telemetry calibrates them.
- **Reuse**: `model_tier` defaults from `tiered-orchestration-pattern.md`; `blueprint cost` clones `wave-digest/digest.mjs`'s read→filter→report shape; the gate reuses the ADR-0006/ADR-0002 reviewer machinery.

## Follow-ups

- Build order steps 4–6 (config → telemetry → gate). The gate depends on the reviewer machinery (ADR-0006/step 3).
- Re-anchor `model_tier` defaults from real telemetry after ~10 cycles; record the calibration as an amendment.
