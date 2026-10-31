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

describe('Analytics Engine - Green Day Evaluation (Phase 2.2)', () => {
  const habits = ['smoking', 'fap'];

  it('Both habits zero = green', () => {
    const record = {
      date: '2026-05-10',
      habits: { smoking: 0, fap: 0 },
    };
    assert.strictEqual(isDayRecordGreen(record, habits), true);
  });

  it('Smoking positive, fap zero = activity (not green)', () => {
    const record = {
      date: '2026-05-10',
      habits: { smoking: 1, fap: 0 },
    };
    assert.strictEqual(isDayRecordGreen(record, habits), false);
  });

  it('Smoking zero, fap positive = activity (not green)', () => {
    const record = {
      date: '2026-05-10',
      habits: { smoking: 0, fap: 2 },
    };
    assert.strictEqual(isDayRecordGreen(record, habits), false);
  });

  it('Both positive = activity (not green)', () => {
    const record = {
      date: '2026-05-10',
      habits: { smoking: 2, fap: 3 },
    };
    assert.strictEqual(isDayRecordGreen(record, habits), false);
  });

  it('No tracked habits = defined behavior (false, not accidental green)', () => {
    const record = {
      date: '2026-05-10',
      habits: {},
    };
    assert.strictEqual(isDayRecordGreen(record, []), false);
  });
});

describe('Analytics Engine - Green Streak & Continuity (Phase 2.4 & 2.8)', () => {
  it('Five consecutive green days = streak of 5', () => {
    const series = [
      { date: '2026-01-01', qualifies: true },
      { date: '2026-01-02', qualifies: true },
      { date: '2026-01-03', qualifies: true },
      { date: '2026-01-04', qualifies: true },
      { date: '2026-01-05', qualifies: true },
    ];
    const res = calculateStreakSeries(series);
    assert.strictEqual(res.maxStreak, 5);
    assert.strictEqual(res.maxStreakStart, '2026-01-01');
    assert.strictEqual(res.maxStreakEnd, '2026-01-05');
    assert.strictEqual(res.currentStreak, 5);
  });

  it('Green, green, activity, green = max streak 2, current streak 1', () => {
    const series = [
      { date: '2026-01-01', qualifies: true },
      { date: '2026-01-02', qualifies: true },
      { date: '2026-01-03', qualifies: false },
      { date: '2026-01-04', qualifies: true },
    ];
    const res = calculateStreakSeries(series);
    assert.strictEqual(res.maxStreak, 2);
    assert.strictEqual(res.maxStreakStart, '2026-01-01');
    assert.strictEqual(res.maxStreakEnd, '2026-01-02');
    assert.strictEqual(res.currentStreak, 1);
  });

  it('Missing calendar date breaks streak (Jan 1, Jan 2, Jan 4 != 3 consecutive)', () => {
    const series = [
      { date: '2026-01-01', qualifies: true },
      { date: '2026-01-02', qualifies: true },
      // Jan 3 missing!
      { date: '2026-01-04', qualifies: true },
    ];
    const res = calculateStreakSeries(series);
    assert.strictEqual(res.maxStreak, 2); // Cannot be 3 because Jan 3 is missing!
    assert.strictEqual(res.currentStreak, 1);
  });

  it('Month boundary continuity: Jan 31 to Feb 2 = streak of 3', () => {
    const series = [
      { date: '2026-01-31', qualifies: true },
      { date: '2026-02-01', qualifies: true },
      { date: '2026-02-02', qualifies: true },
    ];
    const res = calculateStreakSeries(series);
    assert.strictEqual(res.maxStreak, 3);
    assert.strictEqual(res.maxStreakStart, '2026-01-31');
    assert.strictEqual(res.maxStreakEnd, '2026-02-02');
  });

  it('Year boundary continuity: Dec 31 to Jan 2 = streak of 3', () => {
    const series = [
      { date: '2025-12-31', qualifies: true },
      { date: '2026-01-01', qualifies: true },
      { date: '2026-01-02', qualifies: true },
    ];
    const res = calculateStreakSeries(series);
    assert.strictEqual(res.maxStreak, 3);
    assert.strictEqual(res.maxStreakStart, '2025-12-31');
    assert.strictEqual(res.maxStreakEnd, '2026-01-02');
  });

  it('Leap year continuity: Feb 28, Feb 29, Mar 1 in 2024 = streak of 3', () => {
    const series = [
      { date: '2024-02-28', qualifies: true },
      { date: '2024-02-29', qualifies: true },
      { date: '2024-03-01', qualifies: true },
    ];
    const res = calculateStreakSeries(series);
    assert.strictEqual(res.maxStreak, 3);
    assert.strictEqual(res.maxStreakStart, '2024-02-28');
    assert.strictEqual(res.maxStreakEnd, '2024-03-01');
  });

  it('Single green day = 1', () => {
    const series = [{ date: '2026-03-15', qualifies: true }];
    const res = calculateStreakSeries(series);
    assert.strictEqual(res.maxStreak, 1);
    assert.strictEqual(res.currentStreak, 1);
  });

  it('No green days = 0', () => {
    const series = [
      { date: '2026-03-15', qualifies: false },
      { date: '2026-03-16', qualifies: false },
    ];
    const res = calculateStreakSeries(series);
    assert.strictEqual(res.maxStreak, 0);
    assert.strictEqual(res.currentStreak, 0);
    assert.strictEqual(res.maxStreakStart, null);
    assert.strictEqual(res.maxStreakEnd, null);
  });
});

