-- Archaeology substrate D1 schema — initial migration
-- Source of truth: docs/methodology/archaeology-substrate-design.md §4

-- Events: append-only envelope for every captured event across all six streams.
CREATE TABLE IF NOT EXISTS events (
  event_id      TEXT PRIMARY KEY,            -- ULID
  project_id    TEXT NOT NULL,
  source        TEXT NOT NULL,               -- session|git|github|hive|adr|memory
  source_id     TEXT NOT NULL,               -- session UUID, commit SHA, issue#, etc.
  source_ts     TEXT NOT NULL,               -- RFC3339 when the event happened
  ingest_ts     TEXT NOT NULL,               -- RFC3339 when we landed it
  type          TEXT NOT NULL,               -- session_start, commit, issue_open, ...
  actor         TEXT,                        -- nino, gh:username, agent:session-id
  payload_json  TEXT NOT NULL,               -- event-specific JSON
  blob_key      TEXT,                        -- R2 key for large content; NULL if inline
  UNIQUE(source, source_id, type, source_ts) -- idempotency key
);

CREATE INDEX IF NOT EXISTS idx_events_project_ts   ON events(project_id, source_ts DESC);
CREATE INDEX IF NOT EXISTS idx_events_source_id    ON events(source, source_id);
CREATE INDEX IF NOT EXISTS idx_events_type_ts      ON events(type, source_ts DESC);
CREATE INDEX IF NOT EXISTS idx_events_actor_ts     ON events(actor, source_ts DESC);

-- Refs: the joining magic. Bidirectional graph of references between events.
-- A commit "closes" an issue; a session "claims" a Hive task; a synthesis "ratifies" proposals.
CREATE TABLE IF NOT EXISTS refs (
  ref_id        INTEGER PRIMARY KEY AUTOINCREMENT,
  from_event_id TEXT NOT NULL,
  kind          TEXT NOT NULL,               -- closes|synthesizes|claims|mentions|in_branch|fetched_url|...
  target        TEXT NOT NULL,               -- "<source>:<source_id>" or "url:<url>" or "file:<path>"
  FOREIGN KEY(from_event_id) REFERENCES events(event_id)
);

CREATE INDEX IF NOT EXISTS idx_refs_from   ON refs(from_event_id);
CREATE INDEX IF NOT EXISTS idx_refs_target ON refs(target);
CREATE INDEX IF NOT EXISTS idx_refs_kind   ON refs(kind);

-- Entities: denormalized projections for fast lookup. Built from events.
-- Examples: latest known status of ADR-NNNN, current state of Hive proposal #N.
-- Rebuilt by replaying events; never the source of truth.
CREATE TABLE IF NOT EXISTS entities (
  entity_ref    TEXT PRIMARY KEY,            -- "<source>:<source_id>"
  project_id    TEXT NOT NULL,
  kind          TEXT NOT NULL,               -- adr|proposal|issue|session|commit|file|memory
  current_state TEXT,                        -- kind-specific status enum
  title         TEXT,
  first_seen    TEXT NOT NULL,
  last_updated  TEXT NOT NULL,
  meta_json     TEXT
);

CREATE INDEX IF NOT EXISTS idx_entities_project_kind ON entities(project_id, kind);
CREATE INDEX IF NOT EXISTS idx_entities_state        ON entities(current_state);

-- Ingestion bookmarks: each ingester records where it last left off, for resumable backfills.
CREATE TABLE IF NOT EXISTS ingest_bookmarks (
  ingester      TEXT PRIMARY KEY,            -- "session" | "git" | "github" | "hive" | "adr" | "memory"
  last_source_ts TEXT NOT NULL,
  last_source_id TEXT,
  updated_at    TEXT NOT NULL
);
