# Behav — Implementation Plan

> **Working agreement:** Implement exactly one phase at a time. After each phase, stop and report results. The owner reviews the code and app before authorizing the next phase. Do not begin the next phase automatically.

## Project rules
- Read `context.md`, `prd.md`, and `Agents.md` before implementation.
- Preserve the requested **Expo SDK 58** target. Check current official Expo compatibility before installing packages. Do not change SDK versions silently.
- Android-first; Expo + React Native + TypeScript + Expo Router + Expo SQLite.
- Local-first and offline-first. No backend, auth, cloud sync, AI, ads, or social features in the MVP.
- Follow the soft design reference: warm cream, soft periwinkle/lavender, muted sage and peach, gentle shadows, rounded surfaces, generous spacing, readable typography.
- No fake data, dead buttons, placeholder functionality, unnecessary dependencies, or broad rewrites.
- The owner is learning: explain important decisions in plain language and keep changes reviewable.
- Protect all existing work and user data. Do not overwrite or delete files without a clear reason.

## How each phase must run
1. Inspect the existing repository and identify relevant files.
2. State a brief scope for the current phase only.
3. Implement that phase directly; do not stop after writing another plan.
4. Run relevant checks and manually verify where the environment allows.
5. Fix issues introduced in the phase.
6. Update this file's progress checklist and record any known limitations.
7. Stop. Report changed files, functionality completed, commands/tests actually run, test results, and remaining issues.
8. Wait for the owner's explicit review and instruction before starting another phase.

Do not implement future-phase functionality early, except small foundations genuinely required for the current phase. If a dependency or requirement is blocked, explain the specific blocker and offer the smallest reasonable option.

---

## Phase 0 — Repository and environment verification

**Goal:** Understand the actual project before changing it.

### Tasks
- [x] Inspect the repository, `package.json`, app routes, assets, and existing documentation.
- [x] Confirm the current Expo SDK and package manager.
- [x] Verify SDK 58 availability and compatibility against current official Expo documentation.
- [x] Identify the available Android testing path: physical phone, emulator, or neither.
- [x] Identify existing work worth preserving and any setup blockers.
- [x] Do not scaffold a second app if a project already exists.

### Acceptance criteria
- [x] The current project structure and SDK are documented.
- [x] Any compatibility blocker is explained clearly.
- [x] No user files are overwritten and no unnecessary dependencies are installed.

**Review gate:** Completed and verified.

## Phase 1 — App foundation and soft design system

**Goal:** Create a stable, launchable app shell with the visual foundation.

### Tasks
- [x] Configure the existing Expo project and Expo Router, compatible with the selected SDK.
- [x] Establish shared design tokens for colors, spacing, typography, radii, borders, and elevation.
- [x] Create reusable, small UI primitives only where they improve consistency.
- [x] Implement the main navigation for Home, Behaviors, History, Insights, and Settings.
- [x] Build a polished Home screen using real empty states, not invented metrics.
- [x] Add a clear quick-log entry point; it may remain nonfunctional until Phase 3, but must be visibly marked as not yet implemented or omitted.
- [x] Support safe areas, keyboard behavior, Android back navigation, and common phone sizes.
- [x] Keep the app readable and usable with system font scaling.

### Acceptance criteria
- [x] App starts without a runtime error in the supported environment.
- [x] Main navigation works.
- [x] The Home screen follows the agreed reference direction and design tokens.
- [x] No fake metrics, dead controls presented as functional, or placeholder cards.
- [x] Type-check/lint checks available in the project pass.

**Review gate:** Stop and wait for owner approval.

## Phase 2 — Data layer and SQLite persistence

**Goal:** Establish reliable local storage before relying on it for user records.

### Tasks
- [x] Install only SDK-compatible dependencies.
- [x] Create a typed SQLite data-access layer separate from UI components.
- [x] Define initial tables for behaviors, log entries, goals (if needed for schema planning), and schema metadata.
- [x] Add schema versioning and safe migrations.
- [x] Define validation and consistent date/time storage.
- [x] Provide typed repository functions for required create/read/update/archive/delete operations.
- [x] Handle initialization, failures, and loading states.

