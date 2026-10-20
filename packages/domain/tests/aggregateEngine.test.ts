import {
  calculateDailyAggregate,
  groupEntriesByLocalDate
} from '../src/engines/aggregateEngine';
import { BehaviorEntry, DailyReview } from '../src/entities/types';

describe('AggregateEngine', () => {
  const userId = 'usr_123';
  const behaviorId = 'beh_abc';
  const localDate = '2026-10-15';

  it('marks day as PENDING when there are no entries and no review (never assumes confirmed zero)', () => {
    const aggregate = calculateDailyAggregate({
      userId,
      behaviorId,
      localDate,
      entries: [],
      review: null
    });

    expect(aggregate.reviewStatus).toBe('PENDING');
    expect(aggregate.totalQuantity).toBe(0);
    expect(aggregate.occurrenceCount).toBe(0);
  });

  it('marks day as CONFIRMED_ZERO only when explicit daily review exists', () => {
    const review: DailyReview = {
      id: 'rev_1',
      userId,
      behaviorId,
      localDate,
      timezone: 'UTC',
      status: 'CONFIRMED_ZERO',
      reviewedAt: '2026-10-15T22:00:00Z',
      createdAt: '2026-10-15T22:00:00Z',
      updatedAt: '2026-10-15T22:00:00Z'
    };

    const aggregate = calculateDailyAggregate({
      userId,
      behaviorId,
      localDate,
      entries: [],
      review
    });

    expect(aggregate.reviewStatus).toBe('CONFIRMED_ZERO');
    expect(aggregate.totalQuantity).toBe(0);
    expect(aggregate.occurrenceCount).toBe(0);
  });

  it('correctly aggregates multiple active entries and marks status as LOGGED', () => {
    const entries: BehaviorEntry[] = [
      {
        id: 'e1',
        userId,
        behaviorId,
        quantity: 2.5,
        occurredAt: '2026-10-15T09:30:00Z',
        timezone: 'UTC',
        contextTags: ['morning'],
        createdAt: '2026-10-15T09:30:00Z',
        updatedAt: '2026-10-15T09:30:00Z'
      },
      {
        id: 'e2',
        userId,
        behaviorId,
        quantity: 1.5,
        occurredAt: '2026-10-15T14:00:00Z',
        timezone: 'UTC',
        contextTags: ['afternoon'],
        createdAt: '2026-10-15T14:00:00Z',
        updatedAt: '2026-10-15T14:00:00Z'
      },
      {
        id: 'e3_deleted',
        userId,
        behaviorId,
        quantity: 10,
        occurredAt: '2026-10-15T18:00:00Z',
        timezone: 'UTC',
        contextTags: [],
        createdAt: '2026-10-15T18:00:00Z',
        updatedAt: '2026-10-15T18:05:00Z',
        deletedAt: '2026-10-15T18:05:00Z' // soft-deleted
      }
    ];

    const aggregate = calculateDailyAggregate({
      userId,
      behaviorId,
      localDate,
      entries,
      review: null
    });

    expect(aggregate.reviewStatus).toBe('LOGGED');
    expect(aggregate.occurrenceCount).toBe(2);
    expect(aggregate.totalQuantity).toBe(4.0); // 2.5 + 1.5
  });

  it('groups entries accurately by local date and timezone', () => {
    const entries: BehaviorEntry[] = [
      {
        id: 'e1',
        userId,
        behaviorId,
        quantity: 1,
        occurredAt: '2026-10-15T12:00:00Z',
        timezone: 'UTC',
        contextTags: [],
        createdAt: '2026-10-15T12:00:00Z',
        updatedAt: '2026-10-15T12:00:00Z'
      },
      {
        id: 'e2',
        userId,
        behaviorId,
        quantity: 1,
        occurredAt: '2026-10-16T01:00:00Z',
        timezone: 'UTC',
        contextTags: [],
        createdAt: '2026-10-16T01:00:00Z',
        updatedAt: '2026-10-16T01:00:00Z'
      }
    ];

    const grouped = groupEntriesByLocalDate(entries, 'UTC');
    expect(grouped.has('2026-10-15')).toBe(true);
    expect(grouped.has('2026-10-16')).toBe(true);
    expect(grouped.get('2026-10-15')?.length).toBe(1);
    expect(grouped.get('2026-10-16')?.length).toBe(1);
  });
});
