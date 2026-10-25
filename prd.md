# Behav — Product Requirements Document (MVP)

## 1. Summary
Behav is an offline-first personal behavior tracker for Android. It lets one user record behaviors, review history, understand trends, manage personal goals, and protect their data through export, backup, and historical import.

## 2. Goals
- Make daily logging fast and low-friction.
- Show useful history and simple statistics.
- Support optional daily limits and independent goals.
- Persist records reliably on-device.
- Support export, restore, and import of historical CSV data.
- Deliver a calm, soft, polished interface inspired by the supplied image.

## 3. Non-goals
No login, backend, cloud sync, AI, social features, advertising, subscription system, or complex gamification in the MVP.

## 4. Target platform and stack
- Android-first.
- Expo + React Native + TypeScript.
- Expo SDK **58** (owner-requested target; confirm official package compatibility during setup).
- Expo Router.
- Expo SQLite.
- Expo-supported document/file APIs for importing and exporting data.

## 5. Main navigation
Use a small bottom navigation structure. Suggested destinations:
1. **Home** — today at a glance and quick logging.
2. **Behaviors** — manage tracked behaviors.
3. **History** — calendar/date-based record review.
4. **Insights** — simple statistics and goals.
5. **Settings** — data export/import, backup/restore, and app preferences.

A prominent add/log action may be used if it improves the experience, but avoid cluttering the navigation.

## 6. Functional requirements

### FR-1: Home
- Show the current date and a concise daily summary.
- Show tracked behaviors with today's values and optional limit/progress.
- Allow a user to log a behavior directly from the home screen.
- Show goal progress in a quiet, understandable way.
- Include useful empty states for a new user.

### FR-2: Behavior management
- Create, edit, archive, and delete a behavior.
- Store a name and optional description/category.
- Support a simple measurement mode, such as count or quantity.
- Support an optional daily limit/target.
- Prevent accidental deletion and clarify what happens to associated records.
- Archived behaviors should remain available in historical records.

### FR-3: Logging
- Add a log entry with behavior, date/time, and value/quantity.
- Make common logging actions fast.
- Support editing and deleting a mistaken entry.
- Allow reviewing logs by date.
- Validate quantities and prevent invalid values.
- Define aggregation clearly: totals should not accidentally count the same data twice.

### FR-4: History
- Navigate to a previous date.
- Show the day's entries and totals per behavior.
- Edit or delete existing entries.
- Preserve historical dates when records are edited.
- Provide empty states when no entries exist.

### FR-5: Insights and goals
- Show useful daily/weekly/monthly totals where data exists.
- Show basic trends and averages.
- Support independent user-defined goals, including a target type appropriate to the goal (for example, a streak goal or a consumption-limit goal).
- Calculate streaks from explicit goal rules, not from assumptions.
- Avoid presenting a streak as broken when data is simply missing unless the goal's rules establish that.
- Keep charts limited, legible, and useful.

### FR-6: Local persistence
- Store records in SQLite.
- Records must remain after closing and reopening the app.
- Include schema versioning/migrations as the schema evolves.
- Keep the app usable without an internet connection.

### FR-7: Backup and restore
- Export a complete JSON backup containing the data needed to reconstruct the user's records and settings.
- Offer CSV export for spreadsheet use where appropriate.
- Allow the user to choose a destination using supported Android document APIs.
- Restore from a selected backup with validation and a clear preview.
- Do not silently overwrite existing data; explain merge/replace behavior and ask for confirmation.
- Show a clear success or failure message and, where feasible, the last successful export time.
- Use safe file-writing practices where supported.
- Explain that a file stored only on the same phone can still be lost if the phone or file is lost; recommend copying important backups elsewhere.
- Manual backup/export is acceptable for MVP. Do not promise automatic background backup without implementing and testing it.

### FR-8: Historical CSV import
- Support importing the user's existing year-based CSV files after inspecting their actual structure.
- Preview detected columns, dates, and sample values before committing.
- Preserve raw information when a cell's meaning is ambiguous.
- Do not guess what parentheses, brackets, or other unexplained notation means.
- Validate rows, prevent duplicates where possible, and report imported/skipped rows.
- Test imports with copies of the source files and verify totals after import.

### FR-9: Settings
- Provide access to export, restore, and CSV import.
- Include a simple app/data information section.
- Keep settings minimal; avoid adding preferences without a clear purpose.

## 7. Design requirements
- Warm cream / ivory base.
- Soft lavender, peach, sage, and periwinkle accents.
- Rounded cards and buttons with restrained shadows.
- Airy spacing and clear typography.
- Subtle decorative gradients or sky imagery only where they support hierarchy.
- Friendly, calm, non-judgmental copy.
- Strong text contrast and comfortable Android touch targets.
- Responsive layouts for common phone sizes.
- Avoid dense data-heavy screens, harsh dark dashboards, neon colors, and overuse of glassmorphism.

## 8. Data model — initial proposal
The implementation should refine this model before committing migrations.

### Behavior
- `id`
- `name`
- `description` (optional)
- `category` (optional)
- `unit` or measurement mode
- `dailyLimit` (optional)
- `createdAt`
- `archivedAt` (optional)

### LogEntry
- `id`
- `behaviorId`
- `value`
- `occurredAt`
- `note` (optional)
- `createdAt`
- `updatedAt`

### Goal
- `id`
- `title`
- `behaviorId` (optional, depending on goal type)
- `goalType`
- `targetValue` (optional, based on type)
- `startDate`
- `endDate` (optional)
- `isActive`
- `createdAt`

### App metadata
- schema version and import/backup metadata as needed.
- Avoid storing sensitive details that are not needed for app functionality.

## 9. Acceptance criteria
The MVP is ready for personal use when:
1. It launches on the owner's Android phone.
2. A user can create, edit, archive, and remove behaviors safely.
3. A user can log, edit, and delete entries.
4. Entries persist across app restarts and work offline.
5. History displays the correct dates and totals.
6. Statistics and goal calculations are consistent with documented rules.
7. A JSON backup can be exported and restored successfully.
8. CSV export works for supported data.
9. Historical CSV import has a preview, preserves source values, handles duplicates/errors, and reports its outcome.
10. Core screens follow the agreed soft visual direction and remain readable.
11. Relevant checks pass, and remaining limitations are documented.

## 10. Delivery plan
1. Verify local environment and create the Expo SDK 58 project.
2. Confirm app navigation and implement the visual foundation.
3. Build behavior management and quick logging.
4. Add SQLite persistence and data validation.
5. Build history.
6. Add goals and insights.
7. Implement backup, restore, and CSV export/import.
8. Test data integrity, offline behavior, Android layouts, and APK installation.

## 11. Open decisions
Resolve these with the owner when needed; do not silently assume:
- Exact semantics of the historical CSV notation.
- Which measurement units are needed beyond simple counts/quantities.
- Whether restore should offer merge, replace, or both (recommended: offer both with clear confirmation).
- Exact rules for each goal type and streak.
