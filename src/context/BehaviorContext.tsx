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
  // User Profile & Onboarding
  userProfile: UserProfile;
  updateUserProfile: (profile: Partial<UserProfile>) => Promise<void>;
  isOnboardingCompleted: boolean | null;
  onboardingStep: number;
  completeOnboarding: (preferredName: string) => Promise<void>;
  saveOnboardingProgress: (step: number, preferredName?: string) => Promise<void>;
  resetOnboarding: () => Promise<void>;
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
      status: 'green' | 'logged' | 'future' | 'unknown';
      isToday: boolean;
    }[];
    monthName: string;
    monthOffset: number;
  }>;
  setDailyQuantity: (behaviorId: string, value: number, dateInput?: string | Date, note?: string | null) => Promise<LogEntry>;
  getMultiHabitWeekData: (anchorDate?: string) => Promise<import('@/db').MultiHabitWeekData>;
  getUnifiedStats: (anchorDate?: string) => Promise<import('@/db').UnifiedStatsData>;
  getAvailableYears: () => Promise<number[]>;
  getYearMatrixData: (year?: number) => Promise<import('@/db').YearMatrixData>;
  getCustomPeriodStats: (fromDate: string, toDate: string, filterHabitIds?: string[]) => Promise<import('@/db').CustomPeriodStats>;
  // Record bounds & inspection
  getRecordBounds: () => Promise<import('@/db').RecordBounds>;
  // Backup & Restore operations
  createBackupData: (options?: { startDate?: string; endDate?: string }) => Promise<import('@/db').BehavBackupFile>;
  validateBackupContent: (jsonString: string, filename?: string) => { isValid: boolean; error?: string; backup?: import('@/db').BehavBackupFile };
  checkDateCollision: (backup: import('@/db').BehavBackupFile) => Promise<import('@/db').DateCollisionCheckResult>;
  restoreBackupData: (backup: import('@/db').BehavBackupFile, mode?: 'merge' | 'replace') => Promise<import('@/db').RestoreResult>;
  exportLogsCsv: (options?: { startDate?: string; endDate?: string }) => Promise<string>;
  exportBehaviorsCsv: () => Promise<string>;
  clearAllAppData: () => Promise<void>;
  // Utilities
  getEntriesForDate: (date: string | Date) => Promise<LogEntryWithBehavior[]>;
  getSummariesForDate: (date: string | Date) => Promise<DailyBehaviorSummary[]>;
  deleteEntriesForDate: (date: string | Date, behaviorId?: string) => Promise<void>;
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
    name: '',
    bio: 'Building consistent daily habits',
    avatarIcon: 'person',
    avatarColor: '#B9F6CA',
  });
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState<boolean | null>(null);
  const [onboardingStep, setOnboardingStep] = useState<number>(1);

  // Load user profile & onboarding status from app_settings
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
          'SELECT key, value FROM app_settings WHERE key IN (?, ?, ?, ?, ?, ?);',
          [
            'user_name',
            'user_bio',
            'user_avatar_icon',
            'user_avatar_color',
            'onboarding_completed',
            'onboarding_step',
          ]
        );
        const map = new Map(rows.map((r) => [r.key, r.value]));

        setUserProfile((prev) => ({
          name: map.get('user_name') || prev.name,
          bio: map.get('user_bio') || prev.bio,
          avatarIcon: map.get('user_avatar_icon') || prev.avatarIcon,
          avatarColor: map.get('user_avatar_color') || prev.avatarColor,
        }));

        const completedVal = map.get('onboarding_completed');
        const rawStep = parseInt(map.get('onboarding_step') || '1', 10);
        const stepVal = Number.isInteger(rawStep) && rawStep >= 1 && rawStep <= 4 ? rawStep : 1;

        if (completedVal !== undefined) {
          setIsOnboardingCompleted(completedVal === 'true');
          setOnboardingStep(stepVal);
        } else {
          // Returning user check: if user already has behaviors recorded, mark onboarding as completed
          const countRow = await db.getFirstAsync<{ count: number }>(
            'SELECT COUNT(*) as count FROM behaviors;'
          );
          const hasBehaviors = (countRow?.count ?? 0) > 0;
          if (hasBehaviors) {
            await db.runAsync(
              'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?);',
              ['onboarding_completed', 'true']
            );
            setIsOnboardingCompleted(true);
            setOnboardingStep(4);
          } else {
            setIsOnboardingCompleted(false);
            setOnboardingStep(stepVal);
          }
        }
      } catch (err) {
        console.error('Error loading profile from SQLite:', err);
        // Fallback safely to not block the app
        setIsOnboardingCompleted(true);
      }
    }
    loadProfile();
  }, [db]);

  const completeOnboarding = useCallback(
    async (preferredName: string) => {
      const trimmed = preferredName.trim();
      if (!trimmed) {
        throw new Error('Preferred name cannot be empty');
      }
      try {
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS app_settings (
            key TEXT PRIMARY KEY NOT NULL,
            value TEXT NOT NULL
          );
        `);
        await db.runAsync(
          'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?);',
          ['user_name', trimmed]
        );
        await db.runAsync(
          'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?);',
          ['onboarding_completed', 'true']
        );
        await db.runAsync(
          'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?);',
          ['onboarding_step', '4']
        );
        setUserProfile((prev) => ({ ...prev, name: trimmed }));
        setIsOnboardingCompleted(true);
        setOnboardingStep(4);
      } catch (err) {
        console.error('Error completing onboarding in SQLite:', err);
        throw err;
      }
    },
    [db]
  );

  const saveOnboardingProgress = useCallback(
    async (step: number, preferredName?: string) => {
      try {
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS app_settings (
            key TEXT PRIMARY KEY NOT NULL,
            value TEXT NOT NULL
          );
        `);
        await db.runAsync(
          'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?);',
          ['onboarding_step', String(step)]
        );
        setOnboardingStep(step);

        if (preferredName !== undefined && preferredName.trim().length > 0) {
          const trimmed = preferredName.trim();
          await db.runAsync(
            'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?);',
            ['user_name', trimmed]
          );
          setUserProfile((prev) => ({ ...prev, name: trimmed }));
        }
      } catch (err) {
        console.error('Error saving onboarding progress to SQLite:', err);
      }
    },
    [db]
  );

  const resetOnboarding = useCallback(async () => {
    try {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS app_settings (
          key TEXT PRIMARY KEY NOT NULL,
          value TEXT NOT NULL
        );
      `);
      await db.runAsync(
        'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?);',
        ['onboarding_completed', 'false']
      );
      await db.runAsync(
        'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?);',
        ['onboarding_step', '1']
      );
      setIsOnboardingCompleted(false);
      setOnboardingStep(1);
    } catch (err) {
      console.error('Error resetting onboarding status:', err);
    }
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

  const setDailyQuantity = useCallback(
    async (
      behaviorId: string,
      value: number,
      dateInput?: string | Date,
      note?: string | null
    ): Promise<LogEntry> => {
      const entry = await repos.logEntries.setDailyQuantity(behaviorId, value, dateInput, note);
      await refreshData();
      return entry;
    },
    [repos, refreshData]
  );

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

  const getAvailableYears = useCallback(async () => {
    return repos.insights.getAvailableYears();
  }, [repos]);

  const getYearMatrixData = useCallback(async (year?: number) => {
    return repos.insights.getYearMatrixData(year);
  }, [repos]);

  const getCustomPeriodStats = useCallback(
    async (fromDate: string, toDate: string, filterHabitIds?: string[]) => {
      return repos.insights.getCustomPeriodStats(fromDate, toDate, filterHabitIds);
    },
    [repos]
  );

  const getRecordBounds = useCallback(async () => {
    return repos.backup.getRecordBounds();
  }, [repos]);

  const createBackupData = useCallback(async (options?: { startDate?: string; endDate?: string }) => {
    return repos.backup.createBackup(options);
  }, [repos]);

  const validateBackupContent = useCallback((jsonString: string, filename?: string) => {
    return repos.backup.validateBackup(jsonString, filename);
  }, [repos]);

  const checkDateCollision = useCallback(async (backup: import('@/db').BehavBackupFile) => {
    return repos.backup.checkDateCollision(backup);
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

  const clearAllAppData = useCallback(async (): Promise<void> => {
    await repos.backup.clearAllAppData();
    await refreshData();
  }, [repos, refreshData]);

  const getEntriesForDate = useCallback(async (date: string | Date): Promise<LogEntryWithBehavior[]> => {
    return repos.logEntries.getByDate(date);
  }, [repos]);

  const getSummariesForDate = useCallback(async (date: string | Date): Promise<DailyBehaviorSummary[]> => {
    return repos.logEntries.getDailySummaries(date);
  }, [repos]);

  const deleteEntriesForDate = useCallback(
    async (date: string | Date, behaviorId?: string): Promise<void> => {
      await repos.logEntries.deleteByDate(date, behaviorId);
      await refreshData();
    },
    [repos, refreshData]
  );

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
      isOnboardingCompleted,
      onboardingStep,
      completeOnboarding,
      saveOnboardingProgress,
      resetOnboarding,
      createBehavior,
      updateBehavior,
      archiveBehavior,
      unarchiveBehavior,
      deleteBehavior,
      quickLog,
      createLogEntry,
      updateLogEntry,
      deleteLogEntry,
      setDailyQuantity,
      createGoal,
      updateGoal,
      deleteGoal,
      getBehaviorStats,
      getOverallSummary,
      getHomeDashboardStats,
      getMultiHabitWeekData,
      getUnifiedStats,
      getAvailableYears,
      getYearMatrixData,
      getCustomPeriodStats,
      getRecordBounds,
      createBackupData,
      validateBackupContent,
      checkDateCollision,
      restoreBackupData,
      exportLogsCsv,
      exportBehaviorsCsv,
      clearAllAppData,
      getEntriesForDate,
      getSummariesForDate,
      deleteEntriesForDate,
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
      isOnboardingCompleted,
      onboardingStep,
      completeOnboarding,
      saveOnboardingProgress,
      resetOnboarding,
      createBehavior,
      updateBehavior,
      archiveBehavior,
      unarchiveBehavior,
      deleteBehavior,
      quickLog,
      createLogEntry,
      updateLogEntry,
      deleteLogEntry,
      setDailyQuantity,
      createGoal,
      updateGoal,
      deleteGoal,
      getBehaviorStats,
      getOverallSummary,
      getHomeDashboardStats,
      getMultiHabitWeekData,
      getUnifiedStats,
      getAvailableYears,
      getYearMatrixData,
      getCustomPeriodStats,
      getRecordBounds,
      createBackupData,
      validateBackupContent,
      checkDateCollision,
      restoreBackupData,
      exportLogsCsv,
      exportBehaviorsCsv,
      clearAllAppData,
      getEntriesForDate,
      getSummariesForDate,
      deleteEntriesForDate,
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
