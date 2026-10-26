# Behav — Canonical Backup & Restore Specification (v1)

## 1. Overview & Principles

Behav stores all tracking records locally in a private SQLite database. To ensure complete user data ownership, portability, and independence from SQLite's internal column naming or schema evolution, Behav defines this **Canonical Backup Specification (v1)**.

### Design Principles:
1. **Decoupled from SQLite Internals:** The backup uses semantic domain properties (`dailyLimit`, `occurredAt`, `isActive`) with standard JSON primitives rather than raw SQLite column names (`daily_limit`, `is_active: 1|0`).
2. **Deterministic & Portable:** Backups are self-contained. Any system capable of reading and writing JSON can parse, validate, or generate valid Behav backups.
3. **Tolerant Normalization:** While the canonical format uses camelCase, the Behav import engine gracefully ingests both canonical camelCase and legacy snake_case attributes.
4. **Resilient Linking:** Log entries can reference behaviors either by explicit `behaviorId` (UUID) or by `behaviorName` (case-insensitive string match), allowing external converters to easily link logs to habits.
5. **No Data Loss:** Missing timestamps default to noon local time; missing IDs are auto-generated; notes and metadata are preserved verbatim.

---

## 2. JSON Structure & Schema Definition

```json
{
  "$schema": "https://behav.app/schemas/v1.json",
  "format": "behav-backup",
  "schemaVersion": 1,
  "exportedAt": "2026-10-25T20:30:00.000+05:30",
  "app": {
    "name": "Behav",
    "version": "1.0.0"
  },
  "data": {
    "behaviors": [],
    "logEntries": [],
    "goals": []
  }
}
```

### 2.1 Root Envelope

| Field | Type | Required | Description |
|---|---|---|---|
| `format` | `string` | **Yes** | Must be `"behav-backup"` (or `app: "behav"` in legacy format). |
| `schemaVersion` | `integer` | **Yes** | Current version is `1`. Backups with versions > 1 are rejected. |
| `exportedAt` | `string` | **Yes** | ISO 8601 timestamp with local timezone offset when exported. |
| `app` | `object` | No | Application descriptor (`{ "name": "Behav", "version": "1.0.0" }`). |
| `data` | `object` | **Yes** | Container for all domain records. |

---

### 2.2 `data.behaviors[]` (Tracked Habits)

Represents a distinct tracked behavior or habit (e.g., Smoking, Coffee, Late Screen Time).

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `id` | `string` | No | Auto-generated UUID | Unique identifier for the behavior. |
| `name` | `string` | **Yes** | — | Unique habit name (e.g. `"Smoking"`). Case-insensitive trimmed. |
| `description` | `string \| null` | No | `null` | Optional description or personal rationale. |
| `category` | `string \| null` | No | `null` | Optional category grouping (e.g. `"Health"`, `"Focus"`). |
| `unit` | `string` | No | `"times"` | Tracking unit (e.g. `"cigarettes"`, `"cups"`, `"minutes"`). |
| `dailyLimit` | `number \| null` | No | `null` | Target maximum per day. `null` if unconstrained. |
| `createdAt` | `string` | No | Current timestamp | ISO 8601 creation timestamp. |
| `archivedAt` | `string \| null` | No | `null` | ISO 8601 archive timestamp. `null` for active habits. |

*Tolerated aliases: `daily_limit`, `created_at`, `archived_at`.*

---

### 2.3 `data.logEntries[]` (Recorded Activity)

Represents an individual recorded occurrence or quantity for a behavior on a specific date/time.

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `id` | `string` | No | Auto-generated UUID | Unique identifier for this log entry. |
| `behaviorId` | `string` | *See note* | — | The UUID of the associated behavior. |
| `behaviorName`| `string` | *See note* | — | Alternative: The name of the behavior. If `behaviorId` is omitted, the engine automatically matches by name. |
| `value` | `number` | **Yes** | — | Quantity logged. Must be a positive number (e.g. `1`, `3.5`). |
| `occurredAt` | `string` | **Yes** | — | Local date/time (e.g. `2024-03-15T14:30:00.000+05:30`) or simple date string `YYYY-MM-DD` (auto-expanded to midday local time). |
| `note` | `string \| null` | No | `null` | Optional context, notation, or memo. |
| `createdAt` | `string` | No | `occurredAt` | ISO 8601 timestamp when entered. |
| `updatedAt` | `string` | No | `createdAt` | ISO 8601 timestamp when last edited. |

*Note: At least one of `behaviorId` or `behaviorName` must be provided.*
*Tolerated aliases: `behavior_id`, `behavior_name`, `occurred_at`, `created_at`, `updated_at`, `log_entries`.*

---

### 2.4 `data.goals[]` (Habit Targets & Commitments)

