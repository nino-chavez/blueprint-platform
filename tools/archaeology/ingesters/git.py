#!/usr/bin/env python3
"""Git ingester — commits/branches/merges → archaeology events.

SKELETON. Contract finalized; body to be filled in.

Event types to emit:
  commit, branch_create, branch_delete, merge

Refs to capture:
  - in_branch     → git:<branch>
  - by_author     → github:user/<login> | email
  - closes        → github:issue#<num> | hive:proposal#<num>  (from commit message)
  - synthesis     → hive:synthesis#<id-or-num>                (from commit message)
  - touched_file  → file:<path>                                (from diff)
  - merges_into   → git:<branch>                               (on merge events)

Source ID: commit SHA (full, not short), branch:<name>.
source_ts: AuthorDate from git log (committer date as fallback).

Backfill: `git log --all --format='%H%n%ai%n%an%n%ae%n%s%n%b%x00'` with appropriate
parsing. Use `ingest_bookmarks` table to record last-ingested SHA for resumable runs.

Tail options:
  (a) post-receive hook on the bare upstream — works for self-hosted git, awkward
      for GH. Not recommended for GH-hosted projects.
  (b) GH Action on push that calls `git.py tail --since <last_bookmark>` — recommended.
      Lower latency than nightly batch; runs on every push so multi-branch coverage
      is automatic.

Large diffs go to R2 via `blob_content` field; the event row keeps only a short
excerpt + the file list.
"""
from __future__ import annotations

import argparse
import json


def main() -> None:
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    bf = sub.add_parser("backfill")
    bf.add_argument("--repo-path", default=".")
    bf.add_argument("--since", default=None, help="RFC3339 — only emit commits after this ts")
    args = ap.parse_args()

    print(json.dumps({"status": "skeleton", "ingester": "git", "note": "implement per docstring"}, indent=2))


if __name__ == "__main__":
    main()
