import { DatabaseSync } from 'node:sqlite';
import assert from 'node:assert';

// 1. Create SQLite wrapper matching Expo SQLiteDatabase async interface
function createMockExpoDb() {
  const sqlite = new DatabaseSync(':memory:');

  return {
    async execAsync(sql) {
      sqlite.exec(sql);
    },
    async runAsync(sql, params = []) {
      const stmt = sqlite.prepare(sql);
      const result = stmt.run(...params);
      return {
        lastInsertRowId: Number(result.lastInsertRowid),
        changes: Number(result.changes),
      };
    },
    async getAllAsync(sql, params = []) {
      const stmt = sqlite.prepare(sql);
      return stmt.all(...params);
    },
    async getFirstAsync(sql, params = []) {
      const stmt = sqlite.prepare(sql);
      const rows = stmt.all(...params);
      return rows.length > 0 ? rows[0] : null;
    },
  };
}

async function testDatabase() {
  console.log('--- Starting SQLite Database Verification ---');
  const db = createMockExpoDb();

  // Test 1: Run Migrations
  const { runMigrations } = await import('../src/db/migrations.ts');
  await runMigrations(db);
  console.log('✓ Migration 1 (initial_schema) applied successfully');

  // Verify tables exist
  const tables = await db.getAllAsync(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
  );
  const tableNames = tables.map((t) => t.name);
  console.log('✓ Created tables:', tableNames.join(', '));
  assert(tableNames.includes('behaviors'), 'behaviors table missing');
  assert(tableNames.includes('log_entries'), 'log_entries table missing');
  assert(tableNames.includes('goals'), 'goals table missing');
  assert(tableNames.includes('schema_migrations'), 'schema_migrations table missing');

  // Test 2: Idempotency of runMigrations
  await runMigrations(db);
  const migrationsCount = await db.getFirstAsync(
    'SELECT COUNT(*) as count FROM schema_migrations;'
  );
  assert.strictEqual(Number(migrationsCount.count), 1, 'Migrations must be idempotent');
  console.log('✓ Migration idempotency verified');

  // Test 3: BehaviorRepository CRUD
  const { BehaviorRepository } = await import('../src/db/repositories/behaviorRepository.ts');
  const behaviorRepo = new BehaviorRepository(db);

  // Validation: empty name rejected
  await assert.rejects(
    async () => behaviorRepo.create({ name: '   ' }),
    /cannot be empty/,
    'Empty behavior name must be rejected'
  );

  // Validation: negative limit rejected
  await assert.rejects(
    async () => behaviorRepo.create({ name: 'Reading', dailyLimit: -5 }),
    /positive number/,
    'Negative daily limit must be rejected'
  );

  // Create behavior
  const b1 = await behaviorRepo.create({
    name: 'Mindful Breathing',
    category: 'Health',
    unit: 'minutes',
    dailyLimit: 15,
  });
  assert(b1.id, 'Behavior ID must be generated');
  assert.strictEqual(b1.name, 'Mindful Breathing');
  assert.strictEqual(b1.dailyLimit, 15);
  console.log('✓ Behavior created:', b1.name, `(${b1.id})`);

  const b2 = await behaviorRepo.create({
    name: 'Coffee',
    category: 'Habits',
    unit: 'cups',
    dailyLimit: 2,
  });
  console.log('✓ Behavior created:', b2.name, `(${b2.id})`);

  // List all
  let activeBehaviors = await behaviorRepo.getAll(false);
  assert.strictEqual(activeBehaviors.length, 2);

  // Archive b2
  await behaviorRepo.archive(b2.id);
  activeBehaviors = await behaviorRepo.getAll(false);
  assert.strictEqual(activeBehaviors.length, 1, 'Archived behavior should be excluded from active list');
  const allBehaviors = await behaviorRepo.getAll(true);
  assert.strictEqual(allBehaviors.length, 2, 'Archived behavior should be present when includeArchived=true');
  console.log('✓ Behavior archiving verified');

  // Unarchive b2
  await behaviorRepo.unarchive(b2.id);
  activeBehaviors = await behaviorRepo.getAll(false);
  assert.strictEqual(activeBehaviors.length, 2, 'Unarchiving behavior restored it to active list');

  // Test 4: LogEntryRepository CRUD & Aggregation
  const { LogEntryRepository } = await import('../src/db/repositories/logEntryRepository.ts');
  const logRepo = new LogEntryRepository(db);

  // Reject invalid entries
  await assert.rejects(
    async () => logRepo.create({ behaviorId: b1.id, value: -1 }),
    /positive number/,
    'Negative value must be rejected'
  );
  await assert.rejects(
    async () => logRepo.create({ behaviorId: 'non-existent-id', value: 5 }),
    /does not exist/,
    'Non-existent behavior must be rejected'
  );

  // Add 2 entries for b1 today
  const todayIso = new Date().toISOString();
  const e1 = await logRepo.create({
    behaviorId: b1.id,
    value: 5,
    occurredAt: todayIso,
    note: 'Morning session',
  });
  const e2 = await logRepo.create({
    behaviorId: b1.id,
    value: 10,
    occurredAt: todayIso,
    note: 'Evening session',
  });
  console.log('✓ Created 2 log entries (5 + 10 = 15 minutes)');

  // Verify daily summary
  const todayDay = todayIso.slice(0, 10);
  const summaries = await logRepo.getDailySummaries(todayDay);
  const b1Summary = summaries.find((s) => s.behaviorId === b1.id);
  assert(b1Summary, 'Summary for b1 must exist');
  assert.strictEqual(b1Summary.totalValue, 15, 'Total value must be 15');
  assert.strictEqual(b1Summary.entryCount, 2, 'Entry count must be 2');
  assert.strictEqual(b1Summary.isLimitReached, true, 'isLimitReached must be true (15 >= 15)');
  console.log('✓ Daily aggregation verified: totalValue =', b1Summary.totalValue, 'limitReached =', b1Summary.isLimitReached);

  // Query entries by date
  const dayEntries = await logRepo.getByDate(todayDay);
  assert.strictEqual(dayEntries.length, 2);
  assert.strictEqual(dayEntries[0].behaviorName, 'Mindful Breathing');
  console.log('✓ getByDate verified with joined behavior metadata');

  // Delete entry e1
  await logRepo.delete(e1.id);
  const summariesAfterDelete = await logRepo.getDailySummaries(todayDay);
  const b1SummaryAfter = summariesAfterDelete.find((s) => s.behaviorId === b1.id);
  assert.strictEqual(b1SummaryAfter.totalValue, 10);
  assert.strictEqual(b1SummaryAfter.isLimitReached, false, 'Limit is 15, current is 10, so isLimitReached is false');
  console.log('✓ Entry deletion & recalculation verified');

  // Test 5: GoalRepository CRUD
  const { GoalRepository } = await import('../src/db/repositories/goalRepository.ts');
  const goalRepo = new GoalRepository(db);

  const goal = await goalRepo.create({
    title: 'Daily Meditation',
    behaviorId: b1.id,
    goalType: 'daily_limit',
    targetValue: 15,
    startDate: todayDay,
  });
  assert(goal.id);
  assert.strictEqual(goal.title, 'Daily Meditation');
  const activeGoals = await goalRepo.getAll(true);
  assert.strictEqual(activeGoals.length, 1);
  console.log('✓ Goal created & listed:', goal.title);

  // Test 6: Foreign Key Cascading
  // Delete b1: log entries and goal references should cascade or set null
  await behaviorRepo.delete(b1.id);
  const remainingLogs = await logRepo.getByBehaviorId(b1.id);
  assert.strictEqual(remainingLogs.length, 0, 'Cascading delete must remove log entries for deleted behavior');
  console.log('✓ Foreign key cascade delete verified');

  console.log('--- ALL SQLITE PERSISTENCE TESTS PASSED ---');
}

testDatabase().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
