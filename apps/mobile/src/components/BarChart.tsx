import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Rect, Line } from 'react-native-svg';
import { colors, typography } from '../theme';

export interface BarDataPoint {
  label: string;
  value: number;
  color?: string;
  isTargetMet?: boolean;
}

interface BarChartProps {
  data: BarDataPoint[];
  height?: number;
  targetValue?: number;
  targetLabel?: string;
  defaultBarColor?: string;
  barWidth?: number;
  showLabels?: boolean;
  style?: ViewStyle;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  height = 120,
  targetValue,
  targetLabel,
  defaultBarColor = colors.primary.base,
  barWidth = 10,
  showLabels = true,
  style
}) => {
  if (!data || data.length === 0) {
    return (
      <View style={[styles.emptyContainer, { height }, style]}>
        <Text style={styles.emptyText}>No data available</Text>
      </View>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), targetValue || 1, 1);
  const chartHeight = height - (showLabels ? 24 : 0);

  return (
    <View style={[styles.container, style]}>
      <View style={{ height: chartHeight, width: '100%' }}>
        <Svg width="100%" height={chartHeight} style={StyleSheet.absoluteFill}>
          {/* Target reference dashed line if supplied */}
          {targetValue !== undefined && (
            <>
              <Line
                x1="0"
                y1={chartHeight - (targetValue / maxValue) * (chartHeight - 10)}
                x2="100%"
                y2={chartHeight - (targetValue / maxValue) * (chartHeight - 10)}
                stroke={colors.text.muted}
                strokeWidth={1}
                strokeDasharray="4 4"
              />
            </>
          )}
        </Svg>

        {/* Bar columns */}
        <View style={styles.barsRow}>
          {data.map((item, index) => {
            const barHeight = Math.max((item.value / maxValue) * (chartHeight - 14), item.value > 0 ? 6 : 2);
            const barColor = item.color || defaultBarColor;

            return (
              <View key={index} style={styles.barCol}>
                <View
                  style={[
                    styles.bar,
                    {
                      width: barWidth,
                      height: barHeight,
                      backgroundColor: item.value > 0 ? barColor : colors.background.border,
                      borderRadius: barWidth / 2
                    }
                  ]}
                />
              </View>
            );
          })}
        </View>

        {targetLabel && (
          <View
            style={[
              styles.targetBadge,
              { top: Math.max(chartHeight - (targetValue! / maxValue) * (chartHeight - 10) - 16, 2) }
            ]}
          >
            <Text style={styles.targetLabel}>{targetLabel}</Text>
          </View>
        )}
      </View>

      {showLabels && (
        <View style={styles.labelsRow}>
          {data.map((item, index) => (
            <Text key={index} style={styles.labelText}>
              {item.label}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: 8
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.surface,
    borderRadius: 12
  },
  emptyText: {
    ...typography.caption,
    color: colors.text.muted
  },
  barsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 8
  },
  barCol: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%'
  },
  bar: {
    minHeight: 3
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    paddingTop: 8
  },
  labelText: {
    ...typography.caption,
    color: colors.text.muted,
    fontSize: 10,
    textAlign: 'center'
  },
  targetBadge: {
    position: 'absolute',
    right: 4,
    backgroundColor: colors.background.elevated,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.background.border
  },
  targetLabel: {
    ...typography.captionBold,
    fontSize: 9,
    color: colors.text.secondary
  }
});
