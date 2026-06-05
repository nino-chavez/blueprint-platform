-- Track which events have been embedded into Vectorize so the embed pipeline
-- can resume + run incrementally without reprocessing.
ALTER TABLE events ADD COLUMN embedded INTEGER NOT NULL DEFAULT 0;
ALTER TABLE events ADD COLUMN embedded_at TEXT;
ALTER TABLE events ADD COLUMN chunk_count INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_events_embed_pending ON events(embedded, source_ts) WHERE embedded = 0;
