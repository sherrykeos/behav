import { UserSettings, IUserSettingsRepository } from '@behav/domain';
import { ISqliteConnection } from '../database/sqliteConnection';

interface SettingsRow {
  user_id: string;
  theme: string;
  timezone: string;
  locale: string;
  day_boundary_hour: number;
  preferences: string;
  updated_at: string;
}

function mapRowToSettings(row: SettingsRow): UserSettings {
  let preferences: Record<string, unknown> = {};
  try {
    preferences = JSON.parse(row.preferences);
  } catch {
    preferences = {};
  }

  return {
    userId: row.user_id,
    theme: row.theme as UserSettings['theme'],
    timezone: row.timezone,
    locale: row.locale,
    dayBoundaryHour: row.day_boundary_hour,
    preferences,
    updatedAt: row.updated_at
  };
}

export class SqliteUserSettingsRepository implements IUserSettingsRepository {
  constructor(private conn: ISqliteConnection) {}

  public async getByUserId(userId: string): Promise<UserSettings | null> {
    const row = await this.conn.get<SettingsRow>(
      `SELECT * FROM user_settings WHERE user_id = ?`,
      [userId]
    );
    return row ? mapRowToSettings(row) : null;
  }

  public async upsertSettings(settings: UserSettings): Promise<UserSettings> {
    const existing = await this.getByUserId(settings.userId);
    const now = new Date().toISOString();
    const prefsJson = JSON.stringify(settings.preferences || {});

    if (existing) {
      await this.conn.run(
        `UPDATE user_settings SET
          theme = ?, timezone = ?, locale = ?, day_boundary_hour = ?,
          preferences = ?, updated_at = ?
        WHERE user_id = ?`,
        [
          settings.theme,
          settings.timezone,
          settings.locale,
          settings.dayBoundaryHour,
          prefsJson,
          now,
          settings.userId
        ]
      );
      return {
        ...settings,
        updatedAt: now
      };
    }

    await this.conn.run(
      `INSERT INTO user_settings (
        user_id, theme, timezone, locale, day_boundary_hour, preferences, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        settings.userId,
        settings.theme,
        settings.timezone,
        settings.locale,
        settings.dayBoundaryHour,
        prefsJson,
        now
      ]
    );

    return {
      ...settings,
      updatedAt: now
    };
  }
}
