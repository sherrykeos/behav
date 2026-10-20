import { Behavior, BehaviorEntry, Goal, DailyReview, StreakState } from '@behav/domain';

export interface ExportDataPackage {
  metadata: {
    application: string;
    version: string;
    exportedAt: string;
    userId: string;
  };
  behaviors: Behavior[];
  entries: BehaviorEntry[];
  goals: Goal[];
  reviews: DailyReview[];
  streaks: StreakState[];
}

export class ExportService {
  public static generateJsonExport(pkg: ExportDataPackage): string {
    return JSON.stringify(pkg, null, 2);
  }

  public static generateEntriesCsv(entries: BehaviorEntry[]): string {
    const headers = ['id', 'behaviorId', 'quantity', 'occurredAt', 'timezone', 'notes', 'contextTags'];
    const rows = entries.map((e) => [
      e.id,
      e.behaviorId,
      e.quantity,
      e.occurredAt,
      e.timezone,
      `"${(e.notes || '').replace(/"/g, '""')}"`,
      `"${e.contextTags.join(';')}"`
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }
}
