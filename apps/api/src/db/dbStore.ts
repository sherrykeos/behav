import {
  User,
  UserSettings,
  Behavior,
  BehaviorEntry,
  Goal,
  GoalVersion,
  DailyReview,
  StreakState,
  DailyAggregate,
  Insight,
  AccountDeletionRequest
} from '@behav/domain';
import crypto from 'crypto';

export interface DbSession {
  id: string;
  userId: string;
  refreshTokenHash: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  lastUsedAt: string;
  userAgent?: string | null;
  ipAddress?: string | null;
}

export interface VerificationToken {
  id: string;
  userId: string;
  tokenHash: string;
  type: 'EMAIL_VERIFY' | 'PASSWORD_RESET';
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
}

/**
 * Isolated DB Storage interface and in-memory transactional implementation.
 * Used for Fastify API execution, automated security tests, and CI/CD.
 */
export class MemoryDbStore {
  public users: Map<string, User & { passwordHash: string }> = new Map();
  public sessions: Map<string, DbSession> = new Map();
  public userSettings: Map<string, UserSettings> = new Map();
  public behaviors: Map<string, Behavior> = new Map();
  public entries: Map<string, BehaviorEntry> = new Map();
  public goals: Map<string, Goal> = new Map();
  public goalVersions: Map<string, GoalVersion> = new Map();
  public dailyReviews: Map<string, DailyReview> = new Map();
  public streakStates: Map<string, StreakState> = new Map();
  public dailyAggregates: Map<string, DailyAggregate> = new Map();
  public insights: Map<string, Insight> = new Map();
  public deletionRequests: Map<string, AccountDeletionRequest> = new Map();
  public verificationTokens: Map<string, VerificationToken> = new Map();

  public clear(): void {
    this.users.clear();
    this.sessions.clear();
    this.userSettings.clear();
    this.behaviors.clear();
    this.entries.clear();
    this.goals.clear();
    this.goalVersions.clear();
    this.dailyReviews.clear();
    this.streakStates.clear();
    this.dailyAggregates.clear();
    this.insights.clear();
    this.deletionRequests.clear();
    this.verificationTokens.clear();
  }

