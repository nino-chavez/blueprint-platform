#!/usr/bin/env python3
"""
Sessions ingester — Claude Code session JSONLs → archaeology events.

Backfill mode: walk all JSONLs in the project's session dir.
Tail mode: invoked by `SessionEnd` hook for a single session file.

Event types emitted:
  session_start, user_turn, assistant_turn, tool_use, tool_result, session_end

Refs captured:
  in_branch       → git:<branch>
  in_cwd          → file:<cwd>
  fetched_url     → url:<url>          (from WebFetch tool_use)
  mentions        → adr:ADR-NNNN | hive:proposal#N | github:issue#N | github:pr#N

Sanitization (inherited from tools/session-mine/sanitize.py):
  - drop credentials paths, /tmp ephemera, token-bearing URLs
  - assistant_turn payloads are full text but pruned of internal hook noise
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import Iterable

# allow running as `python3 ingesters/sessions.py` from tools/archaeology/
sys.path.insert(0, str(Path(__file__).parent))
from _common import Event, Ref, emit_iterable  # noqa: E402

SOURCE = "session"
# Claude Code derives session dir from the project's absolute path by replacing
# every '/' with '-' and prepending '~/.claude/projects/'. scaffold-archaeology.sh
# substitutes -Users-nino-Workspace-dev-wip-blueprint-platform at install time; you can also override
# at call time with `--session-dir <path>`.
DEFAULT_SESSION_DIR = os.environ.get(
    "ARCHAEOLOGY_SESSION_DIR",
    os.path.expanduser("~/.claude/projects/-Users-nino-Workspace-dev-wip-blueprint-platform"),
)

# Reference-extraction patterns over user/assistant text
ADR_RE       = re.compile(r"\bADR[-\s]?(\d{4})\b")
HIVE_PROP_RE = re.compile(r"\bhive\s*[#]?(\d+)\b|\bproposal\s+#?(\d+)\b", re.I)
GH_ISSUE_RE  = re.compile(r"\b(?:issue|#)\s*(\d{2,5})\b", re.I)
GH_PR_RE     = re.compile(r"\bPR\s*#?(\d{2,5})\b", re.I)

SENSITIVE_PATH_RE = re.compile(r"credentials|secret|\.env|/tmp/|/private/tmp/", re.I)
SENSITIVE_URL_RE  = re.compile(r"[?&](token|key|secret|password|sig)=", re.I)


def is_safe_path(p: str) -> bool:
    return not SENSITIVE_PATH_RE.search(p)


def is_safe_url(u: str) -> bool:
    return not SENSITIVE_URL_RE.search(u)


def extract_refs(text: str) -> list[Ref]:
    refs: list[Ref] = []
    seen: set[tuple[str, str]] = set()

    def add(kind: str, target: str) -> None:
        key = (kind, target)
        if key in seen:
            return
        seen.add(key)
        refs.append(Ref(kind=kind, target=target))

    for m in ADR_RE.finditer(text):
        add("mentions", f"adr:ADR-{m.group(1)}")
    for m in HIVE_PROP_RE.finditer(text):
        n = m.group(1) or m.group(2)
        add("mentions", f"hive:proposal#{n}")
    for m in GH_ISSUE_RE.finditer(text):
        add("mentions", f"github:issue#{m.group(1)}")
    for m in GH_PR_RE.finditer(text):
        add("mentions", f"github:pr#{m.group(1)}")
    return refs


def extract_text(content) -> str:
    """Pull plain text out of message.content (string or list of blocks)."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for block in content:
            if isinstance(block, dict) and block.get("type") == "text":
                parts.append(block.get("text", ""))
        return "\n".join(parts)
    return ""


def iter_records(path: Path) -> Iterable[dict]:
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                yield json.loads(line)
            except json.JSONDecodeError:
                continue


