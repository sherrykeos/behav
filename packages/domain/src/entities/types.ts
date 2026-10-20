/**
 * Behav Domain Entity Types
 * Pure TypeScript models without UI, React Native, or database dependencies.
 */

export type AccountStatus = 'ACTIVE' | 'UNVERIFIED' | 'SUSPENDED' | 'DELETED';

export interface User {
  id: string;
  authProviderSubject?: string | null;
  email: string;
  displayName: string;
  accountStatus: AccountStatus;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  deletedAt?: string | null;
}

export type ThemePreference = 'dark' | 'light' | 'system';

export interface UserSettings {
  userId: string;
  theme: ThemePreference;
  timezone: string;
  locale: string;
  dayBoundaryHour: number; // 0 to 23 (e.g. 0 = midnight, 4 = 4am for night owls)
  preferences: Record<string, unknown>;
  updatedAt: string;
}

export type BehaviorCategory =
  | 'HEALTH'
  | 'HABIT'
  | 'SUBSTANCE'
  | 'MINDFULNESS'
  | 'DIGITAL'
  | 'PRODUCTIVITY'
  | 'OTHER';

export type MeasurementType = 'COUNT' | 'NUMERIC';

export interface Behavior {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  category: BehaviorCategory;
  icon: string;
  accentColor: string;
  measurementType: MeasurementType;
  unit?: string | null; // e.g. "cigarettes", "ml", "minutes", "grams", "times"
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
  deletedAt?: string | null;
}

export interface BehaviorEntry {
  id: string;
  userId: string;
  behaviorId: string;
  quantity: number; // Count (1) or numeric amount (e.g. 2.5)
  occurredAt: string; // ISO 8601
  timezone: string; // IANA timezone, e.g. "America/New_York"
  notes?: string | null;
  contextTags: string[]; // e.g. ["stress", "social", "evening"]
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export type GoalType = 'ABSTINENCE' | 'REDUCTION' | 'FREQUENCY';
export type EvaluationPeriod = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export interface Goal {
  id: string;
  userId: string;
  behaviorId: string;
  goalType: GoalType;
  targetValue: number; // e.g. 0 for abstinence, <= 3 for reduction limit, >= 1 for frequency
  evaluationPeriod: EvaluationPeriod;
  startsAt: string; // ISO 8601
  endsAt?: string | null; // Optional expiration
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GoalVersion {
  id: string;
  goalId: string;
  userId: string;
  behaviorId: string;
  goalType: GoalType;
  targetValue: number;
  evaluationPeriod: EvaluationPeriod;
  versionNumber: number;
  effectiveFrom: string; // ISO 8601
  effectiveTo?: string | null;
  createdAt: string;
}

export type DailyReviewStatus =
  | 'CONFIRMED_ZERO' // User explicitly verified zero activity occurred
  | 'LOGGED'         // Entries exist for this day
  | 'PENDING'        // No entries, awaiting user daily confirmation
  | 'EXCLUDED';      // Day excluded from streak (e.g. vacation/pause)

export interface DailyReview {
  id: string;
  userId: string;
  behaviorId: string;
  localDate: string; // YYYY-MM-DD
  timezone: string;
  status: DailyReviewStatus;
  notes?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StreakState {
  id: string;
  userId: string;
  goalId: string;
  currentStreak: number;
  longestStreak: number;
  lastQualifiedDate?: string | null; // YYYY-MM-DD
  calculatedAt: string;
}

export interface DailyAggregate {
  id?: string;
  userId: string;
  behaviorId: string;
  localDate: string; // YYYY-MM-DD
  totalQuantity: number;
  occurrenceCount: number;
  reviewStatus: DailyReviewStatus;
  calculatedAt: string;
}

export type InsightType =
  | 'PATTERN'
  | 'TREND'
  | 'RECOVERY'
  | 'DISTRIBUTION'
  | 'CORRELATION';

export type EvidenceQuality = 'PRELIMINARY' | 'MODERATE' | 'HIGH';

export interface Insight {
  id: string;
  userId: string;
  behaviorId?: string | null;
  insightType: InsightType;
  title: string;
  summary: string;
  evidence: Record<string, unknown>;
  dateRangeStart: string; // YYYY-MM-DD
  dateRangeEnd: string;   // YYYY-MM-DD
  evidenceQuality: EvidenceQuality;
  createdAt: string;
  dismissedAt?: string | null;
}

export type DeletionRequestStatus = 'PENDING' | 'CANCELLED' | 'COMPLETED';

export interface AccountDeletionRequest {
  id: string;
  userId: string;
  requestedAt: string;
  scheduledFor: string;
  status: DeletionRequestStatus;
  completedAt?: string | null;
}
