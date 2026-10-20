import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, typography } from '../theme';

export interface HourBin {
  hour: number; // 0 to 23
  count: number;
}

interface HourHistogramChartProps {
  data: HourBin[];
  height?: number;
  highlightPeak?: boolean;
  style?: ViewStyle;
}

export const HourHistogramChart: React.FC<HourHistogramChartProps> = ({
  data,
  height = 140,
  highlightPeak = true,
  style
}) => {
  // Ensure we have all 24 hours
  const full24Hours: HourBin[] = Array.from({ length: 24 }, (_, h) => {
    const existing = data.find((d) => d.hour === h);
    return { hour: h, count: existing ? existing.count : 0 };
  });

  const maxCount = Math.max(...full24Hours.map((d) => d.count), 1);
  const chartHeight = height - 28;

  return (
    <View style={[styles.container, style]}>
      {/* Bars container */}
      <View style={[styles.barsRow, { height: chartHeight }]}>
        {full24Hours.map((item) => {
          const isNonZero = item.count > 0;
          const barHeight = isNonZero
            ? Math.max((item.count / maxCount) * (chartHeight - 10), 8)
            : 3;

          const isPeak = highlightPeak && isNonZero && item.count === maxCount;
          const barColor = isPeak
            ? colors.accents.coral
            : isNonZero
            ? '#E06B6B'
            : colors.background.border;

          return (
            <View key={item.hour} style={styles.barCol}>
              <View
                style={[
                  styles.bar,
                  {
                    height: barHeight,
                    backgroundColor: barColor,
                    opacity: isNonZero ? 1 : 0.4
                  }
                ]}
              />
            </View>
          );
        })}
      </View>

      {/* Axis markers: 12am, 6am, 12pm, 6pm */}
      <View style={styles.axisRow}>
        <Text style={styles.axisLabel}>12am</Text>
        <Text style={styles.axisLabel}>6am</Text>
        <Text style={styles.axisLabel}>12pm</Text>
        <Text style={styles.axisLabel}>6pm</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: 10
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 4
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
    paddingHorizontal: 1.5
  },
  bar: {
    width: '100%',
    maxWidth: 8,
    borderRadius: 3
  },
  axisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.background.border
  },
  axisLabel: {
    ...typography.caption,
    fontSize: 11,
    color: colors.text.muted
  }
});
