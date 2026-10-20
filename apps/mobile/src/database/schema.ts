/**
 * SQLite Database Schema & Migrations
 * Versioned schema for offline-first persistence with strict user partition indices.
 */

export const MIGRATION_V1 = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id TEXT PRIMARY KEY,
  theme TEXT NOT NULL DEFAULT 'dark',
  timezone TEXT NOT NULL DEFAULT 'UTC',
  locale TEXT NOT NULL DEFAULT 'en',
  day_boundary_hour INTEGER NOT NULL DEFAULT 0,
  preferences TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS behaviors (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  icon TEXT NOT NULL,
  accent_color TEXT NOT NULL,
  measurement_type TEXT NOT NULL,
  unit TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT,
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_behaviors_user ON behaviors(user_id);
CREATE INDEX IF NOT EXISTS idx_behaviors_user_archived ON behaviors(user_id, archived_at);

CREATE TABLE IF NOT EXISTS behavior_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  behavior_id TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 1.0,
  occurred_at TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  notes TEXT,
  context_tags TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY (behavior_id) REFERENCES behaviors(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_entries_user_occurred ON behavior_entries(user_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_entries_user_behavior ON behavior_entries(user_id, behavior_id, occurred_at);

CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  behavior_id TEXT NOT NULL,
  goal_type TEXT NOT NULL,
  target_value REAL NOT NULL DEFAULT 0.0,
  evaluation_period TEXT NOT NULL DEFAULT 'DAILY',
  starts_at TEXT NOT NULL,
  ends_at TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (behavior_id) REFERENCES behaviors(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_goals_user_behavior ON goals(user_id, behavior_id);

CREATE TABLE IF NOT EXISTS goal_versions (
  id TEXT PRIMARY KEY,
  goal_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  behavior_id TEXT NOT NULL,
  goal_type TEXT NOT NULL,
  target_value REAL NOT NULL,
  evaluation_period TEXT NOT NULL,
  version_number INTEGER NOT NULL DEFAULT 1,
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_goal_versions_goal ON goal_versions(goal_id);

CREATE TABLE IF NOT EXISTS daily_reviews (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  behavior_id TEXT NOT NULL,
  local_date TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  status TEXT NOT NULL DEFAULT 'PENDING',
  notes TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (behavior_id) REFERENCES behaviors(id) ON DELETE CASCADE,
  UNIQUE(user_id, behavior_id, local_date)
);
CREATE INDEX IF NOT EXISTS idx_reviews_user_date ON daily_reviews(user_id, local_date);

CREATE TABLE IF NOT EXISTS streak_states (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  goal_id TEXT NOT NULL,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_qualified_date TEXT,
  calculated_at TEXT NOT NULL,
  FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE,
  UNIQUE(user_id, goal_id)
);

CREATE TABLE IF NOT EXISTS daily_aggregates (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  behavior_id TEXT NOT NULL,
  local_date TEXT NOT NULL,
  total_quantity REAL NOT NULL DEFAULT 0.0,
  occurrence_count INTEGER NOT NULL DEFAULT 0,
  review_status TEXT NOT NULL DEFAULT 'PENDING',
  calculated_at TEXT NOT NULL,
  FOREIGN KEY (behavior_id) REFERENCES behaviors(id) ON DELETE CASCADE,
  UNIQUE(user_id, behavior_id, local_date)
);
CREATE INDEX IF NOT EXISTS idx_aggregates_user_date ON daily_aggregates(user_id, local_date);
`;
