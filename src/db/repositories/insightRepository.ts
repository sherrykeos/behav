import type { SQLiteDatabase } from 'expo-sqlite';
import { toDayString, shiftDayString } from '../../utils/date';
import {
  computeAnalytics,
  type HabitDefinition,
  type DayHabitValues,
  type PeriodAnalyticsResult,
  isDayRecordGreen,
} from '../../services/analytics/analyticsEngine';

export const HABIT_COLORS = [
  '#B9F6CA', // Electric Mint
  '#FF9F43', // Signal Amber
  '#70D6FF', // Sky Blue
  '#FF70A6', // Rose Pink
  '#E9D8A6', // Warm Sand
  '#B388FF', // Lavender
];

export interface MultiHabitDay {
  dateStr: string;
  dayName: string;
  dayNumber: number;
  isToday: boolean;
  values: Record<string, number>;
}

export interface MultiHabitWeekData {
  startDate: string;
  endDate: string;
  formattedRange: string;
  habits: {
    id: string;
    name: string;
    unit: string;
    color: string;
  }[];
  days: MultiHabitDay[];
  maxVal: number;
}

export interface HabitDeepDiveStats {
  behaviorId: string;
  behaviorName: string;
  behaviorUnit: string;
  dailyLimit: number | null;
  createdDate: string;
  totalLogged: number;
  logCount: number;
  currentStreak: number;
  maxStreak: number;
  maxStreakStart: string | null;
  maxStreakEnd: string | null;
}

export interface DayOfWeekData {
  dayIndex: number;
  dayName: string;
  total: number;
}

export interface TimeOfDayData {
  morning: number;
  afternoon: number;
  evening: number;
  night: number;
}

