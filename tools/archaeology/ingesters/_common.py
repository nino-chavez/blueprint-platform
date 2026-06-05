"""Shared ingester primitives — event shape + batched POST to the archaeology Worker."""
from __future__ import annotations

import json
import os
import time
import urllib.request
import urllib.error
from dataclasses import dataclass, field, asdict
from typing import Any, Iterable

PROJECT_ID = os.environ.get("ARCHAEOLOGY_PROJECT_ID", "blueprint-platform")
WORKER_URL = os.environ.get("ARCHAEOLOGY_WORKER_URL", "https://blueprint-archaeology.biq.workers.dev")
INGEST_TOKEN = os.environ.get("ARCHAEOLOGY_INGEST_TOKEN", "")
BATCH_SIZE = int(os.environ.get("ARCHAEOLOGY_BATCH_SIZE", "100"))


@dataclass
class Ref:
    kind: str
    target: str


@dataclass
class Event:
    source: str
    source_id: str
    source_ts: str          # RFC3339
    type: str
    payload: dict[str, Any]
    actor: str | None = None
    blob_content: str | None = None
    refs: list[Ref] = field(default_factory=list)
    project_id: str = PROJECT_ID

    def to_wire(self) -> dict[str, Any]:
        d = asdict(self)
        d["refs"] = [{"kind": r.kind, "target": r.target} for r in self.refs]
        return d


def post_batch(events: list[Event]) -> dict[str, Any]:
    """POST a batch of events to the archaeology Worker. Idempotent server-side."""
    if not events:
        return {"received": 0, "inserted": 0, "skipped": 0, "errors": 0}
    if not INGEST_TOKEN:
        raise RuntimeError("ARCHAEOLOGY_INGEST_TOKEN env var not set")

    body = json.dumps({"events": [e.to_wire() for e in events]}).encode()
    req = urllib.request.Request(
        f"{WORKER_URL}/events",
        data=body,
        headers={
            "content-type": "application/json",
            "X-Archaeology-Token": INGEST_TOKEN,
            "User-Agent": "archaeology-ingester/0.1 (+bc-subscriptions)",
        },
        method="POST",
    )
    # Retry with backoff on 5xx
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.loads(r.read().decode())
        except urllib.error.HTTPError as e:
            if 500 <= e.code < 600 and attempt < 2:
                time.sleep(2 ** attempt)
                continue
            raise


def flush(buffer: list[Event]) -> dict[str, Any]:
    """Flush in BATCH_SIZE chunks; return aggregate stats."""
    agg = {"received": 0, "inserted": 0, "skipped": 0, "errors": 0}
    for i in range(0, len(buffer), BATCH_SIZE):
        chunk = buffer[i : i + BATCH_SIZE]
        stats = post_batch(chunk)
        for k, v in stats.items():
            agg[k] = agg.get(k, 0) + v
    return agg


def emit_iterable(events: Iterable[Event]) -> dict[str, Any]:
    """Drain an iterable in batches."""
    buffer: list[Event] = []
    agg = {"received": 0, "inserted": 0, "skipped": 0, "errors": 0}
    for ev in events:
        buffer.append(ev)
        if len(buffer) >= BATCH_SIZE:
            for k, v in post_batch(buffer).items():
                agg[k] = agg.get(k, 0) + v
            buffer.clear()
    if buffer:
        for k, v in post_batch(buffer).items():
            agg[k] = agg.get(k, 0) + v
    return agg
