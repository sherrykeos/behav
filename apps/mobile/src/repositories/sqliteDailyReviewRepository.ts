import { DailyReview, IDailyReviewRepository } from '@behav/domain';
import { ISqliteConnection } from '../database/sqliteConnection';
import { generateUUID } from '../utils/uuid';

interface DailyReviewRow {
  id: string;
  user_id: string;
  behavior_id: string;
  local_date: string;
  timezone: string;
  status: string;
  notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

function mapRowToReview(row: DailyReviewRow): DailyReview {
  return {
    id: row.id,
    userId: row.user_id,
    behaviorId: row.behavior_id,
    localDate: row.local_date,
    timezone: row.timezone,
    status: row.status as DailyReview['status'],
    notes: row.notes,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export class SqliteDailyReviewRepository implements IDailyReviewRepository {
  constructor(private conn: ISqliteConnection) {}

  public async findByDateAndBehavior(
    userId: string,
    behaviorId: string,
    localDate: string
  ): Promise<DailyReview | null> {
    const row = await this.conn.get<DailyReviewRow>(
      `SELECT * FROM daily_reviews WHERE user_id = ? AND behavior_id = ? AND local_date = ?`,
      [userId, behaviorId, localDate]
    );
    return row ? mapRowToReview(row) : null;
  }

  public async listByBehaviorAndRange(
    userId: string,
    behaviorId: string,
    startDate: string,
    endDate: string
  ): Promise<DailyReview[]> {
    const rows = await this.conn.all<DailyReviewRow>(
      `SELECT * FROM daily_reviews
       WHERE user_id = ? AND behavior_id = ? AND local_date >= ? AND local_date <= ?
       ORDER BY local_date ASC`,
      [userId, behaviorId, startDate, endDate]
    );
    return rows.map(mapRowToReview);
  }

  public async upsertReview(
    review: Omit<DailyReview, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ): Promise<DailyReview> {
    const existing = await this.findByDateAndBehavior(
      review.userId,
      review.behaviorId,
      review.localDate
    );
    const now = new Date().toISOString();

    if (existing) {
      await this.conn.run(
        `UPDATE daily_reviews SET
          timezone = ?, status = ?, notes = ?, reviewed_at = ?, updated_at = ?
        WHERE id = ? AND user_id = ?`,
        [
          review.timezone,
          review.status,
          review.notes || null,
          now,
          now,
          existing.id,
          review.userId
        ]
      );

      return {
        ...existing,
        ...review,
        reviewedAt: now,
        updatedAt: now
      };
    }

    const id = review.id || generateUUID();
    await this.conn.run(
      `INSERT INTO daily_reviews (
        id, user_id, behavior_id, local_date, timezone, status, notes,
        reviewed_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        review.userId,
        review.behaviorId,
        review.localDate,
        review.timezone,
        review.status,
        review.notes || null,
        now,
        now,
        now
      ]
    );

    return {
      ...review,
      id,
      reviewedAt: now,
      createdAt: now,
      updatedAt: now
    };
  }
}
