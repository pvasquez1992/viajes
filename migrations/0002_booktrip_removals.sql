-- Keep a removal marker so old retries and conversation tokens cannot restore
-- the entry. The original document remains available for manual recovery.
CREATE TABLE IF NOT EXISTS booktrip_removals (
  trip_id TEXT PRIMARY KEY REFERENCES booktrip_trips(id),
  owner_id TEXT NOT NULL,
  removed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
