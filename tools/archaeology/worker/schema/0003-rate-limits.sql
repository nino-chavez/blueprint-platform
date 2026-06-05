-- Daily spend / call-count counters for the public /derive/stream surface.
-- Used to protect the Anthropic API budget from abuse on the public-facing
-- archaeology chat surface mounted in subs-portal.

CREATE TABLE IF NOT EXISTS spend_counters (
  scope_key       TEXT PRIMARY KEY,          -- "day:YYYY-MM-DD" for global, "ip:X.X.X.X:YYYY-MM-DD" for per-IP
  call_count      INTEGER NOT NULL DEFAULT 0,
  approx_cost_milli INTEGER NOT NULL DEFAULT 0,  -- cents × 10 for fractional cents
  first_at        TEXT NOT NULL,
  last_at         TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_spend_counters_first_at ON spend_counters(first_at);

-- Optional: audit log of /derive calls — useful for surfacing what people ask.
CREATE TABLE IF NOT EXISTS derive_log (
  log_id          TEXT PRIMARY KEY,          -- ULID
  ts              TEXT NOT NULL,             -- RFC3339
  ip_hash         TEXT NOT NULL,             -- sha256(ip)[:16] — privacy-preserving
  question        TEXT NOT NULL,
  page_context    TEXT,
  retrieval_count INTEGER NOT NULL DEFAULT 0,
  synthesized     INTEGER NOT NULL DEFAULT 0, -- 1 if Claude was called, 0 if retrieval-only
  duration_ms     INTEGER
);

CREATE INDEX IF NOT EXISTS idx_derive_log_ts ON derive_log(ts DESC);
