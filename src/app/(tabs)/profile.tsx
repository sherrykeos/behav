import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper, Card } from '@/components/common';
import { useRouter } from 'expo-router';
import { RestoreModal } from '@/components/settings/RestoreModal';
import { EditProfileModal } from '@/components/settings/EditProfileModal';
import { ExportDatePickerModal } from '@/components/settings/ExportDatePickerModal';
import { ClearDataModal } from '@/components/settings/ClearDataModal';
import { BehaviorModal, renderHabitLogo } from '@/components/behaviors/BehaviorModal';
import { colors, radii, spacing, typography } from '@/theme';
import { useBehaviors } from '@/context/BehaviorContext';
import { exportFile, pickAndReadFile } from '@/utils/fileExport';
import { getCurrentIsoTimestamp, formatFriendlyDate } from '@/utils/date';
import type { BHFile, RestoreResult, RecordBounds } from '@/db';
import type { Behavior, CreateBehaviorInput } from '@/types/database';

function formatFriendlyMonthYear(dateString: string): string {
  if (!dateString) return 'Today';
  const [y, m] = dateString.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

export default function SettingsScreen() {
  const router = useRouter();
  const {
    behaviors,
    userProfile,
    updateUserProfile,
    createBehavior,
    updateBehavior,
    deleteBehavior,
    createBackupData,
    exportLogsCsv,
    validateBackupContent,
    restoreBackupData,
    getRecordBounds,
    clearAllAppData,
    resetOnboarding,
  } = useBehaviors();

  // Record boundaries (earliest and latest record dates)
  const [recordBounds, setRecordBounds] = useState<RecordBounds>({
    earliestDate: null,
    latestDate: null,
    totalEntries: 0,
    recordedDaysCount: 0,
    recordedDates: [],
  });

  const loadBounds = useCallback(async () => {
    try {
      const bounds = await getRecordBounds();
      setRecordBounds(bounds);
    } catch {
      // quiet fallback
    }
  }, [getRecordBounds]);

  useEffect(() => {
    loadBounds();
  }, [loadBounds, behaviors]);

  // Modal visibility states
  const [editProfileModalVisible, setEditProfileModalVisible] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [restoreModalVisible, setRestoreModalVisible] = useState(false);
  const [clearModalVisible, setClearModalVisible] = useState(false);
  const [behaviorModalVisible, setBehaviorModalVisible] = useState(false);
  const [selectedBehaviorToEdit, setSelectedBehaviorToEdit] = useState<Behavior | null>(null);

  // Restore states
  const [selectedBackup, setSelectedBackup] = useState<BHFile | null>(null);
  const [selectedFilename, setSelectedFilename] = useState<string>('');
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [isInstantBackingUp, setIsInstantBackingUp] = useState(false);

  // Status & Feedback banners
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Track last backup time in memory
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(null);

  /**
   * Habit Management Handlers
   */
  const handleOpenAddHabit = () => {
    setSelectedBehaviorToEdit(null);
    setBehaviorModalVisible(true);
  };

  const handleOpenEditHabit = (b: Behavior) => {
    setSelectedBehaviorToEdit(b);
    setBehaviorModalVisible(true);
  };

  const handleSaveHabit = async (data: CreateBehaviorInput) => {
    try {
      if (selectedBehaviorToEdit) {
        await updateBehavior(selectedBehaviorToEdit.id, data);
        setStatusMessage({
          type: 'success',
          text: `Habit "${data.nickname || data.name}" updated successfully.`,
        });
      } else {
        await createBehavior(data);
        setStatusMessage({
          type: 'success',
          text: `Habit "${data.nickname || data.name}" created successfully.`,
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Failed to save habit.',
      });
    }
  };

  const handleDeleteHabit = async (id: string) => {
    try {
      await deleteBehavior(id);
      await loadBounds();
      setStatusMessage({
        type: 'success',
        text: 'Habit deleted successfully.',
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Failed to delete habit.',
      });
    }
  };

  /**
   * 1-Tap Instant Full Backup:
   * Backs up whole app data (entire data from beginning to now) without date filters
   */
  const handleInstantFullBackup = async (): Promise<boolean> => {
    setIsInstantBackingUp(true);
    try {
      const backup = await createBackupData();
      const todayStr = new Date().toISOString().slice(0, 10);
      const filename = `Behav-Full-Backup-${todayStr}.json`;
      const jsonContent = JSON.stringify(backup, null, 2);
      const result = await exportFile(jsonContent, filename, 'application/json');

      if (result.success) {
        const habitCount = 'habits' in backup ? backup.habits.length : backup.data.behaviors.length;
        const dayCount = 'days' in backup ? backup.days.length : (backup.data.records?.length ?? 0);
        setStatusMessage({
          type: 'success',
          text: `Full backup exported: ${filename} (${habitCount} habits, ${dayCount} days). Entire history saved.`,
        });
        setLastBackupTime(getCurrentIsoTimestamp());
        return true;
      } else {
        setStatusMessage({
          type: 'error',
          text: result.error || 'Failed to export full backup file.',
        });
        return false;
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Full backup export failed.',
      });
      return false;
    } finally {
      setIsInstantBackingUp(false);
    }
  };

  /**
   * Handle validated Export submission from ExportDatePickerModal
   */
  const handleExportConfirmed = async (options: {
    startDate?: string;
    endDate?: string;
    format: 'json' | 'csv';
    filenameSummary: string;
  }) => {
    const { startDate, endDate, format, filenameSummary } = options;
    try {
      if (format === 'json') {
        const backup = await createBackupData({ startDate, endDate });
        const filename = `Behav-Backup-${filenameSummary}.json`;
        const jsonContent = JSON.stringify(backup, null, 2);
        const result = await exportFile(jsonContent, filename, 'application/json');

        if (result.success) {
          const habitCount = 'habits' in backup ? backup.habits.length : backup.data.behaviors.length;
          const dayCount = 'days' in backup ? backup.days.length : (backup.data.records?.length ?? 0);
          setStatusMessage({
            type: 'success',
            text: `Backup exported: ${filename} (${habitCount} habits, ${dayCount} days included).`,
          });
          setLastBackupTime(getCurrentIsoTimestamp());
        } else {
          setStatusMessage({
            type: 'error',
            text: result.error || 'Failed to export backup file.',
          });
        }
      } else {
        const csvContent = await exportLogsCsv({ startDate, endDate });
        const filename = `Behav-Logs-${filenameSummary}.csv`;
        const result = await exportFile(csvContent, filename, 'text/csv');

        if (result.success) {
          setStatusMessage({
            type: 'success',
            text: `CSV exported: ${filename}`,
          });
          setLastBackupTime(getCurrentIsoTimestamp());
        } else {
          setStatusMessage({
            type: 'error',
            text: result.error || 'Failed to export CSV file.',
          });
        }
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Export failed.',
      });
    }
  };

  /**
   * Handle Import Backup (accepting standard .json)
   */
  const handlePickAndRestore = async () => {
    setIsReadingFile(true);
    setStatusMessage(null);

    try {
      const pickResult = await pickAndReadFile([
        '*/*',
        'application/json',
        'application/octet-stream',
        'text/*',
      ]);

      if (pickResult.cancelled) {
        setIsReadingFile(false);
        return;
      }

      if (pickResult.error || !pickResult.content) {
        setStatusMessage({
          type: 'error',
          text: pickResult.error || 'Could not read selected file.',
        });
        setIsReadingFile(false);
        return;
      }

      const filename = pickResult.filename || 'backup.json';
      const validation = validateBackupContent(pickResult.content, filename);

      if (!validation.isValid || !validation.backup) {
        setStatusMessage({
          type: 'error',
          text: validation.error || 'Invalid backup file format.',
        });
        setIsReadingFile(false);
        return;
      }

      setSelectedBackup(validation.backup);
      setSelectedFilename(filename);
      setRestoreModalVisible(true);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Error inspecting backup file.',
      });
    } finally {
      setIsReadingFile(false);
    }
  };

  /**
   * Execute actual restore (called from RestoreModal)
   */
  const handleConfirmRestore = async (mode: 'replace' | 'merge'): Promise<RestoreResult> => {
    if (!selectedBackup) {
      throw new Error('No backup selected for restore.');
    }
    const result = await restoreBackupData(selectedBackup, mode);
    await loadBounds();
    setStatusMessage({
      type: 'success',
      text: `Restore complete: ${result.restoredBehaviors} habits, ${result.restoredLogs} records restored.`,
    });
    return result;
  };

  /**
   * Clear All App Data Handler
   */
  const handleConfirmClearAppData = async (): Promise<void> => {
    try {
      await clearAllAppData();
      await loadBounds();
      setStatusMessage({
        type: 'success',
        text: 'All app data has been permanently cleared. Behav has been reset.',
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Failed to clear app data.',
      });
      throw err;
    }
  };

  return (
    <ScreenWrapper scrollable>
      {/* Screen Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.subtitle}>Identity, habit management & data sovereignty</Text>
      </View>

      {/* Operational Feedback Banner */}
      {statusMessage && (
        <View
          style={[
            styles.feedbackBanner,
            statusMessage.type === 'success' ? styles.feedbackSuccess : styles.feedbackError,
          ]}
        >
          <Ionicons
            name={statusMessage.type === 'success' ? 'checkmark-circle' : 'alert-circle'}
            size={18}
            color={statusMessage.type === 'success' ? colors.sageText : colors.peachText}
          />
          <Text
            style={[
              styles.feedbackText,
              { color: statusMessage.type === 'success' ? colors.sageText : colors.peachText },
            ]}
          >
            {statusMessage.text}
          </Text>
          <TouchableOpacity onPress={() => setStatusMessage(null)}>
            <Ionicons name="close" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      {/* SECTION 1: User Profile & Identity Hero Card */}
      <Card style={styles.profileHeroCard}>
        <View style={styles.profileHeader}>
          {/* Avatar */}
          <View
            style={[
              styles.avatarContainer,
              {
                backgroundColor: `${userProfile.avatarColor}1A`,
                borderColor: userProfile.avatarColor,
              },
            ]}
          >
            <Ionicons
              name={userProfile.avatarIcon as any}
              size={34}
              color={userProfile.avatarColor}
            />
          </View>

          {/* User Details */}
          <View style={styles.profileDetails}>
            <View style={styles.nameRow}>
              <Text style={styles.userName}>{userProfile.name || 'Personal Space'}</Text>
              {/* <View style={styles.sovereignBadge}>
                <View style={styles.greenDot} />
                <Text style={styles.sovereignText}>Private & Offline</Text>
              </View> */}
            </View>
            <Text style={styles.userBio} numberOfLines={2}>
              {userProfile.bio || ''}
            </Text>
          </View>
        </View>

        {/* Executive Metrics Bar */}
        <View style={styles.metricsBar}>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{behaviors.length}</Text>
            <Text style={styles.metricLabel}>Habits</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{recordBounds.recordedDaysCount}</Text>
            <Text style={styles.metricLabel}>Days Logged</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>
              {recordBounds.earliestDate
                ? formatFriendlyMonthYear(recordBounds.earliestDate)
                : 'Today'}
            </Text>
            <Text style={styles.metricLabel}>Tracking Since</Text>
          </View>
        </View>

        {/* Edit Profile Action Button */}
        <TouchableOpacity
          style={styles.editProfileBtn}
          onPress={() => setEditProfileModalVisible(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="create-outline" size={15} color={colors.accentPrimary} />
          <Text style={styles.editProfileBtnText}>Edit Identity & Avatar</Text>
        </TouchableOpacity>
      </Card>

      {/* SECTION 2: Manage Habits */}
      <Card style={styles.contentCard}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1, paddingRight: spacing.sm }}>
            <Text style={styles.sectionTitle}>Manage Habits</Text>
            <Text style={styles.sectionSubtitle}>
              Customize nicknames, daily targets, and custom logos
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addHabitBtn}
            onPress={handleOpenAddHabit}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={16} color="#101412" />
            <Text style={styles.addHabitBtnText}>Add Habit</Text>
          </TouchableOpacity>
        </View>

        {behaviors.length === 0 ? (
          <View style={styles.emptyHabitBox}>
            <Ionicons name="sparkles-outline" size={28} color={colors.textTertiary} />
            <Text style={styles.emptyHabitText}>No habits active yet</Text>
            <Text style={styles.emptyHabitSubtext}>
              Tap "Add Habit" to track your first behavior with a custom nickname and logo.
            </Text>
          </View>
        ) : (
          <View style={styles.habitList}>
            {behaviors.map((behavior, index) => {
              const isLast = index === behaviors.length - 1;
              return (
                <View
                  key={behavior.id}
                  style={[styles.habitItemRow, !isLast && styles.habitItemDivider]}
                >
                  {/* Habit Logo */}
                  <View style={styles.habitLogoCircle}>
                    {renderHabitLogo(behavior.icon, 20, colors.accentPrimary)}
                  </View>

                  {/* Habit Details */}
                  <View style={styles.habitMetaCol}>
                    <View style={styles.habitNameRow}>
                      <Text style={styles.habitNameTitle}>
                        {behavior.nickname || behavior.name}
                      </Text>
                      {behavior.category && (
                        <View style={styles.habitCategoryTag}>
                          <Text style={styles.habitCategoryText}>{behavior.category}</Text>
                        </View>
                      )}
                    </View>

                    {!!behavior.subtitle && (
                      <Text style={styles.habitSubtitleText} numberOfLines={1}>
                        {behavior.subtitle}
                      </Text>
                    )}
                    <Text style={styles.habitQuantityText}>
                      {behavior.dailyLimit
                        ? `Target: ${behavior.dailyLimit} ${behavior.unit}/day`
                        : `Unit: ${behavior.unit}`}
                    </Text>
                  </View>

                  {/* Edit Habit Button */}
                  <TouchableOpacity
                    style={styles.habitEditBtn}
                    onPress={() => handleOpenEditHabit(behavior)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="pencil-outline" size={16} color={colors.accentPrimary} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </Card>

      {/* SECTION 3: Data Sovereignty & Backups */}
      <Card style={styles.contentCard}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.sectionTitle}>Data Backups</Text>
            <Text style={styles.sectionSubtitle}>
              Backup and migrate your full database freely
            </Text>
          </View>
        </View>

        <View style={styles.actionsContainer}>
          {/* Custom Date Picker Export Action */}
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => setExportModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={styles.rowIcon}>
              <Ionicons name="calendar-outline" size={20} color={colors.accentPrimary} />
            </View>
            <View style={styles.rowContent}>
              <View style={styles.rowTitleRow}>
                <Text style={styles.rowTitle}>Custom Export</Text>
                <View style={styles.scopeTag}>
                  <Text style={styles.scopeTagText}>Date Filter & CSV</Text>
                </View>
              </View>
              <Text style={styles.rowDesc}>
                {recordBounds.earliestDate
                  ? `Select specific dates from ${formatFriendlyDate(recordBounds.earliestDate)} onwards`
                  : 'Choose specific dates or full history (.json / .csv)'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Import Action */}
          <TouchableOpacity
            style={styles.actionRow}
            onPress={handlePickAndRestore}
            disabled={isReadingFile}
            activeOpacity={0.7}
          >
            <View style={styles.rowIcon}>
              {isReadingFile ? (
                <ActivityIndicator size="small" color={colors.accentPrimary} />
              ) : (
                <Ionicons name="cloud-download-outline" size={20} color={colors.accentPrimary} />
              )}
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>Import Backup File</Text>
              <Text style={styles.rowDesc}>
                Restore habits and historical records from a .json file
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Instant Full Backup Action */}
          <TouchableOpacity
            style={styles.actionRow}
            onPress={handleInstantFullBackup}
            disabled={isInstantBackingUp}
            activeOpacity={0.7}
          >
            <View style={styles.rowIcon}>
              {isInstantBackingUp ? (
                <ActivityIndicator size="small" color={colors.accentPrimary} />
              ) : (
                <Ionicons name="flash-outline" size={20} color={colors.accentPrimary} />
              )}
            </View>
            <View style={styles.rowContent}>
              <View style={styles.rowTitleRow}>
                <Text style={styles.rowTitle}>Instant Full Backup</Text>
                <View style={styles.scopeTag}>
                  <Text style={styles.scopeTagText}>1-Tap JSON</Text>
                </View>
              </View>
              <Text style={styles.rowDesc}>
                {isInstantBackingUp
                  ? 'Exporting full database...'
                  : 'Export all habits, logs, and streaks from the beginning to now (.json)'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>



        {/* Last backup info note */}
        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={13} color={colors.textTertiary} />
          <Text style={styles.metaText}>
            {lastBackupTime
              ? `Last exported: ${formatFriendlyDate(lastBackupTime.slice(0, 10))} at ${lastBackupTime.slice(11, 16)}`
              : 'No exports created during this session'}
          </Text>
        </View>
      </Card>

      {/* SECTION 4: Danger Zone / Clear App Data */}
      <Card style={styles.dangerCard}>
        <View style={styles.dangerRow}>
          <View style={styles.dangerHeaderIcon}>
            <Ionicons name="trash-outline" size={15} color={colors.danger} />
          </View>
          <View style={styles.dangerTextCol}>
            <View style={styles.dangerTitleRow}>
              <Text style={styles.dangerActionTitle}>Clear App Data</Text>
              <View style={styles.dangerTag}>
                <Text style={styles.dangerTagText}>Danger</Text>
              </View>
            </View>
            <Text style={styles.dangerActionDesc}>
              Permanently delete all habits and history
            </Text>
          </View>

          <TouchableOpacity
            style={styles.clearAppBtn}
            onPress={() => setClearModalVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.clearAppBtnText}>Clear</Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* SECTION 5: Small App Information */}
      <Card variant="subtle" style={styles.infoCard}>
        <View style={styles.infoHeader}>
          <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.infoTitle}>App Architecture</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoKey}>App Version</Text>
          <Text style={styles.infoVal}>1.0.0 (Release Build)</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoKey}>Database Engine</Text>
          <Text style={styles.infoVal}>SQLite (behav.db)</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoKey}>Storage Privacy</Text>
          <Text style={styles.infoVal}>100% Offline & Private</Text>
        </View>

        {/* <TouchableOpacity
          style={styles.replayRow}
          onPress={async () => {
            await resetOnboarding();
            router.push('/onboarding');
          }}
          activeOpacity={0.7}
        >
          <View style={styles.replayLeft}>
            <Ionicons name="sparkles-outline" size={15} color={colors.brand.mint} />
            <Text style={styles.replayText}>Replay Welcome & Onboarding</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
        </TouchableOpacity> */}
      </Card>

      {/* Edit Profile Modal */}
      <EditProfileModal
        visible={editProfileModalVisible}
        initialProfile={userProfile}
        onClose={() => setEditProfileModalVisible(false)}
        onSave={updateUserProfile}
      />

      {/* Behavior (Habit) Modal: Add & Modify Habit */}
      <BehaviorModal
        visible={behaviorModalVisible}
        behaviorToEdit={selectedBehaviorToEdit}
        onClose={() => {
          setBehaviorModalVisible(false);
          setSelectedBehaviorToEdit(null);
        }}
        onSave={handleSaveHabit}
        onDelete={handleDeleteHabit}
      />

      {/* Export Date Picker Modal */}
      <ExportDatePickerModal
        visible={exportModalVisible}
        recordBounds={recordBounds}
        onClose={() => setExportModalVisible(false)}
        onExport={handleExportConfirmed}
      />

      {/* Restore Confirmation Modal */}
      <RestoreModal
        visible={restoreModalVisible}
        backup={selectedBackup}
        filename={selectedFilename}
        onClose={() => setRestoreModalVisible(false)}
        onConfirmRestore={handleConfirmRestore}
      />

      {/* Clear App Data Warning & Backup Modal */}
      <ClearDataModal
        visible={clearModalVisible}
        onClose={() => setClearModalVisible(false)}
        onConfirmClear={handleConfirmClearAppData}
        onShortcutBackup={handleInstantFullBackup}
        recordBounds={recordBounds}
        habitCount={behaviors.length}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  title: {
    ...typography.titleLarge,
  },
  subtitle: {
    ...typography.bodyMedium,
    marginTop: spacing.xs,
    color: colors.textSecondary,
  },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  feedbackSuccess: {
    backgroundColor: colors.accentPrimarySubtle,
    borderWidth: 1,
    borderColor: colors.accentPrimary,
  },
  feedbackError: {
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  feedbackText: {
    ...typography.bodySmall,
    flex: 1,
    lineHeight: 18,
  },
  profileHeroCard: {
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  contentCard: {
    marginBottom: spacing.md,
  },
  // Section 1: User Profile Hero styles
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  avatarContainer: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileDetails: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  userName: {
    ...typography.titleMedium,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  sovereignBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accentPrimary,
  },
  sovereignText: {
    ...typography.labelSmall,
    color: colors.accentPrimary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  userBio: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  metricsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.md,
    paddingVertical: spacing.sm + 2,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricValue: {
    ...typography.labelLarge,
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  metricLabel: {
    ...typography.labelSmall,
    color: colors.textTertiary,
    fontSize: 11,
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 26,
    backgroundColor: colors.borderSubtle,
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    borderRadius: radii.md,
  },
  editProfileBtnText: {
    ...typography.labelMedium,
    color: colors.accentPrimary,
    fontWeight: '600',
  },
  // Section 2: Manage Habit styles
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.titleSmall,
    color: colors.textPrimary,
  },
  sectionSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  addHabitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accentPrimary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.sm,
  },
  addHabitBtnText: {
    ...typography.labelSmall,
    color: '#101412',
    fontWeight: '700',
    fontSize: 12,
  },
  emptyHabitBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    gap: spacing.xs,
  },
  emptyHabitText: {
    ...typography.labelLarge,
    color: colors.textSecondary,
  },
  emptyHabitSubtext: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    textAlign: 'center',
    maxWidth: 280,
  },
  habitList: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: spacing.md,
  },
  habitItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  habitItemDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  habitLogoCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: `${colors.accentPrimary}15`,
    borderWidth: 1,
    borderColor: `${colors.accentPrimary}30`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  habitMetaCol: {
    flex: 1,
  },
  habitNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  habitNameTitle: {
    ...typography.labelLarge,
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  habitCategoryTag: {
    backgroundColor: colors.surface,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radii.xs,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  habitCategoryText: {
    ...typography.labelSmall,
    color: colors.textTertiary,
    fontSize: 10,
  },
  habitSubtitleText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  habitQuantityText: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    fontSize: 11,
    marginTop: 2,
  },
  habitEditBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Section 3: Data Sovereignty & Backups
  actionsContainer: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  rowContent: {
    flex: 1,
  },
  rowTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowTitle: {
    ...typography.labelLarge,
    fontSize: 14,
  },
  scopeTag: {
    backgroundColor: `${colors.accentPrimary}15`,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radii.xs,
  },
  scopeTagText: {
    ...typography.labelSmall,
    color: colors.accentPrimary,
    fontSize: 10,
  },
  rowDesc: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
    fontSize: 12,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.sm,
  },
  metaText: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    fontSize: 11,
  },
  // Section 4: Danger Zone styles
  dangerCard: {
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.md,
    borderColor: `${colors.danger}30`,
    backgroundColor: '#151212',
  },
  dangerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dangerHeaderIcon: {
    width: 32,
    height: 32,
    borderRadius: radii.xs,
    backgroundColor: `${colors.danger}18`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerTextCol: {
    flex: 1,
  },
  dangerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dangerActionTitle: {
    ...typography.labelLarge,
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  dangerTag: {
    backgroundColor: `${colors.danger}20`,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: radii.xs,
  },
  dangerTagText: {
    ...typography.labelSmall,
    color: colors.danger,
    fontSize: 9,
    fontWeight: '700',
  },
  dangerActionDesc: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 14,
    marginTop: 1,
  },
  clearAppBtn: {
    backgroundColor: colors.danger,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearAppBtnText: {
    ...typography.labelSmall,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 11,
  },
  // Section 5: App Information styles
  infoCard: {
    marginBottom: spacing.xl,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm,
  },
  infoTitle: {
    ...typography.labelMedium,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  infoKey: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  infoVal: {
    ...typography.labelMedium,
    color: colors.textPrimary,
  },
  replayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 6,
  },
  replayLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  replayText: {
    ...typography.labelMedium,
    color: colors.brand.mint,
    fontSize: 13,
  },
});
