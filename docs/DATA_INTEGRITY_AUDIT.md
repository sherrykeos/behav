# Behav Data Integrity Audit: Analytics, Persistence & State Pipeline

**Audit Date:** 2026-10-31  
**Target Application:** Behav (Offline-First Behavioral Tracker)  
**Stack:** Expo, React Native, TypeScript, Expo Router, Expo SQLite  

---

## 1. Executive Summary

A comprehensive forensic audit of the Behav codebase revealed that the erratic, inconsistent, and mathematically incorrect analytics displayed across the application stem from **four structural root causes**:

1. **Silent Zero-Filling of Missing Dates (The Master Root Cause):** When calculating streaks and green days, the analytics repositories iterated across date ranges and defaulted unrecorded calendar dates to `0`. Any date missing from the database was falsely evaluated as clean/green (`total === 0`).
2. **Dropping Zero-Quantity (Green) Records on Backup Import:** In `BackupRepository.restoreBackup`, day records with `qty === 0` were skipped (`if (qty > 0)`). Consequently, genuine clean/green days were never written to SQLite, leaving the database unable to distinguish between a verified clean day and an unrecorded missing day.
3. **Rejection of Nonnegative (Zero) Values in SQLite Repositories:** `LogEntryRepository.create` and `update` enforced `input.value <= 0 -> throw Error`. SQLite was thus structurally blocked from persisting zero-quantity daily records.
4. **Disjointed & Conflicting Calculation Logic:** Streak and green-day logic was duplicated across `insightRepository.ts`, `bhfile.ts`, `index.tsx` (Home), and `stats.tsx` (Stats) with divergent rules (e.g., home streak truncated at the 1st of the month, habit streak gated on `daily_limit !== null`).

---

## 2. Existing Architecture & Dependency Map

The application data pipeline follows this flow:

```
┌────────────────────────────────────────────────────────┐
│                   SQLite (behav.db)                    │
│   tables: behaviors, log_entries, goals, app_settings   │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│                   Repositories Layer                   │
│   • BehaviorRepository    • LogEntryRepository         │
│   • GoalRepository        • InsightRepository          │
│   • BackupRepository                                   │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│                    BehaviorContext                     │
│   (React Context, State, CRUD, Aggregations, Caches)   │
└──────────────────────────┬─────────────────────────────┘
                           │
        ┌──────────────────┴──────────────────┐
        ▼                                     ▼
┌──────────────────┐                ┌──────────────────┐
│   HomeScreen     │                │   StatsScreen    │
│ (app/(tabs)/     │                │ (app/(tabs)/     │
│   index.tsx)     │                │   stats.tsx)     │
└──────────────────┘                └──────────────────┘
        │                                     │
        ▼                                     ▼
┌──────────────────┐                ┌──────────────────┐
│ BehaviorHomeCard │                │ WeekBarChart     │
└──────────────────┘                └──────────────────┘
```

---

## 3. Inventory of Locations Calculating Statistics

| Location | Function / Component | Metrics Calculated | Defect / Risk |
|---|---|---|---|
| `src/db/repositories/insightRepository.ts:296` | `getHomeDashboardStats` | `greenDaysMonth`, `currentMonthStreak`, `maxAllTimeStreak`, `monthDays` | Falsely marks all unrecorded days as green. Truncates current streak at month boundary. |
| `src/db/repositories/insightRepository.ts:120` | `getBehaviorStats` | 7-day total, 30-day total, peak day, `currentStreakDays` | Ignores streak calculation if `daily_limit` is null. Defaults missing days to 0. |
| `src/db/repositories/insightRepository.ts:516` | `getUnifiedStats` | `greenDaysMonth`, `currentMonthStreak`, `maxAllTimeStreak`, habit `maxStreak`, habit `currentStreak`, time/day distributions | Fills date gaps from `earliestDate` to `anchorDate` with synthetic zeros. |
| `src/db/repositories/insightRepository.ts:437` | `getMultiHabitWeekData` | 7-day habit group values | Defaults missing days to 0 without distinguishing unrecorded. |
| `src/utils/bhfile.ts:63` | `calculateGreenDays` | Total green days in array | Relies on in-memory array rather than database state. |
| `src/utils/bhfile.ts:78` | `calculateMaxStreakFromDays` | Max streak from chronological records | Correct pure algorithm, but fed synthetic zero-filled arrays by repositories. |
| `src/utils/bhfile.ts:167` | `calculateBHFileSummary` | `totalDays`, `greenDays`, `maxStreak`, habit streaks | Independent implementation for export summary. |
| `src/app/(tabs)/index.tsx:257` | `HomeScreen.loadDashboard` | Derived progress gauges (`greenDaysProgress`, `streakProgress`) | Renders stale or month-clipped streaks. |
| `src/app/(tabs)/stats.tsx:107` | `StatsScreen.loadStats` | KPI cards, deep dive metrics | Displays all-time max streak derived from synthetic zero-filled dates. |
| `src/components/behaviors/BehaviorHomeCard.tsx:31` | `BehaviorHomeCard` | `progressPercent` | Ad-hoc limit calculation. |
| `src/db/repositories/backupRepository.ts:673, 714` | `restoreBackup` | `restoredLogs` | Drops zero-quantity records, discarding verified clean days. |

---

## 4. Current Calculation Rules vs. Authoritative Business Rules

### 4.1 Green Day Definition
* **Current Implementation:** Any date where `log_entries` has no records or where the sum of records is 0.
* **Authoritative Rule (Section 2.2):** A day is GREEN only when:
  1. Every tracked habit has a recorded quantity of zero.
  2. The day has a valid daily record.
  * *A day without a record is UNKNOWN, never GREEN.*

