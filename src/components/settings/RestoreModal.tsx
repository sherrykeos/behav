import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Badge } from '@/components/common';
import { colors, radii, shadows, spacing, typography } from '@/theme';
import type { BHFile, RestoreResult, DateCollisionCheckResult } from '@/db';
import { useBehaviors } from '@/context/BehaviorContext';

interface RestoreModalProps {
  visible: boolean;
  backup: BHFile | null;
  filename: string;
  onClose: () => void;
  onConfirmRestore: (mode: 'replace' | 'merge') => Promise<RestoreResult>;
}

export const RestoreModal: React.FC<RestoreModalProps> = ({
  visible,
  backup,
  filename,
  onClose,
  onConfirmRestore,
}) => {
  const { checkDateCollision } = useBehaviors();
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreMode, setRestoreMode] = useState<'replace' | 'merge'>('merge');
  const [result, setResult] = useState<RestoreResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Date collision check state
  const [isCheckingCollision, setIsCheckingCollision] = useState(false);
  const [collisionResult, setCollisionResult] = useState<DateCollisionCheckResult | null>(null);

  useEffect(() => {
    if (visible && backup) {
      let isMounted = true;
      setIsCheckingCollision(true);
      setCollisionResult(null);
      setError(null);

      checkDateCollision(backup)
        .then((res) => {
          if (isMounted) {
            setCollisionResult(res);
            setIsCheckingCollision(false);
          }
        })
        .catch((err) => {
          if (isMounted) {
            console.error('Error checking date collision:', err);
            setIsCheckingCollision(false);
          }
        });

      return () => {
        isMounted = false;
      };
    }
  }, [visible, backup, checkDateCollision]);

  if (!backup) return null;

  const handleRestore = async (mode: 'replace' | 'merge') => {
    setIsRestoring(true);
    setRestoreMode(mode);
    setError(null);
    try {
      const res = await onConfirmRestore(mode);
      setResult(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to restore backup');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleModalClose = () => {
    setResult(null);
    setError(null);
    setIsRestoring(false);
    setCollisionResult(null);
    onClose();
  };

  const behaviorCount = (backup as any).habits?.length ?? (backup as any).data?.behaviors?.length ?? 0;
  const dayCount = (backup as any).days?.length ?? (backup as any).data?.records?.length ?? 0;
  const greenDays = (backup as any).summary?.greenDays;
  const maxStreak = (backup as any).summary?.maxStreak;

  const periodFrom = (backup as any).period?.from || (backup as any).summary?.startDate;
  const periodTo = (backup as any).period?.to || (backup as any).summary?.endDate;

  const hasCollision = !!collisionResult?.hasCollision;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleModalClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {result ? (
            /* Success View */
            <View style={styles.content}>
              <View style={styles.successIconContainer}>
                <Ionicons name="checkmark-circle" size={48} color={colors.accentPrimaryDark} />
              </View>

              <Text style={styles.title}>
                {restoreMode === 'merge' ? 'Data Merged Successfully' : 'Restore Completed'}
              </Text>
              <Text style={styles.subtitle}>
                {restoreMode === 'merge'
                  ? `Your records from ${filename} have been placed according to date alongside your existing history.`
                  : `Your database and history have been successfully reconstructed from ${filename}.`}
              </Text>

              <Card variant="subtle" style={styles.summaryCard}>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Operation Policy</Text>
                  <Text style={styles.statValue}>
                    {restoreMode === 'merge' ? 'Merge (Preserved Existing Data)' : 'Full Replace (Clean State)'}
                  </Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Habits Unified</Text>
                  <Text style={styles.statValue}>{result.restoredBehaviors}</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Activity Records Restored</Text>
                  <Text style={styles.statValue}>{result.restoredLogs}</Text>
                </View>
              </Card>

              <Button
                label="Done"
                variant="primary"
                onPress={handleModalClose}
                style={{ marginTop: spacing.md, width: '100%' }}
              />
            </View>
          ) : (
            /* Preview & Collision Check View */
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.header}>
                <View style={styles.headerTitleRow}>
                  <Text style={styles.title}>Import Backup</Text>
                  <Badge label="JSON Backup" variant="lavender" />
                </View>
                <TouchableOpacity onPress={handleModalClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.filenameText} numberOfLines={1}>
                {filename}
              </Text>

              {/* Counts Preview Card */}
              <Card variant="subtle" style={styles.previewCard}>
                <Text style={styles.previewSectionTitle}>Data in this backup</Text>
                <View style={styles.countsRow}>
                  <View style={styles.countItem}>
                    <Text style={styles.countNumber}>{behaviorCount}</Text>
                    <Text style={styles.countLabel}>Habits</Text>
                  </View>
                  <View style={styles.countDivider} />
                  <View style={styles.countItem}>
                    <Text style={styles.countNumber}>{dayCount}</Text>
                    <Text style={styles.countLabel}>Days</Text>
                  </View>
                  {greenDays !== undefined && (
                    <>
                      <View style={styles.countDivider} />
                      <View style={styles.countItem}>
                        <Text style={styles.countNumber}>{greenDays}</Text>
                        <Text style={styles.countLabel}>Green Days</Text>
                      </View>
                    </>
                  )}
                  {maxStreak !== undefined && (
                    <>
                      <View style={styles.countDivider} />
                      <View style={styles.countItem}>
                        <Text style={styles.countNumber}>{maxStreak}</Text>
                        <Text style={styles.countLabel}>Max Streak</Text>
                      </View>
                    </>
                  )}
                </View>

                {periodFrom && periodTo && (
                  <View style={styles.periodRow}>
                    <Ionicons name="calendar-outline" size={14} color={colors.accentPrimary} />
                    <Text style={styles.periodText}>
                      Period: <Text style={styles.periodDate}>{periodFrom}</Text> to{' '}
                      <Text style={styles.periodDate}>{periodTo}</Text>
                    </Text>
                  </View>
                )}
              </Card>

              {/* Collision Check Status */}
              {isCheckingCollision ? (
                <View style={styles.checkingBox}>
                  <ActivityIndicator size="small" color={colors.accentPrimary} />
                  <Text style={styles.checkingText}>Validating date collisions with local data...</Text>
                </View>
              ) : hasCollision ? (
                /* Collision Alert Box */
                <View style={styles.collisionBox}>
                  <View style={styles.collisionHeaderRow}>
                    <Ionicons name="alert-circle" size={22} color={colors.danger} />
                    <Text style={styles.collisionTitle}>Data Collision Detected</Text>
                  </View>
                  <Text style={styles.collisionDesc}>
                    Cannot merge due to data collision on{' '}
                    <Text style={{ fontWeight: '700', color: colors.textPrimary }}>
                      {collisionResult?.collidingDates.length} date(s)
                    </Text>{' '}
                    (e.g.{' '}
                    {collisionResult?.collidingDates.slice(0, 3).join(', ')}
                    {collisionResult && collisionResult.collidingDates.length > 3 ? '...' : ''}).
                    Merging directly would overwrite or duplicate existing records.
                  </Text>

                  {/* Recommendation Callout */}
                  <View style={styles.recommendationCallout}>
                    <View style={styles.recommendationHeader}>
                      <Ionicons name="sparkles" size={16} color={colors.accentPrimary} />
                      <Text style={styles.recommendationTitle}>Recommendation</Text>
                    </View>
                    <Text style={styles.recommendationText}>
                      Export your current data first and merge with your desired data file using any AI (such as ChatGPT, Claude, or Gemini) to resolve conflicting dates, then import the unified file back into Behav.
                    </Text>
                  </View>
                </View>
              ) : (
                /* Safe to Merge Notice */
                <View style={styles.safeBox}>
                  <View style={styles.safeHeaderRow}>
                    <Ionicons name="checkmark-circle" size={20} color={colors.accentPrimary} />
                    <Text style={styles.safeTitle}>Safe to Merge (No Date Conflicts)</Text>
                  </View>
                  <Text style={styles.safeText}>
                    This file's dates do not overlap with your current data. You can safely merge it and keep both periods placed chronologically without affecting ongoing tracking.
                  </Text>
                </View>
              )}

              {error && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={18} color={colors.peachText} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.actionsColumn}>
                {/* 1. Primary Merge Action */}
                <Button
                  label={
                    isRestoring && restoreMode === 'merge'
                      ? 'Merging Data...'
                      : hasCollision
                      ? 'Cannot Merge (Date Collision)'
                      : 'Merge & Keep Both Datasets'
                  }
                  variant={hasCollision ? 'secondary' : 'primary'}
                  onPress={() => handleRestore('merge')}
                  disabled={isRestoring || isCheckingCollision || hasCollision}
                  loading={isRestoring && restoreMode === 'merge'}
                  style={{ width: '100%' }}
                />

                {/* 2. Secondary Replace or Cancel options */}
                <View style={styles.secondaryActionsRow}>
                  <Button
                    label="Cancel"
                    variant="ghost"
                    onPress={handleModalClose}
                    disabled={isRestoring}
                    style={{ flex: 1 }}
                  />
                  <Button
                    label={
                      isRestoring && restoreMode === 'replace'
                        ? 'Replacing...'
                        : 'Replace All (Wipe)'
                    }
                    variant="danger"
                    size="sm"
                    onPress={() => handleRestore('replace')}
                    disabled={isRestoring || isCheckingCollision}
                    loading={isRestoring && restoreMode === 'replace'}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  container: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.floating,
  },
  content: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    ...typography.titleMedium,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  filenameText: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    fontFamily: 'monospace',
    marginBottom: spacing.md,
  },
  previewCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  previewSectionTitle: {
    ...typography.labelSmall,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  countsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: spacing.xs,
  },
  countItem: {
    alignItems: 'center',
    flex: 1,
  },
  countNumber: {
    ...typography.titleMedium,
    color: colors.textPrimary,
  },
  countLabel: {
    ...typography.labelSmall,
    color: colors.textTertiary,
    fontSize: 10,
    marginTop: 2,
  },
  countDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.borderSubtle,
  },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
    paddingTop: spacing.xs + 2,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    justifyContent: 'center',
  },
  periodText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 12,
  },
  periodDate: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  checkingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.md,
    marginBottom: spacing.md,
  },
  checkingText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  collisionBox: {
    backgroundColor: '#261515',
    borderWidth: 1,
    borderColor: '#542020',
    padding: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.md,
  },
  collisionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    marginBottom: 4,
  },
  collisionTitle: {
    ...typography.labelLarge,
    color: '#FF6B6B',
    fontSize: 14,
  },
  collisionDesc: {
    ...typography.bodySmall,
    color: '#E0ACAC',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  recommendationCallout: {
    marginTop: spacing.sm,
    backgroundColor: 'rgba(185, 246, 202, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(185, 246, 202, 0.25)',
    padding: spacing.sm + 2,
    borderRadius: radii.sm,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  recommendationTitle: {
    ...typography.labelSmall,
    color: colors.accentPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 11,
    fontWeight: '700',
  },
  recommendationText: {
    ...typography.bodySmall,
    color: '#D8F3DC',
    fontSize: 12,
    lineHeight: 17,
  },
  safeBox: {
    backgroundColor: 'rgba(185, 246, 202, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(185, 246, 202, 0.25)',
    padding: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.md,
  },
  safeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    marginBottom: 4,
  },
  safeTitle: {
    ...typography.labelLarge,
    color: colors.accentPrimary,
    fontSize: 14,
  },
  safeText: {
    ...typography.bodySmall,
    color: '#D8F3DC',
    fontSize: 12,
    lineHeight: 17,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.peach,
    padding: spacing.sm,
    borderRadius: radii.sm,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.peachText,
    flex: 1,
    fontSize: 12,
  },
  actionsColumn: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  successIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.sage,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  summaryCard: {
    width: '100%',
    padding: spacing.md,
    marginVertical: spacing.md,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.md,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  statLabel: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    fontSize: 13,
  },
  statValue: {
    ...typography.labelLarge,
    fontSize: 13,
    color: colors.textPrimary,
  },
});
