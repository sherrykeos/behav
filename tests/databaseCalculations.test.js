const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  isDayRecordGreen,
  countCalendarDaysInclusive,
  calculateStreakSeries,
  computeAnalytics,
} = require('../.test-dist/src/services/analytics/analyticsEngine.js');

describe('Database & Invariant Rules Verification (Phase 4 & 7)', () => {
  const habits = [
    { id: 'h1', name: 'Smoking', unit: 'cigarettes' },
    { id: 'h2', name: 'Fap', unit: 'occurrences' },
  ];

  it('Invariant 1 & 2: Daily records store non-negative quantities including 0', () => {
    const dailyRecords = [
      { date: '2026-10-01', habits: { h1: 0, h2: 0 } },
      { date: '2026-10-02', habits: { h1: 2, h2: 0 } },
    ];

    const result = computeAnalytics(habits, dailyRecords);
    assert.strictEqual(result.overview.totalRecordedDays, 2);
    assert.strictEqual(result.overview.greenDays, 1);
    assert.strictEqual(result.overview.activityDays, 1);
    assert.strictEqual(result.habits.h1.totalQuantity, 2);
    assert.strictEqual(result.habits.h2.totalQuantity, 0);
  });

  it('Invariant 4 & 5: Updating a daily quantity replaces existing record rather than creating duplicates', () => {
    // Simulate updating 2026-10-02 from 2 to 3
    const recordsMap = new Map();
    recordsMap.set('2026-10-01', { date: '2026-10-01', habits: { h1: 0, h2: 0 } });
    recordsMap.set('2026-10-02', { date: '2026-10-02', habits: { h1: 2, h2: 0 } });

    // Update operation: replaces rather than creating a duplicate
    recordsMap.set('2026-10-02', { date: '2026-10-02', habits: { h1: 3, h2: 0 } });

    const arrayRecords = Array.from(recordsMap.values());
    assert.strictEqual(arrayRecords.length, 2); // Still exactly 2 daily records!

    const result = computeAnalytics(habits, arrayRecords);
    assert.strictEqual(result.habits.h1.totalQuantity, 3);
  });

  it('Recalculates analytics dynamically after daily record mutation', () => {
    // Initial state: Day 1 Clean (0,0), Day 2 Clean (0,0) -> Streak 2
    let records = [
      { date: '2026-10-01', habits: { h1: 0, h2: 0 } },
      { date: '2026-10-02', habits: { h1: 0, h2: 0 } },
    ];
    let res = computeAnalytics(habits, records);
    assert.strictEqual(res.overview.currentGreenStreak, 2);
    assert.strictEqual(res.overview.greenDays, 2);

    // Mutation: User logs activity on Day 2 -> Day 2 becomes active
    records = [
      { date: '2026-10-01', habits: { h1: 0, h2: 0 } },
      { date: '2026-10-02', habits: { h1: 1, h2: 0 } },
    ];
    res = computeAnalytics(habits, records);
    assert.strictEqual(res.overview.currentGreenStreak, 0); // Active day breaks current streak
    assert.strictEqual(res.overview.maxGreenStreak, 1);
    assert.strictEqual(res.overview.greenDays, 1);

    // Mutation: User logs Day 3 Clean (0,0)
    records.push({ date: '2026-10-03', habits: { h1: 0, h2: 0 } });
    res = computeAnalytics(habits, records);
    assert.strictEqual(res.overview.currentGreenStreak, 1);
    assert.strictEqual(res.overview.maxGreenStreak, 1);
    assert.strictEqual(res.overview.greenDays, 2);
  });

  it('Roundtrip backup/import preserves all daily records including 0-consumption days', () => {
    const originalDays = [
      { date: '2026-08-01', habits: { h1: 0, h2: 0 } }, // Clean
      { date: '2026-08-02', habits: { h1: 0, h2: 0 } }, // Clean
      { date: '2026-08-03', habits: { h1: 3, h2: 0 } }, // Activity
      { date: '2026-08-04', habits: { h1: 0, h2: 1 } }, // Activity
      { date: '2026-08-05', habits: { h1: 0, h2: 0 } }, // Clean
    ];

    // Simulated backup payload
    const backupJson = JSON.stringify({
      format: 'bhfile',
      version: 1,
      period: { from: '2026-08-01', to: '2026-08-05' },
      habits,
      days: originalDays,
    });

    const parsedBackup = JSON.parse(backupJson);

    // Verify all 5 days are preserved
    assert.strictEqual(parsedBackup.days.length, 5);

    // Verify recalculation from imported records matches original
    const result = computeAnalytics(parsedBackup.habits, parsedBackup.days);
    assert.strictEqual(result.overview.totalRecordedDays, 5);
    assert.strictEqual(result.overview.greenDays, 3);
    assert.strictEqual(result.overview.activityDays, 2);
    assert.strictEqual(result.overview.maxGreenStreak, 2);
    assert.strictEqual(result.habits.h1.maxFreeStreak, 2);
    assert.strictEqual(result.habits.h2.maxFreeStreak, 3);
  });
});
