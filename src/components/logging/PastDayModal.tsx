import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radii, spacing, typography } from '@/theme';
import { type Behavior, type DailyBehaviorSummary } from '@/types/database';

interface PastDayModalProps {
  visible: boolean;
  dateStr: string | null;
  behaviors: Behavior[];
  onClose: () => void;
  onSave: (dateStr: string, quantities: Record<string, number>) => Promise<void>;
  onClearDay?: (dateStr: string) => Promise<void>;
  getSummariesForDate: (date: string | Date) => Promise<DailyBehaviorSummary[]>;
}

const renderHabitIcon = (name: string, category?: string | null, customIcon?: string | null) => {
  const lower = (name || '').toLowerCase();
  if (lower.includes('smoke') || lower.includes('smoking') || lower.includes('cigarette') || lower.includes('vape')) {
    return <MaterialCommunityIcons name="smoking" size={22} color={colors.textPrimary} />;
  }
  if (lower.includes('weed') || lower.includes('cannabis') || lower.includes('joint')) {
    return <MaterialCommunityIcons name="cannabis" size={22} color={colors.textPrimary} />;
  }
  if (
    lower.includes('fap') ||
    lower.includes('porn') ||
    lower.includes('masturbat') ||
    lower.includes('relapse') ||
    lower.includes('nofap')
  ) {
    return <MaterialCommunityIcons name="infinity" size={24} color={colors.textPrimary} />;
  }
  if (lower.includes('alcohol') || lower.includes('beer') || lower.includes('wine') || lower.includes('drink')) {
    return <MaterialCommunityIcons name="glass-wine" size={22} color={colors.textPrimary} />;
  }
  if (lower.includes('sugar') || lower.includes('food') || lower.includes('snack') || lower.includes('junk')) {
    return <MaterialCommunityIcons name="food-apple" size={22} color={colors.textPrimary} />;
  }
  if (lower.includes('game') || lower.includes('gaming')) {
    return <MaterialCommunityIcons name="controller" size={22} color={colors.textPrimary} />;
  }
  if (lower.includes('phone') || lower.includes('screen') || lower.includes('social') || lower.includes('scroll')) {
    return <MaterialCommunityIcons name="cellphone" size={22} color={colors.textPrimary} />;
  }
  if (lower.includes('caffeine') || lower.includes('coffee')) {
    return <MaterialCommunityIcons name="coffee" size={22} color={colors.textPrimary} />;
  }
  return <MaterialCommunityIcons name="repeat" size={22} color={colors.textPrimary} />;
};

