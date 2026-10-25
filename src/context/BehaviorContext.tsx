import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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

interface BehaviorContextValue {
  behaviors: Behavior[];
  archivedBehaviors: Behavior[];
  todaySummaries: DailyBehaviorSummary[];
  todayEntries: LogEntryWithBehavior[];
  goals: Goal[];
  isLoading: boolean;
  refreshData: () => Promise<void>;
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
  // Insights operations
  getBehaviorStats: (behaviorId: string, anchorDate?: string) => Promise<BehaviorStats | null>;
  getOverallSummary: (anchorDate?: string) => Promise<{ activeHabitCount: number; totalLogsToday: number; totalLogs7Days: number }>;
  // Backup & Restore operations
  createBackupData: () => Promise<import('@/db').BehavBackupFile>;
  validateBackupContent: (jsonString: string) => { isValid: boolean; error?: string; backup?: import('@/db').BehavBackupFile };
  restoreBackupData: (backup: import('@/db').BehavBackupFile, mode: 'merge' | 'replace') => Promise<import('@/db').RestoreResult>;
  exportLogsCsv: () => Promise<string>;
  exportBehaviorsCsv: () => Promise<string>;
  // Utilities
  getEntriesForDate: (date: string | Date) => Promise<LogEntryWithBehavior[]>;
  getSummariesForDate: (date: string | Date) => Promise<DailyBehaviorSummary[]>;
}

const BehaviorContext = createContext<BehaviorContextValue | null>(null);

export const BehaviorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const db = useSQLiteContext();
  const [repos] = useState<DatabaseRepositories>(() => createRepositories(db));

  const [behaviors, setBehaviors] = useState<Behavior[]>([]);
  const [archivedBehaviors, setArchivedBehaviors] = useState<Behavior[]>([]);
  const [todaySummaries, setTodaySummaries] = useState<DailyBehaviorSummary[]>([]);
  const [todayEntries, setTodayEntries] = useState<LogEntryWithBehavior[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

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
  const createBehavior = async (input: CreateBehaviorInput): Promise<Behavior> => {
    const created = await repos.behaviors.create(input);
    await refreshData();
    return created;
  };

  const updateBehavior = async (id: string, input: UpdateBehaviorInput): Promise<Behavior> => {
    const updated = await repos.behaviors.update(id, input);
    await refreshData();
    return updated;
  };

  const archiveBehavior = async (id: string): Promise<void> => {
    await repos.behaviors.archive(id);
    await refreshData();
  };

  const unarchiveBehavior = async (id: string): Promise<void> => {
    await repos.behaviors.unarchive(id);
    await refreshData();
  };

  const deleteBehavior = async (id: string): Promise<void> => {
    await repos.behaviors.delete(id);
    await refreshData();
  };

  // Log Entry CRUD
  const quickLog = async (behaviorId: string, value = 1, note?: string): Promise<LogEntry> => {
    const entry = await repos.logEntries.create({
      behaviorId,
      value,
      note,
    });
    await refreshData();
    return entry;
  };

  const createLogEntry = async (input: CreateLogEntryInput): Promise<LogEntry> => {
    const entry = await repos.logEntries.create(input);
    await refreshData();
    return entry;
  };

  const updateLogEntry = async (id: string, input: UpdateLogEntryInput): Promise<LogEntry> => {
    const updated = await repos.logEntries.update(id, input);
    await refreshData();
    return updated;
  };

  const deleteLogEntry = async (id: string): Promise<void> => {
    await repos.logEntries.delete(id);
    await refreshData();
  };

  // Goals CRUD
  const createGoal = async (input: CreateGoalInput): Promise<Goal> => {
    const goal = await repos.goals.create(input);
    await refreshData();
    return goal;
  };

  const updateGoal = async (id: string, input: UpdateGoalInput): Promise<Goal> => {
    const updated = await repos.goals.update(id, input);
    await refreshData();
    return updated;
  };

  const deleteGoal = async (id: string): Promise<void> => {
    await repos.goals.delete(id);
    await refreshData();
  };

  // Insights
  const getBehaviorStats = async (behaviorId: string, anchorDate?: string): Promise<BehaviorStats | null> => {
    return repos.insights.getBehaviorStats(behaviorId, anchorDate);
  };

  const getOverallSummary = async (anchorDate?: string) => {
    return repos.insights.getOverallSummary(anchorDate);
  };

  const createBackupData = async () => {
    return repos.backup.createBackup();
  };

  const validateBackupContent = (jsonString: string) => {
    return repos.backup.validateBackup(jsonString);
  };

  const restoreBackupData = async (backup: import('@/db').BehavBackupFile, mode: 'merge' | 'replace') => {
    const result = await repos.backup.restoreBackup(backup, mode);
    await refreshData();
    return result;
  };

  const exportLogsCsv = async () => {
    return repos.backup.exportLogsToCsv();
  };

  const exportBehaviorsCsv = async () => {
    return repos.backup.exportBehaviorsToCsv();
  };

  const getEntriesForDate = async (date: string | Date): Promise<LogEntryWithBehavior[]> => {
    return repos.logEntries.getByDate(date);
  };

  const getSummariesForDate = async (date: string | Date): Promise<DailyBehaviorSummary[]> => {
    return repos.logEntries.getDailySummaries(date);
  };

  return (
    <BehaviorContext.Provider
      value={{
        behaviors,
        archivedBehaviors,
        todaySummaries,
        todayEntries,
        goals,
        isLoading,
        refreshData,
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
        createBackupData,
        validateBackupContent,
        restoreBackupData,
        exportLogsCsv,
        exportBehaviorsCsv,
        getEntriesForDate,
        getSummariesForDate,
      }}
    >
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
