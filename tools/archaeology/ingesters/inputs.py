#!/usr/bin/env python3
"""
Inputs ingester — docs/inputs/_manifest.yaml → archaeology events.

Emits one event per provenance manifest entry:
  - type=external_input for real entries (anything with `included_why`)
  - type=gap_declared    for gap entries (anything with `excluded_why`)

Subtype by category (competitive | licensed-source | bc-internal | merchant-interview |
external-standard | analyst-report | conversation) lives in payload.category so /derive
retrieval can filter by it.

Refs:
  - `influenced` strings (ADR-NNNN, synthesis-N, PRD§X, BRD§X, STRATEGY, ARCHITECTURE,
    epic-NN, hive-N) become `kind=influenced` with target=adr:ADR-NNNN, hive:synthesis#N,
    spec:PRD§X, etc.
  - `local_path` (when present) becomes `kind=lives_at` with target=file:<path>
  - `source` URL (when present) becomes `kind=external_source` with target=url:<url>

Source ID: the manifest entry `id` (stable slug). source_ts: `acquired` for real
entries; for gap entries, the file mtime is used as a placeholder so the event still
sorts into the timeline.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

import yaml

sys.path.insert(0, str(Path(__file__).parent))
from _common import Event, Ref, emit_iterable  # noqa: E402

SOURCE = "inputs"
DEFAULT_MANIFEST = os.environ.get(
    "ARCHAEOLOGY_INPUTS_MANIFEST",
    str(Path(__file__).resolve().parents[3] / "docs/inputs/_manifest.yaml"),
)

INFLUENCED_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"^ADR-(\d{4})"),        "adr:ADR-{0}"),
    (re.compile(r"^synthesis-(\d+)"),    "hive:synthesis#{0}"),
    (re.compile(r"^hive-(\d+)"),         "hive:proposal#{0}"),
    (re.compile(r"^epic-(\d{2,})"),      "epic:{0}"),
    (re.compile(r"^PRD§(.+)"),           "spec:PRD#{0}"),
    (re.compile(r"^BRD§(.+)"),           "spec:BRD#{0}"),
    (re.compile(r"^STRATEGY"),           "spec:STRATEGY"),
    (re.compile(r"^ARCHITECTURE"),       "spec:ARCHITECTURE"),
    (re.compile(r"^methodology"),        "spec:METHODOLOGY"),
]


def normalize_influenced(item: str) -> str | None:
    """Map an `influenced` string from the manifest to a substrate ref target."""
    item = item.strip()
    for pat, tmpl in INFLUENCED_PATTERNS:
        m = pat.match(item)
        if m:
            return tmpl.format(*m.groups()) if m.groups() else tmpl
    return None


def entry_to_event(entry: dict, manifest_mtime: str) -> Event:
    """Convert one manifest entry to an Event."""
    entry_id = entry["id"]
    is_gap = "excluded_why" in entry
    ev_type = "gap_declared" if is_gap else "external_input"

    # source_ts: real entry → acquired date; gap → manifest mtime
    if "acquired" in entry:
        acquired = entry["acquired"]
        if isinstance(acquired, datetime):
            source_ts = acquired.astimezone(timezone.utc).isoformat()
        else:
            # ISO date string from YAML; normalize to RFC3339 at start-of-day UTC
            source_ts = f"{acquired}T00:00:00+00:00"
    else:
        source_ts = manifest_mtime

    refs: list[Ref] = []
    for inf in entry.get("influenced", []) or []:
        target = normalize_influenced(inf)
        if target:
            refs.append(Ref("influenced", target))

    if entry.get("local_path"):
        refs.append(Ref("lives_at", f"file:{entry['local_path']}"))

    src = entry.get("source")
    if src and (src.startswith("http://") or src.startswith("https://") or src.startswith("slack://")):
        refs.append(Ref("external_source", f"url:{src}"))

    return Event(
        source=SOURCE,
        source_id=entry_id,
        source_ts=source_ts,
        type=ev_type,
        actor="nino",
        payload={
            "category": entry.get("category"),
            "title": entry.get("title"),
            "source": entry.get("source"),
            "local_path": entry.get("local_path"),
            "included_why": entry.get("included_why"),
            "excluded_why": entry.get("excluded_why"),
            "notes": entry.get("notes"),
            "influenced": entry.get("influenced", []),
            "is_gap": is_gap,
        },
        refs=refs,
    )


def manifest_events(manifest_path: Path) -> Iterable[Event]:
    with open(manifest_path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    if not isinstance(data, dict) or "entries" not in data:
        raise ValueError(f"Invalid manifest at {manifest_path}: missing entries")

    # Used only for gap entries (no acquired date).
    mtime_iso = datetime.fromtimestamp(
        manifest_path.stat().st_mtime, tz=timezone.utc
    ).isoformat()

    for entry in data["entries"]:
        if not isinstance(entry, dict) or "id" not in entry:
            print(f"[inputs] skipping malformed entry: {entry!r}", file=sys.stderr)
            continue
        yield entry_to_event(entry, mtime_iso)


def backfill(manifest_path: str) -> dict:
    p = Path(manifest_path)
    print(f"[inputs] backfilling from {p}", file=sys.stderr)
    return emit_iterable(manifest_events(p))


def main() -> None:
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    bf = sub.add_parser("backfill")
    bf.add_argument("--manifest", default=DEFAULT_MANIFEST)
    args = ap.parse_args()

    stats = backfill(args.manifest)
    print(json.dumps(stats, indent=2))


if __name__ == "__main__":
    main()