### Acceptance criteria
- [x] Database initializes reliably.
- [x] Create/read/update/delete operations work for test records.
- [x] Records survive app restarts.
- [x] Database errors are visible and handled; they are not silently swallowed.
- [x] Existing user data is not reset or overwritten by schema setup.

**Review gate:** Stop and wait for owner approval.

## Phase 3 — Behavior management and quick logging

**Goal:** Make the app usable for everyday recording.

### Tasks
- [x] Create, edit, archive, and delete behaviors.
- [x] Support behavior name, optional category, measurement type, and optional daily limit.
- [x] Validate forms and show useful errors.
- [x] Log a count or quantity against a behavior with a date/time.
- [x] Support editing and deleting a mistaken entry.
- [x] Add quick logging from Home.
- [x] Calculate today's values and limit progress from actual SQLite data.
- [x] Confirm destructive actions and preserve history when archiving.

### Acceptance criteria
- [x] A behavior can be created and remains after restart.
- [x] Logging multiple entries produces correct totals.
- [x] Editing/deleting entries updates totals correctly.
- [x] Invalid values are rejected with understandable messages.
- [x] Empty and error states work.

**Review gate:** Stop and wait for owner approval.

## Phase 4 — History and record correction

**Goal:** Make past activity understandable and editable.

### Tasks
- [x] Browse/select previous dates.
- [x] Show entries and per-behavior totals for a selected date.
- [x] Support correcting or deleting records.
- [x] Keep date/time semantics consistent and avoid timezone shifts.
- [x] Include useful empty states for dates without records.

### Acceptance criteria
- [x] Correct records appear on the correct dates.
- [x] Editing historical records does not accidentally move their date.
- [x] Daily totals agree with the database.
- [x] Empty dates are handled clearly.

**Review gate:** Stop and wait for owner approval.

## Phase 5 — Goals, streaks, and insights

**Goal:** Provide useful feedback without noisy or misleading gamification.

### Tasks
- [x] Define goal types and their rules explicitly before implementing calculations.
- [x] Support independent goals associated with a behavior where appropriate.
- [x] Implement basic daily, weekly, and monthly totals and trends.
- [x] Implement averages and streaks based on documented goal rules.
- [x] Distinguish missing data from a confirmed missed goal where possible.
- [x] Use simple, legible charts only where they add insight.

### Acceptance criteria
- [x] Calculations are tested against known examples.
- [x] Different goals do not accidentally share streak state.
- [x] Missing records do not produce misleading claims.
- [x] Empty datasets render gracefully.
- [x] Charts use real data and readable labels.

**Review gate:** Stop and wait for owner approval.

## Phase 6 — Canonical JSON Backup & Restore System

**Goal:** Give the owner reliable control over personal data using standard `.json` backup files exclusively.

### Tasks
- [x] Export a complete, versioned backup to standard `.json` (`Behav-Backup-YYYY-MM-DD.json`).
- [x] Use supported Android document and sharing APIs (`public.json` UTI, `application/json` MIME type).
- [x] Single unified "Import Backup" entry point accepting `.json` exclusively; reject custom `.bhfile` extension.
- [x] Remove spreadsheet/CSV UI cards and actions per owner directive while preserving backend CSV export helpers.
- [x] Validate backup format identifier (`bhfile`), version (`1`), habit definitions, days, and summaries before restore.
- [x] Preview restore contents and require confirmation before replace-all restore.
- [x] Atomic SQLite restore with zero partial writes on failure.
- [x] Report successful or failed operations truthfully.
- [x] Document that a backup kept only on the phone does not protect against phone loss.

### Acceptance criteria
- [x] A `.json` export can be restored without losing supported fields or relationships.
- [x] Only standard `.json` files are accepted; `.bhfile` and non-JSON files are rejected safely.
- [x] Arbitrary JSON, malformed syntax, and inconsistent summaries are rejected without corrupting data.
- [x] Restore outcomes and preview summaries are clearly reported.
- [x] Exported files are verified before success is displayed.

**Review gate:** Stop and wait for owner approval.

