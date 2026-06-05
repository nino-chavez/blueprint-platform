# blueprint-platform — folded into Blueprint (archived)

> **This repository is archived (read-only) as of 2026-06-05.**
> Its work was **folded into the canonical Blueprint repo** as Blueprint's own
> in-repo self-application — "the compiler that compiles itself."

## What happened

`blueprint-platform` was the productization dogfood: Blueprint applied to itself
to turn the methodology into a team-adoptable, portable platform. That work is
complete and now lives **inside the methodology source** (`nino-chavez/blueprint`),
not as a separate consumer repo. The separation was retired because the
source-vs-consumer boundary that keeps the methodology reusable is a **directory
boundary** (`template/` is what external consumers stamp), not a repo boundary —
so the methodology can host its own reference implementation without losing reuse.

## Where everything went

| Was here | Now lives at (`nino-chavez/blueprint`) |
|---|---|
| `apps/portal/` | `apps/portal/` — the live Pattern A reference portal + onboarding KB |
| `packages/` | `packages/` (`@blueprint/ui`, `design-tokens`, `gate-derive`) |
| `research/`, `decisions/` | `research/`, `decisions/` (ADRs already canon at `docs/decisions/ADR-0003..0007`) |
| `tools/archaeology/` | `tools/archaeology/` — the live event-sourced provenance substrate |
| `blueprint.yml` | root `blueprint.yml` (the self-application config) |
| deployed portal | same Pages project, now deployed **from the canonical repo** |

## The history is preserved

Nothing was lost. The full productization history — recon, canonical research,
ADR deliberation, design workflows — is queryable via the **archaeology substrate**
(`tools/archaeology/`, 949 events / 1165 chunks over the 13 productization
sessions), and the git history of this repo remains intact here in the archive.

See `nino-chavez/blueprint` → `WAVE-LOG.md` (wave 45) for the fold record.
