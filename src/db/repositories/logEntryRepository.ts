import type { SQLiteDatabase } from 'expo-sqlite';
import {
  type LogEntry,
  type LogEntryWithBehavior,
  type CreateLogEntryInput,
  type UpdateLogEntryInput,
  type DailyBehaviorSummary,
} from '../../types/database';
import { generateId } from '../../utils/id';
import { getCurrentIsoTimestamp, isValidIsoDate, toDayString } from '../../utils/date';

interface LogEntryRow {
  id: string;
  behavior_id: string;
  value: number;
  occurred_at: string;
  note: string | null;
  created_at: string;
  updated_at: string;
}

interface LogEntryWithBehaviorRow extends LogEntryRow {
  behavior_name: string;
  behavior_unit: string;
  behavior_category: string | null;
}

interface DailySummaryRow {
  behavior_id: string;
  behavior_name: string;
  behavior_unit: string;
  behavior_category: string | null;
  daily_limit: number | null;
  total_value: number;
  entry_count: number;
}

function mapRowToLogEntry(row: LogEntryRow): LogEntry {
  return {
    id: row.id,
    behaviorId: row.behavior_id,
    value: row.value,
    occurredAt: row.occurred_at,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowToLogEntryWithBehavior(row: LogEntryWithBehaviorRow): LogEntryWithBehavior {
  return {
    ...mapRowToLogEntry(row),
    behaviorName: row.behavior_name,
    behaviorUnit: row.behavior_unit,
    behaviorCategory: row.behavior_category,
  };
}

export class LogEntryRepository {
  private db: SQLiteDatabase;

  constructor(db: SQLiteDatabase) {
    this.db = db;
  }

  /**
   * Finds a log entry by ID
   */
  async getById(id: string): Promise<LogEntry | null> {
    const row = await this.db.getFirstAsync<LogEntryRow>(
      'SELECT * FROM log_entries WHERE id = ?;',
      [id]
    );
    return row ? mapRowToLogEntry(row) : null;
  }

  /**
   * Creates a new log entry
   */
  async create(input: CreateLogEntryInput): Promise<LogEntry> {
    if (!input.behaviorId) {
      throw new Error('behaviorId is required');
    }
    if (typeof input.value !== 'number' || isNaN(input.value) || input.value <= 0) {
      throw new Error('Logged value must be a positive number');
    }

    const occurredAt = input.occurredAt || getCurrentIsoTimestamp();
    if (!isValidIsoDate(occurredAt)) {
      throw new Error('occurredAt must be a valid date timestamp');
    }

    // Verify behavior exists
    const behavior = await this.db.getFirstAsync<{ id: string }>(
      'SELECT id FROM behaviors WHERE id = ?;',
      [input.behaviorId]
    );
    if (!behavior) {
      throw new Error(`Behavior with id ${input.behaviorId} does not exist`);
    }

    const id = generateId();
    const createdAt = getCurrentIsoTimestamp();
    const updatedAt = createdAt;
    const note = input.note?.trim() || null;

    await this.db.runAsync(
      `INSERT INTO log_entries (id, behavior_id, value, occurred_at, note, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [id, input.behaviorId, input.value, occurredAt, note, createdAt, updatedAt]
    );

    return {
      id,
      behaviorId: input.behaviorId,
      value: input.value,
      occurredAt,
      note,
      createdAt,
      updatedAt,
    };
  }

  /**
   * Updates an existing entry
   */
  async update(id: string, input: UpdateLogEntryInput): Promise<LogEntry> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Log entry with id ${id} not found`);
    }

    let value = existing.value;
    if (input.value !== undefined) {
      if (typeof input.value !== 'number' || isNaN(input.value) || input.value <= 0) {
        throw new Error('Logged value must be a positive number');
      }
      value = input.value;
    }

    let occurredAt = existing.occurredAt;
    if (input.occurredAt !== undefined) {
      if (!isValidIsoDate(input.occurredAt)) {
        throw new Error('occurredAt must be a valid date timestamp');
      }
      occurredAt = input.occurredAt;
    }

    const note = input.note !== undefined ? input.note?.trim() || null : existing.note;
    const updatedAt = getCurrentIsoTimestamp();

    await this.db.runAsync(
      `UPDATE log_entries
       SET value = ?, occurred_at = ?, note = ?, updated_at = ?
       WHERE id = ?;`,
      [value, occurredAt, note, updatedAt, id]
    );

    return {
      ...existing,
      value,
      occurredAt,
      note,
      updatedAt,
    };
  }

  /**
   * Deletes a log entry
   */
  async delete(id: string): Promise<void> {
    await this.db.runAsync('DELETE FROM log_entries WHERE id = ?;', [id]);
  }

  /**
   * Retrieves log entries for a specific day string (YYYY-MM-DD)
   */
  async getByDate(dateInput: string | Date): Promise<LogEntryWithBehavior[]> {
    const day = toDayString(dateInput);
    const rows = await this.db.getAllAsync<LogEntryWithBehaviorRow>(
      `SELECT
         e.*,
         b.name AS behavior_name,
         b.unit AS behavior_unit,
         b.category AS behavior_category
       FROM log_entries e
       JOIN behaviors b ON e.behavior_id = b.id
       WHERE substr(e.occurred_at, 1, 10) = ?
       ORDER BY e.occurred_at DESC;`,
      [day]
    );

    return rows.map(mapRowToLogEntryWithBehavior);
  }

  /**
   * Retrieves all log entries for a behavior
   */
  async getByBehaviorId(behaviorId: string): Promise<LogEntry[]> {
    const rows = await this.db.getAllAsync<LogEntryRow>(
      'SELECT * FROM log_entries WHERE behavior_id = ? ORDER BY occurred_at DESC;',
      [behaviorId]
    );
    return rows.map(mapRowToLogEntry);
  }

  /**
   * Aggregates total value and count per active behavior for a specific day
   */
  async getDailySummaries(dateInput: string | Date): Promise<DailyBehaviorSummary[]> {
    const day = toDayString(dateInput);
    const rows = await this.db.getAllAsync<DailySummaryRow>(
      `SELECT
         b.id AS behavior_id,
         b.name AS behavior_name,
         b.unit AS behavior_unit,
         b.category AS behavior_category,
         b.daily_limit,
         COALESCE(SUM(e.value), 0) AS total_value,
         COUNT(e.id) AS entry_count
       FROM behaviors b
       LEFT JOIN log_entries e
         ON b.id = e.behavior_id AND substr(e.occurred_at, 1, 10) = ?
       WHERE b.archived_at IS NULL
       GROUP BY b.id
       ORDER BY b.name ASC;`,
      [day]
    );

    return rows.map((r) => ({
      behaviorId: r.behavior_id,
      behaviorName: r.behavior_name,
      behaviorUnit: r.behavior_unit,
      behaviorCategory: r.behavior_category,
      dailyLimit: r.daily_limit,
      totalValue: Number(r.total_value),
      entryCount: Number(r.entry_count),
      isLimitReached: r.daily_limit !== null && Number(r.total_value) >= r.daily_limit,
    }));
  }
}
