import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from '@/components/common/Button';
import { colors, radii, spacing, typography } from '@/theme';
import { type Behavior, type CreateBehaviorInput } from '@/types/database';
import { useBehaviors } from '@/context/BehaviorContext';
import { exportFile } from '@/utils/fileExport';
import { toDayString } from '@/utils/date';

interface BehaviorModalProps {
  visible: boolean;
  behaviorToEdit?: Behavior | null;
  onClose: () => void;
  onSave: (data: CreateBehaviorInput) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

const CATEGORY_SUGGESTIONS = ['Health', 'Focus', 'Habits', 'Wellness', 'Daily'];
const UNIT_SUGGESTIONS = ['times', 'minutes', 'cups', 'pages', 'hours', 'ml'];

export interface HabitLogoOption {
  id: string;
  name: string;
  source: 'ionicons' | 'material';
  icon: string;
}

export const HABIT_LOGO_OPTIONS: HabitLogoOption[] = [
  // Profile logos
  { id: 'leaf', name: 'Leaf', source: 'ionicons', icon: 'leaf' },
  { id: 'flame', name: 'Flame', source: 'ionicons', icon: 'flame' },
  { id: 'water', name: 'Water', source: 'material', icon: 'water' },
  { id: 'fitness', name: 'Fitness', source: 'ionicons', icon: 'fitness' },
  { id: 'sparkles', name: 'Sparkles', source: 'ionicons', icon: 'sparkles' },
  { id: 'heart', name: 'Heart', source: 'ionicons', icon: 'heart' },
  { id: 'star', name: 'Star', source: 'ionicons', icon: 'star' },
  { id: 'compass', name: 'Compass', source: 'ionicons', icon: 'compass' },
  { id: 'person', name: 'Person', source: 'ionicons', icon: 'person' },
  { id: 'moon', name: 'Moon', source: 'ionicons', icon: 'moon' },
  // Common habit logos
  { id: 'smoking', name: 'Smoke', source: 'material', icon: 'smoking' },
  { id: 'cafe', name: 'Coffee', source: 'material', icon: 'coffee' },
  { id: 'wine', name: 'Wine', source: 'material', icon: 'glass-wine' },
  { id: 'beer', name: 'Beer', source: 'material', icon: 'beer' },
  { id: 'food-apple', name: 'Food', source: 'material', icon: 'food-apple' },
  { id: 'controller', name: 'Gaming', source: 'material', icon: 'controller' },
  { id: 'cellphone', name: 'Phone', source: 'material', icon: 'cellphone' },
  { id: 'barbell', name: 'Gym', source: 'material', icon: 'dumbbell' },
  { id: 'walk', name: 'Walk', source: 'material', icon: 'walk' },
  { id: 'bicycle', name: 'Bike', source: 'material', icon: 'bicycle' },
  { id: 'book', name: 'Read', source: 'material', icon: 'book-open-variant' },
  { id: 'bed', name: 'Sleep', source: 'material', icon: 'bed' },
  { id: 'trophy', name: 'Trophy', source: 'ionicons', icon: 'trophy' },
  { id: 'repeat', name: 'Habit', source: 'material', icon: 'repeat' },
];

export function renderHabitLogo(
  iconId?: string | null,
  size = 22,
  color: string = colors.textPrimary
) {
  if (!iconId) {
    return <MaterialCommunityIcons name="repeat" size={size} color={color} />;
  }
  const match = HABIT_LOGO_OPTIONS.find((opt) => opt.id === iconId);
  if (match) {
    if (match.source === 'ionicons') {
      return <Ionicons name={match.icon as any} size={size} color={color} />;
    }
    return <MaterialCommunityIcons name={match.icon as any} size={size} color={color} />;
  }
  return <Ionicons name={iconId as any} size={size} color={color} />;
}

export const BehaviorModal: React.FC<BehaviorModalProps> = ({
  visible,
  behaviorToEdit,
  onClose,
  onSave,
  onDelete,
}) => {
  const { createBackupData, deleteBehavior } = useBehaviors();

  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [category, setCategory] = useState('');
  const [unit, setUnit] = useState('times');
  const [dailyLimit, setDailyLimit] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<string>('repeat');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Deletion & Warning states
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);

