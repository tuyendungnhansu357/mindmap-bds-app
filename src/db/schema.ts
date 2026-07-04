// src/db/schema.ts

export const SCHEMA_VERSION = 1;

export const CREATE_TABLES_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS maps (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  layout_type TEXT DEFAULT 'free',
  pwd_hash TEXT,
  thumbnail_uri TEXT
);

CREATE TABLE IF NOT EXISTS nodes (
  id TEXT PRIMARY KEY,
  map_id TEXT NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
  parent_id TEXT REFERENCES nodes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  x REAL NOT NULL,
  y REAL NOT NULL,
  w REAL,
  h REAL,
  color TEXT,
  icon TEXT,
  collapsed INTEGER DEFAULT 0,
  rel_style_json TEXT,
  sort_order INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_nodes_map ON nodes(map_id);
CREATE INDEX IF NOT EXISTS idx_nodes_parent ON nodes(parent_id);

CREATE TABLE IF NOT EXISTS cross_links (
  id TEXT PRIMARY KEY,
  map_id TEXT NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
  from_id TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  to_id TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  label TEXT,
  color TEXT,
  cpx REAL,
  cpy REAL,
  rel_style_json TEXT
);
CREATE INDEX IF NOT EXISTS idx_crosslinks_map ON cross_links(map_id);

CREATE TABLE IF NOT EXISTS templates (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT,
  data_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
`;
