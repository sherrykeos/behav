import type { SQLiteDatabase } from 'expo-sqlite';
import { getCurrentIsoTimestamp } from '../../utils/date';
import type { Behavior, Goal, LogEntry } from '../../types/database';

export interface BehavBackupData {
  behaviors: Array<{
    id: string;
    name: string;
    description: string | null;
    category: string | null;
    unit: string;
    daily_limit: number | null;
    created_at: string;
    archived_at: string | null;
  }>;
  log_entries: Array<{
    id: string;
    behavior_id: string;
    value: number;
    occurred_at: string;
    note: string | null;
    created_at: string;
    updated_at: string;
  }>;
  goals: Array<{
    id: string;
    title: string;
    behavior_id: string | null;
    goal_type: string;
    target_value: number | null;
    start_date: string;
    end_date: string | null;
    is_active: number;
    created_at: string;
  }>;
}

export interface BehavBackupFile {
  app: 'behav';
  schemaVersion: 1;
  exportedAt: string;
  appName: string;
  appVersion: string;
  data: BehavBackupData;
}

export interface RestorePreview {
  behaviorCount: number;
  logCount: number;
  goalCount: number;
  exportedAt: string;
}

export interface RestoreResult {
  mode: 'merge' | 'replace';
  restoredBehaviors: number;
  restoredLogs: number;
  restoredGoals: number;
  skippedLogs: number;
}

/**
 * Escapes a single CSV value according to RFC 4180
 */
