import type { SQLiteDatabase } from 'expo-sqlite';
import {
  type Behavior,
  type CreateBehaviorInput,
  type UpdateBehaviorInput,
} from '../../types/database';
import { generateId } from '../../utils/id';
import { getCurrentIsoTimestamp } from '../../utils/date';

interface BehaviorRow {
  id: string;
  name: string;
  nickname?: string | null;
  subtitle?: string | null;
  description: string | null;
  category: string | null;
  unit: string;
  daily_limit: number | null;
  icon?: string | null;
  created_at: string;
  archived_at: string | null;
}

function mapRowToBehavior(row: BehaviorRow): Behavior {
  return {
    id: row.id,
    name: row.name,
    nickname: row.nickname || null,
    subtitle: row.subtitle || row.description || null,
    description: row.description,
    category: row.category,
    unit: row.unit,
    dailyLimit: row.daily_limit,
    icon: row.icon || null,
    createdAt: row.created_at,
    archivedAt: row.archived_at,
  };
}

export class BehaviorRepository {
  private db: SQLiteDatabase;

  constructor(db: SQLiteDatabase) {
    this.db = db;
  }

  /**
   * Retrieves all behaviors, ordered by name
   */
  async getAll(includeArchived = false): Promise<Behavior[]> {
    const query = includeArchived
      ? 'SELECT * FROM behaviors ORDER BY name ASC;'
      : 'SELECT * FROM behaviors WHERE archived_at IS NULL ORDER BY name ASC;';

    const rows = await this.db.getAllAsync<BehaviorRow>(query);
    return rows.map(mapRowToBehavior);
  }

  /**
   * Finds a behavior by ID
   */
  async getById(id: string): Promise<Behavior | null> {
    const row = await this.db.getFirstAsync<BehaviorRow>(
      'SELECT * FROM behaviors WHERE id = ?;',
      [id]
    );
    return row ? mapRowToBehavior(row) : null;
  }

  /**
   * Creates a new behavior with validation
   */
  async create(input: CreateBehaviorInput): Promise<Behavior> {
    const name = input.name.trim();
    if (!name) {
      throw new Error('Behavior name cannot be empty');
    }

    if (input.dailyLimit !== undefined && input.dailyLimit !== null && input.dailyLimit <= 0) {
      throw new Error('Daily limit must be a positive number');
    }

    const id = generateId();
    const createdAt = getCurrentIsoTimestamp();
    const nickname = input.nickname?.trim() || null;
    const subtitle = input.subtitle?.trim() || input.description?.trim() || null;
    const unit = input.unit?.trim() || 'times';
    const description = input.description?.trim() || subtitle;
    const category = input.category?.trim() || null;
    const dailyLimit = input.dailyLimit ?? null;
    const icon = input.icon?.trim() || null;

    try {
      await this.db.runAsync(
        `INSERT INTO behaviors (id, name, nickname, subtitle, description, category, unit, daily_limit, icon, created_at, archived_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL);`,
        [id, name, nickname, subtitle, description, category, unit, dailyLimit, icon, createdAt]
      );
    } catch {
      // Fallback if subtitle column was pending
      await this.db.runAsync(
        `INSERT INTO behaviors (id, name, nickname, description, category, unit, daily_limit, icon, created_at, archived_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL);`,
        [id, name, nickname, description, category, unit, dailyLimit, icon, createdAt]
      );
    }

    return {
      id,
      name,
      nickname,
      subtitle,
      description,
      category,
      unit,
      dailyLimit,
      icon,
      createdAt,
      archivedAt: null,
    };
  }

  /**
   * Updates an existing behavior
   */
  async update(id: string, input: UpdateBehaviorInput): Promise<Behavior> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Behavior with id ${id} not found`);
    }

    let name = existing.name;
    if (input.name !== undefined) {
      const trimmed = input.name.trim();
      if (!trimmed) throw new Error('Behavior name cannot be empty');
      name = trimmed;
    }

    let dailyLimit = existing.dailyLimit;
    if (input.dailyLimit !== undefined) {
      if (input.dailyLimit !== null && input.dailyLimit <= 0) {
        throw new Error('Daily limit must be a positive number');
      }
      dailyLimit = input.dailyLimit;
    }

    const nickname = input.nickname !== undefined ? input.nickname?.trim() || null : (existing.nickname || null);
    const subtitle = input.subtitle !== undefined ? input.subtitle?.trim() || null : (existing.subtitle || existing.description || null);
    const description = input.description !== undefined ? input.description?.trim() || null : (subtitle || existing.description);
    const category = input.category !== undefined ? input.category?.trim() || null : existing.category;
    const unit = input.unit !== undefined ? input.unit.trim() || 'times' : existing.unit;
    const icon = input.icon !== undefined ? input.icon?.trim() || null : (existing.icon || null);

    try {
      await this.db.runAsync(
        `UPDATE behaviors
         SET name = ?, nickname = ?, subtitle = ?, description = ?, category = ?, unit = ?, daily_limit = ?, icon = ?
         WHERE id = ?;`,
        [name, nickname, subtitle, description, category, unit, dailyLimit, icon, id]
      );
    } catch {
      // Fallback if subtitle column was pending
      await this.db.runAsync(
        `UPDATE behaviors
         SET name = ?, nickname = ?, description = ?, category = ?, unit = ?, daily_limit = ?, icon = ?
         WHERE id = ?;`,
        [name, nickname, description, category, unit, dailyLimit, icon, id]
      );
    }

    return {
      ...existing,
      name,
      nickname,
      subtitle,
      description,
      category,
      unit,
      dailyLimit,
      icon,
    };
  }

  /**
   * Archives a behavior (preserves historical data)
   */
  async archive(id: string): Promise<void> {
    const archivedAt = getCurrentIsoTimestamp();
    await this.db.runAsync(
      'UPDATE behaviors SET archived_at = ? WHERE id = ?;',
      [archivedAt, id]
    );
  }

  /**
   * Unarchives a behavior
   */
  async unarchive(id: string): Promise<void> {
    await this.db.runAsync(
      'UPDATE behaviors SET archived_at = NULL WHERE id = ?;',
      [id]
    );
  }

  /**
   * Deletes a behavior and cascades to log entries
   */
  async delete(id: string): Promise<void> {
    await this.db.runAsync('DELETE FROM behaviors WHERE id = ?;', [id]);
  }
}
