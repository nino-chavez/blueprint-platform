#!/usr/bin/env python3
"""Hive ingester — proposals/synthesis/decisions/tasks → archaeology events.

SKELETON. Contract finalized; body to be filled in.

Event types to emit:
  proposal_filed, proposal_state_change, synthesis_created,
  decision_logged, task_claimed, task_completed, task_released

Refs to capture:
  - filed_by      → github:user/<login> | "agent:<session-id>"
  - in_project    → hive:project#<uuid>
  - closes        → hive:proposal#<num>          (synthesis closes proposals)
  - ratifies      → hive:proposal#<num>          (per `proposal_ids` array)
  - claimed_by    → "agent:<session-id>" | github:user/<login>
  - blocked_by    → hive:proposal#<num>          (from hive-meta.blocked_by)
  - mentions      → adr:ADR-NNNN | github:issue#<num>

Source ID: proposal#<num>, synthesis#<id-or-num>, task#<short-id>, decision#<id>.
source_ts: created_at / updated_at from the Hive D1.

Backfill: read from the project's Hive Worker derived endpoints:
  GET /api/derived/proposals
  GET /api/derived/synthesis
  GET /api/derived/decisions
  GET /api/derived/tasks

Tail: add ONE fetch() in the Hive Worker's mutation handlers (hive_propose,
hive_synthesize, hive_log_decision, hive_claim_task, etc.) that mirrors the
event to the archaeology Worker. Minimal change to the existing Worker, ~20 lines.

See `hive-coordination-pattern.md` for the upstream Hive design; this ingester
attaches to the Hive substrate as a read-side consumer.
"""
from __future__ import annotations

import argparse
import json


def main() -> None:
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    bf = sub.add_parser("backfill")
    bf.add_argument("--hive-endpoint", required=True, help="https://<project>-hive-mcp.<...>.workers.dev")
    args = ap.parse_args()

    print(json.dumps({"status": "skeleton", "ingester": "hive", "note": "implement per docstring"}, indent=2))


if __name__ == "__main__":
    main()
