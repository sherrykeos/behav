import { BehaviorEntry, IEntryRepository } from '@behav/domain';
import { ISqliteConnection } from '../database/sqliteConnection';
import { generateUUID } from '../utils/uuid';

interface EntryRow {
  id: string;
  user_id: string;
  behavior_id: string;
  quantity: number;
  occurred_at: string;
  timezone: string;
  notes: string | null;
  context_tags: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

function mapRowToEntry(row: EntryRow): BehaviorEntry {
  let contextTags: string[] = [];
  try {
    contextTags = JSON.parse(row.context_tags);
  } catch {
    contextTags = [];
  }

  return {
    id: row.id,
    userId: row.user_id,
    behaviorId: row.behavior_id,
    quantity: row.quantity,
    occurredAt: row.occurred_at,
    timezone: row.timezone,
    notes: row.notes,
    contextTags,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at
  };
}

export class SqliteEntryRepository implements IEntryRepository {
  constructor(private conn: ISqliteConnection) {}

  public async findById(id: string, userId: string): Promise<BehaviorEntry | null> {
    const row = await this.conn.get<EntryRow>(
      `SELECT * FROM behavior_entries WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      [id, userId]
    );
    return row ? mapRowToEntry(row) : null;
  }

  public async listByBehaviorAndRange(
    userId: string,
    behaviorId: string,
    startDate: string,
    endDate: string
  ): Promise<BehaviorEntry[]> {
    const startIso = `${startDate}T00:00:00.000Z`;
    const endIso = `${endDate}T23:59:59.999Z`;

    const rows = await this.conn.all<EntryRow>(
      `SELECT * FROM behavior_entries
       WHERE user_id = ? AND behavior_id = ? AND occurred_at >= ? AND occurred_at <= ? AND deleted_at IS NULL
       ORDER BY occurred_at DESC`,
      [userId, behaviorId, startIso, endIso]
    );

    return rows.map(mapRowToEntry);
  }

  public async listByUserAndRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<BehaviorEntry[]> {
    const startIso = `${startDate}T00:00:00.000Z`;
    const endIso = `${endDate}T23:59:59.999Z`;

    const rows = await this.conn.all<EntryRow>(
      `SELECT * FROM behavior_entries
       WHERE user_id = ? AND occurred_at >= ? AND occurred_at <= ? AND deleted_at IS NULL
       ORDER BY occurred_at DESC`,
      [userId, startIso, endIso]
    );

    return rows.map(mapRowToEntry);
  }

  public async create(entry: Omit<BehaviorEntry, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<BehaviorEntry> {
    // Security check: verify parent behavior belongs to user
    const behavior = await this.conn.get(
      `SELECT id FROM behaviors WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      [entry.behaviorId, entry.userId]
    );
    if (!behavior) {
      throw new Error(`Parent behavior not found or unauthorized: ${entry.behaviorId}`);
    }

    const now = new Date().toISOString();
    const id = entry.id || generateUUID();
    const tagsJson = JSON.stringify(entry.contextTags || []);

    await this.conn.run(
      `INSERT INTO behavior_entries (
        id, user_id, behavior_id, quantity, occurred_at, timezone, notes,
        context_tags, created_at, updated_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        entry.userId,
        entry.behaviorId,
        entry.quantity,
        entry.occurredAt,
        entry.timezone,
        entry.notes || null,
        tagsJson,
        now,
        now,
        null
      ]
    );

    return {
      ...entry,
      id,
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    };
  }

  public async update(
    id: string,
    userId: string,
    patch: Partial<Omit<BehaviorEntry, 'id' | 'userId' | 'behaviorId' | 'createdAt'>>
  ): Promise<BehaviorEntry> {
    const existing = await this.findById(id, userId);
    if (!existing) {
      throw new Error(`Entry not found or unauthorized: ${id}`);
    }

    const now = new Date().toISOString();
    const updated: BehaviorEntry = {
      ...existing,
      ...patch,
      updatedAt: now
    };

    const tagsJson = JSON.stringify(updated.contextTags || []);

    await this.conn.run(
      `UPDATE behavior_entries SET
        quantity = ?, occurred_at = ?, timezone = ?, notes = ?, context_tags = ?, updated_at = ?
      WHERE id = ? AND user_id = ?`,
      [
        updated.quantity,
        updated.occurredAt,
        updated.timezone,
        updated.notes || null,
        tagsJson,
        now,
        id,
        userId
      ]
    );

    return updated;
  }

  public async softDelete(id: string, userId: string): Promise<void> {
    const now = new Date().toISOString();
    await this.conn.run(
      `UPDATE behavior_entries SET deleted_at = ?, updated_at = ? WHERE id = ? AND user_id = ?`,
      [now, now, id, userId]
    );
  }

  public async countByUser(userId: string): Promise<number> {
    const res = await this.conn.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM behavior_entries WHERE user_id = ? AND deleted_at IS NULL`,
      [userId]
    );
    return res ? res.count : 0;
  }
}
