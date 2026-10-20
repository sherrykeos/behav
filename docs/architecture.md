# Behav Architecture Documentation

## 1. System Overview

**Behav** is an offline-first, privacy-conscious mobile application engineered for objective behavioral measurement, independent goal streaks, deterministic pattern discovery, and lasting behavioral change.

Unlike conventional habit trackers that assume an unlogged day equals zero activity or employ shame-based gamification, Behav treats behavioral data as verifiable empirical measurements.

```
+-------------------------------------------------------------------------+
|                        Presentation Layer (Mobile)                     |
|  Expo Router (27 Screens) - Custom Dark Sage Design System - React Hook  |
+-------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
|                        Application Context Layer                        |
|        AuthContext (Session & Isolation) - DatabaseContext (Pipeline)   |
+-------------------------------------------------------------------------+
                                    |
          +-------------------------+-------------------------+
          |                                                   |
          v                                                   v
+------------------------------------+   +------------------------------------+
|        Repository Interfaces       |   |       Remote API Monolith          |
|  IBehaviorRepo, IEntryRepo,        |   |  Fastify + TypeScript Modular API  |
|  IGoalRepo, IDailyReviewRepo,      |   |  Scrypt Hashing, JWT Rotation,     |
|  IStreakRepo, IAggregateRepo       |   |  PostgreSQL / Prisma Schema        |
+------------------------------------+   +------------------------------------+
          |
          v
+-------------------------------------------------------------------------+
|               Local Persistence & User Isolation (SQLite)               |
|      Strict user_id partitioning, schema_migrations, indices            |
+-------------------------------------------------------------------------+
                                    ^
                                    |
+-------------------------------------------------------------------------+
|                       Zero-Dependency Domain Layer                      |
|  StreakEngine, AnalyticsEngine, AggregateEngine, Immutable Versioning   |
+-------------------------------------------------------------------------+
```

---

## 2. Core Architectural Decisions

### Pure Domain Isolation (`packages/domain`)
All business logic, streak calculations, goal version evaluations, moving averages, and deterministic insight algorithms reside in `@behav/domain`. This package has zero dependencies on React Native, database drivers, or network frameworks.

### Offline-First Sovereignty
All critical tracking capabilities—logging, streak calculations, moving averages, distributions, and calendar confirmations—execute locally in SQLite. The user never needs network connectivity to maintain their tracking integrity.

### Data Partitioning by User ID
Every database entity includes an immutable `user_id`. Queries strictly filter by the authenticated user's ID. When users switch accounts on the same device, no cached data is leaked.

### Explainable & Nonjudgmental
Every streak state and calculation provides human-readable explanations. Lapses are documented as objective observations without moral judgment or negative gamification.
