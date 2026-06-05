#!/usr/bin/env python3
"""
Iterations ingester — docs/iterations/_history.md → archaeology events.

The history ledger is the auto-derived chronological view of every ratified ADR plus
the invalidated-paths register. Both sections become first-class events in the
archaeology substrate.

Event types emitted:
  decision_logged   — one per ADR row in §1 "Decision lineage (chronological)"
  adr_superseded    — one per IP row in §2 "Rejected paths (invalidated-paths register)"
                       (uses the design doc's vocabulary for "a path we abandoned"; the
                        IP-NN id stays in source_id so timeline traversal still works)

Refs:
  decision_logged → kind=lives_at  target=file:docs/decisions/NNNN-slug.md
                  → kind=ratified_via target=hive:synthesis#<id-or-uuid>
                  → kind=ratifies     target=hive:proposal#N (per proposal listed)
  adr_superseded  → kind=cited_in  target=adr:ADR-NNNN | hive:synthesis#N | hive:proposal#N
                  → kind=mentions  target=memory:<slug>  (from `memory entry \`X\`` phrases)

Source: "iterations" (added to Worker SOURCES set alongside inputs + audits).
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

sys.path.insert(0, str(Path(__file__).parent))
from _common import Event, Ref, emit_iterable  # noqa: E402

SOURCE = "iterations"
DEFAULT_HISTORY = os.environ.get(
    "ARCHAEOLOGY_ITERATIONS_HISTORY",
    str(Path(__file__).resolve().parents[3] / "docs/iterations/_history.md"),
)

# Section anchors
SEC1 = "## 1. Decision lineage"
SEC2 = "## 2. Rejected paths"
SEC3 = "## 3. Deferred"   # cuts off section 2

# §1 — per-ADR record
ADR_HEADER_RE   = re.compile(r"^### (ADR-(\d{4})) — (.+?) · `(\d{4}-\d{2}-\d{2})`$")
ADR_PATH_RE     = re.compile(r"\[`(docs/decisions/[^`]+\.md)`\]")
ADR_SYNTH_RE    = re.compile(r"^Synthesis: `([^`]+)`")
ADR_PROPS_RE    = re.compile(r"^Proposals: (.+)$")
PROP_ENTRY_RE   = re.compile(r"`([0-9a-f-]+)(?: \(#(\d+)\))?`")
LINEAGE_RE      = re.compile(r"^Lineage: (.+)$")

# §2 — per-IP record
IP_HEADER_RE    = re.compile(r"^### (IP-\d+) — (.+)$")
IP_RULED_RE     = re.compile(r"^Ruled out `(\d{4}-\d{2}-\d{2})`(?: · (.+))?$")

# Ref extraction across both sections
ADR_INLINE_RE      = re.compile(r"\bADR-(\d{4})\b")
SYNTH_NUM_RE       = re.compile(r"\bSynthesis\s*#?(\d+)\b|\bsynthesis\s+#?(\d+)\b", re.I)
HIVE_INLINE_RE     = re.compile(r"\bHive\s+#(\d+)\b", re.I)
PR_INLINE_RE       = re.compile(r"\bPR\s*#(\d+)\b", re.I)
MEMORY_INLINE_RE   = re.compile(r"memory\s+entry\s+`([a-z][a-z0-9-]+)`", re.I)


def to_rfc3339(date_str: str) -> str:
    """YYYY-MM-DD → RFC3339 at start-of-day UTC."""
    return f"{date_str}T00:00:00+00:00"


def extract_inline_refs(text: str) -> list[Ref]:
    """Pull ADR/synthesis/hive/PR/memory cross-refs out of free text."""
    refs: list[Ref] = []
    seen: set[tuple[str, str]] = set()

    def add(kind: str, target: str) -> None:
        key = (kind, target)
        if key in seen:
            return
        seen.add(key)
        refs.append(Ref(kind, target))

    for m in ADR_INLINE_RE.finditer(text):
        add("cited_in", f"adr:ADR-{m.group(1)}")
    for m in SYNTH_NUM_RE.finditer(text):
        n = m.group(1) or m.group(2)
        if n:
            add("cited_in", f"hive:synthesis#{n}")
    for m in HIVE_INLINE_RE.finditer(text):
        add("cited_in", f"hive:proposal#{m.group(1)}")
    for m in PR_INLINE_RE.finditer(text):
        add("cited_in", f"github:pr#{m.group(1)}")
    for m in MEMORY_INLINE_RE.finditer(text):
        add("mentions", f"memory:{m.group(1)}")
    return refs


def parse_decision_lineage(block: str) -> Iterable[Event]:
    """Parse §1 decision rows. block = raw markdown of section §1."""
    # Each record runs from a `### ADR-NNNN` header until the next `### ` or end of block.
    records = re.split(r"(?m)^### ", block)
    for rec in records:
        rec = rec.strip()
        if not rec.startswith("ADR-"):
            continue
        # Re-prefix the `### ` we stripped so the header regex matches as written.
        header_match = ADR_HEADER_RE.match("### " + rec.splitlines()[0])
        if not header_match:
            continue
        adr_id   = header_match.group(1)          # ADR-NNNN
        title    = header_match.group(3)
        date_str = header_match.group(4)

        # Path + synthesis + proposals
        path_match  = ADR_PATH_RE.search(rec)
        synth_match = ADR_SYNTH_RE.search(rec, re.MULTILINE) or re.search(r"^Synthesis: `([^`]+)`", rec, re.M)
        props_match = re.search(r"^Proposals: (.+)$", rec, re.M)
        lineage_match = re.search(r"^Lineage: (.+)$", rec, re.M)

        adr_path = path_match.group(1) if path_match else None
        synthesis_id = synth_match.group(1) if synth_match else None
        proposals_raw = props_match.group(1) if props_match else ""

        refs: list[Ref] = []
        if adr_path:
            refs.append(Ref("lives_at", f"file:{adr_path}"))
        if synthesis_id:
            # Synthesis IDs may be UUIDs (`9c93c845-...`) or numeric (`#574`). Both
            # work as targets — UUIDs match what subs-hive D1 stores natively;
            # numeric ids match the GH issue number form used throughout the codebase.
            refs.append(Ref("ratified_via", f"hive:synthesis#{synthesis_id}"))

        for m in PROP_ENTRY_RE.finditer(proposals_raw):
            num = m.group(2)
            if num:
                refs.append(Ref("ratifies", f"hive:proposal#{num}"))
            else:
                # No GH issue number was recorded — fall back to the proposal UUID.
                refs.append(Ref("ratifies", f"hive:proposal-uuid#{m.group(1)}"))

        if lineage_match:
            # e.g. "extends ADR-0010 §1" or "supersedes ADR-0029"
            refs.extend(extract_inline_refs(lineage_match.group(1)))

        # Also catch any inline ADR mentions in the title (e.g. "ADR-0029 follow-up")
        refs.extend(extract_inline_refs(title))

        yield Event(
            source=SOURCE,
            source_id=adr_id,
            source_ts=to_rfc3339(date_str),
            type="decision_logged",
            actor="nino",
            payload={
                "title": title,
                "date": date_str,
                "synthesis_id": synthesis_id,
                "adr_path": adr_path,
                "proposals_raw": proposals_raw,
                "lineage": lineage_match.group(1) if lineage_match else None,
            },
            refs=refs,
        )


def parse_invalidated_paths(block: str) -> Iterable[Event]:
    """Parse §2 IP-NN rows. block = raw markdown of section §2."""
    records = re.split(r"(?m)^### ", block)
    for rec in records:
        rec = rec.strip()
        if not rec.startswith("IP-"):
            continue
        first_line = rec.splitlines()[0]
        header_match = IP_HEADER_RE.match("### " + first_line)
        if not header_match:
            continue
        ip_id = header_match.group(1)
        title = header_match.group(2)

        ruled_match = re.search(r"^Ruled out `(\d{4}-\d{2}-\d{2})`(?: · (.+))?$", rec, re.M)
        if not ruled_match:
            continue
        date_str = ruled_match.group(1)
        source_line = ruled_match.group(2) or ""

        proposed = ""
        ruled_because = ""
        for m in re.finditer(r"\*\*Proposed:\*\*\s*(.*?)(?=\n\n|\Z)", rec, re.S):
            proposed = m.group(1).strip()
        for m in re.finditer(r"\*\*Ruled out because:\*\*\s*(.*?)(?=\n\n|\Z)", rec, re.S):
            ruled_because = m.group(1).strip()

        # Refs from the source line + the rationale body
        refs: list[Ref] = []
        refs.extend(extract_inline_refs(source_line))
        refs.extend(extract_inline_refs(proposed))
        refs.extend(extract_inline_refs(ruled_because))

        yield Event(
            source=SOURCE,
            source_id=ip_id,
            source_ts=to_rfc3339(date_str),
            type="adr_superseded",
            actor="nino",
            payload={
                "title": title,
                "date": date_str,
                "source_line": source_line,
                "proposed": proposed,
                "ruled_out_because": ruled_because,
            },
            refs=refs,
        )


def history_events(history_path: Path) -> Iterable[Event]:
    text = history_path.read_text(encoding="utf-8")
    # Slice section boundaries
    s1_start = text.find(SEC1)
    s2_start = text.find(SEC2)
    s3_start = text.find(SEC3)
    if s1_start < 0 or s2_start < 0:
        raise ValueError(f"{history_path}: cannot find § headers")
    s1_block = text[s1_start:s2_start]
    s2_block = text[s2_start: s3_start if s3_start > 0 else len(text)]
    yield from parse_decision_lineage(s1_block)
    yield from parse_invalidated_paths(s2_block)


def backfill(history_path: str) -> dict:
    p = Path(history_path)
    print(f"[iterations] backfilling from {p}", file=sys.stderr)
    return emit_iterable(history_events(p))


def main() -> None:
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    bf = sub.add_parser("backfill")
    bf.add_argument("--history", default=DEFAULT_HISTORY)
    args = ap.parse_args()

    stats = backfill(args.history)
    print(json.dumps(stats, indent=2))


if __name__ == "__main__":
    main()
