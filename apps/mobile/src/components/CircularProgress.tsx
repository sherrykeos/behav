import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../theme';

interface CircularProgressProps {
  size: number;
  strokeWidth: number;
  progress: number; // 0 to 1
  color?: string;
  trackColor?: string;
  children?: React.ReactNode;
  style?: ViewStyle;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  size,
  strokeWidth,
  progress,
  color = colors.primary.base,
  trackColor = '#17221B',
  children,
  style
}) => {
  const center = size / 2;
  const radius = center - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(Math.max(progress, 0), 1);
  const strokeDashoffset = circumference - clampedProgress * circumference;

  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Svg width={size} height={size} style={styles.svg}>
        {/* Background track circle */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Active progress arc */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      {children && <View style={styles.content}>{children}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  svg: {
    position: 'absolute',
    top: 0,
    left: 0
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center'
  }
});