## Phase 7 — Historical CSV import (2024–2026)

**Goal:** Bring the owner's old spreadsheet records into Behav accurately.

### Tasks
- [ ] Inspect the actual CSV files and document their structure before writing the importer.
- [ ] Identify date layout, behavior columns, blanks, special values, and encoding.
- [ ] Provide a preview of detected dates, columns, and sample values before committing.
- [ ] Ask the owner to clarify ambiguous notation such as `15 (3) [1]`; do not guess its meaning.
- [ ] Preserve raw values or flag unresolved cells rather than silently transforming them.
- [ ] Validate rows, dates, and values.
- [ ] Prevent duplicate imports where possible and define the duplicate key.
- [ ] Report imported, skipped, and invalid rows with reasons.
- [ ] Test using copies of the source files and compare expected counts/totals.

### Acceptance criteria
- [ ] Import preview matches the source file.
- [ ] Ambiguous values are resolved with owner input or preserved without reinterpretation.
- [ ] Re-importing the same file does not silently duplicate records.
- [ ] A clear import report is shown.
- [ ] Imported data is spot-checked against source records.

**Review gate:** Stop and wait for owner approval.

## Phase 8 — Quality pass and Android release

**Goal:** Verify the integrated MVP and prepare an installable build.

### Tasks
- [ ] Test the main flow end to end on Android where possible.
- [ ] Test offline operation and persistence after app restarts.
- [ ] Test behavior creation, logging, editing, archiving, history, goals, export, restore, and import.
- [ ] Test empty states, invalid input, cancellation, and failure states.
- [ ] Check small screens, safe areas, keyboard overlap, contrast, and accessibility labels.
- [ ] Run configured type-check, lint, and test commands.
- [ ] Resolve high-impact bugs before release.
- [ ] Build an Android APK using a compatible build path and document installation steps.
- [ ] Verify the build artifact exists; do not claim a device install was tested unless it was.

### Acceptance criteria
- [ ] No known data-loss bug remains in core flows.
- [ ] Core functions pass their documented checks.
- [ ] APK build result and limitations are reported accurately.
- [ ] Known issues and next steps are documented.

**Review gate:** Owner reviews and accepts the MVP.

---

## Progress log

Update this section after each phase. Keep entries factual and concise.

| Phase | Status | Notes |
|---|---|---|
| 0 — Environment verification | Completed | Expo SDK 58.0.0, npm, Android target verified. |
| 1 — App foundation and design system | Completed | Design tokens, primitives, 5-tab navigation & Home screen implemented; type-check and bundle export passing. |
| 2 — SQLite persistence | Completed | Versioned migrations, schema (behaviors, log_entries, goals), typed repositories, validation, and integration tests passing. |
| 3 — Behaviors and quick logging | Completed | Full behavior CRUD, active/archived management, 1-tap card logging, QuickLogModal, recent entries review and correction with SQLite persistence. |
| 4 — History | Completed | Date navigation (prev/next/14-day strip), day summaries, grouped behavior records, retroactive logging, and record editing/deletion with zero timezone drift. |
| 5 — Goals and insights | Completed | Independent behavior goals, 7-day & 30-day metrics, honest bad-habit adherence streaks, and proportional 7-day bar chart with verified SQLite test suite. |
| 6 — Backup and CSV export | Completed | Standard JSON backup system (.json exclusively), retired .bhfile, unified Import Backup action, measurement integrity definitions, strict duplicate & schema validation, atomic transaction restoration, and RFC 4180 CSV export. |
| 7 — Historical CSV import | Deferred | Deferred per owner strategy; personal historical data will be converted to BHFile v1 format externally. |
| 8 — Quality and Android release | Not started | |

## Required end-of-phase report

At the end of each phase, report:
1. **Implemented:** what now works.
2. **Files changed:** list key files.
3. **Verification:** exact commands/tests run and their outcomes.
4. **Not verified:** anything that could not be tested.
5. **Known issues:** any remaining problems.
6. **Review request:** ask the owner to review this phase and explicitly authorize the next phase.

**Do not start another phase until the owner approves the current phase.**

