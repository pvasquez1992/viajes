CREATE TABLE IF NOT EXISTS booktrip_legacy (
  trip_id TEXT PRIMARY KEY REFERENCES booktrip_trips(id),
  original_href TEXT NOT NULL UNIQUE,
  catalog_json TEXT NOT NULL,
  initial_document TEXT NOT NULL,
  source_hash TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS booktrip_lifecycle (
  trip_id TEXT PRIMARY KEY REFERENCES booktrip_trips(id),
  generation INTEGER NOT NULL DEFAULT 0
);