def session_events(path: Path) -> Iterable[Event]:
    """Yield all events for a single JSONL session file."""
    session_id = path.stem
    branch: str | None = None
    cwd: str | None = None
    first_ts: str | None = None
    last_ts: str | None = None
    record_count = 0

    for rec in iter_records(path):
        record_count += 1
        rtype = rec.get("type")
        ts = rec.get("timestamp", "")
        if not ts:
            continue
        if first_ts is None:
            first_ts = ts
        last_ts = ts

        branch = rec.get("gitBranch") or branch
        cwd = rec.get("cwd") or cwd

        msg = rec.get("message") or {}
        content = msg.get("content")

        # user turns
        if rtype == "user" and content:
            text = extract_text(content)
            if not text:
                continue
            yield Event(
                source=SOURCE,
                source_id=session_id,
                source_ts=ts,
                type="user_turn",
                actor="nino",
                payload={"text": text[:8000]},
                refs=_session_refs(branch, cwd) + extract_refs(text),
            )

        # assistant turns + tool uses
        if rtype == "assistant" and isinstance(content, list):
            text_parts: list[str] = []
            for block in content:
                if not isinstance(block, dict):
                    continue
                btype = block.get("type")
                if btype == "text":
                    text_parts.append(block.get("text", ""))
                elif btype == "tool_use":
                    name = block.get("name", "")
                    inp = block.get("input") or {}
                    tool_refs = _session_refs(branch, cwd)
                    if name == "WebFetch":
                        url = inp.get("url", "")
                        if url and is_safe_url(url):
                            tool_refs.append(Ref("fetched_url", f"url:{url}"))
                    elif name in ("Read", "Write", "Edit"):
                        fp = inp.get("file_path", "")
                        if fp and is_safe_path(fp):
                            tool_refs.append(Ref("touched_file", f"file:{fp}"))
                    yield Event(
                        source=SOURCE,
                        source_id=session_id,
                        source_ts=ts,
                        type="tool_use",
                        actor=f"agent:{session_id}",
                        payload={
                            "tool": name,
                            "input": _sanitize_tool_input(inp),
                        },
                        refs=tool_refs,
                    )

            if text_parts:
                text = "\n".join(text_parts)
                yield Event(
                    source=SOURCE,
                    source_id=session_id,
                    source_ts=ts,
                    type="assistant_turn",
                    actor=f"agent:{session_id}",
                    payload={"text": text[:8000]},
                    refs=_session_refs(branch, cwd) + extract_refs(text),
                )

    # bookend session_start / session_end
    if first_ts:
        yield Event(
            source=SOURCE,
            source_id=session_id,
            source_ts=first_ts,
            type="session_start",
            actor="nino",
            payload={"branch": branch, "cwd": cwd, "record_count": record_count},
            refs=_session_refs(branch, cwd),
        )
    if last_ts:
        yield Event(
            source=SOURCE,
            source_id=session_id,
            source_ts=last_ts,
            type="session_end",
            actor="nino",
            payload={"branch": branch, "cwd": cwd, "record_count": record_count},
            refs=_session_refs(branch, cwd),
        )


def _session_refs(branch: str | None, cwd: str | None) -> list[Ref]:
    refs: list[Ref] = []
    if branch:
        refs.append(Ref("in_branch", f"git:{branch}"))
    if cwd:
        refs.append(Ref("in_cwd", f"file:{cwd}"))
    return refs


def _sanitize_tool_input(inp: dict) -> dict:
    """Strip sensitive paths/URLs from tool inputs before emitting."""
    out: dict = {}
    for k, v in inp.items():
        if isinstance(v, str):
            if SENSITIVE_PATH_RE.search(v) or SENSITIVE_URL_RE.search(v):
                out[k] = "[REDACTED]"
            else:
                out[k] = v[:2000]
        else:
            out[k] = v
    return out


def backfill(session_dir: str) -> dict:
    files = sorted(Path(session_dir).glob("*.jsonl"))
    print(f"[sessions] backfilling {len(files)} files from {session_dir}", file=sys.stderr)

    def all_events() -> Iterable[Event]:
        for f in files:
            yield from session_events(f)

    return emit_iterable(all_events())


def tail(jsonl_path: str) -> dict:
    """Single-file mode for SessionEnd hook."""
    return emit_iterable(session_events(Path(jsonl_path)))


def main() -> None:
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    bf = sub.add_parser("backfill")
    bf.add_argument("--session-dir", default=DEFAULT_SESSION_DIR)
    t = sub.add_parser("tail")
    t.add_argument("--jsonl", required=True)
    args = ap.parse_args()

    if args.cmd == "backfill":
        stats = backfill(args.session_dir)
    else:
        stats = tail(args.jsonl)
    print(json.dumps(stats, indent=2))


if __name__ == "__main__":
    main()