Represents a personal target linked to a behavior.

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `id` | `string` | No | Auto-generated UUID | Unique identifier for the goal. |
| `title` | `string` | **Yes** | — | Goal title (e.g. `"Under 5 cigarettes/day"`). |
| `behaviorId` | `string \| null` | No | `null` | Associated behavior UUID. |
| `goalType` | `string` | No | `"daily_limit"` | One of: `"daily_limit"`, `"streak"`, `"frequency"`. |
| `targetValue`| `number \| null` | No | `null` | Target limit or streak count. |
| `startDate` | `string` | **Yes** | — | Start date (`YYYY-MM-DD`). |
| `endDate` | `string \| null` | No | `null` | Optional target completion date (`YYYY-MM-DD`). |
| `isActive` | `boolean` | No | `true` | Whether goal is actively being pursued. |
| `createdAt` | `string` | No | Current timestamp | ISO 8601 creation timestamp. |

*Tolerated aliases: `behavior_id`, `goal_type`, `target_value`, `start_date`, `end_date`, `is_active` (0 or 1).*

---

## 3. Concrete Example Payload

```json
{
  "$schema": "https://behav.app/schemas/v1.json",
  "format": "behav-backup",
  "schemaVersion": 1,
  "exportedAt": "2026-10-25T20:30:00.000+05:30",
  "app": {
    "name": "Behav",
    "version": "1.0.0"
  },
  "data": {
    "behaviors": [
      {
        "id": "b-smoking-001",
        "name": "Smoking",
        "description": "Daily cigarettes tracking",
        "category": "Health",
        "unit": "cigarettes",
        "dailyLimit": 4,
        "createdAt": "2024-01-01T00:00:00.000+05:30",
        "archivedAt": null
      },
      {
        "id": "b-coffee-002",
        "name": "Coffee",
        "description": "Espresso and pour-over cups",
        "category": "Lifestyle",
        "unit": "cups",
        "dailyLimit": 2,
        "createdAt": "2024-01-01T00:00:00.000+05:30",
        "archivedAt": null
      }
    ],
    "logEntries": [
      {
        "id": "l-20240101-01",
        "behaviorId": "b-smoking-001",
        "value": 1,
        "occurredAt": "2024-01-01T09:15:00.000+05:30",
        "note": "Morning break",
        "createdAt": "2024-01-01T09:15:00.000+05:30",
        "updatedAt": "2024-01-01T09:15:00.000+05:30"
      },
      {
        "id": "l-20240101-02",
        "behaviorId": "b-smoking-001",
        "value": 2,
        "occurredAt": "2024-01-01T14:30:00.000+05:30",
        "note": "After lunch (2)",
        "createdAt": "2024-01-01T14:30:00.000+05:30",
        "updatedAt": "2024-01-01T14:30:00.000+05:30"
      },
      {
        "id": "l-20240101-03",
        "behaviorId": "b-coffee-002",
        "value": 1,
        "occurredAt": "2024-01-01T10:00:00.000+05:30",
        "note": null,
        "createdAt": "2024-01-01T10:00:00.000+05:30",
        "updatedAt": "2024-01-01T10:00:00.000+05:30"
      }
    ],
    "goals": [
      {
        "id": "g-smoking-001",
        "title": "Stay under 4 cigarettes daily",
        "behaviorId": "b-smoking-001",
        "goalType": "daily_limit",
        "targetValue": 4,
        "startDate": "2024-01-01",
        "endDate": null,
        "isActive": true,
        "createdAt": "2024-01-01T00:00:00.000+05:30"
      }
    ]
  }
}
```

---

## 4. Restore Modes & Execution Semantics

When restoring from this JSON backup file, Behav supports two explicit operations:

### 4.1 Merge Mode (Safe & Non-Destructive)
- **Primary-Key Idempotency:** Records with identical IDs are upserted (`INSERT OR REPLACE INTO ...`), preserving existing records that are not in the backup.
- **Behavior Name Matching:** If a log entry in the backup references a behavior name that already exists in the local database with a different ID, it binds to the existing behavior to avoid duplicate habit entries.
- **Zero Accidental Deletions:** No existing logs, habits, or goals are deleted.

### 4.2 Replace Mode (Destructive with Full Reconstruction)
- **Atomic Transaction:** The database is wiped (`DELETE FROM log_entries; DELETE FROM goals; DELETE FROM behaviors;`) and completely repopulated in a single SQLite transaction. If any step fails, the entire transaction rolls back safely.
- **Full State Reconstruction:** Once restored, Behav's context automatically triggers recalculation of:
  1. Home Screen daily counters and limit status.
  2. History calendar strip, day totals, and grouped logs.
  3. Insights 7-day and 30-day totals, daily averages, and honest adherence streaks.

---

## 5. Guide for Converting External Spreadsheets into Behav JSON

When writing a Python, Node.js, or spreadsheet script to convert legacy data into Behav:
1. Define the unique habit names in `data.behaviors` (e.g. `"Smoking"`, `"Alcohol"`).
2. For each historical row/cell:
   - Create a log object with `behaviorName: "Habit Name"`.
   - Set `occurredAt: "YYYY-MM-DDTHH:mm:ss.sss+05:30"` or simple `"YYYY-MM-DD"`.
   - Set `value: <number>`.
   - Put any raw notation, sub-frequencies, or comments into `note: "raw notation (y) [z]"`.
3. Wrap in the root envelope with `format: "behav-backup", schemaVersion: 1`.
4. Import into Behav using **Settings → Restore from Backup**.
