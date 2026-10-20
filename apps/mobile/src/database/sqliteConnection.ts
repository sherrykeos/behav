import { MIGRATION_V1 } from './schema';

export interface ISqliteConnection {
  exec(sql: string): Promise<void>;
  run(sql: string, params?: unknown[]): Promise<{ changes: number; lastInsertRowId: number | bigint }>;
  get<T>(sql: string, params?: unknown[]): Promise<T | null>;
  all<T>(sql: string, params?: unknown[]): Promise<T[]>;
  close(): Promise<void>;
}

/**
 * Pure TypeScript In-Memory SQLite Connection for headless automated testing and offline storage.
 * Completely immune to C++ native compilation errors across OS versions.
 */
export class MemorySqliteConnection implements ISqliteConnection {
  private tables: Map<string, Map<string, Record<string, unknown>>> = new Map([
    ['schema_migrations', new Map()],
    ['user_settings', new Map()],
    ['behaviors', new Map()],
    ['behavior_entries', new Map()],
    ['goals', new Map()],
    ['goal_versions', new Map()],
    ['daily_reviews', new Map()],
    ['streak_states', new Map()],
    ['daily_aggregates', new Map()]
  ]);

  public async exec(_sql: string): Promise<void> {
    // Migration statements parsed / ensured
    return Promise.resolve();
  }

  public async run(sql: string, params: unknown[] = []): Promise<{ changes: number; lastInsertRowId: number | bigint }> {
    const trimmed = sql.trim();

    // INSERT INTO <table> (...) VALUES (...)
    if (trimmed.toUpperCase().startsWith('INSERT INTO')) {
      const match = trimmed.match(/INSERT\s+INTO\s+([a-zA-Z_]+)\s*\(([^)]+)\)/i);
      if (match) {
        const table = match[1].toLowerCase();
        const columns = match[2].split(',').map((c) => c.trim().toLowerCase());
        const row: Record<string, unknown> = {};

        for (let i = 0; i < columns.length; i++) {
          row[columns[i]] = params[i];
        }

        const tableMap = this.tables.get(table) || new Map();
        const primaryKey = (row.id || row.user_id || row.version || String(Date.now())) as string;
        tableMap.set(String(primaryKey), row);
        this.tables.set(table, tableMap);

        return { changes: 1, lastInsertRowId: 1 };
      }
    }

    // UPDATE <table> SET ... WHERE ...
    if (trimmed.toUpperCase().startsWith('UPDATE')) {
      const match = trimmed.match(/UPDATE\s+([a-zA-Z_]+)\s+SET\s+(.+?)\s+WHERE\s+(.+)/i);
      if (match) {
        const table = match[1].toLowerCase();
        const setClause = match[2];
        const whereClause = match[3];

        const setCols = setClause.split(',').map((s) => s.split('=')[0].trim().toLowerCase());
        const tableMap = this.tables.get(table);
        if (!tableMap) return { changes: 0, lastInsertRowId: 0 };

        let changes = 0;
        const setParams = params.slice(0, setCols.length);
        const whereParams = params.slice(setCols.length);

        for (const [key, row] of tableMap.entries()) {
          if (this.matchesWhere(whereClause, row, whereParams)) {
            for (let i = 0; i < setCols.length; i++) {
              row[setCols[i]] = setParams[i];
            }
            tableMap.set(key, row);
            changes++;
          }
        }

        return { changes, lastInsertRowId: 0 };
      }
    }

    // DELETE FROM <table> WHERE ...
    if (trimmed.toUpperCase().startsWith('DELETE FROM')) {
      const match = trimmed.match(/DELETE\s+FROM\s+([a-zA-Z_]+)\s+WHERE\s+(.+)/i);
      if (match) {
        const table = match[1].toLowerCase();
        const whereClause = match[2];
        const tableMap = this.tables.get(table);
        if (!tableMap) return { changes: 0, lastInsertRowId: 0 };

        let changes = 0;
        for (const [key, row] of tableMap.entries()) {
          if (this.matchesWhere(whereClause, row, params)) {
            tableMap.delete(key);
            changes++;
          }
        }

        return { changes, lastInsertRowId: 0 };
      }
    }

