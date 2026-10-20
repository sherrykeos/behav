import {
  MemorySqliteConnection,
  SqliteMigrationManager
} from '../src/database/sqliteConnection';
import {
  SqliteBehaviorRepository,
  SqliteEntryRepository,
  SqliteGoalRepository,
  SqliteDailyReviewRepository,
  SqliteStreakRepository
} from '../src/repositories';

describe('Local Account Switching & Data Partitioning Isolation', () => {
  let conn: MemorySqliteConnection;
  let behaviorRepo: SqliteBehaviorRepository;
  let entryRepo: SqliteEntryRepository;
  let goalRepo: SqliteGoalRepository;
  let reviewRepo: SqliteDailyReviewRepository;
  let streakRepo: SqliteStreakRepository;

  const userAlice = 'user_alice_uuid';
  const userBob = 'user_bob_uuid';

  beforeEach(async () => {
    conn = new MemorySqliteConnection();
    await SqliteMigrationManager.runMigrations(conn);

    behaviorRepo = new SqliteBehaviorRepository(conn);
    entryRepo = new SqliteEntryRepository(conn);
    goalRepo = new SqliteGoalRepository(conn);
    reviewRepo = new SqliteDailyReviewRepository(conn);
    streakRepo = new SqliteStreakRepository(conn);
  });

  afterEach(async () => {
    await conn.close();
  });

  it('strictly isolates local data across account switches in the same SQLite database', async () => {
    // 1. Alice logs in and tracks behaviors, entries, and goals
    const aliceBehavior = await behaviorRepo.create({
      userId: userAlice,
      name: "Alice's Private Habit",
      category: 'HEALTH',
      icon: 'heart',
      accentColor: '#4ADE80',
      measurementType: 'COUNT'
    });

    const aliceEntry = await entryRepo.create({
      userId: userAlice,
      behaviorId: aliceBehavior.id,
      quantity: 1,
      occurredAt: '2026-10-15T10:00:00Z',
      timezone: 'UTC',
      contextTags: ['confidential'],
      notes: "Alice's confidential personal note"
    });

    const aliceGoal = await goalRepo.create({
      userId: userAlice,
      behaviorId: aliceBehavior.id,
      goalType: 'ABSTINENCE',
      targetValue: 0,
      evaluationPeriod: 'DAILY',
      startsAt: '2026-10-01T00:00:00Z',
      active: true
    });

    await reviewRepo.upsertReview({
      userId: userAlice,
      behaviorId: aliceBehavior.id,
      localDate: '2026-10-15',
      timezone: 'UTC',
      status: 'CONFIRMED_ZERO',
      notes: 'Clean day'
    });

    await streakRepo.upsertStreakState({
      userId: userAlice,
      goalId: aliceGoal.id,
      currentStreak: 10,
      longestStreak: 10,
      lastQualifiedDate: '2026-10-15',
      calculatedAt: '2026-10-15T22:00:00Z'
    });

    // 2. Alice signs out, and Bob signs in on the same device/database
    // Bob lists all behaviors: must be empty
    const bobBehaviors = await behaviorRepo.listByUser(userBob);
    expect(bobBehaviors.length).toBe(0);

    // Bob attempts to query Alice's behavior by ID
    const bobDirectAccess = await behaviorRepo.findById(aliceBehavior.id, userBob);
    expect(bobDirectAccess).toBeNull();

    // Bob queries entries
    const bobEntries = await entryRepo.listByUserAndRange(userBob, '2026-10-01', '2026-10-31');
    expect(bobEntries.length).toBe(0);

    const bobEntryDirect = await entryRepo.findById(aliceEntry.id, userBob);
    expect(bobEntryDirect).toBeNull();

    // Bob queries goals
    const bobGoals = await goalRepo.listByUser(userBob);
    expect(bobGoals.length).toBe(0);

    // Bob queries reviews
    const bobReview = await reviewRepo.findByDateAndBehavior(userBob, aliceBehavior.id, '2026-10-15');
    expect(bobReview).toBeNull();

    // Bob queries streaks
    const bobStreaks = await streakRepo.listByUser(userBob);
    expect(bobStreaks.length).toBe(0);

    // 3. Bob creates his own separate behavior
    const bobBehavior = await behaviorRepo.create({
      userId: userBob,
      name: "Bob's Fitness Goal",
      category: 'HEALTH',
      icon: 'activity',
      accentColor: '#60A5FA',
      measurementType: 'NUMERIC',
      unit: 'km'
    });

    // 4. Bob signs out, Alice signs back in
    // Alice sees only Alice's behavior, NOT Bob's
    const aliceBehaviorsAfterSwitch = await behaviorRepo.listByUser(userAlice);
    expect(aliceBehaviorsAfterSwitch.length).toBe(1);
    expect(aliceBehaviorsAfterSwitch[0].name).toBe("Alice's Private Habit");

    // Alice cannot access Bob's behavior
    const aliceAccessingBob = await behaviorRepo.findById(bobBehavior.id, userAlice);
    expect(aliceAccessingBob).toBeNull();
  });
});
