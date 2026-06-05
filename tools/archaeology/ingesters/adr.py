#!/usr/bin/env python3
"""ADR ingester — docs/decisions/*.md → archaeology events.

SKELETON. Contract finalized; body to be filled in.

Event types to emit:
  adr_created       — when a new ADR file lands
  adr_status_change — when status frontmatter changes (proposed → accepted → superseded)
  adr_superseded    — when an ADR references `supersedes:` another

Refs to capture:
  - lives_at         → file:docs/decisions/NNNN-slug.md
  - ratified_via     → hive:synthesis#<id-or-uuid>   (from frontmatter or body)
  - ratifies         → hive:proposal#<num>           (from frontmatter `proposal_ids[]`)
  - supersedes       → adr:ADR-NNNN                  (when this ADR replaces another)
  - superseded_by    → adr:ADR-NNNN                  (emitted on the superseded ADR's event)
  - mentions         → adr:ADR-NNNN | hive:proposal#N | github:issue#N (from body text)

Source ID: ADR-NNNN (e.g., "ADR-0055"). source_ts: from frontmatter `date:` or git log.

Backfill mode: walk docs/decisions/*.md.
Tail mode: invoked by post-merge GH Action that diffs docs/decisions/ on push to dev/main.

See template/tools/archaeology/ingesters/iterations.py for a reference body that parses
the auto-generated history view of ADRs — both ingesters land complementary events with
the same source_id (ADR-NNNN), and the substrate's UNIQUE constraint dedupes correctly
because their `source` and `type` differ ("adr" vs "iterations", "adr_created" vs
"decision_logged").
"""
from __future__ import annotations

import argparse
import json
import sys


def main() -> None:
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    bf = sub.add_parser("backfill")
    bf.add_argument("--adr-dir", default="docs/decisions")
    args = ap.parse_args()

    print(json.dumps({"status": "skeleton", "ingester": "adr", "note": "implement per docstring"}, indent=2))


if __name__ == "__main__":
    main()