export function escapeCsvValue(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export class BackupRepository {
  private db: SQLiteDatabase;

  constructor(db: SQLiteDatabase) {
    this.db = db;
  }

  /**
   * Generates complete JSON backup payload of all behaviors, logs, and goals
   */
  async createBackup(): Promise<BehavBackupFile> {
    const behaviors = await this.db.getAllAsync<BehavBackupData['behaviors'][0]>(
      'SELECT id, name, description, category, unit, daily_limit, created_at, archived_at FROM behaviors ORDER BY created_at ASC;'
    );

    const logEntries = await this.db.getAllAsync<BehavBackupData['log_entries'][0]>(
      'SELECT id, behavior_id, value, occurred_at, note, created_at, updated_at FROM log_entries ORDER BY occurred_at ASC;'
    );

    const goals = await this.db.getAllAsync<BehavBackupData['goals'][0]>(
      'SELECT id, title, behavior_id, goal_type, target_value, start_date, end_date, is_active, created_at FROM goals ORDER BY created_at ASC;'
    );

    return {
      app: 'behav',
      schemaVersion: 1,
      exportedAt: getCurrentIsoTimestamp(),
      appName: 'Behav',
      appVersion: '1.0.0',
      data: {
        behaviors,
        log_entries: logEntries,
        goals,
      },
    };
  }

  /**
   * Validates and parses raw backup JSON
   */
  validateBackup(jsonString: string): { isValid: boolean; error?: string; backup?: BehavBackupFile } {
    try {
      const parsed = JSON.parse(jsonString);

      if (!parsed || typeof parsed !== 'object') {
        return { isValid: false, error: 'Backup file is empty or not valid JSON.' };
      }

      if (parsed.app !== 'behav') {
        return { isValid: false, error: 'Unrecognized file format: Not a Behav backup.' };
      }

      if (parsed.schemaVersion !== 1) {
        return {
          isValid: false,
          error: `Unsupported backup version (${parsed.schemaVersion}). Supported version is 1.`,
        };
      }

      if (!parsed.data || typeof parsed.data !== 'object') {
        return { isValid: false, error: 'Backup file is missing data payload.' };
      }

      const { behaviors, log_entries, goals } = parsed.data;

      if (!Array.isArray(behaviors) || !Array.isArray(log_entries) || !Array.isArray(goals)) {
        return { isValid: false, error: 'Corrupted backup file: data tables must be arrays.' };
      }

      // Check required fields for first item in each if present
      for (const b of behaviors) {
        if (!b.id || !b.name || !b.created_at) {
          return { isValid: false, error: 'Corrupted backup: behavior missing required id or name.' };
        }
      }

      for (const l of log_entries) {
        if (!l.id || !l.behavior_id || l.value === undefined || !l.occurred_at) {
          return { isValid: false, error: 'Corrupted backup: log entry missing id, behavior_id, or value.' };
        }
      }

      return {
        isValid: true,
        backup: parsed as BehavBackupFile,
      };
    } catch (e: any) {
      return { isValid: false, error: `Failed to parse backup JSON: ${e.message}` };
    }
  }

  /**
   * Restores database records using either 'merge' or 'replace' mode
   */
  async restoreBackup(backup: BehavBackupFile, mode: 'merge' | 'replace'): Promise<RestoreResult> {
    const { behaviors, log_entries, goals } = backup.data;

    let restoredBehaviors = 0;
    let restoredLogs = 0;
    let restoredGoals = 0;
    let skippedLogs = 0;

    const executeOperations = async () => {
      if (mode === 'replace') {
        // Clear all current records in proper order (foreign key cascades)
        await this.db.execAsync('DELETE FROM log_entries;');
        await this.db.execAsync('DELETE FROM goals;');
        await this.db.execAsync('DELETE FROM behaviors;');
      }

      // 1. Insert behaviors
      for (const b of behaviors) {
        if (mode === 'replace') {
          await this.db.runAsync(
            `INSERT INTO behaviors (id, name, description, category, unit, daily_limit, created_at, archived_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
            [b.id, b.name, b.description ?? null, b.category ?? null, b.unit || 'times', b.daily_limit ?? null, b.created_at, b.archived_at ?? null]
          );
          restoredBehaviors++;
        } else {
          // Merge mode: INSERT OR REPLACE behavior to keep latest details
          await this.db.runAsync(
            `INSERT OR REPLACE INTO behaviors (id, name, description, category, unit, daily_limit, created_at, archived_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
            [b.id, b.name, b.description ?? null, b.category ?? null, b.unit || 'times', b.daily_limit ?? null, b.created_at, b.archived_at ?? null]
          );
          restoredBehaviors++;
        }
      }

      // Build set of valid behavior IDs
      const allBehaviors = await this.db.getAllAsync<{ id: string }>('SELECT id FROM behaviors;');
      const validBehaviorIds = new Set(allBehaviors.map((b) => b.id));

      // 2. Insert goals
      for (const g of goals) {
        // Only link behavior if behavior exists
        const bId = g.behavior_id && validBehaviorIds.has(g.behavior_id) ? g.behavior_id : null;
        await this.db.runAsync(
          `INSERT OR REPLACE INTO goals (id, title, behavior_id, goal_type, target_value, start_date, end_date, is_active, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [g.id, g.title, bId, g.goal_type, g.target_value ?? null, g.start_date, g.end_date ?? null, g.is_active ? 1 : 0, g.created_at]
        );
        restoredGoals++;
      }

      // 3. Insert log entries
      for (const l of log_entries) {
        if (!validBehaviorIds.has(l.behavior_id)) {
          // Orphaned log entry without behavior cannot be inserted due to foreign key
          skippedLogs++;
          continue;
        }

        if (mode === 'replace') {
          await this.db.runAsync(
            `INSERT INTO log_entries (id, behavior_id, value, occurred_at, note, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?);`,
            [l.id, l.behavior_id, l.value, l.occurred_at, l.note ?? null, l.created_at, l.updated_at || l.created_at]
          );
          restoredLogs++;
        } else {
          // Merge: insert or replace log entry
          await this.db.runAsync(
            `INSERT OR REPLACE INTO log_entries (id, behavior_id, value, occurred_at, note, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?);`,
            [l.id, l.behavior_id, l.value, l.occurred_at, l.note ?? null, l.created_at, l.updated_at || l.created_at]
          );
          restoredLogs++;
        }
      }
    };

    if (typeof (this.db as any).withTransactionAsync === 'function') {
      await (this.db as any).withTransactionAsync(executeOperations);
    } else {
      await this.db.execAsync('BEGIN TRANSACTION;');
      try {
        await executeOperations();
        await this.db.execAsync('COMMIT;');
      } catch (err) {
        await this.db.execAsync('ROLLBACK;');
        throw err;
      }
    }

    return {
      mode,
      restoredBehaviors,
      restoredLogs,
      restoredGoals,
      skippedLogs,
    };
  }

  /**
   * Generates RFC 4180 compliant CSV string of all activity logs joined with behavior info
   */
  async exportLogsToCsv(): Promise<string> {
    interface JoinedLogRow {
      id: string;
      behavior_id: string;
      behavior_name: string;
      category: string | null;
      unit: string;
      value: number;
      occurred_at: string;
      note: string | null;
      created_at: string;
    }

    const rows = await this.db.getAllAsync<JoinedLogRow>(`
      SELECT 
        l.id,
        l.behavior_id,
        b.name as behavior_name,
        b.category,
        b.unit,
        l.value,
        l.occurred_at,
        l.note,
        l.created_at
      FROM log_entries l
      JOIN behaviors b ON l.behavior_id = b.id
      ORDER BY l.occurred_at DESC;
    `);

    const header = [
      'id',
      'occurred_at',
      'behavior_name',
      'category',
      'value',
      'unit',
      'note',
      'behavior_id',
      'created_at',
    ].join(',');

    const lines = rows.map((r) =>
      [
        escapeCsvValue(r.id),
        escapeCsvValue(r.occurred_at),
        escapeCsvValue(r.behavior_name),
        escapeCsvValue(r.category),
        escapeCsvValue(r.value),
        escapeCsvValue(r.unit),
        escapeCsvValue(r.note),
        escapeCsvValue(r.behavior_id),
        escapeCsvValue(r.created_at),
      ].join(',')
    );

    return [header, ...lines].join('\r\n');
  }

  /**
   * Generates RFC 4180 compliant CSV string of behaviors
   */
  async exportBehaviorsToCsv(): Promise<string> {
    interface BehaviorRow {
      id: string;
      name: string;
      category: string | null;
      unit: string;
      daily_limit: number | null;
      archived_at: string | null;
      created_at: string;
    }

    const rows = await this.db.getAllAsync<BehaviorRow>(`
      SELECT id, name, category, unit, daily_limit, archived_at, created_at
      FROM behaviors
      ORDER BY name ASC;
    `);

    const header = [
      'id',
      'name',
      'category',
      'unit',
      'daily_limit',
      'is_archived',
      'created_at',
    ].join(',');

    const lines = rows.map((r) =>
      [
        escapeCsvValue(r.id),
        escapeCsvValue(r.name),
        escapeCsvValue(r.category),
        escapeCsvValue(r.unit),
        escapeCsvValue(r.daily_limit),
        escapeCsvValue(r.archived_at ? 'true' : 'false'),
        escapeCsvValue(r.created_at),
      ].join(',')
    );

    return [header, ...lines].join('\r\n');
  }
}
