import { DatabaseSync } from 'node:sqlite';
import assert from 'node:assert';
import fs from 'node:fs';
import { shiftDayString } from '../src/utils/date.ts';
import {
  validateBHFileV1,
  calculateBHFileSummary,
  calculateMaxStreakFromDays,
  isDayGreen,
} from '../src/utils/bhfile.ts';

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

  // Test 11: Phase 6 JSON Canonical Backup & Restore System
  console.log('--- Testing Phase 6: JSON Canonical Backup & Restore System ---');
  const { BackupRepository, hasAcceptedBackupExtension } = await import('../src/db/repositories/backupRepository.ts');
  const backupRepo = new BackupRepository(db);

  // 1. Export canonical JSON backup (v1)
  const exportedBhfile = await backupRepo.createBackup();
  assert.strictEqual(exportedBhfile.format, 'bhfile', 'Format identifier must be "bhfile"');
  assert.strictEqual(exportedBhfile.version, 1, 'Format version must be 1');
  assert(exportedBhfile.habits.length >= 2, 'Must include active habits');
  assert(exportedBhfile.days.length >= 1, 'Must include days array');
  assert(exportedBhfile.summary.totalDays === exportedBhfile.days.length, 'Summary totalDays must match days count');
  console.log(`✓ JSON backup export verified: ${exportedBhfile.habits.length} habits, ${exportedBhfile.days.length} days`);

  // 2. Extension validation tests
  const exportedString = JSON.stringify(exportedBhfile);

  // Import with .json extension
  const jsonExtValidation = backupRepo.validateBackup(exportedString, 'Behav-Backup-2026-10-25.json');
  assert(jsonExtValidation.isValid, 'Valid backup with .json extension must pass validation');

  // Custom .bhfile extension MUST be rejected
  const bhfileExtValidation = backupRepo.validateBackup(exportedString, 'Behav-Backup-2026-10-25.bhfile');
  assert(!bhfileExtValidation.isValid, 'Custom .bhfile extension must be rejected');
  assert.match(bhfileExtValidation.error, /Only standard \.json backup files are accepted/);

  // Extension helper checks
  assert(hasAcceptedBackupExtension('backup.json'), '.json must be accepted');
  assert(!hasAcceptedBackupExtension('backup.bhfile'), '.bhfile must be rejected');
  assert(!hasAcceptedBackupExtension('backup.csv'), '.csv must not be accepted as backup');
  assert(!hasAcceptedBackupExtension('backup.txt'), '.txt must not be accepted as backup');
  console.log('✓ Extension handling verified: .json accepted exclusively; .bhfile and non-backup extensions rejected');

  // 3. Validation rejection rules
  // Mismatched format identifier
  const wrongFormat = backupRepo.validateBackup(JSON.stringify({ format: 'random_app', schemaVersion: 1, data: {} }));
  assert(!wrongFormat.isValid, 'Mismatched format identifier must be rejected');

  // Arbitrary JSON without format identifier
  const arbitraryJson = backupRepo.validateBackup(JSON.stringify({ foo: 'bar', timestamp: 12345 }));
  assert(!arbitraryJson.isValid, 'Arbitrary JSON must be rejected');

  // Future schema version
  const futureVersion = backupRepo.validateBackup(JSON.stringify({ format: 'bhfile', schemaVersion: 2, data: {} }));
  assert(!futureVersion.isValid, 'Unsupported future schema version must be rejected');

  // Malformed JSON string
  const malformed = backupRepo.validateBackup('{ invalid json syntax');
  assert(!malformed.isValid, 'Malformed JSON must be rejected');

  // Duplicate behavior ID in same file
  const dupBehaviorId = backupRepo.validateBackup(JSON.stringify({
    format: 'bhfile',
    schemaVersion: 1,
    data: {
      behaviors: [
        { id: 'b-dup', name: 'Habit 1', unit: 'times' },
        { id: 'b-dup', name: 'Habit 2', unit: 'times' },
      ],
      records: [],
      goals: []
    }
  }));
  assert(!dupBehaviorId.isValid, 'Duplicate behavior IDs within file must be rejected');

  // Duplicate behavior name in same file
  const dupBehaviorName = backupRepo.validateBackup(JSON.stringify({
    format: 'bhfile',
    schemaVersion: 1,
    data: {
      behaviors: [
        { id: 'b-1', name: 'Smoking', unit: 'times' },
        { id: 'b-2', name: 'smoking', unit: 'times' },
      ],
      records: [],
      goals: []
    }
  }));
  assert(!dupBehaviorName.isValid, 'Duplicate behavior names within file must be rejected');

  // Dangling behavior reference (record references behavior not in file)
  const danglingRef = backupRepo.validateBackup(JSON.stringify({
    format: 'bhfile',
    schemaVersion: 1,
    data: {
      behaviors: [{ id: 'b-1', name: 'Habit 1', unit: 'times' }],
      records: [{ id: 'r-1', behaviorId: 'b-nonexistent', value: 1, occurredAt: '2026-10-25' }],
      goals: []
    }
  }));
  assert(!danglingRef.isValid, 'Dangling behavior reference must be rejected');

  // Invalid date format (e.g. invalid calendar date 2024-02-31)
  const invalidDate = backupRepo.validateBackup(JSON.stringify({
    format: 'bhfile',
    schemaVersion: 1,
    data: {
      behaviors: [{ id: 'b-1', name: 'Habit 1', unit: 'times' }],
      records: [{ id: 'r-1', behaviorId: 'b-1', value: 1, occurredAt: '2024-02-31' }],
      goals: []
    }
  }));
  assert(!invalidDate.isValid, 'Invalid calendar date must be rejected');

  // Invalid quantity (negative or zero)
  const invalidQuantity = backupRepo.validateBackup(JSON.stringify({
    format: 'bhfile',
    schemaVersion: 1,
    data: {
      behaviors: [{ id: 'b-1', name: 'Habit 1', unit: 'times' }],
      records: [{ id: 'r-1', behaviorId: 'b-1', value: -3, occurredAt: '2024-01-01' }],
      goals: []
    }
  }));
  assert(!invalidQuantity.isValid, 'Non-positive quantity must be rejected');
  console.log('✓ Validation rules correctly enforce schema integrity, duplicate prevention, and foreign-key constraints');

  // 4. Multi-year synthetic historical dataset ingestion test
  const multiYearSynthetic = {
    format: 'bhfile',
    schemaVersion: 1,
    appVersion: '1.0.0',
    exportedAt: '2026-10-25T20:00:00.000+05:30',
    data: {
      behaviors: [
        {
          id: 'b-synthetic-smoke',
          name: 'Synthetic Smoking',
          category: 'Health',
          unit: 'cigarettes',
          measurementType: 'count',
          dailyLimit: 4
        },
        {
          id: 'b-synthetic-water',
          name: 'Water Tracking',
          category: 'Wellness',
          unit: 'ml',
          measurementType: 'volume',
          dailyLimit: 2000
        }
      ],
      records: [
        // 2024 historical record
        {
          id: 'r-2024-01',
          behaviorId: 'b-synthetic-smoke',
          value: 3,
          occurredAt: '2024-03-15',
          note: 'Historical 2024 entry'
        },
        // 2025 historical record
        {
          id: 'r-2025-01',
          behaviorId: 'b-synthetic-smoke',
          value: 2,
          occurredAt: '2025-07-20',
          note: 'Historical 2025 entry'
        },
        // 2026 volume record
        {
          id: 'r-2026-01',
          behaviorId: 'b-synthetic-water',
          value: 500,
          occurredAt: '2026-10-25T10:00:00.000+05:30',
          note: 'Morning water glass'
        }
      ],
      goals: [
        {
          id: 'g-synth-1',
          title: 'Keep smoking under 4',
          behaviorId: 'b-synthetic-smoke',
          goalType: 'daily_limit',
          targetValue: 4,
          startDate: '2024-01-01',
          isActive: true
        }
      ]
    }
  };

  const multiYearValidation = backupRepo.validateBackup(JSON.stringify(multiYearSynthetic), 'synthetic.json');
  assert(multiYearValidation.isValid, 'Multi-year synthetic payload must validate cleanly');

  // Perform full atomic replace restore
  const restoreOutcome = await backupRepo.restoreBackup(multiYearValidation.backup, 'replace');
  assert.strictEqual(restoreOutcome.restoredBehaviors, 2, '2 behaviors restored');
  assert.strictEqual(restoreOutcome.restoredLogs, 3, '3 records restored');
  assert.strictEqual(restoreOutcome.restoredGoals, 1, '1 goal restored');

  // Verify historical retrieval by date
  const records2024 = await logRepo.getByDate('2024-03-15');
  assert.strictEqual(records2024.length, 1, '2024 record must be retrievable');
  assert.strictEqual(records2024[0].value, 3);
  assert.strictEqual(records2024[0].behaviorName, 'Synthetic Smoking');

  const records2025 = await logRepo.getByDate('2025-07-20');
  assert.strictEqual(records2025.length, 1, '2025 record must be retrievable');
  assert.strictEqual(records2025[0].value, 2);

  const records2026 = await logRepo.getByDate('2026-10-25');
  assert.strictEqual(records2026.length, 1, '2026 record must be retrievable');
  assert.strictEqual(records2026[0].value, 500);
  assert.strictEqual(records2026[0].behaviorUnit, 'ml');
  console.log('✓ Multi-year records restored across 2024-2026 with exact dates, quantities, and units');

  // 5. Atomic transaction rollback verification
  const preFailureCount = (await db.getAllAsync('SELECT id FROM behaviors;')).length;
  // Attempt invalid restore that triggers constraint violation inside transaction
  try {
    await backupRepo.restoreBackup({
      format: 'bhfile',
      schemaVersion: 1,
      appVersion: '1.0.0',
      exportedAt: getCurrentIsoTimestamp(),
      data: {
        behaviors: [{ id: 'b-fail-1', name: 'Will Roll Back', unit: 'times', dailyLimit: null, createdAt: 'now', archivedAt: null }],
        // Foreign key violation or invalid SQL
        records: [{ id: 'r-fail-1', behaviorId: 'b-does-not-exist', value: 1, occurredAt: 'now', note: null, createdAt: 'now', updatedAt: 'now' }],
        goals: []
      }
    }, 'replace');
  } catch (err) {
    // Expected transaction rollback
  }
  // Verify database was preserved completely without partial writes
  const postFailureCount = (await db.getAllAsync('SELECT id FROM behaviors;')).length;
  assert.strictEqual(postFailureCount, preFailureCount, 'Database must be unchanged after failed transaction');
  console.log('✓ Atomic transaction safety verified: failed restore leaves zero partial changes');

  // --- Section 6: Testing Locked BHFile v1 Canonical Format & Streak Semantics ---
  console.log('--- Testing Locked BHFile v1 Canonical Format & Streak Semantics ---');

  // 1. Validate Canonical Reference Example
  const exampleFileContent = fs.readFileSync('docs/example-v1.json', 'utf8');
  const exampleJson = JSON.parse(exampleFileContent);
  const exampleValidation = validateBHFileV1(exampleJson);
  assert.strictEqual(exampleValidation.isValid, true, `Canonical example must validate: ${exampleValidation.error}`);
  assert.strictEqual(exampleValidation.data.summary.totalDays, 6);
  assert.strictEqual(exampleValidation.data.summary.greenDays, 4);
  assert.strictEqual(exampleValidation.data.summary.maxStreak, 2);
  assert.strictEqual(exampleValidation.data.summary.habits.H1.total, 7);
  assert.strictEqual(exampleValidation.data.summary.habits.H2.total, 1);
  assert.strictEqual(exampleValidation.data.summary.habits.H3.total, 120);
  console.log('✓ Canonical reference example passes exact v1 schema and summary recalculation');

  // 2. Format, Version & Prohibited Root Fields
  const badFormat = validateBHFileV1({ ...exampleJson, format: 'json' });
  assert.strictEqual(badFormat.isValid, false, 'Format must be "bhfile"');
  assert.match(badFormat.error, /Invalid format identifier/);

  const badVersion = validateBHFileV1({ ...exampleJson, version: 2 });
  assert.strictEqual(badVersion.isValid, false, 'Version 2 must be rejected in v1 engine');
  assert.match(badVersion.error, /Unsupported format version/);

  const extraField = validateBHFileV1({ ...exampleJson, appVersion: '1.0.0' });
  assert.strictEqual(extraField.isValid, false, 'Prohibited root fields must be rejected');
  assert.match(extraField.error, /Prohibited root field detected/);
  console.log('✓ Format identifier, version gating, and prohibited root fields rejected properly');

  // 3. Habit Rules: Uniqueness & Allowed Keys
  const dupHabits = {
    ...exampleJson,
    habits: [
      { id: 'H1', name: 'Smoking', unit: 'cigarettes' },
      { id: 'H1', name: 'Duplicate H1', unit: 'cigarettes' },
    ],
  };
  const dupHabitsResult = validateBHFileV1(dupHabits);
  assert.strictEqual(dupHabitsResult.isValid, false, 'Duplicate habit ID must be rejected');
  assert.match(dupHabitsResult.error, /Duplicate habit ID/);

  const extraHabitProp = {
    ...exampleJson,
    habits: [{ id: 'H1', name: 'Smoking', unit: 'cigarettes', dailyLimit: 10 }],
  };
  assert.strictEqual(validateBHFileV1(extraHabitProp).isValid, false, 'Prohibited habit field must be rejected');
  console.log('✓ Habit ID uniqueness and strict habit property checking verified');

  // 4. Date Rules: Chronological Order, Uniqueness & Validity
  const nonChronological = {
    ...exampleJson,
    days: [
      { date: '2026-10-22', habits: { H1: 0, H2: 0, H3: 0 } },
      { date: '2026-10-21', habits: { H1: 0, H2: 0, H3: 0 } },
    ],
    summary: { totalDays: 2, greenDays: 2, maxStreak: 2, habits: { H1: { total: 0 }, H2: { total: 0 }, H3: { total: 0 } } }
  };
  const nonChronoResult = validateBHFileV1(nonChronological);
  assert.strictEqual(nonChronoResult.isValid, false, 'Non-chronological dates must be rejected');
  assert.match(nonChronoResult.error, /Non-chronological date order/);

  const duplicateDate = {
    ...exampleJson,
    days: [
      { date: '2026-10-21', habits: { H1: 0, H2: 0, H3: 0 } },
      { date: '2026-10-21', habits: { H1: 0, H2: 0, H3: 0 } },
    ],
    summary: { totalDays: 2, greenDays: 2, maxStreak: 2, habits: { H1: { total: 0 }, H2: { total: 0 }, H3: { total: 0 } } }
  };
  const dupDateResult = validateBHFileV1(duplicateDate);
  assert.strictEqual(dupDateResult.isValid, false, 'Duplicate dates must be rejected');
  assert.match(dupDateResult.error, /Duplicate date/);

  const invalidCalendarDate = {
    ...exampleJson,
    days: [{ date: '2026-02-31', habits: { H1: 0, H2: 0, H3: 0 } }],
    summary: { totalDays: 1, greenDays: 1, maxStreak: 1, habits: { H1: { total: 0 }, H2: { total: 0 }, H3: { total: 0 } } }
  };
  const invalidDateResult = validateBHFileV1(invalidCalendarDate);
  assert.strictEqual(invalidDateResult.isValid, false, 'Invalid calendar date must be rejected');
  assert.match(invalidDateResult.error, /invalid calendar date/);
  console.log('✓ Date uniqueness, chronological ordering, and calendar validation verified');

  // 5. Day Habit Completeness, Non-Negativity & Discrete Unit Types
  const missingHabitInDay = {
    ...exampleJson,
    days: [{ date: '2026-10-21', habits: { H1: 0, H2: 0 } }], // missing H3
    summary: { totalDays: 1, greenDays: 1, maxStreak: 1, habits: { H1: { total: 0 }, H2: { total: 0 }, H3: { total: 0 } } }
  };
  const missingHabitResult = validateBHFileV1(missingHabitInDay);
  assert.strictEqual(missingHabitResult.isValid, false, 'Day missing defined habit must be rejected');
  assert.match(missingHabitResult.error, /missing habit "H3"/);

  const unknownHabitInDay = {
    ...exampleJson,
    days: [{ date: '2026-10-21', habits: { H1: 0, H2: 0, H3: 0, H99: 0 } }],
    summary: { totalDays: 1, greenDays: 1, maxStreak: 1, habits: { H1: { total: 0 }, H2: { total: 0 }, H3: { total: 0 } } }
  };
  const unknownHabitResult = validateBHFileV1(unknownHabitInDay);
  assert.strictEqual(unknownHabitResult.isValid, false, 'Undefined habit in day must be rejected');
  assert.match(unknownHabitResult.error, /references undefined habit ID/);

  const negativeQty = {
    ...exampleJson,
    days: [{ date: '2026-10-21', habits: { H1: -1, H2: 0, H3: 0 } }],
    summary: { totalDays: 1, greenDays: 0, maxStreak: 0, habits: { H1: { total: -1 }, H2: { total: 0 }, H3: { total: 0 } } }
  };
  const negResult = validateBHFileV1(negativeQty);
  assert.strictEqual(negResult.isValid, false, 'Negative quantity must be rejected');
  assert.match(negResult.error, /cannot be negative/);

  const fractionalDiscrete = {
    ...exampleJson,
    days: [{ date: '2026-10-21', habits: { H1: 2.5, H2: 0, H3: 0 } }], // cigarettes cannot be 2.5
    summary: { totalDays: 1, greenDays: 0, maxStreak: 0, habits: { H1: { total: 2.5 }, H2: { total: 0 }, H3: { total: 0 } } }
  };
  const fracResult = validateBHFileV1(fractionalDiscrete);
  assert.strictEqual(fracResult.isValid, false, 'Fractional discrete count must be rejected');
  assert.match(fracResult.error, /must be an integer/);
  console.log('✓ Habit completeness, non-negativity, and discrete unit integer rules verified');

  // 6. Streak Algorithm Semantics & Edge Cases
  // Case A: Consecutive 5 green days
  const streak5Days = [
    { date: '2026-10-01', isGreen: true },
    { date: '2026-10-02', isGreen: true },
    { date: '2026-10-03', isGreen: true },
    { date: '2026-10-04', isGreen: true },
    { date: '2026-10-05', isGreen: true },
  ];
  assert.strictEqual(calculateMaxStreakFromDays(streak5Days), 5, '5 consecutive green days must yield streak of 5');

  // Case B: Non-green day breaks streak
  const streakWithNonGreen = [
    { date: '2026-10-01', isGreen: true },
    { date: '2026-10-02', isGreen: true },
    { date: '2026-10-03', isGreen: false }, // break
    { date: '2026-10-04', isGreen: true },
  ];
  assert.strictEqual(calculateMaxStreakFromDays(streakWithNonGreen), 2, 'Non-green day must break streak');

  // Case C: Missing calendar date breaks streak (even if both adjacent days are green)
  const streakWithMissingDate = [
    { date: '2026-10-01', isGreen: true },
    { date: '2026-10-02', isGreen: true },
    // 2026-10-03 is MISSING
    { date: '2026-10-04', isGreen: true },
    { date: '2026-10-05', isGreen: true },
    { date: '2026-10-06', isGreen: true },
  ];
  assert.strictEqual(calculateMaxStreakFromDays(streakWithMissingDate), 3, 'Missing calendar date must break streak');

  // Case D: Zero green days
  const zeroGreen = [
    { date: '2026-10-01', isGreen: false },
    { date: '2026-10-02', isGreen: false },
  ];
  assert.strictEqual(calculateMaxStreakFromDays(zeroGreen), 0, 'No green days must yield streak of 0');

  // Case E: Empty dataset
  assert.strictEqual(calculateMaxStreakFromDays([]), 0, 'Empty dataset must yield streak of 0');
  console.log('✓ Streak algorithm verified for consecutive days, non-green breaks, missing date breaks, and zero green days');

  // 7. Inconsistent Summary Tampering Detection
  const tamperedTotalDays = {
    ...exampleJson,
    summary: { ...exampleJson.summary, totalDays: 99 }
  };
  const tamperedTotalResult = validateBHFileV1(tamperedTotalDays);
  assert.strictEqual(tamperedTotalResult.isValid, false, 'Tampered totalDays must be rejected');
  assert.match(tamperedTotalResult.error, /Summary mismatch: totalDays/);

  const tamperedGreenDays = {
    ...exampleJson,
    summary: { ...exampleJson.summary, greenDays: 99 }
  };
  const tamperedGreenResult = validateBHFileV1(tamperedGreenDays);
  assert.strictEqual(tamperedGreenResult.isValid, false, 'Tampered greenDays must be rejected');
  assert.match(tamperedGreenResult.error, /Summary mismatch: greenDays/);

  const tamperedStreak = {
    ...exampleJson,
    summary: { ...exampleJson.summary, maxStreak: 99 }
  };
  const tamperedStreakResult = validateBHFileV1(tamperedStreak);
  assert.strictEqual(tamperedStreakResult.isValid, false, 'Tampered maxStreak must be rejected');
  assert.match(tamperedStreakResult.error, /Summary mismatch: maxStreak/);

  const tamperedHabitTotal = {
    ...exampleJson,
    summary: {
      ...exampleJson.summary,
      habits: { ...exampleJson.summary.habits, H1: { total: 999 } }
    }
  };
  const tamperedHabitResult = validateBHFileV1(tamperedHabitTotal);
  assert.strictEqual(tamperedHabitResult.isValid, false, 'Tampered habit total must be rejected');
  assert.match(tamperedHabitResult.error, /Summary mismatch for habit "H1"/);
  console.log('✓ Independent summary verification strictly rejects tampered counts, streaks, or totals');

  // 8. Empty Dataset Behavior
  const emptyFile = {
    format: 'bhfile',
    version: 1,
    habits: [{ id: 'H1', name: 'Smoking', unit: 'cigarettes' }],
    days: [],
    summary: {
      totalDays: 0,
      greenDays: 0,
      maxStreak: 0,
      habits: { H1: { total: 0 } }
    }
  };
  const emptyResult = validateBHFileV1(emptyFile);
  assert.strictEqual(emptyResult.isValid, true, 'Valid empty BHFile must pass validation');
  console.log('✓ Valid empty BHFile structure passes validation cleanly');

  console.log('--- ALL SQLITE PERSISTENCE, HISTORY, INSIGHTS & BHFILE TESTS PASSED ---');
}

testDatabase().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
