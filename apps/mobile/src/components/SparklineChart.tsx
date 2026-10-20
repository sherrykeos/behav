import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Line } from 'react-native-svg';
import { colors, typography } from '../theme';

export interface TrendPoint {
  label: string;
  value: number;
  dateStr?: string;
}

interface SparklineChartProps {
  data: TrendPoint[];
  height?: number;
  lineColor?: string;
  fillColor?: string;
  unit?: string;
  style?: ViewStyle;
}

export const SparklineChart: React.FC<SparklineChartProps> = ({
  data,
  height = 160,
  lineColor = colors.accents.coral,
  unit = 'entries',
  style
}) => {
  const [selectedIdx, setSelectedIdx] = useState<number>(Math.max(0, Math.floor(data.length / 2)));

  if (!data || data.length === 0) {
    return (
      <View style={[styles.emptyContainer, { height }, style]}>
        <Text style={styles.emptyText}>No trend data available</Text>
      </View>
    );
  }

  const paddingHorizontal = 20;
  const paddingTop = 28;
  const paddingBottom = 30;
  const graphHeight = height - paddingTop - paddingBottom;
  const graphWidth = 320; // baseline responsive width

  const values = data.map((d) => d.value);
  const maxValue = Math.max(...values, 1);
  const minValue = 0;
  const range = maxValue - minValue || 1;

  const points = data.map((d, i) => {
    const x = paddingHorizontal + (i / Math.max(data.length - 1, 1)) * (graphWidth - paddingHorizontal * 2);
    const y = paddingTop + graphHeight - ((d.value - minValue) / range) * graphHeight;
    return { x, y, ...d };
  });

  // Build SVG path
  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const midX = (prev.x + curr.x) / 2;
    pathD += ` C ${midX} ${prev.y}, ${midX} ${curr.y}, ${curr.x} ${curr.y}`;
  }

  const selectedPoint = points[selectedIdx] || points[0];

  return (
    <View style={[styles.container, style]}>
      {/* Active tooltip badge matching reference */}
      <View style={[styles.tooltipContainer, { left: Math.max(10, selectedPoint.x - 60) }]}>
        <View style={styles.tooltipPill}>
          <Text style={styles.tooltipText}>
            {selectedPoint.dateStr || selectedPoint.label} · {selectedPoint.value} {unit}
          </Text>
        </View>
      </View>

      <View style={{ height, width: '100%' }}>
        <Svg width="100%" height={height} viewBox={`0 0 ${graphWidth} ${height}`}>
          <Defs>
            <LinearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={lineColor} stopOpacity="0.3" />
              <Stop offset="100%" stopColor={lineColor} stopOpacity="0.0" />
            </LinearGradient>
          </Defs>

          {/* Vertical dashed line for selected point */}
          <Line
            x1={selectedPoint.x}
            y1={paddingTop - 6}
            x2={selectedPoint.x}
            y2={paddingTop + graphHeight}
            stroke={colors.background.border}
            strokeWidth={1}
            strokeDasharray="3 3"
          />

          {/* The Smooth Trend Line */}
          <Path
            d={pathD}
            fill="none"
            stroke={lineColor}
            strokeWidth={2.5}
            strokeLinecap="round"
          />

          {/* Data Points */}
          {points.map((p, idx) => (
            <Circle
              key={idx}
              cx={p.x}
              cy={p.y}
              r={idx === selectedIdx ? 5.5 : 3.5}
              fill={idx === selectedIdx ? colors.text.primary : lineColor}
              stroke={colors.background.card}
              strokeWidth={idx === selectedIdx ? 2.5 : 1.5}
            />
          ))}
        </Svg>
      </View>

      {/* X-Axis Labels & Touch targets */}
      <View style={styles.axisRow}>
        {data.map((item, idx) => (
          <TouchableOpacity
            key={idx}
            onPress={() => setSelectedIdx(idx)}
            style={styles.axisItem}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.axisText,
                idx === selectedIdx && { color: colors.text.primary, fontWeight: '700' }
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative'
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.surface,
    borderRadius: 14
  },
  emptyText: {
    ...typography.caption,
    color: colors.text.muted
  },
  tooltipContainer: {
    position: 'absolute',
    top: 2,
    zIndex: 10
  },
  tooltipPill: {
    backgroundColor: colors.background.elevated,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.background.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4
  },
  tooltipText: {
    ...typography.captionBold,
    color: colors.text.primary,
    fontSize: 11
  },
  axisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginTop: -10
  },
  axisItem: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: 'center'
  },
  axisText: {
    ...typography.caption,
    color: colors.text.muted,
    fontSize: 11
  }
});
