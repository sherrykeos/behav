/**
 * Database Domain Models & DTOs for Behav
 */

export interface Behavior {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  unit: string;
  dailyLimit: number | null;
  createdAt: string;
  archivedAt: string | null;
}

export interface CreateBehaviorInput {
  name: string;
  description?: string | null;
  category?: string | null;
  unit?: string;
  dailyLimit?: number | null;
}

export interface UpdateBehaviorInput {
  name?: string;
  description?: string | null;
  category?: string | null;
  unit?: string;
  dailyLimit?: number | null;
}

export interface LogEntry {
  id: string;
  behaviorId: string;
  value: number;
  occurredAt: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LogEntryWithBehavior extends LogEntry {
  behaviorName: string;
  behaviorUnit: string;
  behaviorCategory: string | null;
}

export interface CreateLogEntryInput {
  behaviorId: string;
  value: number;
  occurredAt?: string; // defaults to now (ISO)
  note?: string | null;
}

export interface UpdateLogEntryInput {
  value?: number;
  occurredAt?: string;
  note?: string | null;
}

export type GoalType = 'daily_limit' | 'streak' | 'frequency';

export interface Goal {
  id: string;
  title: string;
  behaviorId: string | null;
  goalType: GoalType;
  targetValue: number | null;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CreateGoalInput {
  title: string;
  behaviorId?: string | null;
  goalType: GoalType;
  targetValue?: number | null;
  startDate: string;
  endDate?: string | null;
}

export interface UpdateGoalInput {
  title?: string;
  targetValue?: number | null;
  endDate?: string | null;
  isActive?: boolean;
}

export interface DailyBehaviorSummary {
  behaviorId: string;
  behaviorName: string;
  behaviorUnit: string;
  behaviorCategory: string | null;
  dailyLimit: number | null;
  totalValue: number;
  entryCount: number;
  isLimitReached: boolean;
}
