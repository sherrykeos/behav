import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  calculateDailyAggregate,
  groupEntriesByLocalDate,
  calculateStreak,
  generateDeterministicInsights,
  calculatePeriodStatistics,
  calculateTimeDistribution,
  calculateAdvancedTrends,
  DailyAggregate,
  StreakState,
  PeriodStatistics,
  TimeDistribution,
  AdvancedTrends,
  Insight
} from '@behav/domain';
import {
  MemorySqliteConnection,
  ISqliteConnection,
  SqliteMigrationManager
} from '../database/sqliteConnection';
import {
  SqliteBehaviorRepository,
  SqliteEntryRepository,
  SqliteGoalRepository,
  SqliteDailyReviewRepository,
  SqliteStreakRepository,
  SqliteAggregateRepository,
  SqliteUserSettingsRepository,
  SqliteInsightRepository
} from '../repositories';
import { useAuth } from './AuthContext';

export interface RecalculatedBehaviorData {
  statistics: PeriodStatistics;
  distribution: TimeDistribution;
  trends: AdvancedTrends;
  insights: Insight[];
  streaks: StreakState[];
  aggregates: DailyAggregate[];
}

interface DatabaseContextType {
  isReady: boolean;
  behaviorRepo: SqliteBehaviorRepository;
  entryRepo: SqliteEntryRepository;
  goalRepo: SqliteGoalRepository;
  reviewRepo: SqliteDailyReviewRepository;
  streakRepo: SqliteStreakRepository;
  aggregateRepo: SqliteAggregateRepository;
  settingsRepo: SqliteUserSettingsRepository;
  insightRepo: SqliteInsightRepository;
  recalculateBehavior: (behaviorId: string) => Promise<RecalculatedBehaviorData>;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

// Singleton in-memory SQLite connection for client session
const clientConn: ISqliteConnection = new MemorySqliteConnection();

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [isReady, setIsReady] = useState<boolean>(false);

  const [behaviorRepo] = useState(() => new SqliteBehaviorRepository(clientConn));
  const [entryRepo] = useState(() => new SqliteEntryRepository(clientConn));
  const [goalRepo] = useState(() => new SqliteGoalRepository(clientConn));
  const [reviewRepo] = useState(() => new SqliteDailyReviewRepository(clientConn));
  const [streakRepo] = useState(() => new SqliteStreakRepository(clientConn));
  const [aggregateRepo] = useState(() => new SqliteAggregateRepository(clientConn));
  const [settingsRepo] = useState(() => new SqliteUserSettingsRepository(clientConn));
  const [insightRepo] = useState(() => new SqliteInsightRepository(clientConn));

  useEffect(() => {
    async function initDb() {
      await SqliteMigrationManager.runMigrations(clientConn);
      setIsReady(true);
    }
    initDb();
  }, []);

  const recalculateBehavior = async (behaviorId: string): Promise<RecalculatedBehaviorData> => {
    const userId = user ? user.id : 'usr_local_default';

    // 1. Fetch entries and reviews
    const entries = await entryRepo.listByBehaviorAndRange(userId, behaviorId, '2000-01-01', '2100-01-01');
    const reviews = await reviewRepo.listByBehaviorAndRange(userId, behaviorId, '2000-01-01', '2100-01-01');
    const goals = await goalRepo.listByBehavior(userId, behaviorId);

    // 2. Group entries by local date
    const entriesByDate = groupEntriesByLocalDate(entries, 'UTC');
    const reviewsByDate = new Map(reviews.map((r) => [r.localDate, r]));

    const dateSet = new Set<string>();
    entriesByDate.forEach((_, date) => dateSet.add(date));
    reviewsByDate.forEach((_, date) => dateSet.add(date));

    // Ensure past 14 days exist
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      dateSet.add(d.toISOString().substring(0, 10));
    }

    const sortedDates = Array.from(dateSet).sort();

    // 3. Compute and persist aggregates
    const aggregates: DailyAggregate[] = [];
    for (const localDate of sortedDates) {
      const dayEntries = entriesByDate.get(localDate) || [];
      const dayReview = reviewsByDate.get(localDate) || null;
      const agg = calculateDailyAggregate({
        userId,
        behaviorId,
        localDate,
        entries: dayEntries,
        review: dayReview
      });
      await aggregateRepo.upsertAggregate(agg);
      aggregates.push(agg);
    }

    // 4. Compute and persist independent streaks
    const streakStates: StreakState[] = [];
    for (const goal of goals) {
      const versions = await goalRepo.listVersions(goal.id, userId);
      const streakResult = calculateStreak(goal, aggregates, versions);
      const streakState = await streakRepo.upsertStreakState({
        userId,
        goalId: goal.id,
        currentStreak: streakResult.currentStreak,
        longestStreak: streakResult.longestStreak,
        lastQualifiedDate: streakResult.lastQualifiedDate,
        calculatedAt: new Date().toISOString()
      });
      streakStates.push(streakState);
    }

    // 5. Compute statistics, distributions, trends, and insights
    const statistics = calculatePeriodStatistics(aggregates);
    const distribution = calculateTimeDistribution(entries);
    const trends = calculateAdvancedTrends(aggregates);
    const generatedInsights = generateDeterministicInsights(userId, behaviorId, aggregates, entries);

    for (const ins of generatedInsights) {
      await insightRepo.create(ins);
    }

    return {
      statistics,
      distribution,
      trends,
      insights: generatedInsights,
      streaks: streakStates,
      aggregates
    };
  };

  return (
    <DatabaseContext.Provider
      value={{
        isReady,
        behaviorRepo,
        entryRepo,
        goalRepo,
        reviewRepo,
        streakRepo,
        aggregateRepo,
        settingsRepo,
        insightRepo,
        recalculateBehavior
      }}
    >
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = (): DatabaseContextType => {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
};
