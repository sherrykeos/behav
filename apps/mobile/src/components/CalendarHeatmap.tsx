import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radii, spacing, typography } from '../theme';
import { DailyReviewStatus } from '@behav/domain';

export interface CalendarDayItem {
  date: string; // YYYY-MM-DD
  dayNumber: number;
  status: DailyReviewStatus;
  quantity: number;
  isToday: boolean;
  isFuture: boolean;
  isOverLimit?: boolean;
}

interface CalendarHeatmapProps {
  days: CalendarDayItem[];
  firstDayOffset?: number; // 0 for Mon, 1 for Tue, ... 6 for Sun
  onSelectDay: (day: CalendarDayItem) => void;
  selectedDate?: string;
}

export const CalendarHeatmap: React.FC<CalendarHeatmapProps> = ({
  days,
  firstDayOffset = 0,
  onSelectDay,
  selectedDate
}) => {
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const getDayStyle = (item: CalendarDayItem, isSelected: boolean) => {
    if (item.isFuture) {
      return {
        backgroundColor: colors.background.surface,
        opacity: 0.35,
        borderColor: 'transparent'
      };
    }

    // Over limit: Coral solid circle
    if (item.isOverLimit || (item.quantity > 0 && item.status === 'LOGGED')) {
      return {
        backgroundColor: '#351818',
        borderColor: isSelected ? colors.text.primary : '#522222',
        borderWidth: isSelected ? 2 : 1
      };
    }

    // Within limit: Mint/green solid circle
    if (item.status === 'CONFIRMED_ZERO' || (item.quantity === 0 && !item.isFuture)) {
      return {
        backgroundColor: '#12261B',
        borderColor: isSelected ? colors.text.primary : '#1B3D2A',
        borderWidth: isSelected ? 2 : 1
      };
    }

    // Not logged / pending
    return {
      backgroundColor: colors.background.surface,
      borderColor: isSelected ? colors.text.primary : colors.background.border,
      borderWidth: isSelected ? 2 : 1
    };
  };

  const getDayTextColor = (item: CalendarDayItem, isSelected: boolean) => {
    if (item.isFuture) return colors.text.muted;
    if (isSelected) return colors.text.primary;

    if (item.isOverLimit || (item.quantity > 0 && item.status === 'LOGGED')) {
      return colors.accents.coral;
    }
    if (item.status === 'CONFIRMED_ZERO' || (item.quantity === 0 && !item.isFuture)) {
      return colors.primary.base;
    }
    return colors.text.secondary;
  };

  // Generate blank spacer slots for the first week of the month
  const spacerSlots = Array.from({ length: firstDayOffset }, (_, i) => i);

  return (
    <View style={styles.container}>
      {/* Weekday headers: Mon Tue Wed Thu Fri Sat Sun */}
      <View style={styles.headerRow}>
        {weekDays.map((wd, idx) => (
          <Text key={idx} style={styles.weekdayLabel}>
            {wd}
          </Text>
        ))}
      </View>

      {/* Days Grid */}
      <View style={styles.grid}>
        {/* Leading empty spacers */}
        {spacerSlots.map((s) => (
          <View key={`spacer-${s}`} style={styles.daySlot} />
        ))}

        {/* Real day items */}
        {days.map((item) => {
          const isSelected = selectedDate === item.date;
          return (
            <View key={item.date} style={styles.daySlot}>
              <TouchableOpacity
                onPress={() => !item.isFuture && onSelectDay(item)}
                disabled={item.isFuture}
                activeOpacity={0.7}
                style={[
                  styles.dayCircle,
                  getDayStyle(item, isSelected)
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    { color: getDayTextColor(item, isSelected) },
                    item.isToday && styles.todayText
                  ]}
                >
                  {item.dayNumber}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      {/* Legend Matching Showcase */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.primary.base }]} />
          <Text style={styles.legendLabel}>Within limit</Text>
        </View>

        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.accents.coral }]} />
          <Text style={styles.legendLabel}>Over limit</Text>
        </View>

        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.background.elevated }]} />
          <Text style={styles.legendLabel}>Not logged</Text>
        </View>

        <View style={styles.legendItem}>
          <View style={styles.legendRing} />
          <Text style={styles.legendLabel}>Selected</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.base,
    marginVertical: spacing.sm
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm
  },
  weekdayLabel: {
    ...typography.caption,
    color: colors.text.muted,
    fontSize: 11,
    width: '14.28%',
    textAlign: 'center'
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center'
  },
  daySlot: {
    width: '14.28%',
    height: 44,
    alignItems: 'center',
    justifyContent: 'center'
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center'
  },
  dayText: {
    ...typography.bodyBold,
    fontSize: 13
  },
  todayText: {
    fontWeight: '800'
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.background.border
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6
  },
  legendRing: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    borderWidth: 1.5,
    borderColor: colors.text.primary,
    marginRight: 6
  },
  legendLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    fontSize: 11
  }
});
