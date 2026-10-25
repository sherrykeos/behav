
# BHFile — Canonical Data Interchange Specification (v1)

**Status:** Locked & Authoritative  
**Format Identifier:** `"bhfile"`  
**Format Version:** `1`  
**Canonical File Extension:** `.json`  
**Accepted Import Extensions:** `.json`  
**Default Export Filename:** `Behav-Backup-YYYY-MM-DD.json`  
**JSON Schema:** [`docs/bhfile-v1.schema.json`](./bhfile-v1.schema.json)  
**Reference Example:** [`docs/example-v1.json`](./example-v1.json)

---

## 1. Overview and Purpose

**BHFile** is the canonical, portable, versioned data interchange format for **Behav**, a private, offline-first personal behavior tracker for Android.

The format is designed to be:
1. **Self-Contained & Human-Readable:** A clean, UTF-8 JSON document that can be inspected in ordinary text editors and processed with standard JSON utilities.
2. **Deterministic & Normalized:** Encodes habit definitions, complete daily records, and a calculated summary without relying on device-specific database identifiers or internal database column layouts.
3. **Format-Identified:** Internal document content defines its format, not the file extension. Backups use standard `.json` files containing the `"bhfile"` format identifier; arbitrary JSON without this identifier is rejected. Custom extensions (such as legacy `.bhfile`) are retired and rejected.
4. **Verifiable:** The `summary` section is derived directly from the source daily records. Export recalculates the summary; import independently recalculates and verifies every summary metric. Inconsistent or tampered summaries are rejected.

---

## 2. Canonical Reference Structure

The following is the canonical reference example for BHFile v1:

```json
{
  "format": "bhfile",
  "version": 1,
  "habits": [
    {
      "id": "H1",
      "name": "Smoking",
      "unit": "cigarettes"
    },
    {
      "id": "H2",
      "name": "Masturbation",
      "unit": "occurrences"
    },
    {
      "id": "H3",
      "name": "Alcohol",
      "unit": "ml"
    }
  ],
  "days": [
    {
      "date": "2026-10-20",
      "habits": {
        "H1": 5,
        "H2": 1,
        "H3": 120
      }
    },
    {
      "date": "2026-10-21",
      "habits": {
        "H1": 0,
        "H2": 0,
        "H3": 0
      }
    },
    {
      "date": "2026-10-22",
      "habits": {
        "H1": 0,
        "H2": 0,
        "H3": 0
      }
    },
    {
      "date": "2026-10-23",
      "habits": {
        "H1": 2,
        "H2": 0,
        "H3": 0
      }
    },
    {
      "date": "2026-10-24",
      "habits": {
        "H1": 0,
        "H2": 0,
        "H3": 0
      }
    },
    {
      "date": "2026-10-25",
      "habits": {
        "H1": 0,
        "H2": 0,
        "H3": 0
      }
    }
  ],
  "summary": {
    "totalDays": 6,
    "greenDays": 4,
    "maxStreak": 2,
    "habits": {
      "H1": {
        "total": 7
      },
      "H2": {
        "total": 1
      },
      "H3": {
        "total": 120
      }
    }
  }
}
```

---

## 3. Exact Format & Field Specifications

### 3.1 Root Object

The root of every BHFile v1 document must be a JSON object containing exactly the following 5 fields:

| Field | Type | Required | Description |
|---|---|---|---|
| `format` | `string` | **Yes** | Must equal `"bhfile"`. |
| `version` | `integer` | **Yes** | Must equal `1`. |
| `habits` | `array` | **Yes** | Array of all habits tracked in this file. |
| `days` | `array` | **Yes** | Array of daily recorded calendar entries. |
| `summary` | `object` | **Yes** | Derived summary of the included `days` data. |

#### Prohibited Root Fields
Do not include `createdAt`, `updatedAt`, `exportedAt`, `appVersion`, `appName`, `metadata`, `goals`, `records`, or any other extraneous fields in the canonical v1 root object. Backups containing unauthorized root fields are rejected.