export const PastDayModal: React.FC<PastDayModalProps> = ({
  visible,
  dateStr,
  behaviors,
  onClose,
  onSave,
  onClearDay,
  getSummariesForDate,
}) => {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [hasExistingRecords, setHasExistingRecords] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch summaries for the selected date when opened
  useEffect(() => {
    if (!visible || !dateStr) {
      setQuantities({});
      setHasExistingRecords(false);
      setError(null);
      return;
    }

    let isMounted = true;
    const loadDateData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const summaries = await getSummariesForDate(dateStr);

        if (!isMounted) return;

        const newQuantities: Record<string, number> = {};
        let foundAnyRecords = false;

        // Map summaries to quantities
        for (const b of behaviors) {
          const match = summaries.find((s) => s.behaviorId === b.id);
          if (match && match.entryCount > 0) {
            newQuantities[b.id] = match.totalValue;
            foundAnyRecords = true;
          } else {
            newQuantities[b.id] = 0;
          }
        }

        setQuantities(newQuantities);
        setHasExistingRecords(foundAnyRecords);
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || 'Failed to load day records');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadDateData();

    return () => {
      isMounted = false;
    };
  }, [visible, dateStr, behaviors, getSummariesForDate]);

  if (!dateStr) return null;

  // Format date display
  const [yearStr, monthStr, dayNumStr] = dateStr.split('-');
  const dateObj = new Date(Number(yearStr), Number(monthStr) - 1, Number(dayNumStr));
  const weekdayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const isToday = dateStr === todayStr;

  // Relative day label
  let relativeLabel = '';
  if (isToday) {
    relativeLabel = 'Today';
  } else {
    const diffMs = new Date(todayStr).getTime() - dateObj.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      relativeLabel = 'Yesterday';
    } else if (diffDays > 1) {
      relativeLabel = `${diffDays} days ago`;
    }
  }

  // Current day status
  const totalLogged = Object.values(quantities).reduce((acc, v) => acc + (v || 0), 0);
  const isAllZeroClean = totalLogged === 0;

  const handleIncrement = (behaviorId: string) => {
    setQuantities((prev) => ({
      ...prev,
      [behaviorId]: (prev[behaviorId] || 0) + 1,
    }));
  };

  const handleDecrement = (behaviorId: string) => {
    setQuantities((prev) => ({
      ...prev,
      [behaviorId]: Math.max(0, (prev[behaviorId] || 0) - 1),
    }));
  };

  const handleSetZero = (behaviorId: string) => {
    setQuantities((prev) => ({
      ...prev,
      [behaviorId]: 0,
    }));
  };

  const handleMarkEntireDayClean = () => {
    const cleanQuantities: Record<string, number> = {};
    for (const b of behaviors) {
      cleanQuantities[b.id] = 0;
    }
    setQuantities(cleanQuantities);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      await onSave(dateStr, quantities);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearDayConfirm = () => {
    if (!onClearDay) return;

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`Clear all records for ${formattedDate}? The day will revert to untracked.`);
      if (confirmed) {
        onClearDay(dateStr).then(() => onClose());
      }
      return;
    }

    Alert.alert(
      'Clear Day Records',
      `Clear all records for ${formattedDate}? The day will revert to untracked.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Day',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsSaving(true);
              await onClearDay(dateStr);
              onClose();
            } catch (err: any) {
              setError(err?.message || 'Failed to clear day');
            } finally {
              setIsSaving(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleCol}>
              <View style={styles.dateBadgeRow}>
                <Text style={styles.weekdayText}>{weekdayName}</Text>
                {!!relativeLabel && (
                  <View style={[styles.relativePill, isToday && styles.todayPill]}>
                    <Text style={[styles.relativePillText, isToday && styles.todayPillText]}>
                      {relativeLabel}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.dateHeading}>{formattedDate}</Text>
            </View>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Status Banner */}
          <View style={styles.statusBannerRow}>
            <View
              style={[
                styles.statusBadge,
                isAllZeroClean ? styles.statusBadgeClean : styles.statusBadgeLogged,
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: isAllZeroClean ? colors.statusGreenDay : colors.statusHabitActivity },
                ]}
              />
              <Text
                style={[
                  styles.statusBadgeText,
                  { color: isAllZeroClean ? colors.statusGreenDay : colors.statusHabitActivity },
                ]}
              >
                {isAllZeroClean ? 'Clean Day (0 Logs)' : `Logged Activity (${totalLogged} total)`}
              </Text>
            </View>

            {hasExistingRecords && (
              <View style={styles.recordedIndicator}>
                <Ionicons name="checkmark-done" size={13} color={colors.textTertiary} />
                <Text style={styles.recordedIndicatorText}>Previously recorded</Text>
              </View>
            )}
          </View>

          {/* Quick Action Pill Bar */}
          <View style={styles.quickActionsBar}>
            <TouchableOpacity
              style={[styles.quickActionPill, styles.cleanAllPill]}
              onPress={handleMarkEntireDayClean}
              activeOpacity={0.7}
            >
              <Ionicons name="shield-checkmark-outline" size={14} color={colors.accentPrimary} />
              <Text style={styles.cleanAllPillText}>Mark Clean (All 0)</Text>
            </TouchableOpacity>

            {hasExistingRecords && onClearDay && (
              <TouchableOpacity
                style={[styles.quickActionPill, styles.clearDayPill]}
                onPress={handleClearDayConfirm}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={13} color={colors.textSecondary} />
                <Text style={styles.clearDayPillText}>Reset Day</Text>
              </TouchableOpacity>
            )}
          </View>

          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Behaviors List */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.accentPrimary} />
              <Text style={styles.loadingText}>Loading day data...</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.habitScrollView}
              contentContainerStyle={styles.habitListContent}
              showsVerticalScrollIndicator={false}
            >
              {behaviors.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No habits currently tracked.</Text>
                </View>
              ) : (
                behaviors.map((behavior) => {
                  const val = quantities[behavior.id] || 0;
                  const isClean = val === 0;

                  return (
                    <View key={behavior.id} style={styles.habitCard}>
                      {/* Left: Icon Box */}
                      <View style={styles.habitIconBox}>
                        {renderHabitIcon(behavior.name, behavior.category, behavior.icon)}
                      </View>

                      {/* Middle: Name & Unit */}
                      <View style={styles.habitInfoCol}>
                        <Text style={styles.habitName} numberOfLines={1}>
                          {behavior.nickname || behavior.name}
                        </Text>
                        <Text style={styles.habitUnitText}>
                          {val} {behavior.unit} {isClean ? '(Clean)' : ''}
                        </Text>
                      </View>

                      {/* Right: Stepper and Clean Pill */}
                      <View style={styles.stepperContainer}>
                        {val > 0 && (
                          <TouchableOpacity
                            style={styles.setZeroButton}
                            onPress={() => handleSetZero(behavior.id)}
                            activeOpacity={0.7}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          >
                            <Text style={styles.setZeroText}>Set 0</Text>
                          </TouchableOpacity>
                        )}

                        <View style={styles.stepperPill}>
                          <TouchableOpacity
                            style={[
                              styles.stepperButton,
                              val <= 0 && styles.stepperButtonDisabled,
                            ]}
                            onPress={() => handleDecrement(behavior.id)}
                            disabled={val <= 0}
                            activeOpacity={0.6}
                          >
                            <Ionicons
                              name="remove"
                              size={14}
                              color={val > 0 ? colors.textPrimary : colors.textTertiary}
                            />
                          </TouchableOpacity>

                          <View style={styles.stepperValueBox}>
                            <Text style={[styles.stepperValueText, isClean && styles.cleanValueText]}>
                              {val}
                            </Text>
                          </View>

                          <TouchableOpacity
                            style={styles.stepperButton}
                            onPress={() => handleIncrement(behavior.id)}
                            activeOpacity={0.6}
                          >
                            <Ionicons name="add" size={14} color={colors.textPrimary} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          )}

          {/* Action Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={isSaving}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={isSaving || isLoading}
              activeOpacity={0.8}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={colors.textInverse} />
              ) : (
                <>
                  <Ionicons name="checkmark" size={17} color={colors.textInverse} />
                  <Text style={styles.saveButtonText}>Save Records</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheetContainer: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '88%',
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  headerTitleCol: {
    flex: 1,
  },
  dateBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  weekdayText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  relativePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  todayPill: {
    backgroundColor: 'rgba(185, 246, 202, 0.16)',
  },
  relativePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  todayPillText: {
    color: colors.accentPrimary,
  },
  dateHeading: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.4,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  statusBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  statusBadgeClean: {
    backgroundColor: 'rgba(185, 246, 202, 0.1)',
    borderColor: 'rgba(185, 246, 202, 0.25)',
  },
  statusBadgeLogged: {
    backgroundColor: 'rgba(255, 179, 0, 0.1)',
    borderColor: 'rgba(255, 179, 0, 0.25)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  recordedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recordedIndicatorText: {
    fontSize: 11,
    color: colors.textTertiary,
  },
  quickActionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.md,
  },
  quickActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  cleanAllPill: {
    backgroundColor: 'rgba(185, 246, 202, 0.12)',
    borderColor: 'rgba(185, 246, 202, 0.35)',
  },
  cleanAllPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accentPrimary,
  },
  clearDayPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  clearDayPillText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 82, 82, 0.12)',
    borderColor: 'rgba(255, 82, 82, 0.3)',
    borderWidth: 1,
    padding: spacing.sm,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12.5,
    fontWeight: '500',
    flex: 1,
  },
  loadingContainer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12.5,
    color: colors.textSecondary,
  },
  habitScrollView: {
    maxHeight: 280,
  },
  habitListContent: {
    gap: 9,
    paddingBottom: spacing.xs,
  },
  emptyState: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: colors.textTertiary,
  },
  habitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  habitIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  habitInfoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  habitName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  habitUnitText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  setZeroButton: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  setZeroText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  stepperPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 16,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  stepperButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonDisabled: {
    opacity: 0.35,
  },
  stepperValueBox: {
    minWidth: 26,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValueText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cleanValueText: {
    color: colors.accentPrimary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  cancelButton: {
    flex: 0.35,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  cancelButtonText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  saveButton: {
    flex: 0.65,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: colors.accentPrimary,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textInverse,
  },
});
