import {
  MemorySqliteConnection,
  SqliteMigrationManager
} from '../src/database/sqliteConnection';
import {
  SqliteBehaviorRepository,
  SqliteEntryRepository,
  SqliteGoalRepository,
  SqliteDailyReviewRepository,
  SqliteStreakRepository,
  SqliteAggregateRepository
} from '../src/repositories';

describe('SQLite Repositories & Local Database', () => {
  let conn: MemorySqliteConnection;
  let behaviorRepo: SqliteBehaviorRepository;
  let entryRepo: SqliteEntryRepository;
  let goalRepo: SqliteGoalRepository;
  let reviewRepo: SqliteDailyReviewRepository;
  let streakRepo: SqliteStreakRepository;
  let aggregateRepo: SqliteAggregateRepository;

  const userA = 'user_alice';

  beforeEach(async () => {
    conn = new MemorySqliteConnection();
    await SqliteMigrationManager.runMigrations(conn);

    behaviorRepo = new SqliteBehaviorRepository(conn);
    entryRepo = new SqliteEntryRepository(conn);
    goalRepo = new SqliteGoalRepository(conn);
    reviewRepo = new SqliteDailyReviewRepository(conn);
    streakRepo = new SqliteStreakRepository(conn);
    aggregateRepo = new SqliteAggregateRepository(conn);
  });

  afterEach(async () => {
    await conn.close();
  });

  it('runs migrations and creates all tables with schema versioning', async () => {
    const version = await conn.get<{ version: number }>(
      'SELECT version FROM schema_migrations WHERE version = 1'
    );
    expect(version?.version).toBe(1);
  });

  it('performs behavior CRUD operations with soft delete and archiving', async () => {
    const created = await behaviorRepo.create({
      userId: userA,
      name: 'Meditation',
      description: 'Daily mindfulness',
      category: 'MINDFULNESS',
      icon: 'sparkles',
      accentColor: '#4ADE80',
      measurementType: 'COUNT',
      unit: 'sessions'
    });

    expect(created.id).toBeDefined();
    expect(created.name).toBe('Meditation');

    // Retrieve
    const retrieved = await behaviorRepo.findById(created.id, userA);
    expect(retrieved?.name).toBe('Meditation');

    // Update
    const updated = await behaviorRepo.update(created.id, userA, {
      name: 'Mindful Meditation'
    });
    expect(updated.name).toBe('Mindful Meditation');

    // Archive
    await behaviorRepo.archive(created.id, userA);
    const activeList = await behaviorRepo.listByUser(userA, false);
    expect(activeList.length).toBe(0);

    const allList = await behaviorRepo.listByUser(userA, true);
    expect(allList.length).toBe(1);

    // Soft delete
    await behaviorRepo.softDelete(created.id, userA);
    const afterDelete = await behaviorRepo.findById(created.id, userA);
    expect(afterDelete).toBeNull();
  });

  it('logs entries, calculates range queries, and soft-deletes entries', async () => {
    const behavior = await behaviorRepo.create({
      userId: userA,
      name: 'Water Intake',
      category: 'HEALTH',
      icon: 'droplet',
      accentColor: '#60A5FA',
      measurementType: 'NUMERIC',
      unit: 'ml'
    });

    const entry1 = await entryRepo.create({
      userId: userA,
      behaviorId: behavior.id,
      quantity: 500,
      occurredAt: '2026-10-15T09:00:00Z',
      timezone: 'UTC',
      contextTags: ['morning'],
      notes: 'Glass of water'
    });

    const entry2 = await entryRepo.create({
      userId: userA,
      behaviorId: behavior.id,
      quantity: 750,
      occurredAt: '2026-10-15T14:00:00Z',
      timezone: 'UTC',
      contextTags: ['lunch'],
      notes: 'Water with meal'
    });

    const rangeEntries = await entryRepo.listByBehaviorAndRange(
      userA,
      behavior.id,
      '2026-10-15',
      '2026-10-15'
    );
    expect(rangeEntries.length).toBe(2);

    const totalQty = rangeEntries.reduce((sum, e) => sum + e.quantity, 0);
    expect(totalQty).toBe(1250);

    // Soft delete entry1
    await entryRepo.softDelete(entry1.id, userA);
    const afterDelete = await entryRepo.listByBehaviorAndRange(
      userA,
      behavior.id,
      '2026-10-15',
      '2026-10-15'
    );
    expect(afterDelete.length).toBe(1);
    expect(afterDelete[0].id).toBe(entry2.id);
  });

  it('manages goals and records immutable goal versions on update', async () => {
    const behavior = await behaviorRepo.create({
      userId: userA,
      name: 'Screen Time',
      category: 'DIGITAL',
      icon: 'smartphone',
      accentColor: '#FBBF24',
      measurementType: 'NUMERIC',
      unit: 'hours'
    });

    const goal = await goalRepo.create({
      userId: userA,
      behaviorId: behavior.id,
      goalType: 'REDUCTION',
      targetValue: 4, // <= 4 hours
      evaluationPeriod: 'DAILY',
      startsAt: '2026-10-01T00:00:00Z',
      active: true
    });

    expect(goal.targetValue).toBe(4);

    // Check version 1 created
    const initialVersions = await goalRepo.listVersions(goal.id, userA);
    expect(initialVersions.length).toBe(1);
    expect(initialVersions[0].targetValue).toBe(4);

    // Update goal target value to 2 hours
    const updated = await goalRepo.update(goal.id, userA, {
      targetValue: 2
    });
    expect(updated.targetValue).toBe(2);

    // Check version 2 created and version 1 closed
    const updatedVersions = await goalRepo.listVersions(goal.id, userA);
    expect(updatedVersions.length).toBe(2);
    expect(updatedVersions[0].effectiveTo).not.toBeNull();
    expect(updatedVersions[1].targetValue).toBe(2);
    expect(updatedVersions[1].effectiveTo).toBeNull();
  });

  it('upserts daily reviews and persists streak states', async () => {
    const behavior = await behaviorRepo.create({
      userId: userA,
      name: 'Cigarettes',
      category: 'SUBSTANCE',
      icon: 'shield',
      accentColor: '#F87171',
      measurementType: 'COUNT'
    });

    // Confirm zero activity
    const review = await reviewRepo.upsertReview({
      userId: userA,
      behaviorId: behavior.id,
      localDate: '2026-10-15',
      timezone: 'UTC',
      status: 'CONFIRMED_ZERO',
      notes: 'Smoke-free day!'
    });
    expect(review.status).toBe('CONFIRMED_ZERO');

    // Upsert streak state
    const streak = await streakRepo.upsertStreakState({
      userId: userA,
      goalId: 'goal_smoke_free',
      currentStreak: 5,
      longestStreak: 12,
      lastQualifiedDate: '2026-10-15',
      calculatedAt: '2026-10-15T22:00:00Z'
    });
    expect(streak.currentStreak).toBe(5);
    expect(streak.longestStreak).toBe(12);

    // Advance streak
    const advanced = await streakRepo.upsertStreakState({
      userId: userA,
      goalId: 'goal_smoke_free',
      currentStreak: 6,
      longestStreak: 12,
      lastQualifiedDate: '2026-10-16',
      calculatedAt: '2026-10-16T22:00:00Z'
    });
    expect(advanced.currentStreak).toBe(6);
  });
});
