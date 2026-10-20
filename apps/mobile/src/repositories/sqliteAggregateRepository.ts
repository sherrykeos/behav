import { DailyAggregate, IAggregateRepository } from '@behav/domain';
import { ISqliteConnection } from '../database/sqliteConnection';
import { generateUUID } from '../utils/uuid';

interface AggregateRow {
  id: string;
  user_id: string;
  behavior_id: string;
  local_date: string;
  total_quantity: number;
  occurrence_count: number;
  review_status: string;
  calculated_at: string;
}

function mapRowToAggregate(row: AggregateRow): DailyAggregate {
  return {
    id: row.id,
    userId: row.user_id,
    behaviorId: row.behavior_id,
    localDate: row.local_date,
    totalQuantity: row.total_quantity,
    occurrenceCount: row.occurrence_count,
    reviewStatus: row.review_status as DailyAggregate['reviewStatus'],
    calculatedAt: row.calculated_at
  };
}

export class SqliteAggregateRepository implements IAggregateRepository {
  constructor(private conn: ISqliteConnection) {}

  public async getByBehaviorAndDate(
    userId: string,
    behaviorId: string,
    localDate: string
  ): Promise<DailyAggregate | null> {
    const row = await this.conn.get<AggregateRow>(
      `SELECT * FROM daily_aggregates WHERE user_id = ? AND behavior_id = ? AND local_date = ?`,
      [userId, behaviorId, localDate]
    );
    return row ? mapRowToAggregate(row) : null;
  }

  public async listByBehaviorAndRange(
    userId: string,
    behaviorId: string,
    startDate: string,
    endDate: string
  ): Promise<DailyAggregate[]> {
    const rows = await this.conn.all<AggregateRow>(
      `SELECT * FROM daily_aggregates
       WHERE user_id = ? AND behavior_id = ? AND local_date >= ? AND local_date <= ?
       ORDER BY local_date ASC`,
      [userId, behaviorId, startDate, endDate]
    );
    return rows.map(mapRowToAggregate);
  }

  public async upsertAggregate(aggregate: DailyAggregate): Promise<DailyAggregate> {
    const existing = await this.getByBehaviorAndDate(
      aggregate.userId,
      aggregate.behaviorId,
      aggregate.localDate
    );
    const now = aggregate.calculatedAt || new Date().toISOString();

    if (existing) {
      await this.conn.run(
        `UPDATE daily_aggregates SET
          total_quantity = ?, occurrence_count = ?, review_status = ?, calculated_at = ?
        WHERE id = ? AND user_id = ?`,
        [
          aggregate.totalQuantity,
          aggregate.occurrenceCount,
          aggregate.reviewStatus,
          now,
          existing.id,
          aggregate.userId
        ]
      );

      return {
        ...existing,
        ...aggregate,
        calculatedAt: now
      };
    }

    const id = aggregate.id || generateUUID();
    await this.conn.run(
      `INSERT INTO daily_aggregates (
        id, user_id, behavior_id, local_date, total_quantity, occurrence_count,
        review_status, calculated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        aggregate.userId,
        aggregate.behaviorId,
        aggregate.localDate,
        aggregate.totalQuantity,
        aggregate.occurrenceCount,
        aggregate.reviewStatus,
        now
      ]
    );

    return {
      ...aggregate,
      id,
      calculatedAt: now
    };
  }

  public async deleteByBehaviorAndDate(
    userId: string,
    behaviorId: string,
    localDate: string
  ): Promise<void> {
    await this.conn.run(
      `DELETE FROM daily_aggregates WHERE user_id = ? AND behavior_id = ? AND local_date = ?`,
      [userId, behaviorId, localDate]
    );
  }
}
