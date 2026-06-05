# Start Here — Blueprint

> For a team evaluating Blueprint. Three questions: what is it, see it in action,
> how do we try it. ~5 minutes.

## What it is

Blueprint is an agent-assisted methodology + CLI for running a product
initiative end-to-end — **research → prototype → strategy docs → fact-check →
deploy** — that ships one portal serving three audiences from a single place:
leadership (strategy), engineering (feasibility), and everyone (an interactive
prototype with the design rationale attached).

You bring the context (screenshots, a brief, codebase access, competitive intel).
The agent runs the pipeline; the output is a deployable deliverable package, not a
pile of docs.

## See it in action

**The live portal:** https://blueprint-platform.pages.dev

That site is Blueprint applied to *itself* — the methodology used to productize
the methodology. It's the same shape of portal Blueprint generates for any
initiative, so it doubles as "here's what the output looks like." Worth clicking:

- **discover** — what the platform is
- **roadmap** — the build, end-to-end (it's done)
- **inspect** — the decisions (ADRs) + research behind every choice

**The source:** this repo (public). [`decisions/`](decisions/) holds the ADRs,
[`research/`](research/) the analysis that grounds them, `apps/portal/` the portal
you just clicked.

## What it can do

Seven pipeline stages (research, design-principles, prototype, fact-check,
documents, deploy, iterate), driven by a thin CLI:

| Command | Does |
|---|---|
| `blueprint init` | scaffold a new initiative's portal (Pattern A platform / B redesign-review) |
| `blueprint review` | run an executable conformance reviewer (+ org-authored ones) |
| `blueprint cost` | per-stage effort/model dial + telemetry (run it like Claude Code's effort level) |
| `blueprint fleet` | see every consumer initiative's drift from the methodology version |
| `blueprint upgrade` | preview/apply a non-breaking methodology bump in your repo |
| `blueprint doctor` | conformance/health check — actually runs the gates, not a files-exist green |

Configurable cost, git-native access (CODEOWNERS + rulesets, no auth service),
bidirectional updates (push non-breaking down, accept fixes/RFCs up), and
org-authored reviewers without forking.

## Blueprint vs Hive — two parts, on purpose

- **Blueprint** (this) — the planning/prototyping methodology + toolchain.
- **Hive** — the multi-operator coordination layer (separate repo, owned by
  Travis). Blueprint *plans*; Hive *coordinates*. Companions, integrated, not
  merged.

## How your team tries it

Honest state today:

- **Explore now** — the portal + this repo are live and public. Nothing to install.
- **Run it** — the CLI (`@nino-chavez/blueprint-cli`) is built but **not yet on
  npm**, and deploys currently target a hackathon Cloudflare account. Once it's
  published, the on-ramp is:

  ```bash
  npx @nino-chavez/blueprint-cli init --pattern=A --target=my-initiative
  cd my-initiative
  # edit blueprint.yml (project, audience, research scope, cost dial)
  # then run the pipeline with Claude Code — the stamped CLAUDE.md drives each stage
  ```

- **Go deeper** — `decisions/00-charter.md` (the why + the six tracks),
  `decisions/01-prescription.md` (what ships, the build order).

Want a 20-minute walkthrough for the team, or to be a pilot? Open an issue or ping
in #ai-hive.
