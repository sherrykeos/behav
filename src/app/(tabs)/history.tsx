import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper, Card, Button, Badge, EmptyState } from '@/components/common';
import { EditLogModal } from '@/components/logging/EditLogModal';
import { QuickLogModal } from '@/components/logging/QuickLogModal';
import { useBehaviors } from '@/context/BehaviorContext';
import { colors, radii, shadows, spacing, typography } from '@/theme';
import {
  type LogEntryWithBehavior,
  type DailyBehaviorSummary,
} from '@/types/database';
import {
  toDayString,
  shiftDayString,
  formatDayHeader,
  formatTimeFriendly,
  formatFriendlyDate,
  combineDateAndTime,
  extractTimeHHmm,
  getCurrentIsoTimestamp,
} from '@/utils/date';

export default function HistoryScreen() {
  const {
    behaviors,
    todayEntries,
    getEntriesForDate,
    getSummariesForDate,
    updateLogEntry,
    deleteLogEntry,
    createLogEntry,
  } = useBehaviors();

  const today = toDayString();
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [entries, setEntries] = useState<LogEntryWithBehavior[]>([]);
  const [summaries, setSummaries] = useState<DailyBehaviorSummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [entryToEdit, setEntryToEdit] = useState<LogEntryWithBehavior | null>(null);
  const [quickLogVisible, setQuickLogVisible] = useState(false);

  // Fetch data for selected date
  const loadDateData = useCallback(async (dateStr: string) => {
    setIsLoading(true);
    try {
      const [fetchedEntries, fetchedSummaries] = await Promise.all([
        getEntriesForDate(dateStr),
        getSummariesForDate(dateStr),
      ]);
      setEntries(fetchedEntries);
      setSummaries(fetchedSummaries);
    } catch (err) {
      console.error('Failed to load history records for date:', dateStr, err);
    } finally {
      setIsLoading(false);
    }
  }, [getEntriesForDate, getSummariesForDate]);

  useEffect(() => {
    loadDateData(selectedDate);
  }, [selectedDate, loadDateData, todayEntries]);

  useFocusEffect(
    useCallback(() => {
      loadDateData(selectedDate);
    }, [loadDateData, selectedDate])
  );

  // Date Navigation
  const handlePrevDay = () => {
    setSelectedDate((prev) => shiftDayString(prev, -1));
  };

  const handleNextDay = () => {
    if (selectedDate < today) {
      setSelectedDate((prev) => shiftDayString(prev, 1));
    }
  };

  const handleGoToToday = () => {
    setSelectedDate(today);
  };

  // Generate 14-day history strip
  const dateStrip = Array.from({ length: 14 }).map((_, index) => {
    const day = shiftDayString(today, -(13 - index));
    const [y, m, d] = day.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dayNum = dateObj.getDate();
    const dayName = dateObj.toLocaleDateString(undefined, { weekday: 'narrow' });
    const isToday = day === today;
    const isSelected = day === selectedDate;

    return {
      dateStr: day,
      dayNum,
      dayName,
      isToday,
      isSelected,
    };
  });

  // Calculate active entries total count
  const totalEntriesCount = entries.length;
  const isSelectedToday = selectedDate === today;

  // Group entries by behavior
  const groupedEntries = entries.reduce<Record<string, { behaviorName: string; unit: string; category: string | null; items: LogEntryWithBehavior[] }>>(
    (acc, entry) => {
      if (!acc[entry.behaviorId]) {
        acc[entry.behaviorId] = {
          behaviorName: entry.behaviorName,
          unit: entry.behaviorUnit,
          category: entry.behaviorCategory,
          items: [],
        };
      }
      acc[entry.behaviorId].items.push(entry);
      return acc;
    },
    {}
  );

  return (
    <ScreenWrapper scrollable>
      {/* Screen Title */}
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
        <Text style={styles.subtitle}>Review and correct recorded activity by date</Text>
      </View>

      {/* Date Navigator Card */}
      <Card style={styles.dateNavCard}>
        <View style={styles.dateNavRow}>
          <Pressable
            onPress={handlePrevDay}
            hitSlop={10}
            style={styles.navArrow}
            accessibilityLabel="Previous day"
          >
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </Pressable>

          <View style={styles.dateCenter}>
            <Text style={styles.dateTitle}>{formatDayHeader(selectedDate)}</Text>
            <Text style={styles.dateSubtitle}>{formatFriendlyDate(selectedDate)}</Text>
          </View>

          <Pressable
            onPress={handleNextDay}
            disabled={isSelectedToday}
            hitSlop={10}
            style={[styles.navArrow, isSelectedToday && styles.navArrowDisabled]}
            accessibilityLabel="Next day"
          >
            <Ionicons
              name="chevron-forward"
              size={22}
              color={isSelectedToday ? colors.textTertiary : colors.textPrimary}
            />
          </Pressable>
        </View>

        {/* 14-Day Quick Strip */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.stripContainer}
        >
          {dateStrip.map((item) => (
            <Pressable
              key={item.dateStr}
              onPress={() => setSelectedDate(item.dateStr)}
              style={[
                styles.stripChip,
                item.isSelected && styles.stripChipSelected,
              ]}
            >
              <Text
                style={[
                  styles.stripDayName,
                  item.isSelected && styles.stripTextSelected,
                ]}
              >
                {item.dayName}
              </Text>
              <Text
                style={[
                  styles.stripDayNum,
                  item.isSelected && styles.stripTextSelected,
                ]}
              >
                {item.dayNum}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {!isSelectedToday && (
          <View style={styles.todayButtonRow}>
            <Button
              label="Return to Today"
              onPress={handleGoToToday}
              variant="secondary"
              size="sm"
              icon={<Ionicons name="calendar-outline" size={14} color={colors.primary} />}
            />
          </View>
        )}
      </Card>

      {/* Content Area */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loadingText}>Loading records...</Text>
        </View>
      ) : totalEntriesCount === 0 ? (
        /* Empty Day State */
        <Card style={styles.emptyCard}>
          <EmptyState
            icon={<Ionicons name="calendar-outline" size={26} color={colors.primary} />}
            title="No Records For This Date"
            description={`No habit occurrences were recorded on ${formatFriendlyDate(selectedDate)}.`}
            actionLabel={behaviors.length > 0 ? "Add Entry on This Date" : undefined}
            onAction={behaviors.length > 0 ? () => setQuickLogVisible(true) : undefined}
          />
        </Card>
      ) : (
        /* Date Data */
        <>
          {/* Day Totals Summary Card */}
          <Card variant="subtle" style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryTitle}>Recorded on this day</Text>
              <Badge label={`${totalEntriesCount} ${totalEntriesCount === 1 ? 'entry' : 'entries'}`} variant="primary" />
            </View>

            <View style={styles.totalsList}>
              {summaries
                .filter((s) => s.totalValue > 0)
                .map((s) => (
                  <View key={s.behaviorId} style={styles.totalRow}>
                    <Text style={styles.totalName}>{s.behaviorName}</Text>
                    <View style={styles.totalValueContainer}>
                      <Text style={styles.totalValueText}>
                        {s.totalValue} {s.behaviorUnit}
                      </Text>
                      {s.dailyLimit !== null && (
                        <Text style={styles.totalLimitText}>
                          (Limit: {s.dailyLimit})
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
            </View>

            <Button
              label="Add Entry on This Date"
              onPress={() => setQuickLogVisible(true)}
              variant="secondary"
              size="sm"
              icon={<Ionicons name="add" size={16} color={colors.primary} />}
              style={styles.addHistoricalBtn}
            />
          </Card>

          {/* Grouped Entries List */}
          <View style={styles.entriesSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Detailed Records</Text>
              <Text style={styles.tapHint}>Tap record to correct or delete</Text>
            </View>

            {Object.entries(groupedEntries).map(([behaviorId, group]) => {
              const totalVal = group.items.reduce((sum, item) => sum + item.value, 0);

              return (
                <Card key={behaviorId} style={styles.groupCard}>
                  {/* Behavior Group Header */}
                  <View style={styles.groupHeader}>
                    <View style={styles.groupHeaderTitleRow}>
                      <Text style={styles.groupBehaviorName}>{group.behaviorName}</Text>
                      {group.category && (
                        <Badge label={group.category} variant="lavender" />
                      )}
                    </View>
                    <Text style={styles.groupTotal}>
                      Total: {totalVal} {group.unit}
                    </Text>
                  </View>

                  {/* Items */}
                  <View style={styles.groupItems}>
                    {group.items.map((entry, idx) => (
                      <Pressable
                        key={entry.id}
                        onPress={() => setEntryToEdit(entry)}
                        style={[
                          styles.entryRow,
                          idx < group.items.length - 1 && styles.entryRowDivider,
                        ]}
                        android_ripple={{ color: colors.surfaceHover }}
                      >
                        <View style={styles.entryLeft}>
                          <Text style={styles.entryValue}>
                            {entry.value} {entry.behaviorUnit}
                          </Text>
                          {entry.note ? (
                            <Text style={styles.entryNote} numberOfLines={1}>
                              "{entry.note}"
                            </Text>
                          ) : null}
                        </View>
                        <View style={styles.entryRight}>
                          <Text style={styles.entryTime}>
                            {formatTimeFriendly(entry.occurredAt)}
                          </Text>
                          <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
                        </View>
                      </Pressable>
                    ))}
                  </View>
                </Card>
              );
            })}
          </View>
        </>
      )}

      {/* Edit Log Modal */}
      <EditLogModal
        visible={entryToEdit !== null}
        entry={entryToEdit}
        onClose={() => setEntryToEdit(null)}
        onSave={async (id, val, occurredAt, note) => {
          await updateLogEntry(id, { value: val, occurredAt, note });
          await loadDateData(selectedDate);
        }}
        onDelete={async (id) => {
          await deleteLogEntry(id);
          await loadDateData(selectedDate);
        }}
      />

      {/* Quick Log Modal for Selected Date */}
      <QuickLogModal
        visible={quickLogVisible}
        behaviors={behaviors}
        onClose={() => setQuickLogVisible(false)}
        onLog={async (bId, val, note) => {
          const currentTime = extractTimeHHmm(getCurrentIsoTimestamp());
          const occurredAt = combineDateAndTime(selectedDate, currentTime);
          await createLogEntry({
            behaviorId: bId,
            value: val,
            occurredAt,
            note,
          });
          await loadDateData(selectedDate);
        }}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    ...typography.titleLarge,
  },
  subtitle: {
    ...typography.bodyMedium,
    marginTop: spacing.xs,
  },
  dateNavCard: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  dateNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  navArrow: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navArrowDisabled: {
    opacity: 0.3,
  },
  dateCenter: {
    alignItems: 'center',
  },
  dateTitle: {
    ...typography.titleMedium,
    fontSize: 18,
  },
  dateSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  stripContainer: {
    flexDirection: 'row',
    gap: spacing.xs + 2,
    paddingVertical: 2,
  },
  stripChip: {
    width: 44,
    height: 52,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  stripChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stripDayName: {
    ...typography.labelSmall,
    fontSize: 10,
    color: colors.textTertiary,
    marginBottom: 2,
  },
  stripDayNum: {
    ...typography.labelLarge,
    fontSize: 14,
    color: colors.textPrimary,
  },
  stripTextSelected: {
    color: colors.textInverse,
  },
  todayButtonRow: {
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  loadingContainer: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  loadingText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  emptyCard: {
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  summaryCard: {
    marginBottom: spacing.md,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  summaryTitle: {
    ...typography.titleSmall,
    fontSize: 15,
  },
  totalsList: {
    marginVertical: spacing.xs,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  totalName: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  totalValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  totalValueText: {
    ...typography.labelLarge,
    fontSize: 14,
    color: colors.primary,
  },
  totalLimitText: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    fontSize: 12,
  },
  addHistoricalBtn: {
    marginTop: spacing.md,
    alignSelf: 'flex-start',
  },
  entriesSection: {
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.titleMedium,
    fontSize: 16,
  },
  tapHint: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    fontSize: 11,
  },
  groupCard: {
    padding: 0,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.surfaceSubtle,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  groupHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  groupBehaviorName: {
    ...typography.labelLarge,
    fontSize: 14,
  },
  groupTotal: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  groupItems: {
    paddingHorizontal: spacing.md,
  },
  entryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  entryRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  entryLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  entryValue: {
    ...typography.labelLarge,
    fontSize: 15,
    color: colors.textPrimary,
  },
  entryNote: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  entryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  entryTime: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    fontSize: 12,
  },
});