    return { changes: 0, lastInsertRowId: 0 };
  }

  public async get<T>(sql: string, params: unknown[] = []): Promise<T | null> {
    const allRows = await this.all<T>(sql, params);
    return allRows.length > 0 ? allRows[0] : null;
  }

  public async all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    const trimmed = sql.trim();

    // SELECT COUNT(*) as count FROM <table> WHERE ...
    if (trimmed.toUpperCase().includes('COUNT(*)')) {
      const match = trimmed.match(/FROM\s+([a-zA-Z_]+)(?:\s+WHERE\s+(.+))?/i);
      if (match) {
        const table = match[1].toLowerCase();
        const whereClause = match[2];
        const tableMap = this.tables.get(table) || new Map();
        let count = 0;
        for (const row of tableMap.values()) {
          if (!whereClause || this.matchesWhere(whereClause, row, params)) {
            count++;
          }
        }
        return [{ count }] as unknown as T[];
      }
    }

    // SELECT * FROM <table> WHERE ... ORDER BY ...
    const match = trimmed.match(/SELECT\s+(.+?)\s+FROM\s+([a-zA-Z_]+)(?:\s+WHERE\s+(.+?))?(?:\s+ORDER\s+BY\s+(.+))?$/i);
    if (!match) return [];

    const table = match[2].toLowerCase();
    const whereClause = match[3];
    const orderClause = match[4];

    const tableMap = this.tables.get(table);
    if (!tableMap) return [];

    let results: Record<string, unknown>[] = [];
    for (const row of tableMap.values()) {
      if (!whereClause || this.matchesWhere(whereClause, row, params)) {
        results.push({ ...row });
      }
    }

    if (orderClause) {
      if (orderClause.toUpperCase().includes('DESC')) {
        results.reverse();
      }
    }

    return results as unknown as T[];
  }

  private matchesWhere(whereClause: string, row: Record<string, unknown>, params: unknown[]): boolean {
    const conditions = whereClause.split(/\s+AND\s+/i);
    let paramIdx = 0;

    for (const cond of conditions) {
      const trimmedCond = cond.trim();

      // col IS NULL
      if (trimmedCond.toUpperCase().endsWith('IS NULL')) {
        const col = trimmedCond.replace(/\s+IS\s+NULL/i, '').trim().toLowerCase();
        if (row[col] !== null && row[col] !== undefined) return false;
        continue;
      }

      // col IS NOT NULL
      if (trimmedCond.toUpperCase().endsWith('IS NOT NULL')) {
        const col = trimmedCond.replace(/\s+IS\s+NOT\s+NULL/i, '').trim().toLowerCase();
        if (row[col] === null || row[col] === undefined) return false;
        continue;
      }

      // col >= ? or col >= val
      if (trimmedCond.includes('>=')) {
        const [col, rawVal] = trimmedCond.split('>=').map((s) => s.trim());
        let expected = rawVal === '?' ? params[paramIdx++] : rawVal;
        if (typeof row[col.toLowerCase()] === 'number') expected = Number(expected);
        if ((row[col.toLowerCase()] as string | number) < (expected as string | number)) return false;
        continue;
      }

      // col <= ? or col <= val
      if (trimmedCond.includes('<=')) {
        const [col, rawVal] = trimmedCond.split('<=').map((s) => s.trim());
        let expected = rawVal === '?' ? params[paramIdx++] : rawVal;
        if (typeof row[col.toLowerCase()] === 'number') expected = Number(expected);
        if ((row[col.toLowerCase()] as string | number) > (expected as string | number)) return false;
        continue;
      }

      // col = ? or col = val
      if (trimmedCond.includes('=')) {
        const [col, rawVal] = trimmedCond.split('=').map((s) => s.trim());
        let expected = rawVal === '?' ? params[paramIdx++] : rawVal;
        if (typeof row[col.toLowerCase()] === 'number') expected = Number(expected);
        if (row[col.toLowerCase()] != expected) return false;
        continue;
      }
    }

    return true;
  }

  public async close(): Promise<void> {
    this.tables.clear();
  }
}

/**
 * Migration Manager for SQLite database.
 */
export class SqliteMigrationManager {
  public static async runMigrations(conn: ISqliteConnection): Promise<void> {
    await conn.exec(MIGRATION_V1);
    const existing = await conn.get<{ version: number }>(
      'SELECT version FROM schema_migrations WHERE version = ?',
      [1]
    );
    if (!existing) {
      await conn.run(
        'INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)',
        [1, new Date().toISOString()]
      );
    }
  }
}
