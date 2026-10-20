import { StreakState, IStreakRepository } from '@behav/domain';
import { ISqliteConnection } from '../database/sqliteConnection';
import { generateUUID } from '../utils/uuid';

interface StreakRow {
  id: string;
  user_id: string;
  goal_id: string;
  current_streak: number;
  longest_streak: number;
  last_qualified_date: string | null;
  calculated_at: string;
}

function mapRowToStreak(row: StreakRow): StreakState {
  return {
    id: row.id,
    userId: row.user_id,
    goalId: row.goal_id,
    currentStreak: row.current_streak,
    longestStreak: row.longest_streak,
    lastQualifiedDate: row.last_qualified_date,
    calculatedAt: row.calculated_at
  };
}

export class SqliteStreakRepository implements IStreakRepository {
  constructor(private conn: ISqliteConnection) {}

  public async findByGoalId(goalId: string, userId: string): Promise<StreakState | null> {
    const row = await this.conn.get<StreakRow>(
      `SELECT * FROM streak_states WHERE goal_id = ? AND user_id = ?`,
      [goalId, userId]
    );
    return row ? mapRowToStreak(row) : null;
  }

  public async listByUser(userId: string): Promise<StreakState[]> {
    const rows = await this.conn.all<StreakRow>(
      `SELECT * FROM streak_states WHERE user_id = ?`,
      [userId]
    );
    return rows.map(mapRowToStreak);
  }

  public async upsertStreakState(
    state: Omit<StreakState, 'id'> & { id?: string }
  ): Promise<StreakState> {
    const existing = await this.findByGoalId(state.goalId, state.userId);
    const now = state.calculatedAt || new Date().toISOString();

    if (existing) {
      await this.conn.run(
        `UPDATE streak_states SET
          current_streak = ?, longest_streak = ?, last_qualified_date = ?, calculated_at = ?
        WHERE id = ? AND user_id = ?`,
        [
          state.currentStreak,
          state.longestStreak,
          state.lastQualifiedDate || null,
          now,
          existing.id,
          state.userId
        ]
      );

      return {
        ...existing,
        ...state,
        calculatedAt: now
      };
    }

    const id = state.id || generateUUID();
    await this.conn.run(
      `INSERT INTO streak_states (
        id, user_id, goal_id, current_streak, longest_streak, last_qualified_date, calculated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        state.userId,
        state.goalId,
        state.currentStreak,
        state.longestStreak,
        state.lastQualifiedDate || null,
        now
      ]
    );

    return {
      ...state,
      id,
      calculatedAt: now
    };
  }
}
