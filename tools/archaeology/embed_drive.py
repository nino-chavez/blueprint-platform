#!/usr/bin/env python3
"""
Embedding-pipeline driver.

Loops `POST /embed?batch=N` on the archaeology Worker until the pending queue is
drained (or the operator-set ceiling trips). Each iteration:
  - Worker selects up to N embedded=0 events of embeddable types
  - Chunks them, runs @cf/baai/bge-base-en-v1.5, upserts to Vectorize, marks embedded=1
  - Returns batch stats

The driver is the orchestration layer that knows about Workers-AI free-tier ceilings
and the operator-set 20K-chunk safety stop.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request

WORKER_URL = os.environ.get("ARCHAEOLOGY_WORKER_URL", "https://blueprint-archaeology.biq.workers.dev")
INGEST_TOKEN = os.environ.get("ARCHAEOLOGY_INGEST_TOKEN", "")

DEFAULT_BATCH = 25
DEFAULT_STOP_CHUNKS = 20_000           # Operator-set ceiling from the brief
DEFAULT_DAILY_LIMIT_CHUNKS = 9_500     # Conservative under Workers-AI 10K/day free


def post(path: str, batch: int) -> dict:
    req = urllib.request.Request(
        f"{WORKER_URL}{path}?batch={batch}",
        data=b"",
        headers={
            "X-Archaeology-Token": INGEST_TOKEN,
            "User-Agent": "archaeology-embed-driver/0.1 (+bc-subscriptions)",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read().decode())


def get(path: str) -> dict:
    req = urllib.request.Request(
        f"{WORKER_URL}{path}",
        headers={"User-Agent": "archaeology-embed-driver/0.1 (+bc-subscriptions)"},
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode())


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--batch", type=int, default=DEFAULT_BATCH)
    ap.add_argument("--max-chunks", type=int, default=DEFAULT_STOP_CHUNKS,
                    help="Stop and exit non-zero once this many chunks have been upserted "
                         "in this run. Safety net for unexpected corpus growth.")
    ap.add_argument("--daily-limit", type=int, default=DEFAULT_DAILY_LIMIT_CHUNKS,
                    help="Soft cap per run, intended to stay under the Workers-AI free-tier.")
    ap.add_argument("--sleep-secs", type=float, default=0.5,
                    help="Pause between batches; backs off automatically on 429/5xx.")
    args = ap.parse_args()

    if not INGEST_TOKEN:
        print("ARCHAEOLOGY_INGEST_TOKEN env var not set", file=sys.stderr)
        sys.exit(2)

    total_events = 0
    total_chunks = 0
    backoff = args.sleep_secs

    pre = get("/embed/stats")
    print(f"[embed] starting; pending={pre['pending_events']} embedded={pre['embedded_events']} "
          f"chunks={pre['chunks_upserted']}", file=sys.stderr)

    while True:
        try:
            res = post("/embed", args.batch)
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503, 504):
                backoff = min(backoff * 2, 30)
                print(f"[embed] {e.code}; backing off {backoff}s", file=sys.stderr)
                time.sleep(backoff)
                continue
            raise
        except urllib.error.URLError as e:
            backoff = min(backoff * 2, 30)
            print(f"[embed] network error {e}; backing off {backoff}s", file=sys.stderr)
            time.sleep(backoff)
            continue

        backoff = args.sleep_secs

        total_events += res.get("events_processed", 0)
        total_chunks += res.get("chunks_upserted", 0)

        if res.get("done"):
            print("[embed] queue drained", file=sys.stderr)
            break

        if total_chunks >= args.daily_limit:
            print(f"[embed] daily-limit reached ({total_chunks} chunks); stop and resume tomorrow",
                  file=sys.stderr)
            break

        if total_chunks >= args.max_chunks:
            print(f"[embed] ABORT — max-chunks ceiling ({args.max_chunks}) tripped; "
                  f"verify with operator before continuing", file=sys.stderr)
            sys.exit(3)

        if total_events % 200 == 0 or res.get("events_processed", 0) == 0:
            print(f"[embed] processed={total_events} chunks={total_chunks} "
                  f"last_batch={res}", file=sys.stderr)
        time.sleep(args.sleep_secs)

    final = get("/embed/stats")
    print(json.dumps({
        "events_processed_this_run": total_events,
        "chunks_upserted_this_run": total_chunks,
        **final,
    }, indent=2))


if __name__ == "__main__":
    main()