export interface UnifiedStatsData {
  greenDaysMonth: number;
  daysInMonth: number;
  currentMonthStreak: number;
  maxAllTimeStreak: number;
  maxStreakStart: string | null;
  maxStreakEnd: string | null;
  totalLogsRecorded: number;
  totalHabitsActive: number;
  habitStats: HabitDeepDiveStats[];
  past30DaysTotals: { dateStr: string; dayNumber: number; total: number; isGreen: boolean }[];
  habitDistribution: { id: string; name: string; total: number; percentage: number; color: string }[];
  dayOfWeekDistribution: DayOfWeekData[];
  timeOfDayDistribution: TimeOfDayData;
  dataQuality?: {
    expectedDays: number;
    recordedDays: number;
    missingDays: number;
    complete: boolean;
  };
}

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
  trendPercent7Days: number | null;
  // 30-day stats
  total30Days: number;
  avg30Days: number;
  peakDay: { date: string; value: number } | null;
  // Authoritative streak
  currentStreakDays: number;
  maxStreakDays: number;
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
   * Loads all active behaviors and daily log records from SQLite
   * and runs the Authoritative Analytics Engine.
   */
  private async loadAuthoritativeDailyData(anchorDate?: string): Promise<{
    habits: HabitDefinition[];
    dailyRecords: DayHabitValues[];
    dateMap: Map<string, Record<string, number>>;
    analytics: PeriodAnalyticsResult;
  }> {
    const habitsRows = await this.db.getAllAsync<{
      id: string;
      name: string;
      unit: string;
      daily_limit: number | null;
    }>('SELECT id, name, unit, daily_limit FROM behaviors WHERE archived_at IS NULL ORDER BY created_at ASC;');

    const habits: HabitDefinition[] = habitsRows.map((h) => ({
      id: h.id,
      name: h.name,
      unit: h.unit,
      dailyLimit: h.daily_limit,
    }));

    let query = `
      SELECT
        behavior_id,
        substr(occurred_at, 1, 10) as date_str,
        COALESCE(SUM(value), 0) as total_val
      FROM log_entries
    `;
    const params: string[] = [];
    if (anchorDate) {
      query += ' WHERE substr(occurred_at, 1, 10) <= ?';
      params.push(anchorDate);
    }
    query += ' GROUP BY behavior_id, substr(occurred_at, 1, 10) ORDER BY date_str ASC;';

    const rows = await this.db.getAllAsync<{
      behavior_id: string;
      date_str: string;
      total_val: number;
    }>(query, params);

    const dateMap = new Map<string, Record<string, number>>();
    for (const r of rows) {
      if (!dateMap.has(r.date_str)) {
        dateMap.set(r.date_str, {});
      }
      dateMap.get(r.date_str)![r.behavior_id] = Number(r.total_val);
    }

    const sortedDates = Array.from(dateMap.keys()).sort();
    const dailyRecords: DayHabitValues[] = sortedDates.map((d) => ({
      date: d,
      habits: dateMap.get(d)!,
    }));

    const analytics = computeAnalytics(habits, dailyRecords, {
      toDate: anchorDate,
      referenceDate: anchorDate,
    });

    return { habits, dailyRecords, dateMap, analytics };
  }

  /**
   * Calculates comprehensive habit statistics and streaks using the analytics engine
   */
  async getBehaviorStats(behaviorId: string, anchorDateInput?: string): Promise<BehaviorStats | null> {
    const anchorDate = anchorDateInput || toDayString();

    const behavior = await this.db.getFirstAsync<{
      id: string;
      name: string;
      unit: string;
      daily_limit: number | null;
      created_at: string;
    }>('SELECT id, name, unit, daily_limit, created_at FROM behaviors WHERE id = ?;', [behaviorId]);

    if (!behavior) return null;

    const { dateMap, analytics } = await this.loadAuthoritativeDailyData(anchorDate);

    // 7-day breakdown (last 7 days ending at anchorDate)
    const past7Days: DayBarData[] = [];
    let total7Days = 0;
    for (let i = 6; i >= 0; i--) {
      const dStr = shiftDayString(anchorDate, -i);
      const dayValues = dateMap.get(dStr);
      const total = dayValues ? dayValues[behaviorId] || 0 : 0;
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

    // Previous 7 days (days -13 to -7)
    let prev7DaysTotal = 0;
    for (let i = 13; i >= 7; i--) {
      const dStr = shiftDayString(anchorDate, -i);
      const dayValues = dateMap.get(dStr);
      prev7DaysTotal += dayValues ? dayValues[behaviorId] || 0 : 0;
    }

    let trendPercent7Days: number | null = null;
    if (prev7DaysTotal > 0) {
      trendPercent7Days = Math.round(((total7Days - prev7DaysTotal) / prev7DaysTotal) * 100);
    }

    // 30-day totals & peak
    let total30Days = 0;
    let peakDay: { date: string; value: number } | null = null;

    for (let i = 29; i >= 0; i--) {
      const dStr = shiftDayString(anchorDate, -i);
      const dayValues = dateMap.get(dStr);
      const val = dayValues ? dayValues[behaviorId] || 0 : 0;
      total30Days += val;
      if (val > 0 && (!peakDay || val > peakDay.value)) {
        peakDay = { date: dStr, value: val };
      }
    }
    const avg30Days = Math.round((total30Days / 30) * 10) / 10;

    // Authoritative per-habit streaks from analytics engine
    const habitAnalytics = analytics.habits[behaviorId];
    const currentStreakDays = habitAnalytics ? habitAnalytics.currentFreeStreak : 0;
    const maxStreakDays = habitAnalytics ? habitAnalytics.maxFreeStreak : 0;

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
      maxStreakDays,
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
      'SELECT COUNT(*) as count FROM log_entries WHERE substr(occurred_at, 1, 10) = ? AND value > 0;',
      [anchorDate]
    );
    const weekLogsRow = await this.db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM log_entries WHERE substr(occurred_at, 1, 10) BETWEEN ? AND ? AND value > 0;',
      [startDate7, anchorDate]
    );

    return {
      activeHabitCount: Number(habitsCountRow?.count || 0),
      totalLogsToday: Number(todayLogsRow?.count || 0),
      totalLogs7Days: Number(weekLogsRow?.count || 0),
    };
  }

  /**
   * Fetches home dashboard metrics:
   * - sum green days (current month, only verified recorded days!)
   * - this streak (authoritative current green streak)
   * - max streak (authoritative max green streak all-time)
   * - calendar day statuses:
   *   'green': recorded & all habits 0
   *   'logged': recorded & positive habit activity
   *   'future': after anchorDate
   *   'unknown': in the past but no record exists (no dot shown)
   */
  async getHomeDashboardStats(anchorDateInput?: string): Promise<{
    greenDaysMonth: number;
    currentMonthStreak: number;
    maxAllTimeStreak: number;
    monthDays: {
      date: string;
      dayNumber: number;
      dayOfWeek: number;
      status: 'green' | 'logged' | 'future' | 'unknown';
      isToday: boolean;
    }[];
    monthName: string;
    monthOffset: number;
  }> {
    const anchorDate = anchorDateInput || toDayString();
    const [yearStr, monthStr] = anchorDate.split('-');
    const year = Number(yearStr);
    const month = Number(monthStr);

    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
    const monthName = new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: 'short' });

    const { habits, dateMap, analytics } = await this.loadAuthoritativeDailyData(anchorDate);
    const trackedHabitIds = habits.map((h) => h.id);

    const monthDays: {
      date: string;
      dayNumber: number;
      dayOfWeek: number;
      status: 'green' | 'logged' | 'future' | 'unknown';
      isToday: boolean;
    }[] = [];

    let greenDaysMonth = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${yearStr}-${monthStr}-${String(d).padStart(2, '0')}`;
      const dayOfWeek = (firstDayOfWeek + (d - 1)) % 7;
      const isFuture = dateStr > anchorDate;
      const isToday = dateStr === anchorDate;

      let status: 'green' | 'logged' | 'future' | 'unknown';

      if (isFuture) {
        status = 'future';
      } else if (dateMap.has(dateStr)) {
        const dayRecord: DayHabitValues = {
          date: dateStr,
          habits: dateMap.get(dateStr)!,
        };
        const isGreen = isDayRecordGreen(dayRecord, trackedHabitIds);
        if (isGreen) {
          status = 'green';
          greenDaysMonth++;
        } else {
          status = 'logged';
        }
      } else {
        // Day has no valid record: UNKNOWN, not green!
        status = 'unknown';
      }

      monthDays.push({
        date: dateStr,
        dayNumber: d,
        dayOfWeek,
        status,
        isToday,
      });
    }

    return {
      greenDaysMonth,
      currentMonthStreak: analytics.overview.currentGreenStreak,
      maxAllTimeStreak: analytics.overview.maxGreenStreak,
      monthDays,
      monthName,
      monthOffset: firstDayOfWeek,
    };
  }

  /**
   * Fetches 7-day multi-habit breakdown data for scrollable multi-line chart
   */
  async getMultiHabitWeekData(anchorDateInput?: string): Promise<MultiHabitWeekData> {
    const anchorDate = anchorDateInput || toDayString();
    const startDate = shiftDayString(anchorDate, -6);
    const today = toDayString();

    const habitsRows = await this.db.getAllAsync<{ id: string; name: string; unit: string }>(
      'SELECT id, name, unit FROM behaviors WHERE archived_at IS NULL ORDER BY created_at ASC;'
    );

    const habits = habitsRows.map((h, i) => ({
      id: h.id,
      name: h.name,
      unit: h.unit,
      color: HABIT_COLORS[i % HABIT_COLORS.length],
    }));

    const rows = await this.db.getAllAsync<{
      behavior_id: string;
      day: string;
      total: number;
    }>(
      `SELECT
         behavior_id,
         substr(occurred_at, 1, 10) as day,
         COALESCE(SUM(value), 0) as total
       FROM log_entries
       WHERE substr(occurred_at, 1, 10) BETWEEN ? AND ?
       GROUP BY behavior_id, substr(occurred_at, 1, 10);`,
      [startDate, anchorDate]
    );

    const valMap = new Map<string, number>();
    for (const r of rows) {
      valMap.set(`${r.behavior_id}_${r.day}`, Number(r.total));
    }

    let globalMax = 1;
    const days: MultiHabitDay[] = [];
    for (let i = 6; i >= 0; i--) {
      const dStr = shiftDayString(anchorDate, -i);
      const [y, m, d] = dStr.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      const dayName = dateObj.toLocaleDateString(undefined, { weekday: 'short' });

      const dayValues: Record<string, number> = {};
      for (const h of habits) {
        const val = valMap.get(`${h.id}_${dStr}`) || 0;
        dayValues[h.id] = val;
        if (val > globalMax) globalMax = val;
      }

      days.push({
        dateStr: dStr,
        dayName,
        dayNumber: d,
        isToday: dStr === today,
        values: dayValues,
      });
    }

    const [sy, sm, sd] = startDate.split('-').map(Number);
    const [ey, em, ed] = anchorDate.split('-').map(Number);
    const startObj = new Date(sy, sm - 1, sd);
    const endObj = new Date(ey, em - 1, ed);
    const formattedRange = `${startObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${endObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;

    return {
      startDate,
      endDate: anchorDate,
      formattedRange,
      habits,
      days,
      maxVal: globalMax,
    };
  }

  /**
   * Fetches unified comprehensive statistics across all database records,
   * authoritatively powered by computeAnalytics.
   */
  async getUnifiedStats(anchorDateInput?: string): Promise<UnifiedStatsData> {
    const anchorDate = anchorDateInput || toDayString();
    const [yearStr, monthStr] = anchorDate.split('-');
    const year = Number(yearStr);
    const month = Number(monthStr);

    const daysInMonth = new Date(year, month, 0).getDate();

    const { habits, dateMap, analytics } = await this.loadAuthoritativeDailyData(anchorDate);
    const trackedHabitIds = habits.map((h) => h.id);

    // Fetch raw logs for time-of-day and day-of-week distributions
    const allLogs = await this.db.getAllAsync<{
      id: string;
      behavior_id: string;
      occurred_at: string;
      value: number;
    }>('SELECT id, behavior_id, occurred_at, value FROM log_entries WHERE value > 0 ORDER BY occurred_at ASC;');

    const dayOfWeekCounts = [0, 0, 0, 0, 0, 0, 0];
    const timeOfDayCounts = { morning: 0, afternoon: 0, evening: 0, night: 0 };
    const habitCountsMap = new Map<string, number>();

    for (const log of allLogs) {
      const day = log.occurred_at.substring(0, 10);
      const val = Number(log.value);

      habitCountsMap.set(log.behavior_id, (habitCountsMap.get(log.behavior_id) || 0) + 1);

      const [ly, lm, ld] = day.split('-').map(Number);
      const logDate = new Date(ly, lm - 1, ld);
      const dow = logDate.getDay();
      dayOfWeekCounts[dow] += val;

      const timePart = log.occurred_at.length >= 16 ? log.occurred_at.substring(11, 16) : '12:00';
      const hour = parseInt(timePart.split(':')[0], 10) || 12;
      if (hour >= 5 && hour < 12) {
        timeOfDayCounts.morning += val;
      } else if (hour >= 12 && hour < 17) {
        timeOfDayCounts.afternoon += val;
      } else if (hour >= 17 && hour < 22) {
        timeOfDayCounts.evening += val;
      } else {
        timeOfDayCounts.night += val;
      }
    }

    // Green days in current month (verified records only)
    let greenDaysMonth = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${yearStr}-${monthStr}-${String(d).padStart(2, '0')}`;
      if (dateStr <= anchorDate && dateMap.has(dateStr)) {
        const isGreen = isDayRecordGreen({ date: dateStr, habits: dateMap.get(dateStr)! }, trackedHabitIds);
        if (isGreen) {
          greenDaysMonth++;
        }
      }
    }

    // Past 30 Days timeline
    const past30DaysTotals: { dateStr: string; dayNumber: number; total: number; isGreen: boolean }[] = [];
    for (let i = 29; i >= 0; i--) {
      const dStr = shiftDayString(anchorDate, -i);
      const dayRec = dateMap.get(dStr);
      let total = 0;
      let isRecorded = false;
      let isGreen = false;

      if (dayRec) {
        isRecorded = true;
        total = Object.values(dayRec).reduce((a, b) => a + b, 0);
        isGreen = isDayRecordGreen({ date: dStr, habits: dayRec }, trackedHabitIds);
      }

      const dNum = parseInt(dStr.split('-')[2], 10);
      past30DaysTotals.push({
        dateStr: dStr,
        dayNumber: dNum,
        total,
        isGreen,
      });
    }

    // Habit Deep Dive Stats using Authoritative Engine
    const behaviors = await this.db.getAllAsync<{
      id: string;
      name: string;
      unit: string;
      daily_limit: number | null;
      created_at: string;
    }>('SELECT id, name, unit, daily_limit, created_at FROM behaviors WHERE archived_at IS NULL ORDER BY created_at ASC;');

    let totalAllHabitsVal = 0;
    const habitStats: HabitDeepDiveStats[] = behaviors.map((b) => {
      const hData = analytics.habits[b.id];
      const totalVol = hData ? hData.totalQuantity : 0;
      totalAllHabitsVal += totalVol;

      return {
        behaviorId: b.id,
        behaviorName: b.name,
        behaviorUnit: b.unit,
        dailyLimit: b.daily_limit,
        createdDate: b.created_at.substring(0, 10),
        totalLogged: totalVol,
        logCount: habitCountsMap.get(b.id) || 0,
        currentStreak: hData ? hData.currentFreeStreak : 0,
        maxStreak: hData ? hData.maxFreeStreak : 0,
        maxStreakStart: hData ? hData.maxFreeStreakStart : null,
        maxStreakEnd: hData ? hData.maxFreeStreakEnd : null,
      };
    });

    // Habit Distribution Proportions
    const habitDistribution = behaviors.map((b, idx) => {
      const hData = analytics.habits[b.id];
      const total = hData ? hData.totalQuantity : 0;
      const pct = totalAllHabitsVal > 0 ? Math.round((total / totalAllHabitsVal) * 100) : 0;
      return {
        id: b.id,
        name: b.name,
        total,
        percentage: pct,
        color: HABIT_COLORS[idx % HABIT_COLORS.length],
      };
    });

    const dayOfWeekNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dayOfWeekIndices = [1, 2, 3, 4, 5, 6, 0];
    const dayOfWeekDistribution: DayOfWeekData[] = dayOfWeekIndices.map((idx, displayIdx) => ({
      dayIndex: idx,
      dayName: dayOfWeekNames[displayIdx],
      total: dayOfWeekCounts[idx],
    }));

    return {
      greenDaysMonth,
      daysInMonth,
      currentMonthStreak: analytics.overview.currentGreenStreak,
      maxAllTimeStreak: analytics.overview.maxGreenStreak,
      maxStreakStart: analytics.overview.maxGreenStreakStart,
      maxStreakEnd: analytics.overview.maxGreenStreakEnd,
      totalLogsRecorded: allLogs.length,
      totalHabitsActive: behaviors.length,
      habitStats,
      past30DaysTotals,
      habitDistribution,
      dayOfWeekDistribution,
      timeOfDayDistribution: timeOfDayCounts,
      dataQuality: {
        expectedDays: analytics.dataQuality.expectedDays,
        recordedDays: analytics.dataQuality.recordedDays,
        missingDays: analytics.dataQuality.missingDays,
        complete: analytics.dataQuality.complete,
      },
    };
  }
}
