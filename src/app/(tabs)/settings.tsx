import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper, Card, Badge, Button } from '@/components/common';
import { RestoreModal } from '@/components/settings/RestoreModal';
import { colors, radii, spacing, typography } from '@/theme';
import { useBehaviors } from '@/context/BehaviorContext';
import { exportFile, pickAndReadFile } from '@/utils/fileExport';
import { toDayString, getCurrentIsoTimestamp, formatFriendlyDate } from '@/utils/date';
import type { BehavBackupFile, RestoreResult } from '@/db';

export default function SettingsScreen() {
  const {
    createBackupData,
    validateBackupContent,
    restoreBackupData,
    exportLogsCsv,
    exportBehaviorsCsv,
  } = useBehaviors();

  // Export / Restore UI states
  const [isExportingJson, setIsExportingJson] = useState(false);
  const [isExportingLogsCsv, setIsExportingLogsCsv] = useState(false);
  const [isExportingBehaviorsCsv, setIsExportingBehaviorsCsv] = useState(false);
  const [isReadingFile, setIsReadingFile] = useState(false);

  // Status & Feedback banners
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Restore Modal states
  const [restoreModalVisible, setRestoreModalVisible] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<BehavBackupFile | null>(null);
  const [selectedFilename, setSelectedFilename] = useState<string>('');

  // Track last backup time in memory
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(null);

  /**
   * Handle JSON Backup creation and export
   */
  const handleExportJson = async () => {
    setIsExportingJson(true);
    setStatusMessage(null);

    try {
      const backup = await createBackupData();
      const today = toDayString();
      const filename = `behav-backup-${today}.json`;
      const jsonContent = JSON.stringify(backup, null, 2);

      const result = await exportFile(jsonContent, filename, 'application/json');

      if (result.success) {
        const now = getCurrentIsoTimestamp();
        setLastBackupTime(now);
        setStatusMessage({
          type: 'success',
          text: `Backup verified and saved: ${filename} (${backup.data.behaviors.length} habits, ${backup.data.log_entries.length} logs).`,
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: result.error || 'Failed to export backup file.',
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Failed to generate backup.',
      });
    } finally {
      setIsExportingJson(false);
    }
  };

  /**
   * Handle Document Picking and Validation for Restore
   */
  const handlePickAndRestore = async () => {
    setIsReadingFile(true);
    setStatusMessage(null);

    try {
      const pickResult = await pickAndReadFile(['application/json', 'text/json', '*/*']);

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

      const validation = validateBackupContent(pickResult.content);

      if (!validation.isValid || !validation.backup) {
        setStatusMessage({
          type: 'error',
          text: validation.error || 'Invalid backup file format.',
        });
        setIsReadingFile(false);
        return;
      }

      setSelectedBackup(validation.backup);
      setSelectedFilename(pickResult.filename || 'backup.json');
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
  const handleConfirmRestore = async (mode: 'merge' | 'replace'): Promise<RestoreResult> => {
    if (!selectedBackup) {
      throw new Error('No backup selected for restore.');
    }
    const result = await restoreBackupData(selectedBackup, mode);
    setStatusMessage({
      type: 'success',
      text: `Restore complete: ${result.restoredBehaviors} habits, ${result.restoredLogs} logs (${mode} mode).`,
    });
    return result;
  };

  /**
   * Export Activity Logs to CSV
   */
  const handleExportLogsCsv = async () => {
    setIsExportingLogsCsv(true);
    setStatusMessage(null);

    try {
      const csv = await exportLogsCsv();
      const today = toDayString();
      const filename = `behav-activity-logs-${today}.csv`;

      const result = await exportFile(csv, filename, 'text/csv');

      if (result.success) {
        setStatusMessage({
          type: 'success',
          text: `Activity logs CSV saved: ${filename}`,
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: result.error || 'Failed to export logs CSV.',
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Failed to export activity logs.',
      });
    } finally {
      setIsExportingLogsCsv(false);
    }
  };

  /**
   * Export Habits List to CSV
   */
  const handleExportBehaviorsCsv = async () => {
    setIsExportingBehaviorsCsv(true);
    setStatusMessage(null);

    try {
      const csv = await exportBehaviorsCsv();
      const today = toDayString();
      const filename = `behav-habits-${today}.csv`;

      const result = await exportFile(csv, filename, 'text/csv');

      if (result.success) {
        setStatusMessage({
          type: 'success',
          text: `Habits list CSV saved: ${filename}`,
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: result.error || 'Failed to export habits CSV.',
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Failed to export habits list.',
      });
    } finally {
      setIsExportingBehaviorsCsv(false);
    }
  };

  return (
    <ScreenWrapper scrollable>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>
          Data portability, backups, and app controls
        </Text>
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

      {/* Section 1: JSON Backup & Restore */}
      <Card style={styles.contentCard}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.sectionTitle}>Full Data Backup</Text>
            <Text style={styles.sectionSubtitle}>
              Complete versioned snapshot of habits, logs, and goals
            </Text>
          </View>
          <Badge label="JSON v1" variant="lavender" />
        </View>

        <View style={styles.backupActions}>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={handleExportJson}
            disabled={isExportingJson}
            activeOpacity={0.7}
          >
            <View style={styles.rowIcon}>
              {isExportingJson ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="cloud-upload-outline" size={20} color={colors.primary} />
              )}
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>Export JSON Backup</Text>
              <Text style={styles.rowDesc}>
                Save complete database to device storage, Google Drive, or share
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.actionRow}
            onPress={handlePickAndRestore}
            disabled={isReadingFile}
            activeOpacity={0.7}
          >
            <View style={styles.rowIcon}>
              {isReadingFile ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="cloud-download-outline" size={20} color={colors.primary} />
              )}
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>Restore from Backup</Text>
              <Text style={styles.rowDesc}>
                Preview records and safely merge or replace existing data
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.metaText}>
            {lastBackupTime
              ? `Last exported: ${formatFriendlyDate(lastBackupTime.slice(0, 10))} at ${lastBackupTime.slice(11, 16)}`
              : 'No backup exported during this session'}
          </Text>
        </View>
      </Card>

      {/* Section 2: CSV Spreadsheet Export */}
      <Card style={styles.contentCard}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.sectionTitle}>Spreadsheet Export</Text>
            <Text style={styles.sectionSubtitle}>
              Standard CSV format for Excel, Sheets, or custom analysis
            </Text>
          </View>
          <Badge label="CSV" variant="sage" />
        </View>

        <View style={styles.backupActions}>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={handleExportLogsCsv}
            disabled={isExportingLogsCsv}
            activeOpacity={0.7}
          >
            <View style={[styles.rowIcon, { backgroundColor: colors.sage }]}>
              {isExportingLogsCsv ? (
                <ActivityIndicator size="small" color={colors.sageText} />
              ) : (
                <Ionicons name="document-text-outline" size={20} color={colors.sageText} />
              )}
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>Export Activity Logs (CSV)</Text>
              <Text style={styles.rowDesc}>
                All logged timestamps, quantities, habits, and notes
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.actionRow}
            onPress={handleExportBehaviorsCsv}
            disabled={isExportingBehaviorsCsv}
            activeOpacity={0.7}
          >
            <View style={[styles.rowIcon, { backgroundColor: colors.sage }]}>
              {isExportingBehaviorsCsv ? (
                <ActivityIndicator size="small" color={colors.sageText} />
              ) : (
                <Ionicons name="list-outline" size={20} color={colors.sageText} />
              )}
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>Export Habits & Limits (CSV)</Text>
              <Text style={styles.rowDesc}>
                Definitions, daily consumption limits, and status
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>
      </Card>

      {/* Section 3: Data Safety Notice */}
      <Card variant="subtle" style={styles.contentCard}>
        <View style={styles.noticeHeader}>
          <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
          <Text style={styles.infoTitle}>Data Ownership & Device Safety</Text>
        </View>
        <Text style={styles.infoText}>
          Behav operates strictly offline. All tracking records are stored exclusively in your device's
          local SQLite database. There are no remote servers, background analytics, or cloud sync.
        </Text>
        <View style={styles.warningCallout}>
          <Ionicons name="alert-circle-outline" size={18} color={colors.peachText} />
          <Text style={styles.warningCalloutText}>
            Important: A backup stored only on this phone will be lost if your device is damaged, lost,
            or reset. Please use the system share sheet to transfer your exported backups to external storage,
            Google Drive, or your personal computer.
          </Text>
        </View>
      </Card>

      {/* Section 4: About Behav */}
      <Card variant="subtle">
        <Text style={styles.infoTitle}>About Behav</Text>
        <View style={styles.specRow}>
          <Text style={styles.specKey}>Application Version</Text>
          <Text style={styles.specValue}>1.0.0 (MVP)</Text>
        </View>
        <View style={styles.specRow}>
          <Text style={styles.specKey}>Expo SDK</Text>
          <Text style={styles.specValue}>58.0.0</Text>
        </View>
        <View style={styles.specRow}>
          <Text style={styles.specKey}>Persistence Engine</Text>
          <Text style={styles.specValue}>Local SQLite</Text>
        </View>
        <View style={styles.specRow}>
          <Text style={styles.specKey}>Backup Schema</Text>
          <Text style={styles.specValue}>v1 (JSON)</Text>
        </View>
      </Card>

      {/* Restore Preview & Confirmation Modal */}
      <RestoreModal
        visible={restoreModalVisible}
        backup={selectedBackup}
        filename={selectedFilename}
        onClose={() => setRestoreModalVisible(false)}
        onConfirmRestore={handleConfirmRestore}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  title: {
    ...typography.titleLarge,
  },
  subtitle: {
    ...typography.bodyMedium,
    marginTop: spacing.xs,
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
    backgroundColor: colors.sage,
  },
  feedbackError: {
    backgroundColor: colors.peach,
  },
  feedbackText: {
    ...typography.bodySmall,
    flex: 1,
    lineHeight: 18,
  },
  contentCard: {
    marginBottom: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.titleSmall,
  },
  sectionSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  backupActions: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
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
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  rowContent: {
    flex: 1,
  },
  rowTitle: {
    ...typography.labelLarge,
    fontSize: 14,
  },
  rowDesc: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: 6,
  },
  metaText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 12,
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  infoTitle: {
    ...typography.titleSmall,
    fontSize: 15,
  },
  infoText: {
    ...typography.bodyMedium,
    fontSize: 13,
    lineHeight: 18,
  },
  warningCallout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.peach,
    borderRadius: radii.sm,
    padding: spacing.sm,
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  warningCalloutText: {
    ...typography.bodySmall,
    color: colors.peachText,
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  specKey: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  specValue: {
    ...typography.labelSmall,
    color: colors.textPrimary,
  },
});
