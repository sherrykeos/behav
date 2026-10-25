import type { SQLiteDatabase } from 'expo-sqlite';
import { getCurrentIsoTimestamp, toLocalIsoString, isValidIsoDate } from '../../utils/date';
import { generateId } from '../../utils/id';
import { getMeasurementType, validateQuantity, type MeasurementType } from '../../utils/measurement';
import {
  validateBHFileV1,
  calculateBHFileSummary,
  type BHFileV1,
  type BHFileV1Habit,
  type BHFileV1Day,
  type BHFileV1Summary,
} from '../../utils/bhfile';

/**
 * Authoritative BHFile v1 Domain Schema
 */
export interface BHFileBehavior {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  unit: string;
  measurementType?: MeasurementType;
  dailyLimit: number | null;
  createdAt: string;
  archivedAt: string | null;
}

export interface BHFileRecord {
  id: string;
  behaviorId: string;
  behaviorName?: string;
  value: number;
  unit?: string;
  occurredAt: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BHFileGoal {
  id: string;
  title: string;
  behaviorId: string | null;
  goalType: 'daily_limit' | 'streak' | 'frequency';
  targetValue: number | null;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface BHFileData {
  behaviors: BHFileBehavior[];
  records: BHFileRecord[];
  goals: BHFileGoal[];
}

export interface LegacyBHFile {
  $schema?: string;
  format: 'bhfile';
  schemaVersion: 1;
  appVersion: string;
  exportedAt: string;
  data: BHFileData;
  metadata?: Record<string, unknown>;
  appName?: string;
}

export type BHFile = BHFileV1 | LegacyBHFile;
export type BehavBackupFile = BHFile;
export type BehavBackupData = BHFileData;

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

/**
 * Checks whether a given filename has an accepted backup extension (.json)
 */
export function hasAcceptedBackupExtension(filename?: string): boolean {
  if (!filename) return true; // If filename not available, validation checks payload content
  const lower = filename.trim().toLowerCase();
  return lower.endsWith('.json');
}

export class BackupRepository {
  private db: SQLiteDatabase;

  constructor(db: SQLiteDatabase) {
    this.db = db;
  }

  /**
   * Generates complete canonical BHFile v1 JSON backup payload
   */
  async createBackup(): Promise<BHFileV1> {
    interface RawBehaviorRow {
      id: string;
      name: string;
      unit: string;
      created_at: string;
      archived_at: string | null;
    }

    interface RawLogRow {
      occurred_at: string;
      behavior_id: string;
      value: number;
    }

    const [behaviorsRows, logRows] = await Promise.all([
      this.db.getAllAsync<RawBehaviorRow>(
        'SELECT id, name, unit, created_at, archived_at FROM behaviors WHERE archived_at IS NULL ORDER BY created_at ASC;'
      ),
      this.db.getAllAsync<RawLogRow>(
        'SELECT occurred_at, behavior_id, value FROM log_entries ORDER BY occurred_at ASC;'
      ),
    ]);

    const habits: BHFileV1Habit[] = behaviorsRows.map((r) => ({
      id: r.id,
      name: r.name,
      unit: r.unit,
    }));

    // Group logs by calendar date (YYYY-MM-DD)
    const dateMap = new Map<string, Record<string, number>>();
    for (const log of logRows) {
      const dateStr = log.occurred_at.slice(0, 10);
      if (!dateMap.has(dateStr)) {
        dateMap.set(dateStr, {});
      }
      const dayTotals = dateMap.get(dateStr)!;
      dayTotals[log.behavior_id] = (dayTotals[log.behavior_id] || 0) + log.value;
    }

    // Build sorted days array where EVERY habit is present
    const sortedDates = Array.from(dateMap.keys()).sort();
    const days: BHFileV1Day[] = sortedDates.map((dateStr) => {
      const dayTotals = dateMap.get(dateStr)!;
      const dayHabits: Record<string, number> = {};
      for (const h of habits) {
        dayHabits[h.id] = dayTotals[h.id] !== undefined ? dayTotals[h.id] : 0;
      }
      return {
        date: dateStr,
        habits: dayHabits,
      };
    });

    const summary = calculateBHFileSummary(habits, days);

    return {
      format: 'bhfile',
      version: 1,
      habits,
      days,
      summary,
    };
  }

  /**
   * Validates and normalizes JSON backup content from a .json file
   */
  validateBackup(
    jsonString: string,
    filename?: string
  ): {
    isValid: boolean;
    error?: string;
    backup?: BHFile;
  } {
    try {
      if (!jsonString || typeof jsonString !== 'string' || !jsonString.trim()) {
        return { isValid: false, error: 'Backup file is empty.' };
      }

      // Enforce .json extension when filename is provided
      if (filename && !hasAcceptedBackupExtension(filename)) {
        return {
          isValid: false,
          error: `Unsupported file extension. Only standard .json backup files are accepted (got '${filename}').`,
        };
      }

      let parsed: any;
      try {
        parsed = JSON.parse(jsonString);
      } catch (jsonErr: any) {
        return { isValid: false, error: `Malformed JSON: ${jsonErr.message}` };
      }

      if (!parsed || typeof parsed !== 'object') {
        return { isValid: false, error: 'File content does not contain a valid JSON object.' };
      }

      // Canonical BHFile v1 validation
      if (parsed.habits && parsed.days && parsed.summary) {
        const v1Result = validateBHFileV1(parsed);
        if (!v1Result.isValid || !v1Result.data) {
          return { isValid: false, error: v1Result.error };
        }
        return { isValid: true, backup: v1Result.data };
      }

      // Legacy fallback validation
      const format = parsed.format || parsed.app;
      if (format !== 'bhfile' && format !== 'behav-backup' && format !== 'behav') {
        return {
          isValid: false,
          error: `Unrecognized format '${format}'. The file is not a valid JSON backup.`,
        };
      }

      const version = parsed.schemaVersion ?? parsed.version;
      if (version === undefined || version === null) {
        return { isValid: false, error: 'Missing schemaVersion or version in backup file.' };
      }
      if (version !== 1) {
        return {
          isValid: false,
          error: `Unsupported schema version (${version}). Only version 1 is supported by this app.`,
        };
      }

      const dataObj = parsed.data;
      if (!dataObj || typeof dataObj !== 'object') {
        return { isValid: false, error: 'Backup is missing required habits or data object.' };
      }

      const rawBehaviors = dataObj.behaviors;
      const rawRecords = dataObj.records || dataObj.logEntries || dataObj.log_entries;
      const rawGoals = dataObj.goals || [];

      if (!Array.isArray(rawBehaviors)) {
        return { isValid: false, error: 'data.behaviors must be an array.' };
      }
      if (!Array.isArray(rawRecords)) {
        return { isValid: false, error: 'data.records must be an array.' };
      }
      if (!Array.isArray(rawGoals)) {
        return { isValid: false, error: 'data.goals must be an array.' };
      }

      // 4. Validate behaviors
      const normalizedBehaviors: BHFileBehavior[] = [];
      const behaviorIds = new Set<string>();
      const behaviorNames = new Set<string>();
      const behaviorIdMap = new Map<string, BHFileBehavior>();

      for (let i = 0; i < rawBehaviors.length; i++) {
        const b = rawBehaviors[i];
        if (!b || typeof b !== 'object') {
          return { isValid: false, error: `Behavior at index ${i} is not a valid object.` };
        }

        const name = (b.name || '').trim();
        if (!name) {
          return { isValid: false, error: `Behavior at index ${i} is missing a required name.` };
        }

        const nameLower = name.toLowerCase();
        if (behaviorNames.has(nameLower)) {
          return { isValid: false, error: `Duplicate behavior name '${name}' found at index ${i}.` };
        }
        behaviorNames.add(nameLower);

        const id = b.id ? String(b.id).trim() : generateId();
        if (behaviorIds.has(id)) {
          return { isValid: false, error: `Duplicate behavior ID '${id}' found at index ${i}.` };
        }
        behaviorIds.add(id);

        const unit = (b.unit || 'times').trim();
        if (!unit) {
          return { isValid: false, error: `Behavior '${name}' has an empty unit.` };
        }

        const rawLimit = b.dailyLimit !== undefined ? b.dailyLimit : b.daily_limit;
        let dailyLimit: number | null = null;
        if (rawLimit !== undefined && rawLimit !== null && rawLimit !== '') {
          const num = Number(rawLimit);
          if (isNaN(num) || num <= 0) {
            return { isValid: false, error: `Behavior '${name}' has invalid dailyLimit '${rawLimit}'. Limit must be a positive number.` };
          }
          dailyLimit = num;
        }

        const createdAt = b.createdAt || b.created_at || getCurrentIsoTimestamp();
        const archivedAt = b.archivedAt !== undefined ? b.archivedAt : b.archived_at !== undefined ? b.archived_at : null;

        const normalizedBehavior: BHFileBehavior = {
          id,
          name,
          description: b.description ? String(b.description).trim() : null,
          category: b.category ? String(b.category).trim() : null,
          unit,
          measurementType: b.measurementType || getMeasurementType(unit),
          dailyLimit,
          createdAt,
          archivedAt: archivedAt || null,
        };

        normalizedBehaviors.push(normalizedBehavior);
        behaviorIdMap.set(id, normalizedBehavior);
        behaviorIdMap.set(nameLower, normalizedBehavior);
      }

      // 5. Validate records
      const normalizedRecords: BHFileRecord[] = [];
      const recordIds = new Set<string>();

      for (let i = 0; i < rawRecords.length; i++) {
        const r = rawRecords[i];
        if (!r || typeof r !== 'object') {
          return { isValid: false, error: `Record at index ${i} is not a valid object.` };
        }

        const id = r.id ? String(r.id).trim() : generateId();
        if (recordIds.has(id)) {
          return { isValid: false, error: `Duplicate record ID '${id}' found at index ${i}.` };
        }
        recordIds.add(id);

        const behaviorId = r.behaviorId || r.behavior_id;
        const behaviorName = (r.behaviorName || r.behavior_name || '').trim();

        if (!behaviorId && !behaviorName) {
          return {
            isValid: false,
            error: `Record at index ${i} must reference a behaviorId or behaviorName.`,
          };
        }

        // Verify relationship to behaviors defined in the file
        let resolvedBehavior: BHFileBehavior | undefined;
        if (behaviorId && behaviorIdMap.has(behaviorId)) {
          resolvedBehavior = behaviorIdMap.get(behaviorId);
        } else if (behaviorName && behaviorIdMap.has(behaviorName.toLowerCase())) {
          resolvedBehavior = behaviorIdMap.get(behaviorName.toLowerCase());
        }

        if (!resolvedBehavior) {
          return {
            isValid: false,
            error: `Dangling reference: Record at index ${i} references behavior '${behaviorId || behaviorName}' which does not exist in the backup.`,
          };
        }

        const value = Number(r.value);
        if (isNaN(value) || value <= 0) {
          return {
            isValid: false,
            error: `Record at index ${i} has invalid value '${r.value}'. Value must be a positive number.`,
          };
        }

        let occurredAt = r.occurredAt || r.occurred_at;
        if (!occurredAt || typeof occurredAt !== 'string') {
          return { isValid: false, error: `Record at index ${i} is missing occurredAt timestamp.` };
        }

        // Expand date-only string YYYY-MM-DD to midday local ISO timestamp
        if (/^\d{4}-\d{2}-\d{2}$/.test(occurredAt)) {
          const [y, m, d] = occurredAt.split('-').map(Number);
          const dateCheck = new Date(y, m - 1, d);
          if (
            dateCheck.getFullYear() !== y ||
            dateCheck.getMonth() !== m - 1 ||
            dateCheck.getDate() !== d
          ) {
            return { isValid: false, error: `Record at index ${i} has invalid calendar date '${occurredAt}'.` };
          }
          occurredAt = toLocalIsoString(new Date(y, m - 1, d, 12, 0, 0, 0));
        } else if (!isValidIsoDate(occurredAt)) {
          return { isValid: false, error: `Record at index ${i} has invalid timestamp '${occurredAt}'.` };
        }

        const createdAt = r.createdAt || r.created_at || occurredAt;
        const updatedAt = r.updatedAt || r.updated_at || createdAt;

        normalizedRecords.push({
          id,
          behaviorId: resolvedBehavior.id,
          behaviorName: resolvedBehavior.name,
          value,
          unit: resolvedBehavior.unit,
          occurredAt,
          note: r.note ? String(r.note).trim() : null,
          createdAt,
          updatedAt,
        });
      }

      // 6. Validate goals
      const normalizedGoals: BHFileGoal[] = [];

      for (let i = 0; i < rawGoals.length; i++) {
        const g = rawGoals[i];
        if (!g || typeof g !== 'object') {
          return { isValid: false, error: `Goal at index ${i} is not a valid object.` };
        }

        const title = (g.title || '').trim();
        if (!title) {
          return { isValid: false, error: `Goal at index ${i} is missing a required title.` };
        }

        const startDate = g.startDate || g.start_date;
        if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
          return { isValid: false, error: `Goal '${title}' has invalid startDate '${startDate}'. Must be YYYY-MM-DD.` };
        }

        const endDate = g.endDate || g.end_date || null;
        if (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
          return { isValid: false, error: `Goal '${title}' has invalid endDate '${endDate}'. Must be YYYY-MM-DD.` };
        }

        const goalType = g.goalType || g.goal_type || 'daily_limit';
        const rawTarget = g.targetValue !== undefined ? g.targetValue : g.target_value;
        const targetValue = rawTarget !== null && rawTarget !== undefined && !isNaN(Number(rawTarget)) ? Number(rawTarget) : null;
        const isActive = g.isActive !== undefined ? Boolean(g.isActive) : g.is_active !== undefined ? Number(g.is_active) === 1 : true;

        normalizedGoals.push({
          id: g.id ? String(g.id).trim() : generateId(),
          title,
          behaviorId: g.behaviorId || g.behavior_id || null,
          goalType,
          targetValue,
          startDate,
          endDate,
          isActive,
          createdAt: g.createdAt || g.created_at || getCurrentIsoTimestamp(),
        });
      }

      const canonicalBackup: BHFile = {
        $schema: 'https://behav.app/schemas/bhfile-v1.json',
        format: 'bhfile',
        schemaVersion: 1,
        appVersion: parsed.appVersion || '1.0.0',
        exportedAt: parsed.exportedAt || getCurrentIsoTimestamp(),
        data: {
          behaviors: normalizedBehaviors,
          records: normalizedRecords,
          goals: normalizedGoals,
        },
        metadata: parsed.metadata || {},
      };

      return {
        isValid: true,
        backup: canonicalBackup,
      };
    } catch (e: any) {
      return { isValid: false, error: `Failed to validate backup: ${e.message}` };
    }
  }

  /**
   * Restores database records atomically using 'replace' (default full restore) or 'merge'
   */
  async restoreBackup(backup: BHFile, mode: 'merge' | 'replace' = 'replace'): Promise<RestoreResult> {
    const isV1 = !!((backup as any).habits && (backup as any).days);

    let restoredBehaviors = 0;
    let restoredLogs = 0;
    let restoredGoals = 0;
    let skippedLogs = 0;

    const executeOperations = async () => {
      if (mode === 'replace') {
        // Atomic clean wipe in foreign-key dependency order
        await this.db.execAsync('DELETE FROM log_entries;');
        await this.db.execAsync('DELETE FROM goals;');
        await this.db.execAsync('DELETE FROM behaviors;');
      }

      if (isV1) {
        const v1 = backup as BHFileV1;
        // 1. Insert habits into behaviors table
        for (const h of v1.habits) {
          await this.db.runAsync(
            `INSERT OR REPLACE INTO behaviors (id, name, unit, created_at)
             VALUES (?, ?, ?, ?);`,
            [h.id, h.name, h.unit, getCurrentIsoTimestamp()]
          );
          restoredBehaviors++;
        }

        // 2. Insert days into log_entries
        for (const day of v1.days) {
          const occurredAt = `${day.date}T12:00:00.000`;
          for (const [habitId, qty] of Object.entries(day.habits)) {
            await this.db.runAsync(
              `INSERT INTO log_entries (id, behavior_id, value, occurred_at, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?);`,
              [generateId(), habitId, qty, occurredAt, occurredAt, occurredAt]
            );
            restoredLogs++;
          }
        }
        return;
      }

      const { behaviors, records, goals } = (backup as LegacyBHFile).data;

      // 1. Insert behaviors
      for (const b of behaviors) {
        await this.db.runAsync(
          `INSERT OR REPLACE INTO behaviors (id, name, description, category, unit, daily_limit, created_at, archived_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            b.id,
            b.name,
            b.description ?? null,
            b.category ?? null,
            b.unit || 'times',
            b.dailyLimit ?? null,
            b.createdAt,
            b.archivedAt ?? null,
          ]
        );
        restoredBehaviors++;
      }

      // Read current behavior IDs
      const allDbBehaviors = await this.db.getAllAsync<{ id: string }>('SELECT id FROM behaviors;');
      const validBehaviorIds = new Set(allDbBehaviors.map((b) => b.id));

      // 2. Insert goals
      for (const g of goals) {
        const bId = g.behaviorId && validBehaviorIds.has(g.behaviorId) ? g.behaviorId : null;
        await this.db.runAsync(
          `INSERT OR REPLACE INTO goals (id, title, behavior_id, goal_type, target_value, start_date, end_date, is_active, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            g.id,
            g.title,
            bId,
            g.goalType,
            g.targetValue ?? null,
            g.startDate,
            g.endDate ?? null,
            g.isActive ? 1 : 0,
            g.createdAt,
          ]
        );
        restoredGoals++;
      }

      // 3. Insert records
      for (const r of records) {
        if (!validBehaviorIds.has(r.behaviorId)) {
          skippedLogs++;
          continue;
        }

        await this.db.runAsync(
          `INSERT OR REPLACE INTO log_entries (id, behavior_id, value, occurred_at, note, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?);`,
          [
            r.id,
            r.behaviorId,
            r.value,
            r.occurredAt,
            r.note ?? null,
            r.createdAt,
            r.updatedAt || r.createdAt,
          ]
        );
        restoredLogs++;
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
