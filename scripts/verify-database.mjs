import { DatabaseSync } from 'node:sqlite';
import assert from 'node:assert';
import { shiftDayString } from '../src/utils/date.ts';

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
    async withTransactionAsync(task) {
      sqlite.exec('BEGIN TRANSACTION;');
      try {
        const result = await task();
        sqlite.exec('COMMIT;');
        return result;
      } catch (err) {
        sqlite.exec('ROLLBACK;');
        throw err;
      }
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

  // Test 10: Phase 5 Insights, Trends & Independent Streaks
  console.log('--- Testing Phase 5: Insights, Averages & Independent Streaks ---');
  const { InsightRepository } = await import('../src/db/repositories/insightRepository.ts');
  const insightRepo = new InsightRepository(db);

  // Setup habit: Smoking (daily limit = 4, created 4 days ago)
  const bSmoking = await behaviorRepo.create({
    name: 'Smoking',
    unit: 'cigarettes',
    dailyLimit: 4,
  });
  // Simulate habit created 4 days ago
  const anchorDate = '2026-10-25';
  await db.runAsync('UPDATE behaviors SET created_at = ? WHERE id = ?;', [
    `${shiftDayString(anchorDate, -3)}T00:00:00.000+05:30`,
    bSmoking.id,
  ]);

  // Setup habit: Screen Time (daily limit = 60, zero records logged)
  const bScreen = await behaviorRepo.create({
    name: 'Screen Time',
    unit: 'minutes',
    dailyLimit: 60,
  });

  // Add 4 consecutive days of smoking within limit (3 per day) for 2026-10-22, 2026-10-23, 2026-10-24, 2026-10-25
  for (let i = 0; i < 4; i++) {
    const day = shiftDayString(anchorDate, -i);
    await logRepo.create({
      behaviorId: bSmoking.id,
      value: 3,
      occurredAt: `${day}T12:00:00.000+05:30`,
    });
  }

  // Calculate stats for Smoking
  const smokingStats = await insightRepo.getBehaviorStats(bSmoking.id, anchorDate);
  assert(smokingStats, 'Stats must exist for Smoking');
  assert.strictEqual(smokingStats.total7Days, 12, '7-day total should be 3 * 4 = 12');
  assert.strictEqual(smokingStats.avg7Days, Math.round((12 / 7) * 10) / 10);
  assert.strictEqual(smokingStats.currentStreakDays, 4, 'Streak must be 4 consecutive days under limit');
  console.log('✓ 7-day totals, daily average, and adherence streak (4 days) verified');

  // Verify Screen Time has its own independent streak (independent habits test)
  const screenStats = await insightRepo.getBehaviorStats(bScreen.id, anchorDate);
  assert(screenStats, 'Stats must exist for Screen Time');
  // Screen time has 0 logs, so its streak must be 0 (no fake streaks for unrecorded habits)
  assert.strictEqual(screenStats.total7Days, 0, 'Screen Time 7-day total must be 0');
  assert.strictEqual(screenStats.currentStreakDays, 0, 'Habit with no recorded logs has streak = 0');
  console.log('✓ Independent streak state between distinct habits verified');

  // Break streak: log an occurrence on anchorDate for Smoking exceeding limit (add 2 more, total = 5 > 4)
  const overLimitEntry = await logRepo.create({
    behaviorId: bSmoking.id,
    value: 2,
    occurredAt: `${anchorDate}T18:00:00.000+05:30`,
  });

  const smokingStatsAfterOver = await insightRepo.getBehaviorStats(bSmoking.id, anchorDate);
  assert(smokingStatsAfterOver);
  assert.strictEqual(smokingStatsAfterOver.total7Days, 14, 'Total should now be 12 + 2 = 14');
  assert.strictEqual(smokingStatsAfterOver.currentStreakDays, 0, 'Exceeding limit on anchor day must reset streak to 0');
  console.log('✓ Streak correctly resets when limit is exceeded without fabricating false data');

  // Test 11: Phase 6 Backup, Restore & CSV Export
  console.log('--- Testing Phase 6: Backup, Restore & CSV Export ---');
  const { BackupRepository } = await import('../src/db/repositories/backupRepository.ts');
  const backupRepo = new BackupRepository(db);

  // 1. Export JSON backup
  const backup = await backupRepo.createBackup();
  assert.strictEqual(backup.app, 'behav', 'Backup app must be "behav"');
  assert.strictEqual(backup.schemaVersion, 1, 'Backup schemaVersion must be 1');
  assert(backup.data.behaviors.length >= 3, 'Backup must include all created behaviors');
  assert(backup.data.log_entries.length >= 6, 'Backup must include all log entries');
  assert(backup.data.goals.length >= 1, 'Backup must include goals');
  console.log(`✓ JSON backup created successfully (${backup.data.behaviors.length} habits, ${backup.data.log_entries.length} logs)`);

  // 2. Backup validation tests
  const validJson = JSON.stringify(backup);
  const validResult = backupRepo.validateBackup(validJson);
  assert(validResult.isValid, 'Valid backup must pass validation');

  const invalidAppResult = backupRepo.validateBackup(JSON.stringify({ app: 'other_app', schemaVersion: 1, data: {} }));
  assert(!invalidAppResult.isValid, 'Non-behav backup must be rejected');

  const invalidVersionResult = backupRepo.validateBackup(JSON.stringify({ app: 'behav', schemaVersion: 99, data: {} }));
  assert(!invalidVersionResult.isValid, 'Future schema version must be rejected');

  const corruptJsonResult = backupRepo.validateBackup('{ invalid json');
  assert(!corruptJsonResult.isValid, 'Malformed JSON string must be rejected');
  console.log('✓ Backup validation correctly enforces schema version and structure');

  // 3. CSV Export tests
  const logsCsv = await backupRepo.exportLogsToCsv();
  assert(logsCsv.startsWith('id,occurred_at,behavior_name,category,value,unit,note,behavior_id,created_at'), 'Logs CSV header must follow RFC 4180');
  assert(logsCsv.includes('Smoking'), 'Logs CSV must contain behavior names');

  const behaviorsCsv = await backupRepo.exportBehaviorsToCsv();
  assert(behaviorsCsv.startsWith('id,name,category,unit,daily_limit,is_archived,created_at'), 'Behaviors CSV header must follow RFC 4180');
  assert(behaviorsCsv.includes('Smoking'), 'Behaviors CSV must include habits');
  console.log('✓ RFC 4180 CSV export for logs and behaviors verified');

  // 4. Merge restore test (idempotent, does not duplicate records)
  const initialLogCount = (await db.getAllAsync('SELECT id FROM log_entries;')).length;
  const mergeResult = await backupRepo.restoreBackup(backup, 'merge');
  const postMergeLogCount = (await db.getAllAsync('SELECT id FROM log_entries;')).length;
  assert.strictEqual(postMergeLogCount, initialLogCount, 'Merge restore with existing primary keys must not create duplicate records');
  assert.strictEqual(mergeResult.skippedLogs, 0, 'No logs should be skipped when parent habits exist');
  console.log('✓ Merge restore verified: primary-key integrity preserved without duplicates');

  // 5. Destructive replace restore test
  const replaceResult = await backupRepo.restoreBackup(backup, 'replace');
  const postReplaceLogCount = (await db.getAllAsync('SELECT id FROM log_entries;')).length;
  assert.strictEqual(postReplaceLogCount, backup.data.log_entries.length, 'Replace restore must restore exact record counts');
  console.log('✓ Destructive replace restore verified with complete database reconstruction');

  console.log('--- ALL SQLITE PERSISTENCE, HISTORY, INSIGHTS & BACKUP TESTS PASSED ---');
}

testDatabase().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