  useEffect(() => {
    if (visible) {
      if (behaviorToEdit) {
        setName(behaviorToEdit.name);
        setNickname(behaviorToEdit.nickname || '');
        setSubtitle(behaviorToEdit.subtitle || '');
        setCategory(behaviorToEdit.category || '');
        setUnit(behaviorToEdit.unit || 'times');
        setDailyLimit(behaviorToEdit.dailyLimit ? String(behaviorToEdit.dailyLimit) : '');
        setDescription(behaviorToEdit.description || '');
        setSelectedIcon(behaviorToEdit.icon || 'repeat');
      } else {
        setName('');
        setNickname('');
        setSubtitle('');
        setCategory('');
        setUnit('times');
        setDailyLimit('');
        setDescription('');
        setSelectedIcon('repeat');
      }
      setError(null);
      setShowDeleteWarning(false);
      setIsDeleting(false);
      setIsBackingUp(false);
    }
  }, [behaviorToEdit, visible]);

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    const trimmedNickname = nickname.trim();
    if (!trimmedName && !trimmedNickname) {
      setError('Habit name or nickname is required.');
      return;
    }

    let parsedLimit: number | null = null;
    if (dailyLimit.trim()) {
      const num = Number(dailyLimit.trim());
      if (isNaN(num) || num <= 0) {
        setError('Daily target/limit must be a positive number.');
        return;
      }
      parsedLimit = num;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave({
        name: trimmedName || trimmedNickname,
        nickname: trimmedNickname || null,
        subtitle: subtitle.trim() || null,
        category: category.trim() || null,
        unit: unit.trim() || 'times',
        dailyLimit: parsedLimit,
        description: description.trim() || null,
        icon: selectedIcon || null,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save behavior.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Delete habit directly without backup
   */
  const handleDirectDelete = async () => {
    if (!behaviorToEdit) return;
    setIsDeleting(true);
    setError(null);
    try {
      if (onDelete) {
        await onDelete(behaviorToEdit.id);
      } else {
        await deleteBehavior(behaviorToEdit.id);
      }
      setShowDeleteWarning(false);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete habit.');
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Export backup file first, then delete habit
   */
  const handleBackupAndDelete = async () => {
    if (!behaviorToEdit) return;
    setIsBackingUp(true);
    setError(null);
    try {
      const backup = await createBackupData();
      const today = toDayString();
      const habitSlug = (behaviorToEdit.nickname || behaviorToEdit.name)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-');
      const filename = `Behav-Backup-BeforeDeleting-${habitSlug}-${today}.json`;
      const jsonContent = JSON.stringify(backup, null, 2);

      const result = await exportFile(jsonContent, filename, 'application/json');
      if (!result.success && result.error && !result.uri) {
        throw new Error(result.error || 'Failed to export backup file before deleting.');
      }

      // Proceed to delete
      setIsDeleting(true);
      if (onDelete) {
        await onDelete(behaviorToEdit.id);
      } else {
        await deleteBehavior(behaviorToEdit.id);
      }
      setShowDeleteWarning(false);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Backup before delete failed.');
    } finally {
      setIsBackingUp(false);
      setIsDeleting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>
                {behaviorToEdit ? 'Modify Habit' : 'New Habit'}
              </Text>
              <Text style={styles.subtitle}>
                Configure nickname, target quantity & home tab logo
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close modal">
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color={colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Habit Logo Selector */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Habit Logo (Used in Home Tab)</Text>
              <View style={styles.logoPreviewRow}>
                <View style={styles.selectedLogoCircle}>
                  {renderHabitLogo(selectedIcon, 28, colors.accentPrimary)}
                </View>
                <View style={styles.selectedLogoTextCol}>
                  <Text style={styles.selectedLogoTitle}>
                    {HABIT_LOGO_OPTIONS.find((o) => o.id === selectedIcon)?.name || 'Custom Logo'}
                  </Text>
                  <Text style={styles.selectedLogoDesc}>
                    This logo will identify this habit in the Home and Profile tabs
                  </Text>
                </View>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.logoOptionsScroll}
              >
                {HABIT_LOGO_OPTIONS.map((opt) => {
                  const isSelected = selectedIcon === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[
                        styles.logoOptionCard,
                        isSelected && styles.logoOptionCardActive,
                      ]}
                      onPress={() => setSelectedIcon(opt.id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.logoOptionIconBox}>
                        {renderHabitLogo(
                          opt.id,
                          20,
                          isSelected ? colors.accentPrimary : colors.textSecondary
                        )}
                      </View>
                      <Text
                        style={[
                          styles.logoOptionLabel,
                          isSelected && styles.logoOptionLabelActive,
                        ]}
                        numberOfLines={1}
                      >
                        {opt.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Habit Name */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Habit Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Smoking, Coffee, Meditation, Reading"
                placeholderTextColor={colors.textTertiary}
                value={name}
                onChangeText={(val) => {
                  setName(val);
                  if (error) setError(null);
                }}
                maxLength={60}
              />
            </View>

            {/* Nickname / Display Label */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Nickname / Display Label (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Morning Vape, Espresso Shot, 20m Walk"
                placeholderTextColor={colors.textTertiary}
                value={nickname}
                onChangeText={setNickname}
                maxLength={60}
              />
              <Text style={styles.helperText}>
                Custom nickname will be prioritized on your Home tab habit card.
              </Text>
            </View>

            {/* Subtitle */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Subtitle (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Keep it down, Drink 2L daily, Focus mindset"
                placeholderTextColor={colors.textTertiary}
                value={subtitle}
                onChangeText={setSubtitle}
                maxLength={80}
              />
              <Text style={styles.helperText}>
                Displayed directly below your nickname on the Home tab card.
              </Text>
            </View>

            {/* Daily Target / Limit Quantity */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Daily Target / Limit Quantity (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 5, 20, 2"
                placeholderTextColor={colors.textTertiary}
                value={dailyLimit}
                onChangeText={(val) => {
                  setDailyLimit(val);
                  if (error) setError(null);
                }}
                keyboardType="numeric"
              />
              <Text style={styles.helperText}>
                Threshold for daily status and progress tracking.
              </Text>
            </View>

            {/* Measurement Unit */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Measurement Unit</Text>
              <TextInput
                style={styles.input}
                placeholder="times, minutes, cups, pages, ml"
                placeholderTextColor={colors.textTertiary}
                value={unit}
                onChangeText={setUnit}
                maxLength={30}
              />
              <View style={styles.chipsRow}>
                {UNIT_SUGGESTIONS.map((u) => (
                  <Pressable
                    key={u}
                    onPress={() => setUnit(u)}
                    style={[
                      styles.chip,
                      unit.toLowerCase() === u.toLowerCase() && styles.chipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        unit.toLowerCase() === u.toLowerCase() && styles.chipTextActive,
                      ]}
                    >
                      {u}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Category */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Category (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Health, Focus, Routine"
                placeholderTextColor={colors.textTertiary}
                value={category}
                onChangeText={setCategory}
                maxLength={40}
              />
              <View style={styles.chipsRow}>
                {CATEGORY_SUGGESTIONS.map((cat) => (
                  <Pressable
                    key={cat}
                    onPress={() => setCategory(cat)}
                    style={[
                      styles.chip,
                      category.toLowerCase() === cat.toLowerCase() && styles.chipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        category.toLowerCase() === cat.toLowerCase() && styles.chipTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Description / Intention */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Notes / Intention (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Add notes, cues, or intention..."
                placeholderTextColor={colors.textTertiary}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                maxLength={200}
              />
            </View>

            {/* Save / Cancel Action Buttons */}
            <View style={styles.actionsRow}>
              <Button
                label="Cancel"
                onPress={onClose}
                variant="secondary"
                size="md"
                style={{ flex: 1 }}
              />
              <Button
                label={behaviorToEdit ? 'Save Changes' : 'Create Habit'}
                onPress={handleSubmit}
                variant="primary"
                size="md"
                loading={isSubmitting}
                style={{ flex: 1 }}
              />
            </View>

            {/* Delete Habit Trigger Button (Only in edit mode) */}
            {behaviorToEdit && (
              <View style={styles.deleteSection}>
                <TouchableOpacity
                  style={styles.deleteTriggerBtn}
                  onPress={() => setShowDeleteWarning(true)}
                  activeOpacity={0.7}
                  disabled={isSubmitting || isDeleting || isBackingUp}
                >
                  <Ionicons name="trash-outline" size={17} color={colors.danger} />
                  <Text style={styles.deleteTriggerText}>Delete Habit</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          {/* Delete Confirmation & Backup Warning Dialog */}
          <Modal
            visible={showDeleteWarning}
            transparent
            animationType="fade"
            onRequestClose={() => {
              if (!isDeleting && !isBackingUp) setShowDeleteWarning(false);
            }}
          >
            <View style={styles.warningOverlay}>
              <View style={styles.warningCard}>
                {/* Warning Icon Badge */}
                <View style={styles.warningBadge}>
                  <Ionicons name="alert-circle" size={32} color={colors.danger} />
                </View>

                <Text style={styles.warningTitle}>
                  Delete "{behaviorToEdit?.nickname || behaviorToEdit?.name}"?
                </Text>

                <Text style={styles.warningDesc}>
                  This action will permanently delete this habit and all its logged activity records
                  from your device. This cannot be undone.
                </Text>

                {/* Backup Recommendation Box */}
                <View style={styles.backupCallout}>
                  <Ionicons name="shield-checkmark" size={18} color={colors.accentPrimary} />
                  <Text style={styles.backupCalloutText}>
                    You can save a full JSON backup right now before deleting to keep your historical
                    records safe.
                  </Text>
                </View>

                {/* Action Buttons */}
                <View style={styles.warningActions}>
                  {/* Backup & Delete */}
                  <TouchableOpacity
                    style={[styles.backupDeleteBtn, (isBackingUp || isDeleting) && styles.btnDisabled]}
                    onPress={handleBackupAndDelete}
                    disabled={isBackingUp || isDeleting}
                    activeOpacity={0.7}
                  >
                    {isBackingUp ? (
                      <ActivityIndicator size="small" color="#101412" />
                    ) : (
                      <>
                        <Ionicons name="cloud-upload" size={18} color="#101412" />
                        <Text style={styles.backupDeleteBtnText}>Backup & Delete</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  {/* Delete without backup */}
                  <TouchableOpacity
                    style={[styles.directDeleteBtn, (isBackingUp || isDeleting) && styles.btnDisabled]}
                    onPress={handleDirectDelete}
                    disabled={isBackingUp || isDeleting}
                    activeOpacity={0.7}
                  >
                    {isDeleting ? (
                      <ActivityIndicator size="small" color={colors.dangerText} />
                    ) : (
                      <>
                        <Ionicons name="trash-outline" size={16} color={colors.dangerText} />
                        <Text style={styles.directDeleteBtnText}>Delete Without Backup</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  {/* Cancel */}
                  <TouchableOpacity
                    style={styles.warningCancelBtn}
                    onPress={() => setShowDeleteWarning(false)}
                    disabled={isBackingUp || isDeleting}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.warningCancelText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.titleMedium,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.dangerLight,
    padding: spacing.sm,
    borderRadius: radii.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.dangerText,
    flex: 1,
  },
  formGroup: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  logoPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.md,
    padding: spacing.sm,
    gap: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  selectedLogoCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${colors.accentPrimary}1A`,
    borderWidth: 1.5,
    borderColor: colors.accentPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedLogoTextCol: {
    flex: 1,
  },
  selectedLogoTitle: {
    ...typography.labelLarge,
    color: colors.textPrimary,
  },
  selectedLogoDesc: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },
  logoOptionsScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  logoOptionCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    minWidth: 62,
  },
  logoOptionCardActive: {
    borderColor: colors.accentPrimary,
    backgroundColor: `${colors.accentPrimary}15`,
  },
  logoOptionIconBox: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoOptionLabel: {
    ...typography.labelSmall,
    color: colors.textTertiary,
    fontSize: 10,
    marginTop: 2,
  },
  logoOptionLabelActive: {
    color: colors.accentPrimary,
    fontWeight: '600',
  },
  input: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  helperText: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    fontSize: 11,
    marginTop: 4,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  chipActive: {
    backgroundColor: colors.accentPrimarySubtle,
    borderColor: colors.accentPrimary,
  },
  chipText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 12,
  },
  chipTextActive: {
    color: colors.accentPrimary,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  deleteSection: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    alignItems: 'center',
  },
  deleteTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
  },
  deleteTriggerText: {
    ...typography.labelMedium,
    color: colors.danger,
    fontSize: 13,
  },
  // Warning Dialog styles
  warningOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  warningCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: 'center',
  },
  warningBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.dangerLight,
    borderWidth: 1.5,
    borderColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  warningTitle: {
    ...typography.titleMedium,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  warningDesc: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  backupCallout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.accentPrimarySubtle,
    borderWidth: 1,
    borderColor: `${colors.accentPrimary}40`,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  backupCalloutText: {
    ...typography.bodySmall,
    color: colors.sageText,
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  warningActions: {
    width: '100%',
    gap: spacing.sm,
  },
  backupDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accentPrimary,
    paddingVertical: 12,
    borderRadius: radii.md,
  },
  backupDeleteBtnText: {
    ...typography.labelLarge,
    color: '#101412',
    fontWeight: '700',
  },
  directDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: colors.danger,
    paddingVertical: 10,
    borderRadius: radii.md,
  },
  directDeleteBtnText: {
    ...typography.labelMedium,
    color: colors.dangerText,
    fontSize: 13,
  },
  warningCancelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  warningCancelText: {
    ...typography.bodyMedium,
    color: colors.textTertiary,
  },
  btnDisabled: {
    opacity: 0.5,
  },
});