### 4.2 Green Days Count
* **Current Implementation:** Number of calendar days up to anchor date where sum of logged records equals 0.
* **Authoritative Rule (Section 2.3):** Number of valid recorded dates where all tracked habits have quantity 0.

### 4.3 Maximum Green Streak
* **Current Implementation:** Longest sequence between `earliestDate` and `today` where sum of logs is 0, assuming all unlogged days are 0.
* **Authoritative Rule (Section 2.4):** Longest sequence of consecutive calendar dates that are all green. A missing date breaks the streak.

### 4.4 Habit-Specific Streaks (Smoking-free / Fap-free)
* **Current Implementation:** In `getBehaviorStats`, streaks were only calculated if `dailyLimit !== null && dailyLimit > 0`. In `getUnifiedStats`, missing dates were assumed 0.
* **Authoritative Rule (Sections 2.5 & 2.6):** Longest sequence of consecutive calendar dates on which that specific habit quantity equals zero, independent of other habits. Missing dates break the streak.

### 4.5 Current Streaks
* **Current Implementation:** Looped backward from device `today` within the current calendar month only.
* **Authoritative Rule (Section 2.7):** Number of consecutive qualifying days ending on the latest valid recorded date, provided the sequence reaches the relevant reference date. Must not pretend unrecorded days are green.

---

## 5. Identified Bugs & Suspicious Logic

1. **`insightRepository.ts:355`:**
   ```ts
   } else if (totalVal === 0) {
     status = 'green';
     greenDaysMonth++;
   }
   ```
   `totalVal` comes from `monthDayMap.get(dateStr) || 0`. If a date is completely untracked, `monthDayMap.get` returns `undefined`, which becomes `0`, falsely awarding a green day.
2. **`insightRepository.ts:412`:**
   ```ts
   while (curDate <= anchorDate) {
     const total = allDayMap.get(curDate) || 0;
     allTimeDailyRecords.push({ date: curDate, isGreen: total === 0 });
     curDate = shiftDayString(curDate, 1);
   }
   ```
   Every unlogged date in the multi-year calendar between `earliestDate` and `anchorDate` was converted into `isGreen: true`.
3. **`insightRepository.ts:374` (Month Boundary Clipping):**
   ```ts
   while (checkDate >= `${yearStr}-${monthStr}-01`) { ... }
   ```
   Current streak calculation artificially terminated at the 1st day of the current month, obliterating continuous streaks that started in prior months.
4. **`backupRepository.ts:673, 714`:**
   ```ts
   for (const [habitId, qty] of Object.entries(day.habits)) {
     if (qty > 0) {
       await this.db.runAsync(...);
     }
   }
   ```
   By dropping `qty === 0`, clean days were lost upon import.
5. **`logEntryRepository.ts:84`:**
   ```ts
   if (typeof input.value !== 'number' || isNaN(input.value) || input.value <= 0) {
     throw new Error('Logged value must be a positive number');
   }
   ```
   Actively prevented entering or persisting zero-quantity records.

---

## 6. Date & Timezone Risks

- **Timezone Drift:** Using `new Date().toISOString()` converts local time to UTC, which can shift calendar dates backward or forward by 1 day depending on local timezone offset (e.g. UTC+5:30).
- **String Date Consistency:** Database records use `occurred_at` timestamps. Inconsistent slicing (`slice(0, 10)` vs local Date parsing) leads to off-by-one errors across month and year boundaries.
- **Calendar Date Arithmetic:** Leap years (e.g. 2024, 2028) and month rollovers require pure calendar arithmetic (`shiftDayString`) rather than adding milliseconds (`86,400,000 ms`), which breaks during daylight saving shifts.

---

## 7. Data Persistence & Synchronization Risks

- **Lack of Date Uniqueness in SQLite:** `log_entries` has no unique constraint on `(behavior_id, date)`. Multiple logs on the same date create multiple rows, while zero-consumption has zero rows.
- **State De-synchronization:** `BehaviorContext` updates `todaySummaries` and `todayEntries` on CRUD operations, but `HomeScreen` and `StatsScreen` maintain detached local states (`dashStats`, `unifiedStats`) loaded asynchronously, causing stale analytics after logs are added or deleted.

---

## 8. Proposed Repair Plan

### Phase A: Build Centralized Analytics Engine (`src/services/analytics/analyticsEngine.ts`)
- Implement pure, strongly-typed, deterministic engine accepting `trackedHabits`, `dailyRecords`, and optional date ranges.
- Explicitly differentiate between `green`, `activity`, and `unknown/missing`.
- Compute global green metrics and per-habit clean metrics with start and end dates.
- Compute current streak strictly anchored to the latest recorded date.

### Phase B: Repair SQLite Schema & Repository Layer
- Add Migration 4:
  - Support nonnegative quantities (`value >= 0`).
  - Add explicit calendar date indexing / daily record constraints.
- Update `LogEntryRepository`: allow `value >= 0`, support recording clean days (`0`) and upserting daily values.
- Update `BackupRepository`: persist `0`-quantity records during import and export.

### Phase C: Unify Analytics Consumption
- Refactor `InsightRepository` to delegate all calculations to `AnalyticsEngine`.
- Update `BehaviorContext` to provide unified analytics methods.
- Update `HomeScreen` and `StatsScreen` to consume the engine output, ensuring instant refresh on mutations.

### Phase D: Automated Test Suite & Historical Verification
- Create automated unit tests covering all edge cases (leap day, year boundaries, missing dates, independent habit streaks).
- Verify against the 2026 historical dataset (`media_1793422750557.json`) to confirm exact mathematical alignment.