---

### 3.2 `habits` (Habit Definitions)

`habits` is an array defining every habit referenced in the file. An arbitrary number of user-defined habits is supported. Habits are not hardcoded to smoking, masturbation, or alcohol.

Each habit object contains exactly:

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | **Yes** | Stable, unique identifier within the file (e.g. `"H1"`, `"H2"`). |
| `name` | `string` | **Yes** | Human-readable habit name (e.g. `"Smoking"`). May contain spaces. |
| `unit` | `string` | **Yes** | Measurement unit (e.g. `"cigarettes"`, `"occurrences"`, `"ml"`). |

#### Habit Validation Rules
1. **Unique IDs:** Each habit `id` must be unique across the `habits` array.
2. **Stable Reference:** Day records reference habit IDs, not habit names. If a user renames a habit, the `id` remains unchanged.
3. **No Prohibited Habit Fields:** Habit objects must not include internal database columns such as `dailyLimit`, `archivedAt`, or timestamps.

---

### 3.3 `days` (Daily Calendar Records)

`days` is an array of date-based records spanning days, weeks, months, or years.

Each day object contains exactly:

| Field | Type | Required | Description |
|---|---|---|---|
| `date` | `string` | **Yes** | Calendar date in `YYYY-MM-DD` format (ISO 8601 calendar date). |
| `habits` | `object` | **Yes** | Mapping from every defined habit `id` to its numeric quantity for that date. |

#### Day Validation Rules
1. **Calendar Date Format:** `date` must match `^\d{4}-\d{2}-\d{2}$` and represent a real calendar date (e.g. `2026-02-31` is invalid).
2. **Chronological Ordering:** Entries in `days` must be sorted in strictly ascending chronological order: `days[i].date < days[i+1].date`.
3. **Unique Dates:** Duplicate dates in the `days` array are invalid and rejected.
4. **Complete Habit Mapping:** For every date entry, `habits` must include a numeric entry for **every** habit defined in root `habits`, including habits with a quantity of `0`.
5. **No Unknown Habit IDs:** Day entries must not reference habit IDs that are not declared in the root `habits` array.
6. **Non-Negative Quantities:** Quantities must be numbers $\ge 0$. Negative quantities are strictly invalid.
7. **Measurement Type Integrity:**
   - **Discrete Units:** For units representing discrete counts (e.g. `cigarettes`, `occurrences`, `times`, `count`, `cups`, `glasses`, `pills`), quantities must be integers (`Number.isInteger(qty) === true`).
   - **Continuous Units:** For units representing continuous physical dimensions (e.g. `ml`, `minutes`, `hours`, `l`), fractional decimal quantities are permitted.
8. **Never Aggregate Incompatible Units:** Quantities are always isolated per habit ID; incompatible units are never summed or aggregated together.

---

### 3.4 `summary` (Calculated Summary & Integrity Verification)

The `summary` object summarizes the contents of `days`. It is **derived data**, never the primary source of truth.

The summary object contains exactly:

| Field | Type | Required | Description |
|---|---|---|---|
| `totalDays` | `integer` | **Yes** | Total count of entries in the `days` array. |
| `greenDays` | `integer` | **Yes** | Total count of recorded days where every habit quantity equals zero. |
| `maxStreak` | `integer` | **Yes** | Maximum consecutive calendar days that are all green. |
| `habits` | `object` | **Yes** | Mapping from each defined habit ID to an object containing its `total`. |

#### Summary Validation Rules
1. `summary.totalDays` must exactly equal `days.length`.
2. `summary.greenDays` must equal the number of recorded days where all habits have a quantity of 0.
3. `summary.maxStreak` must equal the maximum consecutive green calendar days calculated according to Section 4.
4. `summary.habits` must contain an entry for every habit ID defined in root `habits`, and no unknown IDs.
5. For each habit ID, `total` must equal the exact sum of its quantities across all entries in `days`.
6. **Inconsistent Summaries Rejected:** On import, the application independently recalculates every summary field from `days`. If declared summary values diverge from calculated values, the file is rejected with a clear validation error.

