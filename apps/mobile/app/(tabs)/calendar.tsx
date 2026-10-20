import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, radii } from '../../src/theme';
import {
  Card,
  Button,
  CalendarHeatmap,
  CalendarDayItem,
  AppIcon,
  BehaviorIconBadge
} from '../../src/components';
import { useAuth } from '../../src/context/AuthContext';
import { useDatabase } from '../../src/context/DatabaseContext';
import { Behavior, DailyReviewStatus } from '@behav/domain';

export default function CalendarDailyReviewScreen() {
  const { user } = useAuth();
  const { behaviorRepo, entryRepo, reviewRepo, goalRepo, recalculateBehavior } = useDatabase();

  const [behaviors, setBehaviors] = useState<Behavior[]>([]);
  const [selectedBehaviorId, setSelectedBehaviorId] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<CalendarDayItem | null>(null);
  const [calendarDays, setCalendarDays] = useState<CalendarDayItem[]>([]);
  const [currentMonthOffset, setCurrentMonthOffset] = useState<number>(0);
  const [firstDayOffset, setFirstDayOffset] = useState<number>(0);

  const loadCalendarData = async () => {
    if (!user) return;
    try {
      const bList = await behaviorRepo.listByUser(user.id, false);
      setBehaviors(bList);

      const activeBId = selectedBehaviorId || (bList.length > 0 ? bList[0].id : '');
      if (!selectedBehaviorId && bList.length > 0) {
        setSelectedBehaviorId(bList[0].id);
      }

      if (!activeBId) return;

      const activeBehavior = bList.find((b) => b.id === activeBId);
      const goals = await goalRepo.listByBehavior(user.id, activeBId);
      const activeGoal = goals[0];

      // Target limit for this behavior
      const dailyTarget = activeGoal ? activeGoal.targetValue : 0;

      // Build month days
      const now = new Date();
      now.setMonth(now.getMonth() + currentMonthOffset);

      const year = now.getFullYear();
      const month = now.getMonth();
      const numDays = new Date(year, month + 1, 0).getDate();

      // First day of this month
      const firstDayDate = new Date(year, month, 1);
      // getDay() gives 0 for Sunday, 1 for Monday... We want 0 for Monday:
      const dayOfWeek = (firstDayDate.getDay() + 6) % 7;
      setFirstDayOffset(dayOfWeek);

      const todayStr = new Date().toISOString().substring(0, 10);
      const items: CalendarDayItem[] = [];

      // Fetch reviews and entries for this month
      const startStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const endStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(numDays).padStart(2, '0')}`;

      const reviews = await reviewRepo.listByBehaviorAndRange(user.id, activeBId, startStr, endStr);
      const reviewsMap = new Map(reviews.map((r) => [r.localDate, r]));

      const entries = await entryRepo.listByBehaviorAndRange(user.id, activeBId, startStr, endStr);
      const entriesMap = new Map<string, number>();
      for (const e of entries) {
        const d = e.occurredAt.substring(0, 10);
        entriesMap.set(d, (entriesMap.get(d) || 0) + e.quantity);
      }

      for (let day = 1; day <= numDays; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isFuture = dateStr > todayStr;
        const isToday = dateStr === todayStr;

        let status: DailyReviewStatus = 'PENDING';
        const qty = entriesMap.get(dateStr) || 0;

        if (qty > 0) {
          status = 'LOGGED';
        } else if (reviewsMap.has(dateStr)) {
          status = reviewsMap.get(dateStr)!.status;
        } else if (!isFuture) {
          status = 'PENDING';
        }

        const isOverLimit = qty > dailyTarget;

        items.push({
          date: dateStr,
          dayNumber: day,
          status,
          quantity: qty,
          isToday,
          isFuture,
          isOverLimit
        });
      }

      setCalendarDays(items);

      // Default select today or first item
      const todayItem = items.find((i) => i.isToday) || items[items.length - 1];
      if (todayItem && !selectedDay) {
        setSelectedDay(todayItem);
      }
    } catch (err) {
      console.error('Failed to load calendar data:', err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadCalendarData();
    }, [user, selectedBehaviorId, currentMonthOffset])
  );

  const handleConfirmZero = async () => {
    if (!user || !selectedBehaviorId || !selectedDay) return;
    try {
      await reviewRepo.upsertReview({
        userId: user.id,
        behaviorId: selectedBehaviorId,
        localDate: selectedDay.date,
        timezone: 'UTC',
        status: 'CONFIRMED_ZERO',
        notes: 'Confirmed zero activity via calendar review'
      });
      await recalculateBehavior(selectedBehaviorId);
      await loadCalendarData();
      Alert.alert('Confirmed', `Marked ${selectedDay.date} as confirmed zero.`);
    } catch {
      Alert.alert('Error', 'Unable to confirm review.');
    }
  };

  const getMonthTitle = () => {
    const d = new Date();
    d.setMonth(d.getMonth() + currentMonthOffset);
    return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  };

  const activeBehavior = behaviors.find((b) => b.id === selectedBehaviorId) || behaviors[0];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header matching showcase: < Calendar */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.backBtn}
        >
          <AppIcon name="chevron-left" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Calendar</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Behavior Selector Dropdown Pill */}
        {behaviors.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.behaviorRow}
          >
            {behaviors.map((b) => {
              const isSelected = b.id === activeBehavior?.id;
              return (
                <TouchableOpacity
                  key={b.id}
                  style={[styles.behaviorPill, isSelected && styles.behaviorPillActive]}
                  onPress={() => {
                    setSelectedBehaviorId(b.id);
                    setSelectedDay(null);
                  }}
                  activeOpacity={0.7}
                >
                  <BehaviorIconBadge
                    icon={b.icon || 'sparkles'}
                    color={b.accentColor}
                    size={14}
                    badgeSize={24}
                  />
                  <Text style={[styles.behaviorPillText, isSelected && { color: colors.text.primary }]}>
                    {b.name}
                  </Text>
                  {isSelected && (
                    <AppIcon name="chevron-down" size={14} color={colors.primary.base} style={{ marginLeft: 4 }} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Month Navigator: < September 2024 > */}
        <View style={styles.monthNavRow}>
          <TouchableOpacity
            onPress={() => setCurrentMonthOffset(currentMonthOffset - 1)}
            style={styles.monthNavBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <AppIcon name="chevron-left" size={18} color={colors.text.muted} />
          </TouchableOpacity>

          <Text style={styles.monthTitle}>{getMonthTitle()}</Text>

          <TouchableOpacity
            onPress={() => currentMonthOffset < 0 && setCurrentMonthOffset(currentMonthOffset + 1)}
            disabled={currentMonthOffset >= 0}
            style={[styles.monthNavBtn, currentMonthOffset >= 0 && { opacity: 0.3 }]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <AppIcon name="chevron-right" size={18} color={colors.text.muted} />
          </TouchableOpacity>
        </View>

        {/* Monthly Calendar Heatmap Grid */}
        <CalendarHeatmap
          days={calendarDays}
          firstDayOffset={firstDayOffset}
          onSelectDay={(day) => setSelectedDay(day)}
          selectedDate={selectedDay?.date}
        />

        {/* Day Review Panel */}
        {selectedDay && (
          <Card style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
              <View>
                <Text style={styles.reviewDate}>{selectedDay.date}</Text>
                <Text style={styles.reviewSubtitle}>
                  {activeBehavior?.name} • {selectedDay.quantity} {activeBehavior?.unit || 'count'}
                </Text>
              </View>

              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      selectedDay.quantity > 0
                        ? colors.accents.coralFaint
                        : colors.primary.faint
                  }
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    {
                      color:
                        selectedDay.quantity > 0
                          ? colors.accents.coral
                          : colors.primary.base
                    }
                  ]}
                >
                  {selectedDay.quantity > 0 ? 'Logged' : 'Within Limit'}
                </Text>
              </View>
            </View>

            {/* Quick Actions for Selected Day */}
            <View style={styles.reviewActions}>
              <Button
                title="Confirm Zero (0)"
                size="sm"
                variant="outline"
                onPress={handleConfirmZero}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title="+ Log Entry"
                size="sm"
                variant="primary"
                onPress={() => router.push(`/behavior/${activeBehavior?.id}/log`)}
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.base
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.border
  },
  backBtn: {
    padding: 4
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text.primary,
    fontSize: 20
  },
  scrollContent: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: 40
  },
  behaviorRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: spacing.sm
  },
  behaviorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
    borderWidth: 1,
    borderRadius: radii.full,
    paddingVertical: 6,
    paddingHorizontal: 12
  },
  behaviorPillActive: {
    backgroundColor: colors.background.highlight,
    borderColor: colors.primary.border
  },
  behaviorPillText: {
    ...typography.captionBold,
    color: colors.text.muted,
    marginLeft: 6
  },
  monthNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginVertical: spacing.xs
  },
  monthNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.background.border
  },
  monthTitle: {
    ...typography.bodyBold,
    color: colors.text.primary,
    fontSize: 16
  },
  reviewCard: {
    marginTop: spacing.md,
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.base
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md
  },
  reviewDate: {
    ...typography.bodyBold,
    color: colors.text.primary,
    fontSize: 16
  },
  reviewSubtitle: {
    ...typography.caption,
    color: colors.text.muted,
    marginTop: 2
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full
  },
  statusBadgeText: {
    ...typography.captionBold,
    fontSize: 11
  },
  reviewActions: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  }
});
