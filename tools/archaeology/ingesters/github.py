#!/usr/bin/env python3
"""GitHub ingester — issues/PRs/comments/reviews/labels → archaeology events.

SKELETON. Contract finalized; body to be filled in.

Event types to emit:
  issue_open, issue_close, issue_comment, pr_open, pr_merge, pr_close,
  pr_review, pr_comment, label_add, label_remove

Refs to capture:
  - in_repo       → github:repo/<owner>/<name>
  - by_author     → github:user/<login>
  - closes        → hive:proposal#<num> | github:issue#<num>   (from body keywords)
  - synthesis     → hive:synthesis#<id-or-num>                 (from PR/commit body)
  - mentions      → adr:ADR-NNNN | hive:proposal#<num>         (from body text)

Source ID: issue#<num>, pr#<num>, comment#<id>, review#<id>.
source_ts: created_at from the GH API.

Backfill: `gh api repos/<owner>/<name>/events --paginate`, or per-resource:
  gh api repos/.../issues --paginate
  gh api repos/.../pulls --paginate
  gh api repos/.../issues/comments --paginate

Tail: GitHub webhook → Worker endpoint POST /events/github-webhook (Worker handler
needs to be added — currently only POST /events is wired).

See archaeology-substrate-pattern.md §"Day-0 Bootstrap Sequence" for the webhook
config recipe.
"""
from __future__ import annotations

import argparse
import json


def main() -> None:
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    bf = sub.add_parser("backfill")
    bf.add_argument("--repo", required=True, help="owner/name")
    bf.add_argument("--since", default=None, help="RFC3339 — only emit events after this ts")
    args = ap.parse_args()

    print(json.dumps({"status": "skeleton", "ingester": "github", "note": "implement per docstring"}, indent=2))


if __name__ == "__main__":
    main()