---

## 4. Green-Day and Maximum-Streak Semantics

### 4.1 Green-Day Definition
- A calendar day is **green** if and only if **every habit quantity for that date equals zero**:
  $$\text{isGreen}(d) \iff \forall h \in \text{habits}, \; d.\text{habits}[h.\text{id}] = 0$$
- If even one habit has a positive quantity ($> 0$), that day is **not green**.
- An explicitly recorded day with all zeros is a confirmed green day.
- An absent/unrecorded calendar date is **not** an implicitly recorded green day.

### 4.2 Maximum-Streak Algorithm
`maxStreak` is defined as the maximum number of consecutive **calendar dates** that are all green:

1. **Consecutive Calendar Dates Required:** Consecutive entries in `days` must represent adjacent calendar days (e.g. `2026-10-21` followed by `2026-10-22`).
2. **Missing Dates Break the Streak:** If a calendar date is absent between two recorded dates (e.g. `2026-10-20` and `2026-10-22` with `2026-10-21` omitted), the missing date breaks the continuous streak. Absent dates are never assumed to be green.
3. **Non-Green Days Break the Streak:** Any day with a quantity $> 0$ resets the active green streak to 0.
4. **Zero Green Days:** If there are no green days in the dataset, `maxStreak` is `0`.
5. **Empty Dataset:** If `days` is empty, `totalDays = 0`, `greenDays = 0`, and `maxStreak = 0`.

#### Formal Pseudocode
```ts
function calculateMaxStreak(days: { date: string; isGreen: boolean }[]): number {
  let currentStreak = 0;
  let maxStreak = 0;
  let prevDate: string | null = null;

  for (const day of days) {
    if (day.isGreen) {
      if (prevDate === null) {
        currentStreak = 1;
      } else {
        const nextDate = shiftDayString(prevDate, 1);
        if (nextDate === day.date) {
          currentStreak += 1;
        } else {
          // Missing date(s) between prevDate and day.date breaks streak
          currentStreak = 1;
        }
      }
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
      }
    } else {
      currentStreak = 0;
    }
    prevDate = day.date;
  }

  return maxStreak;
}
```

---

## 5. Import & Validation Pipeline

When an imported file (`.json`) is selected:

```
[Selected File]
      │
      ▼
1. Safely Parse UTF-8 JSON
      │ (Fails if syntax error)
      ▼
2. Root Envelope Verification
      │ format === "bhfile"
      │ version === 1
      │ No prohibited root keys
      ▼
3. Habit Definitions Validation
      │ Unique IDs, non-empty names, valid units
      ▼
4. Days Validation
      │ Chronological order, valid dates, no duplicates
      │ Every habit ID present for every date
      │ Quantities >= 0, discrete units are integers
      ▼
5. Independent Summary Recalculation
      │ totalDays === days.length
      │ greenDays matches zero-consumption days
      │ maxStreak matches consecutive green dates
      │ Every habit total matches sum of quantities
      ▼
6. Restore Preview Display
      │ Displays habit count, date range, total days, green days, max streak
      ▼
7. User Confirmation & Atomic Database Restoration
      │ Safe transaction: zero partial writes on failure
```

---

## 6. Forward Compatibility and Versioning Policy

1. **Current Version:** Version `1`.
2. **Unsupported Versions:** Backups declaring `version > 1` must be rejected with an explicit message: `"Unsupported format version N. Only version 1 is supported."`
3. **Additive Changes:** Future versions (e.g. v2) that introduce new fields or models (such as notes or time-stamped events) will increment the integer `version` and update the schema.
4. **No Silent Field Discarding:** Unknown fields in v1 are strictly rejected during schema validation. The engine never silently drops unknown fields that might contain user data.
