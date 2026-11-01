import type { SQLiteDatabase } from 'expo-sqlite';

export interface Migration {
  version: number;
  name: string;
  up: (db: SQLiteDatabase) => Promise<void>;
}

export const migrations: Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    up: async (db: SQLiteDatabase) => {
      // 1. Behaviors table
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS behaviors (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          category TEXT,
          unit TEXT NOT NULL DEFAULT 'times',
          daily_limit REAL,
          created_at TEXT NOT NULL,
          archived_at TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_behaviors_archived ON behaviors(archived_at);
        CREATE INDEX IF NOT EXISTS idx_behaviors_name ON behaviors(name);
      `);

      // 2. Log Entries table
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS log_entries (
          id TEXT PRIMARY KEY NOT NULL,
          behavior_id TEXT NOT NULL REFERENCES behaviors(id) ON DELETE CASCADE,
          value REAL NOT NULL,
          occurred_at TEXT NOT NULL,
          note TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_log_entries_behavior_id ON log_entries(behavior_id);
        CREATE INDEX IF NOT EXISTS idx_log_entries_occurred_at ON log_entries(occurred_at);
      `);

      // 3. Goals table
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS goals (
          id TEXT PRIMARY KEY NOT NULL,
          title TEXT NOT NULL,
          behavior_id TEXT REFERENCES behaviors(id) ON DELETE SET NULL,
          goal_type TEXT NOT NULL,
          target_value REAL,
          start_date TEXT NOT NULL,
          end_date TEXT,
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_goals_active ON goals(is_active);
        CREATE INDEX IF NOT EXISTS idx_goals_behavior_id ON goals(behavior_id);
      `);
    },
  },
  {
    version: 2,
    name: 'add_icon_and_nickname_to_behaviors',
    up: async (db: SQLiteDatabase) => {
      try {
        await db.execAsync('ALTER TABLE behaviors ADD COLUMN icon TEXT;');
      } catch {
        // column may already exist
      }
      try {
        await db.execAsync('ALTER TABLE behaviors ADD COLUMN nickname TEXT;');
      } catch {
        // column may already exist
      }
    },
  },
  {
    version: 3,
    name: 'add_subtitle_to_behaviors',
    up: async (db: SQLiteDatabase) => {
      try {
        await db.execAsync('ALTER TABLE behaviors ADD COLUMN subtitle TEXT;');
      } catch {
        // column may already exist
      }
    },
  },
  {
    version: 4,
    name: 'enforce_daily_record_integrity',
    up: async (db: SQLiteDatabase) => {
      // 1. Collapse any duplicate records for the same behavior on the same calendar date
      const duplicates = await db.getAllAsync<{
        behavior_id: string;
        dt: string;
        count: number;
        total_val: number;
      }>(`
        SELECT 
          behavior_id,
          substr(occurred_at, 1, 10) as dt,
          COUNT(*) as count,
          SUM(value) as total_val
        FROM log_entries
        GROUP BY behavior_id, substr(occurred_at, 1, 10)
        HAVING count > 1;
      `);

      for (const dup of duplicates) {
        const rows = await db.getAllAsync<{ id: string }>(`
          SELECT id FROM log_entries
          WHERE behavior_id = ? AND substr(occurred_at, 1, 10) = ?
          ORDER BY occurred_at ASC;
        `, [dup.behavior_id, dup.dt]);

        if (rows.length > 1) {
          const keepId = rows[0].id;
          const deleteIds = rows.slice(1).map((r) => r.id);
          // Update the first row with the consolidated total
          await db.runAsync(
            'UPDATE log_entries SET value = ? WHERE id = ?;',
            [dup.total_val, keepId]
          );
          // Delete duplicate rows
          for (const delId of deleteIds) {
            await db.runAsync('DELETE FROM log_entries WHERE id = ?;', [delId]);
          }
        }
      }

      // 2. Create index for fast date-based lookup
      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_log_entries_behavior_date
        ON log_entries(behavior_id, substr(occurred_at, 1, 10));
      `);
    },
  },
];

/**
 * Executes versioned migrations safely
 */
export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  // Enforce foreign key constraints
  await db.execAsync('PRAGMA foreign_keys = ON;');

  // Create migrations tracker table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  // Get currently applied migration versions
  const appliedRows = await db.getAllAsync<{ version: number }>(
    'SELECT version FROM schema_migrations ORDER BY version ASC;'
  );
  const appliedVersions = new Set(appliedRows.map((r) => r.version));

  for (const migration of migrations) {
    if (!appliedVersions.has(migration.version)) {
      // Execute migration
      await migration.up(db);

      // Record completed migration
      await db.runAsync(
        'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?);',
        [migration.version, migration.name, new Date().toISOString()]
      );
    }
  }
}
