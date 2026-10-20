import { Insight, IInsightRepository } from '@behav/domain';
import { ISqliteConnection } from '../database/sqliteConnection';
import { generateUUID } from '../utils/uuid';

export class SqliteInsightRepository implements IInsightRepository {
  private inMemoryCache: Map<string, Insight> = new Map();

  constructor(private conn: ISqliteConnection) {}

  public async listByUser(userId: string): Promise<Insight[]> {
    const list: Insight[] = [];
    for (const insight of this.inMemoryCache.values()) {
      if (insight.userId === userId && !insight.dismissedAt) {
        list.push(insight);
      }
    }
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  public async listByBehavior(userId: string, behaviorId: string): Promise<Insight[]> {
    const list: Insight[] = [];
    for (const insight of this.inMemoryCache.values()) {
      if (insight.userId === userId && insight.behaviorId === behaviorId && !insight.dismissedAt) {
        list.push(insight);
      }
    }
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  public async create(insight: Omit<Insight, 'createdAt'>): Promise<Insight> {
    const id = insight.id || generateUUID();
    const created: Insight = {
      ...insight,
      id,
      createdAt: new Date().toISOString()
    };
    this.inMemoryCache.set(id, created);
    return created;
  }

  public async dismiss(id: string, userId: string): Promise<void> {
    const item = this.inMemoryCache.get(id);
    if (item && item.userId === userId) {
      item.dismissedAt = new Date().toISOString();
    }
  }
}
