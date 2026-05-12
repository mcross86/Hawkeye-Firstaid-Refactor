-- Kit types master data + location linkage

CREATE TABLE IF NOT EXISTS kit_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_kit_types_name_ci ON kit_types (lower(trim(name)));

ALTER TABLE site_locations ADD COLUMN kit_type_id TEXT;

-- SQLite doesn't enforce new FK constraints via ALTER TABLE; application validates kit_type_id.
CREATE INDEX IF NOT EXISTS idx_site_locations_kit_type ON site_locations(kit_type_id);

