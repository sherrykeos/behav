import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import {
  type Behavior,
  type LogEntry,
  type LogEntryWithBehavior,
  type DailyBehaviorSummary,
  type CreateBehaviorInput,
  type UpdateBehaviorInput,
  type CreateLogEntryInput,
  type UpdateLogEntryInput,
  type Goal,
  type CreateGoalInput,
  type UpdateGoalInput,
} from '@/types/database';
import {
  createRepositories,
  type DatabaseRepositories,
  type BehaviorStats,
} from '@/db';
import { toDayString } from '@/utils/date';

export interface UserProfile {
  name: string;
  bio: string;
  avatarIcon: string;
  avatarColor: string;
}

interface BehaviorContextValue {
  behaviors: Behavior[];
  archivedBehaviors: Behavior[];
  todaySummaries: DailyBehaviorSummary[];
  todayEntries: LogEntryWithBehavior[];
  goals: Goal[];
  isLoading: boolean;
  refreshData: () => Promise<void>;
  // User Profile
  userProfile: UserProfile;
  updateUserProfile: (profile: Partial<UserProfile>) => Promise<void>;
  // Behavior operations
  createBehavior: (input: CreateBehaviorInput) => Promise<Behavior>;
  updateBehavior: (id: string, input: UpdateBehaviorInput) => Promise<Behavior>;
  archiveBehavior: (id: string) => Promise<void>;
  unarchiveBehavior: (id: string) => Promise<void>;
  deleteBehavior: (id: string) => Promise<void>;
  // Log operations
  quickLog: (behaviorId: string, value?: number, note?: string) => Promise<LogEntry>;
  createLogEntry: (input: CreateLogEntryInput) => Promise<LogEntry>;
  updateLogEntry: (id: string, input: UpdateLogEntryInput) => Promise<LogEntry>;
  deleteLogEntry: (id: string) => Promise<void>;
  // Goals operations
  createGoal: (input: CreateGoalInput) => Promise<Goal>;
  updateGoal: (id: string, input: UpdateGoalInput) => Promise<Goal>;
  deleteGoal: (id: string) => Promise<void>;
  getBehaviorStats: (behaviorId: string, anchorDate?: string) => Promise<BehaviorStats | null>;
  getOverallSummary: (anchorDate?: string) => Promise<{ activeHabitCount: number; totalLogsToday: number; totalLogs7Days: number }>;
  getHomeDashboardStats: (anchorDate?: string) => Promise<{
    greenDaysMonth: number;
    currentMonthStreak: number;
    maxAllTimeStreak: number;
    monthDays: {
      date: string;
      dayNumber: number;
      dayOfWeek: number;
      status: 'green' | 'logged' | 'future';
      isToday: boolean;
    }[];
    monthName: string;
    monthOffset: number;
  }>;
  getMultiHabitWeekData: (anchorDate?: string) => Promise<import('@/db').MultiHabitWeekData>;
  getUnifiedStats: (anchorDate?: string) => Promise<import('@/db').UnifiedStatsData>;
  // Record bounds & inspection
  getRecordBounds: () => Promise<import('@/db').RecordBounds>;
  // Backup & Restore operations
  createBackupData: (options?: { startDate?: string; endDate?: string }) => Promise<import('@/db').BehavBackupFile>;
  validateBackupContent: (jsonString: string, filename?: string) => { isValid: boolean; error?: string; backup?: import('@/db').BehavBackupFile };
  restoreBackupData: (backup: import('@/db').BehavBackupFile, mode?: 'merge' | 'replace') => Promise<import('@/db').RestoreResult>;
  exportLogsCsv: (options?: { startDate?: string; endDate?: string }) => Promise<string>;
  exportBehaviorsCsv: () => Promise<string>;
  // Utilities
  getEntriesForDate: (date: string | Date) => Promise<LogEntryWithBehavior[]>;
  getSummariesForDate: (date: string | Date) => Promise<DailyBehaviorSummary[]>;
}

const BehaviorContext = createContext<BehaviorContextValue | null>(null);

