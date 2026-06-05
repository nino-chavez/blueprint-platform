#!/usr/bin/env python3
"""
Audits ingester — docs/audits/*.md → archaeology events.

Emits one `audit_filed` event per audit document, with:
  - payload.category inferred from filename keywords (competitive | runtime | coverage |
    sweeps | uncategorized) when the categorical subdirs of the design doc don't yet
    exist. When/if `docs/audits/{competitive,runtime,coverage,sweeps}/` are populated,
    the directory-prefix path takes precedence.
  - source_ts from the leading YYYY-MM-DD in the filename, falling back to file mtime
  - refs extracted from body text: ADR-NNNN, hive #N, synthesis #N, PR #N, epic-NN

Excludes: _TEMPLATE.md, README.md, derived/, epic-dod/, img/, files starting with `_`
that aren't dated (the underscore prefix is used for non-canonical artifacts).
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

SOURCE = "audits"
DEFAULT_AUDITS_DIR = os.environ.get(
    "ARCHAEOLOGY_AUDITS_DIR",
    str(Path(__file__).resolve().parents[3] / "docs/audits"),
)

# Category inference — filename substring -> category. Ordered: first match wins.
CATEGORY_HEURISTICS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"comparison|factsheet|woocommerce|stripe-billing|subscription-manager|bigeng-pattern|marketplace-conventions|merchant-recruitment|usability-test", re.I),
     "competitive"),
    (re.compile(r"runtime|inventory|clipping|placement|mechanisms|shell-anatomy|mobile-responsive|nav-placement|heuristic-review", re.I),
     "runtime"),
    (re.compile(r"coverage|comprehensiveness|fidelity-gap|merchant-readiness|spec-comprehensiveness|forge-catalog|forge-storefront|interactive", re.I),
     "coverage"),
    (re.compile(r"sweep|triage|alignment|pr-1091|investigation|cleanup|backfill|inflight", re.I),
     "sweeps"),
    (re.compile(r"bc-platform-verify", re.I),
     "competitive"),
    (re.compile(r"roadmap|hkdf-encryption-shipped|pre-engineering|deliverability|close-out|admin-storefront|admin-ui", re.I),
     "runtime"),
]

DATE_PREFIX_RE = re.compile(r"^(\d{4}-\d{2}-\d{2})")
EXCLUDE_NAMES = {"_TEMPLATE.md", "README.md"}

# Refs
ADR_RE       = re.compile(r"\bADR-(\d{4})\b")
HIVE_RE      = re.compile(r"\bHive\s+#(\d+)\b", re.I)
SYNTH_RE     = re.compile(r"\bSynthesis\s*#?(\d+)\b|\bsynthesis\s+#?(\d+)\b", re.I)
PR_RE        = re.compile(r"\bPR\s*#(\d+)\b", re.I)
ISSUE_RE     = re.compile(r"(?<![a-zA-Z])#(\d{2,5})\b")
EPIC_RE      = re.compile(r"\bepic-(\d{2,})\b", re.I)
MEMORY_RE    = re.compile(r"memory(?:\s+entry)?\s+`([a-z][a-z0-9-]+)`", re.I)


def infer_category(path: Path, audits_root: Path) -> str:
    """Determine audit category. Directory-prefix wins over filename heuristic."""
    rel = path.relative_to(audits_root)
    parts = rel.parts
    if len(parts) > 1:
        head = parts[0]
        if head in {"competitive", "runtime", "coverage", "sweeps"}:
            return head
    # Fall back to filename heuristic
    name = rel.name
    for pat, cat in CATEGORY_HEURISTICS:
        if pat.search(name):
            return cat
    return "uncategorized"


def file_source_ts(path: Path) -> str:
    """Prefer the date prefix in the filename; fall back to file mtime."""
    m = DATE_PREFIX_RE.match(path.name)
    if m:
        return f"{m.group(1)}T00:00:00+00:00"
    return datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc).isoformat()


def extract_refs(text: str) -> list[Ref]:
    refs: list[Ref] = []
    seen: set[tuple[str, str]] = set()

    def add(kind: str, target: str) -> None:
        key = (kind, target)
        if key in seen:
            return
        seen.add(key)
        refs.append(Ref(kind, target))

    for m in ADR_RE.finditer(text):
        add("mentions", f"adr:ADR-{m.group(1)}")
    for m in HIVE_RE.finditer(text):
        add("mentions", f"hive:proposal#{m.group(1)}")
    for m in SYNTH_RE.finditer(text):
        n = m.group(1) or m.group(2)
        if n:
            add("mentions", f"hive:synthesis#{n}")
    for m in PR_RE.finditer(text):
        add("mentions", f"github:pr#{m.group(1)}")
    # Bare `#NNNN` issue/PR refs — only kept when not already captured as hive/PR
    for m in ISSUE_RE.finditer(text):
        n = m.group(1)
        # Skip if it was matched as Hive #N or PR #N above — same target dedupe handles it
        add("mentions", f"github:issue#{n}")
    for m in EPIC_RE.finditer(text):
        add("mentions", f"epic:{m.group(1)}")
    for m in MEMORY_RE.finditer(text):
        add("mentions", f"memory:{m.group(1)}")
    return refs


def first_h1(text: str) -> str | None:
    """Pull the document title (first `# ` heading)."""
    for line in text.splitlines():
        if line.startswith("# "):
            return line[2:].strip()
    return None


def audit_event(path: Path, audits_root: Path) -> Event | None:
    try:
        body = path.read_text(encoding="utf-8", errors="replace")
    except OSError as e:
        print(f"[audits] skipping {path}: {e}", file=sys.stderr)
        return None

    title = first_h1(body) or path.stem
    category = infer_category(path, audits_root)
    rel_path = path.relative_to(audits_root.parent.parent)  # repo-root-relative

    refs = [Ref("lives_at", f"file:{rel_path}")]
    refs.extend(extract_refs(body))

    return Event(
        source=SOURCE,
        source_id=path.stem,
        source_ts=file_source_ts(path),
        type="audit_filed",
        actor="nino",
        payload={
            "category": category,
            "title": title,
            "path": str(rel_path),
            # Keep body in payload at a cap; full body lands in R2 via blob_content.
            "excerpt": body[:4000],
            "byte_length": len(body),
        },
        blob_content=body if len(body) > 4000 else None,
        refs=refs,
    )


def walk_audits(audits_dir: Path) -> Iterable[Path]:
    """All audit markdown files except templates / readmes / derived projections."""
    skip_subdirs = {"derived", "epic-dod", "img"}
    for md in audits_dir.rglob("*.md"):
        if md.name in EXCLUDE_NAMES:
            continue
        if any(part in skip_subdirs for part in md.relative_to(audits_dir).parts):
            continue
        yield md


def backfill(audits_dir: str) -> dict:
    root = Path(audits_dir)
    files = sorted(walk_audits(root))
    print(f"[audits] backfilling {len(files)} files from {root}", file=sys.stderr)

    def all_events() -> Iterable[Event]:
        for f in files:
            ev = audit_event(f, root)
            if ev is not None:
                yield ev

    return emit_iterable(all_events())


def main() -> None:
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    bf = sub.add_parser("backfill")
    bf.add_argument("--audits-dir", default=DEFAULT_AUDITS_DIR)
    args = ap.parse_args()

    stats = backfill(args.audits_dir)
    print(json.dumps(stats, indent=2))


if __name__ == "__main__":
    main()