describe('Analytics Engine - Habit-Free Streaks Independence (Phase 2.5 & 2.6)', () => {
  const habits = [
    { id: 'h1', name: 'Smoking' },
    { id: 'h2', name: 'Fap' },
  ];

  it('Smoking does not affect Fap-free streak', () => {
    const records = [
      { date: '2026-04-01', habits: { h1: 2, h2: 0 } },
      { date: '2026-04-02', habits: { h1: 1, h2: 0 } },
      { date: '2026-04-03', habits: { h1: 0, h2: 0 } },
      { date: '2026-04-04', habits: { h1: 0, h2: 1 } },
      { date: '2026-04-05', habits: { h1: 0, h2: 0 } },
    ];

    const result = computeAnalytics(habits, records);
    assert.strictEqual(result.overview.greenDays, 2);
    assert.strictEqual(result.overview.maxGreenStreak, 1);

    // Fap-free: April 1, 2, 3 are zero Fap -> streak 3!
    assert.strictEqual(result.habits['h2'].maxFreeStreak, 3);
    assert.strictEqual(result.habits['h2'].maxFreeStreakStart, '2026-04-01');
    assert.strictEqual(result.habits['h2'].maxFreeStreakEnd, '2026-04-03');
  });

  it('Fap does not affect Smoke-free streak', () => {
    const records = [
      { date: '2026-04-01', habits: { h1: 0, h2: 2 } },
      { date: '2026-04-02', habits: { h1: 0, h2: 1 } },
      { date: '2026-04-03', habits: { h1: 0, h2: 0 } },
      { date: '2026-04-04', habits: { h1: 1, h2: 0 } },
      { date: '2026-04-05', habits: { h1: 0, h2: 0 } },
    ];

    const result = computeAnalytics(habits, records);
    // Smoke-free: April 1, 2, 3 are zero Smoking -> streak 3!
    assert.strictEqual(result.habits['h1'].maxFreeStreak, 3);
    assert.strictEqual(result.habits['h1'].maxFreeStreakStart, '2026-04-01');
    assert.strictEqual(result.habits['h1'].maxFreeStreakEnd, '2026-04-03');
  });
});

describe('Analytics Engine - Data Quality & Missing Dates', () => {
  const habits = [
    { id: 'h1', name: 'Smoking' },
    { id: 'h2', name: 'Fap' },
  ];

  it('Detects missing dates without filling zero', () => {
    const records = [
      { date: '2026-06-01', habits: { h1: 0, h2: 0 } },
      { date: '2026-06-02', habits: { h1: 0, h2: 0 } },
      // June 3 & 4 missing!
      { date: '2026-06-05', habits: { h1: 0, h2: 0 } },
    ];

    const result = computeAnalytics(habits, records, {
      fromDate: '2026-06-01',
      toDate: '2026-06-05',
    });

    assert.strictEqual(result.dataQuality.expectedDays, 5);
    assert.strictEqual(result.dataQuality.recordedDays, 3);
    assert.strictEqual(result.dataQuality.missingDays, 2);
    assert.strictEqual(result.dataQuality.complete, false);

    // Green streak must be 2, not 5!
    assert.strictEqual(result.overview.maxGreenStreak, 2);
    assert.strictEqual(result.overview.currentGreenStreak, 1);
  });
});

describe('Analytics Engine - Historical 2026 Dataset Verification (Phase 8)', () => {
  const artifactPath = 'C:/Users/MRcur/.gemini/antigravity-ide/brain/3b074844-8c46-44be-a218-cde81c07ed4a/.user_uploaded/media_1793422750557.json';

  it('Verifies mathematical reproducibility of 2026 historical records', () => {
    if (!fs.existsSync(artifactPath)) {
      console.warn('Artifact media_1793422750557.json not found on disk; skipping historical verification.');
      return;
    }

    const payload = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    const result = computeAnalytics(payload.habits, payload.days);

    // 1. Total recorded days
    assert.strictEqual(result.dataQuality.recordedDays, 304);

    // 2. Green days (clean zero smoking AND zero fap)
    assert.strictEqual(result.overview.greenDays, 215);
    assert.strictEqual(result.overview.activityDays, 89);

    // 3. Maximum green streak
    assert.strictEqual(result.overview.maxGreenStreak, 34);
    assert.strictEqual(result.overview.maxGreenStreakStart, '2026-03-25');
    assert.strictEqual(result.overview.maxGreenStreakEnd, '2026-04-27');

    // 4. Maximum Fap-free streak
    const fapHabit = result.habits['h2'];
    assert.strictEqual(fapHabit.maxFreeStreak, 35);
    assert.strictEqual(fapHabit.maxFreeStreakStart, '2026-05-01');
    assert.strictEqual(fapHabit.maxFreeStreakEnd, '2026-06-04');

    // 5. Maximum smoke-free streak (within 2026: Jan 1 to May 31 = 151 days)
    const smokeHabit = result.habits['h1'];
    assert.strictEqual(smokeHabit.maxFreeStreak, 151);
    assert.strictEqual(smokeHabit.maxFreeStreakStart, '2026-01-01');
    assert.strictEqual(smokeHabit.maxFreeStreakEnd, '2026-05-31');
  });
});
