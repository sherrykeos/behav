import {
  Behavior,
  BehaviorEntry,
  Goal,
  GoalVersion,
  DailyReview,
  StreakState,
  DailyAggregate,
  Insight,
  UserSettings,
  AccountDeletionRequest
} from '../entities/types';

export interface IBehaviorRepository {
  findById(id: string, userId: string): Promise<Behavior | null>;
  listByUser(userId: string, includeArchived?: boolean): Promise<Behavior[]>;
  create(behavior: Omit<Behavior, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Behavior>;
  update(
    id: string,
    userId: string,
    patch: Partial<Omit<Behavior, 'id' | 'userId' | 'createdAt'>>
  ): Promise<Behavior>;
  archive(id: string, userId: string): Promise<void>;
  unarchive(id: string, userId: string): Promise<void>;
  softDelete(id: string, userId: string): Promise<void>;
}

export interface IEntryRepository {
  findById(id: string, userId: string): Promise<BehaviorEntry | null>;
  listByBehaviorAndRange(
    userId: string,
    behaviorId: string,
    startDate: string, // YYYY-MM-DD
    endDate: string    // YYYY-MM-DD
  ): Promise<BehaviorEntry[]>;
  listByUserAndRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<BehaviorEntry[]>;
  create(entry: Omit<BehaviorEntry, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<BehaviorEntry>;
  update(
    id: string,
    userId: string,
    patch: Partial<Omit<BehaviorEntry, 'id' | 'userId' | 'behaviorId' | 'createdAt'>>
  ): Promise<BehaviorEntry>;
  softDelete(id: string, userId: string): Promise<void>;
  countByUser(userId: string): Promise<number>;
}

export interface IGoalRepository {
  findById(id: string, userId: string): Promise<Goal | null>;
  listByBehavior(userId: string, behaviorId: string): Promise<Goal[]>;
  listByUser(userId: string): Promise<Goal[]>;
  create(goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Goal>;
  update(
    id: string,
    userId: string,
    patch: Partial<Omit<Goal, 'id' | 'userId' | 'behaviorId' | 'createdAt'>>
  ): Promise<Goal>;
  createVersion(version: Omit<GoalVersion, 'id' | 'createdAt'> & { id?: string }): Promise<GoalVersion>;
  listVersions(goalId: string, userId: string): Promise<GoalVersion[]>;
}

export interface IDailyReviewRepository {
  findByDateAndBehavior(
    userId: string,
    behaviorId: string,
    localDate: string
  ): Promise<DailyReview | null>;
  listByBehaviorAndRange(
    userId: string,
    behaviorId: string,
    startDate: string,
    endDate: string
  ): Promise<DailyReview[]>;
  upsertReview(review: Omit<DailyReview, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<DailyReview>;
}

export interface IStreakRepository {
  findByGoalId(goalId: string, userId: string): Promise<StreakState | null>;
  listByUser(userId: string): Promise<StreakState[]>;
  upsertStreakState(state: Omit<StreakState, 'id'> & { id?: string }): Promise<StreakState>;
}

export interface IAggregateRepository {
  getByBehaviorAndDate(
    userId: string,
    behaviorId: string,
    localDate: string
  ): Promise<DailyAggregate | null>;
  listByBehaviorAndRange(
    userId: string,
    behaviorId: string,
    startDate: string,
    endDate: string
  ): Promise<DailyAggregate[]>;
  upsertAggregate(aggregate: DailyAggregate): Promise<DailyAggregate>;
  deleteByBehaviorAndDate(
    userId: string,
    behaviorId: string,
    localDate: string
  ): Promise<void>;
}

export interface IInsightRepository {
  listByUser(userId: string): Promise<Insight[]>;
  listByBehavior(userId: string, behaviorId: string): Promise<Insight[]>;
  create(insight: Omit<Insight, 'createdAt'>): Promise<Insight>;
  dismiss(id: string, userId: string): Promise<void>;
}

export interface IUserSettingsRepository {
  getByUserId(userId: string): Promise<UserSettings | null>;
  upsertSettings(settings: UserSettings): Promise<UserSettings>;
}

export interface IAccountDeletionRepository {
  createRequest(userId: string, scheduledFor: string): Promise<AccountDeletionRequest>;
  cancelRequest(userId: string): Promise<void>;
  getRequest(userId: string): Promise<AccountDeletionRequest | null>;
}
