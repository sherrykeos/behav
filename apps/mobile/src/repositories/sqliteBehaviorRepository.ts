import { Behavior, IBehaviorRepository } from '@behav/domain';
import { ISqliteConnection } from '../database/sqliteConnection';
import { generateUUID } from '../utils/uuid';

interface BehaviorRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  category: string;
  icon: string;
  accent_color: string;
  measurement_type: string;
  unit: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  deleted_at: string | null;
}

function mapRowToBehavior(row: BehaviorRow): Behavior {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    category: row.category as Behavior['category'],
    icon: row.icon,
    accentColor: row.accent_color,
    measurementType: row.measurement_type as Behavior['measurementType'],
    unit: row.unit,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
    deletedAt: row.deleted_at
  };
}

export class SqliteBehaviorRepository implements IBehaviorRepository {
  constructor(private conn: ISqliteConnection) {}

  public async findById(id: string, userId: string): Promise<Behavior | null> {
    const row = await this.conn.get<BehaviorRow>(
      `SELECT * FROM behaviors WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      [id, userId]
    );
    return row ? mapRowToBehavior(row) : null;
  }

  public async listByUser(userId: string, includeArchived = false): Promise<Behavior[]> {
    let sql = `SELECT * FROM behaviors WHERE user_id = ? AND deleted_at IS NULL`;
    if (!includeArchived) {
      sql += ` AND archived_at IS NULL`;
    }
    sql += ` ORDER BY created_at DESC`;

    const rows = await this.conn.all<BehaviorRow>(sql, [userId]);
    return rows.map(mapRowToBehavior);
  }

  public async create(behavior: Omit<Behavior, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Behavior> {
    const now = new Date().toISOString();
    const id = behavior.id || generateUUID();

    await this.conn.run(
      `INSERT INTO behaviors (
        id, user_id, name, description, category, icon, accent_color,
        measurement_type, unit, created_at, updated_at, archived_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        behavior.userId,
        behavior.name,
        behavior.description || null,
        behavior.category,
        behavior.icon,
        behavior.accentColor,
        behavior.measurementType,
        behavior.unit || null,
        now,
        now,
        behavior.archivedAt || null,
        null
      ]
    );

    return {
      ...behavior,
      id,
      createdAt: now,
      updatedAt: now,
      archivedAt: behavior.archivedAt || null,
      deletedAt: null
    };
  }

  public async update(
    id: string,
    userId: string,
    patch: Partial<Omit<Behavior, 'id' | 'userId' | 'createdAt'>>
  ): Promise<Behavior> {
    const existing = await this.findById(id, userId);
    if (!existing) {
      throw new Error(`Behavior not found or unauthorized: ${id}`);
    }

    const now = new Date().toISOString();
    const updated: Behavior = {
      ...existing,
      ...patch,
      updatedAt: now
    };

    await this.conn.run(
      `UPDATE behaviors SET
        name = ?, description = ?, category = ?, icon = ?, accent_color = ?,
        measurement_type = ?, unit = ?, updated_at = ?, archived_at = ?
      WHERE id = ? AND user_id = ?`,
      [
        updated.name,
        updated.description || null,
        updated.category,
        updated.icon,
        updated.accentColor,
        updated.measurementType,
        updated.unit || null,
        now,
        updated.archivedAt || null,
        id,
        userId
      ]
    );

    return updated;
  }

  public async archive(id: string, userId: string): Promise<void> {
    const now = new Date().toISOString();
    await this.conn.run(
      `UPDATE behaviors SET archived_at = ?, updated_at = ? WHERE id = ? AND user_id = ?`,
      [now, now, id, userId]
    );
  }

  public async unarchive(id: string, userId: string): Promise<void> {
    const now = new Date().toISOString();
    await this.conn.run(
      `UPDATE behaviors SET archived_at = NULL, updated_at = ? WHERE id = ? AND user_id = ?`,
      [now, id, userId]
    );
  }

  public async softDelete(id: string, userId: string): Promise<void> {
    const now = new Date().toISOString();
    await this.conn.run(
      `UPDATE behaviors SET deleted_at = ?, updated_at = ? WHERE id = ? AND user_id = ?`,
      [now, now, id, userId]
    );
  }
}
