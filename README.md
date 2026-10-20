# Behav - Habbit tracker App

> **Measure. Understand. Change.**

Behav is a professional, privacy-conscious mobile application built for tracking personal behaviors, setting independent goal streaks, understanding time-based patterns, and measuring behavioral change without judgment or shame.

---

## 1. System Architecture

Behav is structured as a modular TypeScript monorepo with strict separation of presentation, domain logic, persistence, and backend services:

```text
behav/
├── package.json                   # Root monorepo workspace configuration
├── packages/
│   └── domain/                    # Zero-dependency domain models, engines, and validators
│       ├── src/
│       │   ├── entities/          # TypeScript domain entities (User, Behavior, Entry, Goal, etc.)
│       │   ├── engines/           # StreakEngine, AnalyticsEngine, AggregateEngine
│       │   ├── interfaces/        # Repository interfaces (IBehaviorRepository, etc.)
│       │   └── validators/        # Zod validation schemas
│       └── tests/                 # 100% test coverage of domain calculation rules
├── apps/
│   ├── api/                       # Fastify backend modular monolith
│   │   ├── prisma/schema.prisma   # PostgreSQL schema with full referential integrity
│   │   ├── src/
│   │   │   ├── plugins/           # AuthPlugin, CORS, Helmet, Rate Limiter
│   │   │   ├── routes/            # Auth, behaviors, entries, goals, reviews, analytics
│   │   │   ├── services/          # PasswordService (scrypt), TokenService (JWT/rotation)
│   │   │   └── app.ts             # Modular monolith application builder
│   │   └── tests/                 # Automated cross-user security isolation tests
│   └── mobile/                    # React Native & Expo mobile application
│       ├── app/                   # Expo Router (All 27 functional screens)
│       │   ├── (auth)/            # Welcome, Register, Login, Verify, Reset, Error
│       │   ├── (tabs)/            # Dashboard, Behaviors, Calendar, Analytics, Settings
│       │   ├── behavior/          # Create, Detail, Edit, Quick Log, History, Goals, Streaks
│       │   └── settings/          # Profile, Appearance, Privacy, Export, Deletion, Help
│       ├── src/
│       │   ├── theme/             # Design tokens: palette, typography, radii, spacing
│       │   ├── components/        # Accessible design system components
│       │   ├── database/          # SQLite schema, migrations, user isolation
│       │   ├── repositories/      # SQLite implementations of domain interfaces
│       │   └── context/           # AuthContext, DatabaseContext
│       └── tests/                 # SQLite persistence & local account switching isolation tests
└── docs/                          # Architecture, security, and setup documentation
```

---

## 2. Key Features & Business Rules

### Core Behavior Tracking
- **Measurement Types**: Discrete event counts (e.g. cigarettes, meditation sessions) and numeric quantities (e.g. ml, grams, minutes).
- **Independent Goals**: Maintain distinct streaks for `ABSTINENCE` (zero activity), `REDUCTION` (upper volume limit), and `FREQUENCY` (target occurrences).
- **Goal Versioning**: Goal adjustments preserve historical versioning (`startsAt`, `endsAt`). Editing a goal never silently re-evaluates past completed periods.

### Streak Engine
- **Unconfirmed Days**: An absence of logs never defaults to confirmed zero. Unreviewed days remain `PENDING`, holding current streaks rather than prematurely resetting them.
- **Explainable Streaks**: Every streak evaluation produces human-readable explanations.
- **Supportive Language**: Never shames users for lapses. Broken streaks are documented as objective observations while cumulative progress remains celebrated.
- **Historical Recalculation**: Backdated edits or deletions immediately recalculate affected aggregates and downstream streaks deterministically.

### Deterministic Behavioral Analytics
- Daily, weekly, monthly totals and averages across all elapsed days vs active days.
- Zero-baseline safe percentage calculations (preventing `NaN%` or `Infinity%`).
- **Temporal Patterns**: 24-hour distribution histogram, day-of-week patterns, intra-day interval analysis, and weekday vs. weekend comparisons.
- **Advanced Metrics**: 7-day and 30-day moving averages, linear trend regression slopes, and recovery times following lapses.
- **Sample Thresholds**: Requires at least 5 to 7 days of verified measurements before generating confidence-scored insights (`PRELIMINARY`, `MODERATE`, `HIGH`).

