import type { SQLiteDatabase } from 'expo-sqlite';
import { runMigrations } from './migrations';
import { BehaviorRepository } from './repositories/behaviorRepository';
import { LogEntryRepository } from './repositories/logEntryRepository';
import { GoalRepository } from './repositories/goalRepository';

export const DATABASE_NAME = 'behav.db';

export interface DatabaseRepositories {
  behaviors: BehaviorRepository;
  logEntries: LogEntryRepository;
  goals: GoalRepository;
}

/**
 * Initializes database by applying pending migrations
 */
export async function initializeDatabase(db: SQLiteDatabase): Promise<void> {
  await runMigrations(db);
}

/**
 * Helper factory to instantiate all repositories for an open db connection
 */
export function createRepositories(db: SQLiteDatabase): DatabaseRepositories {
  return {
    behaviors: new BehaviorRepository(db),
    logEntries: new LogEntryRepository(db),
    goals: new GoalRepository(db),
  };
}

export * from './migrations';
export * from './repositories/behaviorRepository';
export * from './repositories/logEntryRepository';
export * from './repositories/goalRepository';