  // User
  public async findUserByEmail(email: string): Promise<(User & { passwordHash: string }) | null> {
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === email.toLowerCase() && !user.deletedAt) {
        return user;
      }
    }
    return null;
  }

  public async findUserById(id: string): Promise<(User & { passwordHash: string }) | null> {
    const user = this.users.get(id);
    if (!user || user.deletedAt) return null;
    return user;
  }

  public async createUser(data: {
    email: string;
    passwordHash: string;
    displayName: string;
    accountStatus?: 'ACTIVE' | 'UNVERIFIED';
  }): Promise<User> {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const user = {
      id,
      email: data.email.toLowerCase(),
      displayName: data.displayName,
      passwordHash: data.passwordHash,
      accountStatus: data.accountStatus || 'ACTIVE',
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    };
    this.users.set(id, user);

    // Initial settings
    this.userSettings.set(id, {
      userId: id,
      theme: 'dark',
      timezone: 'UTC',
      locale: 'en',
      dayBoundaryHour: 0,
      preferences: {},
      updatedAt: now
    });

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      accountStatus: user.accountStatus,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      deletedAt: null
    };
  }

  // Session
  public async createSession(data: {
    userId: string;
    refreshTokenHash: string;
    expiresAt: string;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<DbSession> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const session: DbSession = {
      id,
      userId: data.userId,
      refreshTokenHash: data.refreshTokenHash,
      createdAt: now,
      expiresAt: data.expiresAt,
      revokedAt: null,
      lastUsedAt: now,
      userAgent: data.userAgent || null,
      ipAddress: data.ipAddress || null
    };
    this.sessions.set(id, session);
    return session;
  }

  public async findSessionByTokenHash(hash: string): Promise<DbSession | null> {
    for (const session of this.sessions.values()) {
      if (session.refreshTokenHash === hash) {
        if (session.revokedAt) return null;
        if (new Date(session.expiresAt).getTime() < Date.now()) return null;
        return session;
      }
    }
    return null;
  }

  public async revokeSession(id: string): Promise<void> {
    const session = this.sessions.get(id);
    if (session) {
      session.revokedAt = new Date().toISOString();
    }
  }

  public async revokeAllUserSessions(userId: string): Promise<void> {
    const now = new Date().toISOString();
    for (const session of this.sessions.values()) {
      if (session.userId === userId) {
        session.revokedAt = now;
      }
    }
  }

  // Verification Tokens
  public async createVerificationToken(data: {
    userId: string;
    tokenHash: string;
    type: 'EMAIL_VERIFY' | 'PASSWORD_RESET';
    expiresAt: string;
  }): Promise<VerificationToken> {
    const id = crypto.randomUUID();
    const record: VerificationToken = {
      id,
      userId: data.userId,
      tokenHash: data.tokenHash,
      type: data.type,
      expiresAt: data.expiresAt,
      usedAt: null,
      createdAt: new Date().toISOString()
    };
    this.verificationTokens.set(id, record);
    return record;
  }

  public async findValidToken(hash: string, type: 'EMAIL_VERIFY' | 'PASSWORD_RESET'): Promise<VerificationToken | null> {
    for (const token of this.verificationTokens.values()) {
      if (token.tokenHash === hash && token.type === type && !token.usedAt) {
        if (new Date(token.expiresAt).getTime() < Date.now()) return null;
        return token;
      }
    }
    return null;
  }

  public async markTokenUsed(id: string): Promise<void> {
    const token = this.verificationTokens.get(id);
    if (token) {
      token.usedAt = new Date().toISOString();
    }
  }

  // Behaviors
  public async listBehaviorsByUser(userId: string, includeArchived = false): Promise<Behavior[]> {
    const list: Behavior[] = [];
    for (const b of this.behaviors.values()) {
      if (b.userId === userId && !b.deletedAt) {
        if (!includeArchived && b.archivedAt) continue;
        list.push(b);
      }
    }
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  public async findBehaviorById(id: string, userId: string): Promise<Behavior | null> {
    const b = this.behaviors.get(id);
    if (!b || b.userId !== userId || b.deletedAt) return null;
    return b;
  }

  public async createBehavior(data: Omit<Behavior, 'id' | 'createdAt' | 'updatedAt'>): Promise<Behavior> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const behavior: Behavior = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
      deletedAt: null
    };
    this.behaviors.set(id, behavior);
    return behavior;
  }

  public async updateBehavior(id: string, userId: string, patch: Partial<Behavior>): Promise<Behavior | null> {
    const b = await this.findBehaviorById(id, userId);
    if (!b) return null;
    const updated: Behavior = {
      ...b,
      ...patch,
      updatedAt: new Date().toISOString()
    };
    this.behaviors.set(id, updated);
    return updated;
  }

  public async softDeleteBehavior(id: string, userId: string): Promise<boolean> {
    const b = await this.findBehaviorById(id, userId);
    if (!b) return false;
    b.deletedAt = new Date().toISOString();
    return true;
  }

  // Entries
  public async listEntriesByUser(userId: string, behaviorId?: string): Promise<BehaviorEntry[]> {
    const list: BehaviorEntry[] = [];
    for (const e of this.entries.values()) {
      if (e.userId === userId && !e.deletedAt) {
        if (behaviorId && e.behaviorId !== behaviorId) continue;
        list.push(e);
      }
    }
    return list.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  }

  public async findEntryById(id: string, userId: string): Promise<BehaviorEntry | null> {
    const e = this.entries.get(id);
    if (!e || e.userId !== userId || e.deletedAt) return null;
    return e;
  }

  public async createEntry(data: Omit<BehaviorEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<BehaviorEntry> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const entry: BehaviorEntry = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    };
    this.entries.set(id, entry);
    return entry;
  }

  public async updateEntry(id: string, userId: string, patch: Partial<BehaviorEntry>): Promise<BehaviorEntry | null> {
    const e = await this.findEntryById(id, userId);
    if (!e) return null;
    const updated: BehaviorEntry = {
      ...e,
      ...patch,
      updatedAt: new Date().toISOString()
    };
    this.entries.set(id, updated);
    return updated;
  }

  public async softDeleteEntry(id: string, userId: string): Promise<boolean> {
    const e = await this.findEntryById(id, userId);
    if (!e) return false;
    e.deletedAt = new Date().toISOString();
    return true;
  }

  // Goals
  public async listGoalsByUser(userId: string, behaviorId?: string): Promise<Goal[]> {
    const list: Goal[] = [];
    for (const g of this.goals.values()) {
      if (g.userId === userId) {
        if (behaviorId && g.behaviorId !== behaviorId) continue;
        list.push(g);
      }
    }
    return list;
  }

  public async findGoalById(id: string, userId: string): Promise<Goal | null> {
    const g = this.goals.get(id);
    if (!g || g.userId !== userId) return null;
    return g;
  }

  public async createGoal(data: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>): Promise<Goal> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const goal: Goal = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.goals.set(id, goal);

    // Initial version
    const versionId = crypto.randomUUID();
    this.goalVersions.set(versionId, {
      id: versionId,
      goalId: id,
      userId: goal.userId,
      behaviorId: goal.behaviorId,
      goalType: goal.goalType,
      targetValue: goal.targetValue,
      evaluationPeriod: goal.evaluationPeriod,
      versionNumber: 1,
      effectiveFrom: goal.startsAt,
      effectiveTo: null,
      createdAt: now
    });

    return goal;
  }

  public async updateGoal(id: string, userId: string, patch: Partial<Goal>): Promise<Goal | null> {
    const g = await this.findGoalById(id, userId);
    if (!g) return null;
    const now = new Date().toISOString();

    // If targetValue or evaluationPeriod changed, close previous version and create new version
    if (
      (patch.targetValue !== undefined && patch.targetValue !== g.targetValue) ||
      (patch.evaluationPeriod !== undefined && patch.evaluationPeriod !== g.evaluationPeriod)
    ) {
      // Find current active version
      for (const v of this.goalVersions.values()) {
        if (v.goalId === id && !v.effectiveTo) {
          v.effectiveTo = now;
        }
      }
      const newVersionId = crypto.randomUUID();
      this.goalVersions.set(newVersionId, {
        id: newVersionId,
        goalId: id,
        userId: g.userId,
        behaviorId: g.behaviorId,
        goalType: g.goalType,
        targetValue: patch.targetValue !== undefined ? patch.targetValue : g.targetValue,
        evaluationPeriod: patch.evaluationPeriod !== undefined ? patch.evaluationPeriod : g.evaluationPeriod,
        versionNumber: (await this.listGoalVersions(id, userId)).length + 1,
        effectiveFrom: now,
        effectiveTo: null,
        createdAt: now
      });
    }

    const updated: Goal = {
      ...g,
      ...patch,
      updatedAt: now
    };
    this.goals.set(id, updated);
    return updated;
  }

  public async listGoalVersions(goalId: string, userId: string): Promise<GoalVersion[]> {
    const list: GoalVersion[] = [];
    for (const v of this.goalVersions.values()) {
      if (v.goalId === goalId && v.userId === userId) {
        list.push(v);
      }
    }
    return list.sort((a, b) => a.versionNumber - b.versionNumber);
  }

  // Daily Reviews
  public async findReview(userId: string, behaviorId: string, localDate: string): Promise<DailyReview | null> {
    const key = `${userId}:${behaviorId}:${localDate}`;
    return this.dailyReviews.get(key) || null;
  }

  public async listReviews(userId: string, behaviorId: string): Promise<DailyReview[]> {
    const list: DailyReview[] = [];
    for (const r of this.dailyReviews.values()) {
      if (r.userId === userId && r.behaviorId === behaviorId) {
        list.push(r);
      }
    }
    return list.sort((a, b) => a.localDate.localeCompare(b.localDate));
  }

  public async upsertReview(data: Omit<DailyReview, 'id' | 'createdAt' | 'updatedAt'>): Promise<DailyReview> {
    const key = `${data.userId}:${data.behaviorId}:${data.localDate}`;
    const existing = this.dailyReviews.get(key);
    const now = new Date().toISOString();

    if (existing) {
      const updated: DailyReview = {
        ...existing,
        ...data,
        updatedAt: now,
        reviewedAt: now
      };
      this.dailyReviews.set(key, updated);
      return updated;
    }

    const id = crypto.randomUUID();
    const created: DailyReview = {
      ...data,
      id,
      reviewedAt: now,
      createdAt: now,
      updatedAt: now
    };
    this.dailyReviews.set(key, created);
    return created;
  }
}

export const db = new MemoryDbStore();