### Security & Data Isolation
- **Authentication**: Salted `scrypt` password hashing, short-lived JWT access tokens, refresh token rotation, and immediate session revocation.
- **Server Isolation**: Requests derive identity strictly from verified token headers; client-supplied `userId` values are disregarded. Parent behavior ownership is strictly validated before entry creation.
- **Local Isolation**: SQLite queries enforce user partitioning (`WHERE user_id = ?`). Account switching completely isolates cached state.

---

## 3. Screen Hierarchy (27 Functional Screens)

| Screen Category | Screen Name | Route | Description |
|---|---|---|---|
| **Authentication** | Welcome & Onboarding | `app/(auth)/welcome.tsx` | Brand introduction & value proposition |
| | Registration | `app/(auth)/register.tsx` | Account registration with Zod validation |
| | Login | `app/(auth)/login.tsx` | Secure credential sign in |
| | Email Verification | `app/(auth)/verify-email.tsx` | 6-digit verification code confirmation |
| | Password Reset | `app/(auth)/reset-password.tsx` | Password recovery workflow |
| | Session Recovery | `app/(auth)/auth-error.tsx` | Graceful error recovery & offline access |
| **Main Tabs** | Home Dashboard | `app/(tabs)/index.tsx` | Today's overview, quick logging, active streaks |
| | All Behaviors | `app/(tabs)/behaviors.tsx` | Categorized list with search & archived view |
| | Calendar & Daily Review | `app/(tabs)/calendar.tsx` | Month switcher, heatmap grid, daily status review |
| | Behavioral Analytics | `app/(tabs)/stats.tsx` | Summary stats, time distributions, trend slopes |
| | Settings Hub | `app/(tabs)/settings.tsx` | Profile summary & settings navigation |
| **Behavior Actions** | Create Behavior | `app/behavior/create.tsx` | Name, category, unit, accent color, initial goal |
| | Behavior Detail | `app/behavior/[id]/index.tsx` | Detail view, quick actions, streaks & metrics |
| | Edit Behavior | `app/behavior/[id]/edit.tsx` | Name, unit, color, archive toggle, soft delete |
| | Quick Log | `app/behavior/[id]/log.tsx` | Stepper, presets (+1,+2,+5,+10), context tags, notes |
| | Entry History | `app/behavior/[id]/history.tsx` | Reverse chronological timeline with edit access |
| | Edit Entry | `app/behavior/[id]/entry/[entryId].tsx` | Correct quantity, timestamp, tags, or delete entry |
| | Goal Management | `app/behavior/[id]/goals.tsx` | Goal creation & immutable version audit trail |
| | Independent Streak View | `app/behavior/[id]/streaks.tsx` | Deep streak inspector with day-by-day explanations |
| | Insights Feed | `app/behavior/[id]/insights.tsx` | Evidence-backed temporal & trend insights |
| **Settings & Privacy** | User Profile | `app/settings/profile.tsx` | Display name, verified email, account status |
| | Appearance | `app/settings/appearance.tsx` | Dark/light theme, day boundary hour (0..4 AM) |
| | Privacy & Data Isolation | `app/settings/privacy.tsx` | Architecture guarantees, zero third-party trackers |
| | Data Export | `app/settings/export.tsx` | Complete data package export in JSON and CSV |
| | Account Deletion | `app/settings/deletion.tsx` | Irreversible deletion lifecycle & 14-day grace period |
| | Help & About | `app/settings/help.tsx` | Documentation, streak philosophy & version info |

---

## 4. Setup & Running Instructions

### Prerequisites
- Node.js >= 20.x
- npm >= 10.x

### Install Dependencies
```bash
npm install
```

### Run Automated Test Suite
Run all tests across domain, API, and mobile packages:
```bash
npm test
```

Run specific package test suites:
```bash
npm run test:domain   # Domain calculation engines (16 tests)
npm run test:api      # Fastify API & security isolation (8 tests)
npm run test:mobile   # SQLite persistence & local account switching (6 tests)
```

### Build Packages
```bash
npm run build
```

### Start Fastify API Backend
```bash
npm --workspace=@behav/api start
```

### Start Expo Mobile App
```bash
npm --workspace=@behav/mobile start
```

---

## 5. Security Assumptions & Verification

- **Automated Security Tests**: Verified in `apps/api/tests/securityIsolation.test.ts` (cross-user read/write rejection, forged JWT rejection, expired token rejection, tampered ID neutralization, session revocation).
- **Local Isolation Tests**: Verified in `apps/mobile/tests/userIsolation.test.ts` (switching between User A and User B guarantees zero data leakage).
- **Zero Tracker Guarantee**: No analytics SDKs or advertising identifiers are included in the bundle.