export const BehaviorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const db = useSQLiteContext();
  const repos = useMemo<DatabaseRepositories>(() => createRepositories(db), [db]);

  const [behaviors, setBehaviors] = useState<Behavior[]>([]);
  const [archivedBehaviors, setArchivedBehaviors] = useState<Behavior[]>([]);
  const [todaySummaries, setTodaySummaries] = useState<DailyBehaviorSummary[]>([]);
  const [todayEntries, setTodayEntries] = useState<LogEntryWithBehavior[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // User Profile state
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: 'Sherry',
    bio: 'Building consistent daily habits',
    avatarIcon: 'person',
    avatarColor: '#B9F6CA',
  });

  // Load user profile from app_settings
  useEffect(() => {
    async function loadProfile() {
      try {
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS app_settings (
            key TEXT PRIMARY KEY NOT NULL,
            value TEXT NOT NULL
          );
        `);
        const rows = await db.getAllAsync<{ key: string; value: string }>(
          'SELECT key, value FROM app_settings WHERE key IN (?, ?, ?, ?);',
          ['user_name', 'user_bio', 'user_avatar_icon', 'user_avatar_color']
        );
        const map = new Map(rows.map((r) => [r.key, r.value]));
        setUserProfile((prev) => ({
          name: map.get('user_name') || prev.name,
          bio: map.get('user_bio') || prev.bio,
          avatarIcon: map.get('user_avatar_icon') || prev.avatarIcon,
          avatarColor: map.get('user_avatar_color') || prev.avatarColor,
        }));
      } catch (err) {
        // quiet fallback
      }
    }
    loadProfile();
  }, [db]);

  const updateUserProfile = useCallback(
    async (newProfile: Partial<UserProfile>) => {
      try {
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS app_settings (
            key TEXT PRIMARY KEY NOT NULL,
            value TEXT NOT NULL
          );
        `);
        const merged = { ...userProfile, ...newProfile };
        if (newProfile.name !== undefined) {
          await db.runAsync('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?);', [
            'user_name',
            merged.name,
          ]);
        }
        if (newProfile.bio !== undefined) {
          await db.runAsync('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?);', [
            'user_bio',
            merged.bio,
          ]);
        }
        if (newProfile.avatarIcon !== undefined) {
          await db.runAsync('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?);', [
            'user_avatar_icon',
            merged.avatarIcon,
          ]);
        }
        if (newProfile.avatarColor !== undefined) {
          await db.runAsync('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?);', [
            'user_avatar_color',
            merged.avatarColor,
          ]);
        }
        setUserProfile(merged);
      } catch (err) {
        console.error('Error updating user profile:', err);
        throw err;
      }
    },
    [db, userProfile]
  );

  const refreshData = useCallback(async () => {
    try {
      const today = toDayString();
      const [allBehaviors, summaries, entries, allGoals] = await Promise.all([
        repos.behaviors.getAll(true),
        repos.logEntries.getDailySummaries(today),
        repos.logEntries.getByDate(today),
        repos.goals.getAll(false),
      ]);

      const active = allBehaviors.filter((b) => b.archivedAt === null);
      const archived = allBehaviors.filter((b) => b.archivedAt !== null);

      setBehaviors(active);
      setArchivedBehaviors(archived);
      setTodaySummaries(summaries);
      setTodayEntries(entries);
      setGoals(allGoals);
    } catch (error) {
      console.error('Error refreshing behavior data from SQLite:', error);
    } finally {
      setIsLoading(false);
    }
  }, [repos]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Behavior CRUD
  const createBehavior = useCallback(async (input: CreateBehaviorInput): Promise<Behavior> => {
    const created = await repos.behaviors.create(input);
    await refreshData();
    return created;
  }, [repos, refreshData]);

  const updateBehavior = useCallback(async (id: string, input: UpdateBehaviorInput): Promise<Behavior> => {
    const updated = await repos.behaviors.update(id, input);
    await refreshData();
    return updated;
  }, [repos, refreshData]);

  const archiveBehavior = useCallback(async (id: string): Promise<void> => {
    await repos.behaviors.archive(id);
    await refreshData();
  }, [repos, refreshData]);

  const unarchiveBehavior = useCallback(async (id: string): Promise<void> => {
    await repos.behaviors.unarchive(id);
    await refreshData();
  }, [repos, refreshData]);

  const deleteBehavior = useCallback(async (id: string): Promise<void> => {
    await repos.behaviors.delete(id);
    await refreshData();
  }, [repos, refreshData]);

  // Log Entry CRUD
  const quickLog = useCallback(async (behaviorId: string, value = 1, note?: string): Promise<LogEntry> => {
    const entry = await repos.logEntries.create({
      behaviorId,
      value,
      note,
    });
    await refreshData();
    return entry;
  }, [repos, refreshData]);

  const createLogEntry = useCallback(async (input: CreateLogEntryInput): Promise<LogEntry> => {
    const entry = await repos.logEntries.create(input);
    await refreshData();
    return entry;
  }, [repos, refreshData]);

  const updateLogEntry = useCallback(async (id: string, input: UpdateLogEntryInput): Promise<LogEntry> => {
    const updated = await repos.logEntries.update(id, input);
    await refreshData();
    return updated;
  }, [repos, refreshData]);

  const deleteLogEntry = useCallback(async (id: string): Promise<void> => {
    await repos.logEntries.delete(id);
    await refreshData();
  }, [repos, refreshData]);

  // Goals CRUD
  const createGoal = useCallback(async (input: CreateGoalInput): Promise<Goal> => {
    const goal = await repos.goals.create(input);
    await refreshData();
    return goal;
  }, [repos, refreshData]);

  const updateGoal = useCallback(async (id: string, input: UpdateGoalInput): Promise<Goal> => {
    const updated = await repos.goals.update(id, input);
    await refreshData();
    return updated;
  }, [repos, refreshData]);

  const deleteGoal = useCallback(async (id: string): Promise<void> => {
    await repos.goals.delete(id);
    await refreshData();
  }, [repos, refreshData]);

  // Insights
  const getBehaviorStats = useCallback(async (behaviorId: string, anchorDate?: string): Promise<BehaviorStats | null> => {
    return repos.insights.getBehaviorStats(behaviorId, anchorDate);
  }, [repos]);

  const getOverallSummary = useCallback(async (anchorDate?: string) => {
    return repos.insights.getOverallSummary(anchorDate);
  }, [repos]);

  const getHomeDashboardStats = useCallback(async (anchorDate?: string) => {
    return repos.insights.getHomeDashboardStats(anchorDate);
  }, [repos]);

  const getMultiHabitWeekData = useCallback(async (anchorDate?: string) => {
    return repos.insights.getMultiHabitWeekData(anchorDate);
  }, [repos]);

  const getUnifiedStats = useCallback(async (anchorDate?: string) => {
    return repos.insights.getUnifiedStats(anchorDate);
  }, [repos]);

  const getRecordBounds = useCallback(async () => {
    return repos.backup.getRecordBounds();
  }, [repos]);

  const createBackupData = useCallback(async (options?: { startDate?: string; endDate?: string }) => {
    return repos.backup.createBackup(options);
  }, [repos]);

  const validateBackupContent = useCallback((jsonString: string, filename?: string) => {
    return repos.backup.validateBackup(jsonString, filename);
  }, [repos]);

  const restoreBackupData = useCallback(async (backup: import('@/db').BehavBackupFile, mode: 'merge' | 'replace' = 'replace') => {
    const result = await repos.backup.restoreBackup(backup, mode);
    await refreshData();
    return result;
  }, [repos, refreshData]);

  const exportLogsCsv = useCallback(async (options?: { startDate?: string; endDate?: string }) => {
    return repos.backup.exportLogsToCsv(options);
  }, [repos]);

  const exportBehaviorsCsv = useCallback(async () => {
    return repos.backup.exportBehaviorsToCsv();
  }, [repos]);

  const getEntriesForDate = useCallback(async (date: string | Date): Promise<LogEntryWithBehavior[]> => {
    return repos.logEntries.getByDate(date);
  }, [repos]);

  const getSummariesForDate = useCallback(async (date: string | Date): Promise<DailyBehaviorSummary[]> => {
    return repos.logEntries.getDailySummaries(date);
  }, [repos]);

  const value = useMemo<BehaviorContextValue>(
    () => ({
      behaviors,
      archivedBehaviors,
      todaySummaries,
      todayEntries,
      goals,
      isLoading,
      refreshData,
      userProfile,
      updateUserProfile,
      createBehavior,
      updateBehavior,
      archiveBehavior,
      unarchiveBehavior,
      deleteBehavior,
      quickLog,
      createLogEntry,
      updateLogEntry,
      deleteLogEntry,
      createGoal,
      updateGoal,
      deleteGoal,
      getBehaviorStats,
      getOverallSummary,
      getHomeDashboardStats,
      getMultiHabitWeekData,
      getUnifiedStats,
      getRecordBounds,
      createBackupData,
      validateBackupContent,
      restoreBackupData,
      exportLogsCsv,
      exportBehaviorsCsv,
      getEntriesForDate,
      getSummariesForDate,
    }),
    [
      behaviors,
      archivedBehaviors,
      todaySummaries,
      todayEntries,
      goals,
      isLoading,
      refreshData,
      userProfile,
      updateUserProfile,
      createBehavior,
      updateBehavior,
      archiveBehavior,
      unarchiveBehavior,
      deleteBehavior,
      quickLog,
      createLogEntry,
      updateLogEntry,
      deleteLogEntry,
      createGoal,
      updateGoal,
      deleteGoal,
      getBehaviorStats,
      getOverallSummary,
      getHomeDashboardStats,
      getMultiHabitWeekData,
      getUnifiedStats,
      getRecordBounds,
      createBackupData,
      validateBackupContent,
      restoreBackupData,
      exportLogsCsv,
      exportBehaviorsCsv,
      getEntriesForDate,
      getSummariesForDate,
    ]
  );

  return (
    <BehaviorContext.Provider value={value}>
      {children}
    </BehaviorContext.Provider>
  );
};

export function useBehaviors(): BehaviorContextValue {
  const context = useContext(BehaviorContext);
  if (!context) {
    throw new Error('useBehaviors must be used within a BehaviorProvider');
  }
  return context;
}
