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
} from '@/types/database';
import { createRepositories, type DatabaseRepositories } from '@/db';
import { toDayString } from '@/utils/date';

interface BehaviorContextValue {
  behaviors: Behavior[];
  archivedBehaviors: Behavior[];
  todaySummaries: DailyBehaviorSummary[];
  todayEntries: LogEntryWithBehavior[];
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
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshData = useCallback(async () => {
    try {
      const today = toDayString();
      const [allBehaviors, summaries, entries] = await Promise.all([
        repos.behaviors.getAll(true),
        repos.logEntries.getDailySummaries(today),
        repos.logEntries.getByDate(today),
      ]);

      const active = allBehaviors.filter((b) => b.archivedAt === null);
      const archived = allBehaviors.filter((b) => b.archivedAt !== null);

      setBehaviors(active);
      setArchivedBehaviors(archived);
      setTodaySummaries(summaries);
      setTodayEntries(entries);
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
