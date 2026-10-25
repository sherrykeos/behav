import type { SQLiteDatabase } from 'expo-sqlite';
import {
  type Goal,
  type CreateGoalInput,
  type UpdateGoalInput,
  type GoalType,
} from '../../types/database';
import { generateId } from '../../utils/id';
import { getCurrentIsoTimestamp } from '../../utils/date';

interface GoalRow {
  id: string;
  title: string;
  behavior_id: string | null;
  goal_type: string;
  target_value: number | null;
  start_date: string;
  end_date: string | null;
  is_active: number;
  created_at: string;
}

function mapRowToGoal(row: GoalRow): Goal {
  return {
    id: row.id,
    title: row.title,
    behaviorId: row.behavior_id,
    goalType: row.goal_type as GoalType,
    targetValue: row.target_value,
    startDate: row.start_date,
    endDate: row.end_date,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
  };
}

export class GoalRepository {
  private db: SQLiteDatabase;

  constructor(db: SQLiteDatabase) {
    this.db = db;
  }

  /**
   * Retrieves all goals
   */
  async getAll(activeOnly = true): Promise<Goal[]> {
    const query = activeOnly
      ? 'SELECT * FROM goals WHERE is_active = 1 ORDER BY created_at DESC;'
      : 'SELECT * FROM goals ORDER BY created_at DESC;';

    const rows = await this.db.getAllAsync<GoalRow>(query);
    return rows.map(mapRowToGoal);
  }

  /**
   * Finds a goal by ID
   */
  async getById(id: string): Promise<Goal | null> {
    const row = await this.db.getFirstAsync<GoalRow>(
      'SELECT * FROM goals WHERE id = ?;',
      [id]
    );
    return row ? mapRowToGoal(row) : null;
  }

  /**
   * Creates a new goal
   */
  async create(input: CreateGoalInput): Promise<Goal> {
    const title = input.title.trim();
    if (!title) {
      throw new Error('Goal title cannot be empty');
    }

    const id = generateId();
    const createdAt = getCurrentIsoTimestamp();
    const behaviorId = input.behaviorId ?? null;
    const targetValue = input.targetValue ?? null;
    const endDate = input.endDate ?? null;

    await this.db.runAsync(
      `INSERT INTO goals (id, title, behavior_id, goal_type, target_value, start_date, end_date, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?);`,
      [id, title, behaviorId, input.goalType, targetValue, input.startDate, endDate, createdAt]
    );

    return {
      id,
      title,
      behaviorId,
      goalType: input.goalType,
      targetValue,
      startDate: input.startDate,
      endDate,
      isActive: true,
      createdAt,
    };
  }

  /**
   * Updates an existing goal
   */
  async update(id: string, input: UpdateGoalInput): Promise<Goal> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Goal with id ${id} not found`);
    }

    let title = existing.title;
    if (input.title !== undefined) {
      const trimmed = input.title.trim();
      if (!trimmed) throw new Error('Goal title cannot be empty');
      title = trimmed;
    }

    const targetValue = input.targetValue !== undefined ? input.targetValue : existing.targetValue;
    const endDate = input.endDate !== undefined ? input.endDate : existing.endDate;
    const isActive = input.isActive !== undefined ? (input.isActive ? 1 : 0) : (existing.isActive ? 1 : 0);

    await this.db.runAsync(
      `UPDATE goals
       SET title = ?, target_value = ?, end_date = ?, is_active = ?
       WHERE id = ?;`,
      [title, targetValue, endDate, isActive, id]
    );

    return {
      ...existing,
      title,
      targetValue,
      endDate,
      isActive: isActive === 1,
    };
  }

  /**
   * Deletes a goal
   */
  async delete(id: string): Promise<void> {
    await this.db.runAsync('DELETE FROM goals WHERE id = ?;', [id]);
  }
}
