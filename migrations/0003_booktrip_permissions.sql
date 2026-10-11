CREATE TABLE IF NOT EXISTS booktrip_users (
  email TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('admin', 'creator', 'viewer')),
  user_id TEXT UNIQUE
);
CREATE TABLE IF NOT EXISTS booktrip_trip_access (
  trip_id TEXT NOT NULL REFERENCES booktrip_trips(id),
  email TEXT NOT NULL,
  permission TEXT NOT NULL CHECK (permission = 'edit'),
  PRIMARY KEY (trip_id, email)
);
