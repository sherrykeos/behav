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

  // Test 7: Phase 4 Date Boundary & Midnight Tests
  console.log('--- Testing Phase 4: Date Boundaries & Historical Edits ---');
  const b3 = await behaviorRepo.create({
    name: 'Cigarettes',
    category: 'Bad Habits',
    unit: 'cigarettes',
    dailyLimit: 10,
  });

  const midnightBefore = '2026-10-24T23:59:59.000+05:30';
  const midnightAfter = '2026-10-25T00:00:01.000+05:30';

  const entryDay1 = await logRepo.create({
    behaviorId: b3.id,
    value: 2,
    occurredAt: midnightBefore,
    note: 'Late night cigarette',
  });

  const entryDay2 = await logRepo.create({
    behaviorId: b3.id,
    value: 3,
    occurredAt: midnightAfter,
    note: 'Just after midnight cigarette',
  });

  const day1Entries = await logRepo.getByDate('2026-10-24');
  const day2Entries = await logRepo.getByDate('2026-10-25');

  assert.strictEqual(day1Entries.length, 1, 'Day 1 must contain exactly the 23:59:59 entry');
  assert.strictEqual(day1Entries[0].id, entryDay1.id);
  assert.strictEqual(day1Entries[0].value, 2);

  assert.strictEqual(day2Entries.some((e) => e.id === entryDay2.id), true, 'Day 2 must contain the 00:00:01 entry');
  console.log('✓ Midnight and calendar date boundaries verified without timezone spill');

  // Test 8: Historical Edit (moving entryDay1 from 2026-10-24 to 2026-10-25 and updating value to 4)
  await logRepo.update(entryDay1.id, {
    value: 4,
    occurredAt: '2026-10-25T14:30:00.000+05:30',
    note: 'Corrected date and quantity',
  });

  const day1AfterEdit = await logRepo.getByDate('2026-10-24');
  assert.strictEqual(day1AfterEdit.length, 0, 'Day 1 should now have 0 entries after moving entry to Day 2');

  const day2Summaries = await logRepo.getDailySummaries('2026-10-25');
  const b3Summary = day2Summaries.find((s) => s.behaviorId === b3.id);
  assert(b3Summary);
  assert.strictEqual(b3Summary.totalValue, 7, 'Day 2 total should now be 3 + 4 = 7');
  assert.strictEqual(b3Summary.entryCount, 2, 'Day 2 entry count should be 2');
  console.log('✓ Historical date/time edit and dynamic recalculation verified');

  // Test 9: Historical Deletion
  await logRepo.delete(entryDay1.id);
  const day2SummariesAfterDel = await logRepo.getDailySummaries('2026-10-25');
  const b3SummaryAfterDel = day2SummariesAfterDel.find((s) => s.behaviorId === b3.id);
  assert(b3SummaryAfterDel);
  assert.strictEqual(b3SummaryAfterDel.totalValue, 3, 'Day 2 total should now be back to 3');
  console.log('✓ Historical entry deletion and recalculation verified');

  console.log('--- ALL SQLITE PERSISTENCE & HISTORY TESTS PASSED ---');
}

testDatabase().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
