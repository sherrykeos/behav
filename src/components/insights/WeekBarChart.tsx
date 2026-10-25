import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radii, spacing, typography } from '@/theme';
import { type DayBarData } from '@/db';

interface WeekBarChartProps {
  data: DayBarData[];
  dailyLimit?: number | null;
  unit?: string;
}

const MAX_BAR_HEIGHT = 70;

export const WeekBarChart: React.FC<WeekBarChartProps> = ({
  data,
  dailyLimit,
  unit,
}) => {
  const maxVal = Math.max(...data.map((d) => d.total), dailyLimit || 1, 1);

  return (
    <View style={styles.container}>
      <View style={styles.barsRow}>
        {data.map((item) => {
          const barHeight = item.total > 0
            ? Math.max(8, Math.round((item.total / maxVal) * MAX_BAR_HEIGHT))
            : 4;

          const isOverLimit = dailyLimit !== undefined && dailyLimit !== null && item.total > dailyLimit;

          return (
            <View key={item.dateStr} style={styles.barColumn}>
              {/* Value Label */}
              <Text
                style={[
                  styles.valueLabel,
                  item.isToday && styles.valueLabelToday,
                  isOverLimit && styles.valueLabelOver,
                ]}
              >
                {item.total > 0 ? item.total : '—'}
              </Text>

              {/* Bar Track & Fill */}
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    { height: barHeight },
                    item.total === 0 && styles.barZero,
                    item.isToday && styles.barToday,
                    isOverLimit && styles.barOverLimit,
                  ]}
                />
              </View>

              {/* Day Name */}
              <Text style={[styles.dayLabel, item.isToday && styles.dayLabelToday]}>
                {item.dayName}
              </Text>
            </View>
          );
        })}
      </View>

      {dailyLimit !== undefined && dailyLimit !== null && (
        <View style={styles.limitLegend}>
          <View style={styles.limitLegendDot} />
          <Text style={styles.limitLegendText}>
            Daily target: {dailyLimit} {unit || ''}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
  },
  barsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: MAX_BAR_HEIGHT + 36,
    paddingHorizontal: spacing.xs,
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
  },
  valueLabel: {
    ...typography.bodySmall,
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
    height: 16,
  },
  valueLabelToday: {
    color: colors.primary,
    fontWeight: '700',
  },
  valueLabelOver: {
    color: colors.peachText,
    fontWeight: '700',
  },
  barTrack: {
    height: MAX_BAR_HEIGHT,
    width: 22,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  barFill: {
    width: '100%',
    borderRadius: radii.sm,
    backgroundColor: colors.primaryLight,
  },
  barZero: {
    backgroundColor: colors.borderSubtle,
  },
  barToday: {
    backgroundColor: colors.primary,
  },
  barOverLimit: {
    backgroundColor: colors.peach,
    borderWidth: 1,
    borderColor: colors.peachText,
  },
  dayLabel: {
    ...typography.labelSmall,
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 6,
  },
  dayLabelToday: {
    color: colors.primary,
    fontWeight: '700',
  },
  limitLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    gap: 6,
  },
  limitLegendDot: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
  },
  limitLegendText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 12,
  },
});
