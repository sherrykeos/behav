# Behav — Engineering Implementation Plan

## Executive Summary
**Behav** is an offline-first, privacy-focused mobile application for tracking personal behaviors, setting independent goals, maintaining verifiable streaks, understanding time-based patterns, and measuring behavioral change without judgment.

---

## 1. Architectural Strategy & Repository Layout

We establish a monorepo with strict separation of concerns:
- **`packages/domain`**: Zero-dependency pure TypeScript library. Contains domain entities, validation schemas, repository interfaces, the independent goal and streak calculation engine, deterministic analytics engine, daily aggregate engine, and evidence-based insight generators.
- **`apps/api`**: Production-grade modular monolith built with Fastify, TypeScript, Prisma ORM, and PostgreSQL. Features real multi-user authentication (salted hashing, JWT access tokens, refresh token rotation, session revocation, email verification, password reset), rate limiting, security headers, and strict request-level user isolation.
- **`apps/mobile`**: React Native & Expo application using Expo Router with 27 functional screens, a custom design system following the sage/mint dark aesthetic, an isomorphic SQLite repository layer with per-user data isolation, and offline-first capabilities.

```text
behav/
├── package.json                   # Monorepo root workspaces
├── packages/
│   └── domain/                    # Pure domain models, engines, interfaces, validators
│       ├── src/
│       │   ├── entities/
│       │   ├── engines/           # Streak, Analytics, Aggregate engines
│       │   ├── interfaces/        # Repository contracts
│       │   └── validators/        # Zod validation schemas
│       └── tests/                 # Comprehensive unit tests
├── apps/
│   ├── api/                       # Fastify backend modular monolith
│   │   ├── prisma/schema.prisma   # PostgreSQL schema with full referential integrity
│   │   ├── src/
│   │   │   ├── plugins/           # Auth, rate-limit, security, user-context
│   │   │   ├── routes/            # Auth, behaviors, entries, goals, reviews, analytics
│   │   │   ├── services/          # TokenService, PasswordService, EmailService
│   │   │   └── server.ts
│   │   └── tests/                 # Security tests (cross-user access, tampered IDs)
│   └── mobile/                    # Expo / React Native client
│       ├── app/                   # Expo Router (27 functional screens)
│       ├── src/
│       │   ├── theme/             # Design tokens (near-black, sage/mint, dark panels)
│       │   ├── components/        # Accessible, responsive design system components
│       │   ├── database/          # SQLite schema, migrations, user isolation
│       │   ├── repositories/      # SQLite implementations of domain interfaces
│       │   ├── context/           # AuthContext, DatabaseContext, ThemeContext
│       │   └── services/          # API client, offline sync buffer, data export
│       └── tests/                 # Integration tests (CRUD, isolation, migrations)
└── docs/                          # Architecture, security, setup documentation
```

---

## 2. Implementation Phases

### Phase 1: Foundation & Domain Layer (`packages/domain`)
- Define TypeScript entities: `User`, `Behavior`, `BehaviorEntry`, `Goal`, `GoalVersion`, `DailyReview`, `StreakState`, `DailyAggregate`, `Insight`, `UserSettings`.
- Implement Zod validation schemas for all entities and inputs.
- Implement Repository Interfaces (`IBehaviorRepository`, `IEntryRepository`, etc.).
- Build `StreakEngine`:
  - Independent streak tracking per goal.
  - Distinguish pending/unconfirmed days from confirmed zero activity.
  - Historical recalculation algorithm upon backdated logs or edits.
  - Immutable goal versioning evaluation.
- Build `AggregateEngine`:
  - Deterministic daily quantity and count calculations from source entries.
- Build `AnalyticsEngine`:
  - Daily/weekly/monthly statistics, baseline-zero safe percentage changes.
  - Hour-of-day, day-of-week, weekday vs weekend distributions.
  - Moving averages (7d, 30d), trend slopes, recovery time after lapses.
  - Minimum sample-size requirements before generating insights.
- Write unit test suite (100% engine coverage).

### Phase 2: Database Schema & Backend API (`apps/api`)
- Prisma schema with PostgreSQL models, UUID primary keys, composite indices, foreign keys with cascade/restrict rules, and user ownership constraints.
- Fastify application with CORS, Helmet, Rate Limiter.
- Authentication module:
  - Scrypt/Argon2 password hashing with cryptographically secure salts.
  - Access token (short-lived) + Refresh token (hashed in DB) rotation.
  - Session revocation and account deletion cascade.
  - Email verification and password reset token workflows.
- User isolation middleware:
  - Reject access to any resource owned by another user.
  - Validate that `behavior_id` belongs to `req.user.id` on entry creation.
- Security and isolation automated tests.

### Phase 3: Mobile Data Layer & SQLite Repositories (`apps/mobile/src/database`)
- Local SQLite database manager with migrations.
- User-partitioned storage: every query enforced with `currentUserId`.
- SQLite implementations of repository interfaces.
- Transaction handling for multi-record operations.
- Account switching and local-data isolation tests.

### Phase 4: Mobile Design System & UI Components (`apps/mobile/src/theme`, `components`)
- Theme tokens:
  - Backgrounds: `#0B0F0D` (base), `#121714` (surface), `#1A221E` (surface elevated), `#232D28` (borders).
  - Accents: Sage green (`#4ADE80`, `#6EE7B7`, `#34D399`), Coral (`#F87171`), Amber (`#FBBF24`), Blue (`#60A5FA`).
  - Typography: Clean modern sans-serif with editorial accents.
- Reusable UI Components:
  - Metric cards, interactive charts, calendar heatmaps, quick log numeric selectors, streak badges, tag chips, dialogs, alerts.

### Phase 5: Navigation & All 27 Functional Screens (`apps/mobile/app`)
- Authentication (1-6): Welcome, Register, Login, Verify Email, Reset Password, Auth Errors & Recovery.
- Main App (7-11): Dashboard, All Behaviors, Create Behavior, Edit Behavior, Quick Log.
- Detail & History (12-16): Behavior Detail, Entry History, Edit Entry, Goal Management, Independent Streak View.
- Review & Insights (17-21): Calendar & Daily Review, Statistics, Time-Based Insights, Advanced Analytics, Insights Feed.
- Settings & Privacy (22-27): Profile, Appearance, Privacy, Data Export (JSON/CSV), Data Deletion, Help & About.

### Phase 6: Automated Testing & Verification
- Unit tests for domain engines.
- Integration tests for SQLite repositories.
- Security tests for backend API user isolation.
- Verification of test suites and builds.
