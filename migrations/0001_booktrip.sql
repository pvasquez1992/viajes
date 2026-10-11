CREATE TABLE IF NOT EXISTS booktrip_trips (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  create_key TEXT NOT NULL UNIQUE,
  document TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE TABLE IF NOT EXISTS booktrip_receipts (
  request_key TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  trip_id TEXT NOT NULL REFERENCES booktrip_trips(id),
  response_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
