import type { SQLiteDatabase } from 'expo-sqlite';
import { toDayString, shiftDayString } from '../../utils/date';

export interface DayBarData {
  dateStr: string;
  dayName: string;
  total: number;
  isToday: boolean;
}

export interface BehaviorStats {
  behaviorId: string;
  behaviorName: string;
  behaviorUnit: string;
  dailyLimit: number | null;
  // 7-day stats
  past7Days: DayBarData[];
  total7Days: number;
  avg7Days: number;
  prev7DaysTotal: number;
  trendPercent7Days: number | null; // e.g. -15% (reduced) or +10% (increased)
  // 30-day stats
  total30Days: number;
  avg30Days: number;
  peakDay: { date: string; value: number } | null;
  // Current adherence streak
  currentStreakDays: number;
}

export interface DayTotalRow {
  day: string;
  total: number;
}

export class InsightRepository {
  private db: SQLiteDatabase;

  constructor(db: SQLiteDatabase) {
    this.db = db;
  }

  /**
   * Calculates comprehensive bad-habit statistics and honest streaks for a behavior
   */
  async getBehaviorStats(behaviorId: string, anchorDateInput?: string): Promise<BehaviorStats | null> {
    const anchorDate = anchorDateInput || toDayString();

    // 1. Fetch behavior details
    const behavior = await this.db.getFirstAsync<{
      id: string;
      name: string;
      unit: string;
      daily_limit: number | null;
      created_at: string;
    }>('SELECT id, name, unit, daily_limit, created_at FROM behaviors WHERE id = ?;', [behaviorId]);

    if (!behavior) return null;

    const createdDay = toDayString(behavior.created_at);

    // 2. Fetch past 30 days totals
    const startDate30 = shiftDayString(anchorDate, -29);
    const rows = await this.db.getAllAsync<DayTotalRow>(
      `SELECT
         substr(occurred_at, 1, 10) AS day,
         COALESCE(SUM(value), 0) AS total
       FROM log_entries
       WHERE behavior_id = ?
         AND substr(occurred_at, 1, 10) BETWEEN ? AND ?
       GROUP BY substr(occurred_at, 1, 10);`,
      [behaviorId, startDate30, anchorDate]
    );

    const dayMap = new Map<string, number>();
    for (const row of rows) {
      dayMap.set(row.day, Number(row.total));
    }

    // 3. Build 7-day breakdown (last 7 days ending at anchorDate)
    const past7Days: DayBarData[] = [];
    let total7Days = 0;
    for (let i = 6; i >= 0; i--) {
      const dStr = shiftDayString(anchorDate, -i);
      const total = dayMap.get(dStr) || 0;
      total7Days += total;

      const [y, m, d] = dStr.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      const dayName = dateObj.toLocaleDateString(undefined, { weekday: 'narrow' });

      past7Days.push({
        dateStr: dStr,
        dayName,
        total,
        isToday: dStr === anchorDate,
      });
    }

    const avg7Days = Math.round((total7Days / 7) * 10) / 10;

    // 4. Calculate previous 7 days (days -13 to -7) to determine trend
    const prev7Start = shiftDayString(anchorDate, -13);
    const prev7End = shiftDayString(anchorDate, -7);
    const prev7Rows = await this.db.getAllAsync<DayTotalRow>(
      `SELECT
         COALESCE(SUM(value), 0) AS total
       FROM log_entries
       WHERE behavior_id = ?
         AND substr(occurred_at, 1, 10) BETWEEN ? AND ?;`,
      [behaviorId, prev7Start, prev7End]
    );
    const prev7DaysTotal = prev7Rows.length > 0 ? Number(prev7Rows[0].total) : 0;

    let trendPercent7Days: number | null = null;
    if (prev7DaysTotal > 0) {
      trendPercent7Days = Math.round(((total7Days - prev7DaysTotal) / prev7DaysTotal) * 100);
    } else if (total7Days > 0 && prev7DaysTotal === 0) {
      trendPercent7Days = null; // No baseline to compare fairly
    }

    // 5. 30-day totals & peak
    let total30Days = 0;
    let peakDay: { date: string; value: number } | null = null;

    for (let i = 29; i >= 0; i--) {
      const dStr = shiftDayString(anchorDate, -i);
      const val = dayMap.get(dStr) || 0;
      total30Days += val;
      if (val > 0 && (!peakDay || val > peakDay.value)) {
        peakDay = { date: dStr, value: val };
      }
    }
    const avg30Days = Math.round((total30Days / 30) * 10) / 10;

    // 6. Calculate Streak based on explicit rule:
    // For bad habits with a daily limit: consecutive days where total <= daily_limit
    // Starting from anchorDate backward to createdDay.
    // If the habit has never had any records logged in the window, streak is 0 (anti-fabrication rule).
    let currentStreakDays = 0;
    const limit = behavior.daily_limit;

    if (limit !== null && limit > 0 && rows.length > 0) {
      // Check anchor day first
      const todayTotal = dayMap.get(anchorDate) || 0;
      let checkDate = anchorDate;

      if (todayTotal <= limit) {
        currentStreakDays++;
        checkDate = shiftDayString(anchorDate, -1);
      } else {
        checkDate = ''; // Exceeded limit on anchor day, streak is 0
      }

      // Check consecutive prior days back to createdDay
      while (checkDate && checkDate >= createdDay) {
        const dayTotal = dayMap.get(checkDate) || 0;
        if (dayTotal <= limit) {
          currentStreakDays++;
          checkDate = shiftDayString(checkDate, -1);
          if (currentStreakDays >= 60) break;
        } else {
          break; // Exceeded limit, streak breaks
        }
      }
    }

    return {
      behaviorId: behavior.id,
      behaviorName: behavior.name,
      behaviorUnit: behavior.unit,
      dailyLimit: behavior.daily_limit,
      past7Days,
      total7Days,
      avg7Days,
      prev7DaysTotal,
      trendPercent7Days,
      total30Days,
      avg30Days,
      peakDay,
      currentStreakDays,
    };
  }

  /**
   * Fetches overall summary stats across all active behaviors
   */
  async getOverallSummary(anchorDateInput?: string): Promise<{
    activeHabitCount: number;
    totalLogsToday: number;
    totalLogs7Days: number;
  }> {
    const anchorDate = anchorDateInput || toDayString();
    const startDate7 = shiftDayString(anchorDate, -6);

    const habitsCountRow = await this.db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM behaviors WHERE archived_at IS NULL;'
    );
    const todayLogsRow = await this.db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM log_entries WHERE substr(occurred_at, 1, 10) = ?;',
      [anchorDate]
    );
    const weekLogsRow = await this.db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM log_entries WHERE substr(occurred_at, 1, 10) BETWEEN ? AND ?;',
      [startDate7, anchorDate]
    );

    return {
      activeHabitCount: Number(habitsCountRow?.count || 0),
      totalLogsToday: Number(todayLogsRow?.count || 0),
      totalLogs7Days: Number(weekLogsRow?.count || 0),
    };
  }
}
