#!/usr/bin/env python3
"""Memory ingester — Claude Code auto-memory entries → archaeology events.

SKELETON. Contract finalized; body to be filled in.

Event types to emit:
  memory_created, memory_updated, memory_removed

Refs to capture:
  - lives_at         → file:~/.claude/projects/<slug>/memory/<name>.md
  - mentions_memory  → memory:<other-slug>           (from [[name]] cross-links)
  - mentions         → adr:ADR-NNNN | hive:proposal#<num> | session:<uuid>

Source ID: the memory slug (kebab-case name from frontmatter).
source_ts: from frontmatter or file mtime.

Backfill: walk `~/.claude/projects/<slug>/memory/*.md`. Skip MEMORY.md (the index).
Tail options:
  (a) Claude Code memory-write hook (if/when an OnMemoryWrite event is available)
  (b) Cron job that walks the dir nightly and emits new/changed events

The substrate's UNIQUE constraint on (source, source_id, type, source_ts) means
re-running backfill is cheap and safe — only new/changed entries land.
"""
from __future__ import annotations

import argparse
import json


def main() -> None:
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    bf = sub.add_parser("backfill")
    bf.add_argument("--memory-dir", default=None,
                    help="default: ~/.claude/projects/<project>/memory/")
    args = ap.parse_args()

    print(json.dumps({"status": "skeleton", "ingester": "memory", "note": "implement per docstring"}, indent=2))


if __name__ == "__main__":
    main()
