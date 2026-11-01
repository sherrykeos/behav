import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, typography } from '@/theme';
import type { RecordBounds } from '@/db';

interface ClearDataModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirmClear: () => Promise<void>;
  onShortcutBackup: () => Promise<boolean>;
  recordBounds: RecordBounds;
  habitCount: number;
}

export const ClearDataModal: React.FC<ClearDataModalProps> = ({
  visible,
  onClose,
  onConfirmClear,
  onShortcutBackup,
  recordBounds,
  habitCount,
}) => {
  const [confirmInput, setConfirmInput] = useState('');
  const [isClearing, setIsClearing] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupSuccess, setBackupSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConfirmed = confirmInput.trim().toUpperCase() === 'CLEAR';

  const handleResetModal = () => {
    setConfirmInput('');
    setIsClearing(false);
    setIsBackingUp(false);
    setBackupSuccess(false);
    setError(null);
    onClose();
  };

  const handleBackupShortcut = async () => {
    setIsBackingUp(true);
    setError(null);
    try {
      const ok = await onShortcutBackup();
      if (ok) {
        setBackupSuccess(true);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to generate backup.');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleClear = async () => {
    if (!isConfirmed) return;
    setIsClearing(true);
    setError(null);
    try {
      await onConfirmClear();
      handleResetModal();
    } catch (err: any) {
      setError(err?.message || 'Failed to clear app data.');
      setIsClearing(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleResetModal}
    >
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardContainer}
        >
          <View style={styles.modalCard}>
            {/* Top specular reflection line */}
            <View style={styles.sheenLine} />

            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.headerTitleGroup}>
                <View style={styles.dangerIconBadge}>
                  <Ionicons name="trash" size={16} color={colors.danger} />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Clear All App Data</Text>
                  <Text style={styles.modalSubtitle}>Irreversible database reset</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={handleResetModal}
                style={styles.closeBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              bounces={false}
            >
              {/* Warning & Data Impact Summary */}
              <View style={styles.warningContainer}>
                <Text style={styles.warningText}>
                  All habits, streaks, daily records, and logs will be permanently deleted from this device.
                </Text>

                <View style={styles.impactStrip}>
                  <View style={styles.impactCol}>
                    <Text style={styles.impactNumber}>{habitCount}</Text>
                    <Text style={styles.impactLabel}>Habits</Text>
                  </View>
                  <View style={styles.impactDivider} />
                  <View style={styles.impactCol}>
                    <Text style={styles.impactNumber}>{recordBounds.recordedDaysCount}</Text>
                    <Text style={styles.impactLabel}>Days Tracked</Text>
                  </View>
                  <View style={styles.impactDivider} />
                  <View style={styles.impactCol}>
                    <Text style={styles.impactNumber}>{recordBounds.totalEntries}</Text>
                    <Text style={styles.impactLabel}>Log Records</Text>
                  </View>
                </View>
              </View>

              {/* Safety Net: Backup First CTA Banner */}
              {backupSuccess ? (
                <View style={styles.backupSuccessBanner}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.accentPrimary} />
                  <Text style={styles.backupSuccessText}>
                    Backup safely exported to device
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.backupPromptBanner}
                  onPress={handleBackupShortcut}
                  disabled={isBackingUp}
                  activeOpacity={0.8}
                >
                  <View style={styles.backupPromptLeft}>
                    <Ionicons name="shield-checkmark" size={16} color={colors.accentPrimary} />
                    <Text style={styles.backupPromptText}>
                      {isBackingUp ? 'Exporting backup...' : 'Recommended: Save a backup first'}
                    </Text>
                  </View>
                  {isBackingUp ? (
                    <ActivityIndicator size="small" color={colors.accentPrimary} />
                  ) : (
                    <View style={styles.backupActionTag}>
                      <Ionicons name="download-outline" size={12} color="#101412" />
                      <Text style={styles.backupActionTagText}>Backup</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}

              {/* Error Banner */}
              {error && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={15} color={colors.danger} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Type CLEAR Authorization */}
              <View style={styles.confirmSection}>
                <View style={styles.confirmHeaderRow}>
                  <Text style={styles.confirmPrompt}>
                    Type <Text style={styles.clearKeyword}>CLEAR</Text> to authorize:
                  </Text>
                  {isConfirmed && (
                    <View style={styles.confirmedPill}>
                      <Ionicons name="checkmark" size={11} color={colors.danger} />
                      <Text style={styles.confirmedPillText}>Confirmed</Text>
                    </View>
                  )}
                </View>

                <TextInput
                  style={[
                    styles.confirmInput,
                    isConfirmed && styles.confirmInputConfirmed,
                  ]}
                  value={confirmInput}
                  onChangeText={setConfirmInput}
                  placeholder="CLEAR"
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  editable={!isClearing}
                  maxLength={10}
                />
              </View>

              {/* Action Buttons */}
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={handleResetModal}
                  disabled={isClearing}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelBtnText}>Keep My Data</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.dangerBtn,
                    !isConfirmed && styles.dangerBtnDisabled,
                  ]}
                  onPress={handleClear}
                  disabled={!isConfirmed || isClearing}
                  activeOpacity={0.8}
                >
                  {isClearing ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="trash-outline" size={15} color="#FFFFFF" />
                  )}
                  <Text style={styles.dangerBtnText}>
                    {isClearing ? 'Erasing Data...' : 'Erase Everything'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  keyboardContainer: {
    width: '100%',
    maxWidth: 420,
    justifyContent: 'center',
  },
  modalCard: {
    backgroundColor: '#181E1B',
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: `${colors.danger}40`,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 8,
  },
  sheenLine: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dangerIconBadge: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: `${colors.danger}18`,
    borderWidth: 1,
    borderColor: `${colors.danger}35`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    ...typography.titleSmall,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  modalSubtitle: {
    ...typography.bodySmall,
    color: colors.danger,
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: 12,
    paddingBottom: 14,
    gap: 10,
  },
  warningContainer: {
    backgroundColor: `${colors.danger}0C`,
    borderRadius: radii.md,
    padding: 11,
    borderWidth: 1,
    borderColor: `${colors.danger}25`,
  },
  warningText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 11.5,
    lineHeight: 16,
  },
  impactStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131815',
    borderRadius: radii.sm,
    marginTop: 9,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  impactCol: {
    flex: 1,
    alignItems: 'center',
  },
  impactNumber: {
    ...typography.labelLarge,
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  impactLabel: {
    ...typography.labelSmall,
    color: colors.textTertiary,
    fontSize: 9.5,
    marginTop: 1,
    letterSpacing: 0.3,
  },
  impactDivider: {
    width: 1,
    height: 20,
    backgroundColor: colors.borderSubtle,
  },
  backupPromptBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: `${colors.accentPrimary}0C`,
    borderRadius: radii.md,
    paddingVertical: 9,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: `${colors.accentPrimary}28`,
  },
  backupPromptLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flex: 1,
    marginRight: 8,
  },
  backupPromptText: {
    ...typography.bodySmall,
    color: colors.accentPrimary,
    fontSize: 11.5,
    fontWeight: '500',
  },
  backupActionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accentPrimary,
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: radii.xs,
  },
  backupActionTagText: {
    ...typography.labelSmall,
    color: '#101412',
    fontWeight: '700',
    fontSize: 10.5,
  },
  backupSuccessBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: `${colors.accentPrimary}15`,
    borderRadius: radii.md,
    paddingVertical: 9,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: `${colors.accentPrimary}35`,
  },
  backupSuccessText: {
    ...typography.labelSmall,
    color: colors.accentPrimary,
    fontWeight: '600',
    fontSize: 11.5,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: `${colors.danger}15`,
    padding: 8,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: `${colors.danger}35`,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.danger,
    fontSize: 11,
  },
  confirmSection: {
    gap: 5,
  },
  confirmHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  confirmPrompt: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 11.5,
  },
  clearKeyword: {
    fontWeight: '700',
    color: colors.danger,
  },
  confirmedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: `${colors.danger}18`,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  confirmedPillText: {
    ...typography.labelSmall,
    color: colors.danger,
    fontSize: 9.5,
    fontWeight: '700',
  },
  confirmInput: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    ...typography.bodyMedium,
    color: colors.textPrimary,
    fontSize: 14,
    letterSpacing: 2,
    textAlign: 'center',
    fontWeight: '600',
  },
  confirmInputConfirmed: {
    borderColor: colors.danger,
    backgroundColor: `${colors.danger}12`,
    color: colors.danger,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 2,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.sm,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  cancelBtnText: {
    ...typography.labelMedium,
    color: colors.textSecondary,
    fontSize: 12.5,
    fontWeight: '600',
  },
  dangerBtn: {
    flex: 1.25,
    backgroundColor: colors.danger,
    borderRadius: radii.sm,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dangerBtnDisabled: {
    opacity: 0.35,
    backgroundColor: '#351E1E',
  },
  dangerBtnText: {
    ...typography.labelMedium,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12.5,
  },
});
