import { Goal, GoalVersion, IGoalRepository } from '@behav/domain';
import { ISqliteConnection } from '../database/sqliteConnection';
import { generateUUID } from '../utils/uuid';

interface GoalRow {
  id: string;
  user_id: string;
  behavior_id: string;
  goal_type: string;
  target_value: number;
  evaluation_period: string;
  starts_at: string;
  ends_at: string | null;
  active: number;
  created_at: string;
  updated_at: string;
}

interface GoalVersionRow {
  id: string;
  goal_id: string;
  user_id: string;
  behavior_id: string;
  goal_type: string;
  target_value: number;
  evaluation_period: string;
  version_number: number;
  effective_from: string;
  effective_to: string | null;
  created_at: string;
}

function mapRowToGoal(row: GoalRow): Goal {
  return {
    id: row.id,
    userId: row.user_id,
    behaviorId: row.behavior_id,
    goalType: row.goal_type as Goal['goalType'],
    targetValue: row.target_value,
    evaluationPeriod: row.evaluation_period as Goal['evaluationPeriod'],
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    active: row.active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapRowToVersion(row: GoalVersionRow): GoalVersion {
  return {
    id: row.id,
    goalId: row.goal_id,
    userId: row.user_id,
    behaviorId: row.behavior_id,
    goalType: row.goal_type as GoalVersion['goalType'],
    targetValue: row.target_value,
    evaluationPeriod: row.evaluation_period as GoalVersion['evaluationPeriod'],
    versionNumber: row.version_number,
    effectiveFrom: row.effective_from,
    effectiveTo: row.effective_to,
    createdAt: row.created_at
  };
}

export class SqliteGoalRepository implements IGoalRepository {
  constructor(private conn: ISqliteConnection) {}

  public async findById(id: string, userId: string): Promise<Goal | null> {
    const row = await this.conn.get<GoalRow>(
      `SELECT * FROM goals WHERE id = ? AND user_id = ?`,
      [id, userId]
    );
    return row ? mapRowToGoal(row) : null;
  }

  public async listByBehavior(userId: string, behaviorId: string): Promise<Goal[]> {
    const rows = await this.conn.all<GoalRow>(
      `SELECT * FROM goals WHERE user_id = ? AND behavior_id = ? ORDER BY created_at DESC`,
      [userId, behaviorId]
    );
    return rows.map(mapRowToGoal);
  }

  public async listByUser(userId: string): Promise<Goal[]> {
    const rows = await this.conn.all<GoalRow>(
      `SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    );
    return rows.map(mapRowToGoal);
  }

  public async create(goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Goal> {
    const now = new Date().toISOString();
    const id = goal.id || generateUUID();

    await this.conn.run(
      `INSERT INTO goals (
        id, user_id, behavior_id, goal_type, target_value, evaluation_period,
        starts_at, ends_at, active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        goal.userId,
        goal.behaviorId,
        goal.goalType,
        goal.targetValue,
        goal.evaluationPeriod,
        goal.startsAt,
        goal.endsAt || null,
        goal.active ? 1 : 0,
        now,
        now
      ]
    );

    // Initial version
    const versionId = generateUUID();
    await this.conn.run(
      `INSERT INTO goal_versions (
        id, goal_id, user_id, behavior_id, goal_type, target_value, evaluation_period,
        version_number, effective_from, effective_to, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        versionId,
        id,
        goal.userId,
        goal.behaviorId,
        goal.goalType,
        goal.targetValue,
        goal.evaluationPeriod,
        1,
        goal.startsAt,
        null,
        now
      ]
    );

    return {
      ...goal,
      id,
      createdAt: now,
      updatedAt: now
    };
  }

  public async update(
    id: string,
    userId: string,
    patch: Partial<Omit<Goal, 'id' | 'userId' | 'behaviorId' | 'createdAt'>>
  ): Promise<Goal> {
    const existing = await this.findById(id, userId);
    if (!existing) {
      throw new Error(`Goal not found or unauthorized: ${id}`);
    }

    const now = new Date().toISOString();
    const updated: Goal = {
      ...existing,
      ...patch,
      updatedAt: now
    };

    // If target value or evaluation period modified, close active version and create new immutable version
    if (
      (patch.targetValue !== undefined && patch.targetValue !== existing.targetValue) ||
      (patch.evaluationPeriod !== undefined && patch.evaluationPeriod !== existing.evaluationPeriod)
    ) {
      await this.conn.run(
        `UPDATE goal_versions SET effective_to = ? WHERE goal_id = ? AND user_id = ? AND effective_to IS NULL`,
        [now, id, userId]
      );

      const versions = await this.listVersions(id, userId);
      const nextVersionNum = versions.length + 1;
      const versionId = generateUUID();

      await this.conn.run(
        `INSERT INTO goal_versions (
          id, goal_id, user_id, behavior_id, goal_type, target_value, evaluation_period,
          version_number, effective_from, effective_to, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          versionId,
          id,
          userId,
          existing.behaviorId,
          updated.goalType,
          updated.targetValue,
          updated.evaluationPeriod,
          nextVersionNum,
          now,
          null,
          now
        ]
      );
    }

    await this.conn.run(
      `UPDATE goals SET
        target_value = ?, evaluation_period = ?, ends_at = ?, active = ?, updated_at = ?
      WHERE id = ? AND user_id = ?`,
      [
        updated.targetValue,
        updated.evaluationPeriod,
        updated.endsAt || null,
        updated.active ? 1 : 0,
        now,
        id,
        userId
      ]
    );

    return updated;
  }

  public async createVersion(version: Omit<GoalVersion, 'id' | 'createdAt'> & { id?: string }): Promise<GoalVersion> {
    const now = new Date().toISOString();
    const id = version.id || generateUUID();

    await this.conn.run(
      `INSERT INTO goal_versions (
        id, goal_id, user_id, behavior_id, goal_type, target_value, evaluation_period,
        version_number, effective_from, effective_to, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        version.goalId,
        version.userId,
        version.behaviorId,
        version.goalType,
        version.targetValue,
        version.evaluationPeriod,
        version.versionNumber,
        version.effectiveFrom,
        version.effectiveTo || null,
        now
      ]
    );

    return {
      ...version,
      id,
      createdAt: now
    };
  }

  public async listVersions(goalId: string, userId: string): Promise<GoalVersion[]> {
    const rows = await this.conn.all<GoalVersionRow>(
      `SELECT * FROM goal_versions WHERE goal_id = ? AND user_id = ? ORDER BY version_number ASC`,
      [goalId, userId]
    );
    return rows.map(mapRowToVersion);
  }
}
