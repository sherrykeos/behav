import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Path, Circle, Rect } from 'react-native-svg';

interface MountainSunsetProps {
  height?: number;
  style?: ViewStyle;
}

export const MountainSunsetIllustration: React.FC<MountainSunsetProps> = ({
  height = 280,
  style
}) => {
  return (
    <View style={[{ height, width: '100%', overflow: 'hidden' }, style]}>
      <Svg width="100%" height={height} viewBox="0 0 360 280" preserveAspectRatio="xMidYMid slice">
        <Defs>
          {/* Sky Gradient */}
          <LinearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#E59866" stopOpacity="0.85" />
            <Stop offset="0.35" stopColor="#D35400" stopOpacity="0.5" />
            <Stop offset="0.65" stopColor="#2E1810" stopOpacity="0.8" />
            <Stop offset="1" stopColor="#0B0F0D" stopOpacity="1" />
          </LinearGradient>

          {/* Sun Gradient */}
          <LinearGradient id="sunGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FAD7A0" stopOpacity="0.95" />
            <Stop offset="1" stopColor="#E67E22" stopOpacity="0.6" />
          </LinearGradient>
        </Defs>

        {/* Sky Background */}
        <Rect width="360" height="280" fill="url(#skyGrad)" />

        {/* Glowing Sunset Sun */}
        <Circle cx="180" cy="130" r="32" fill="url(#sunGrad)" opacity="0.85" />

        {/* Distant Mountains */}
        <Path
          d="M-20,180 Q60,110 140,150 T280,135 T380,180 L380,280 L-20,280 Z"
          fill="#1C2420"
          opacity="0.8"
        />

        {/* Mid-range Ridge */}
        <Path
          d="M-20,195 Q80,150 180,185 T320,165 T380,210 L380,280 L-20,280 Z"
          fill="#131B17"
          opacity="0.9"
        />

        {/* Foreground Mountain Silhouettes */}
        <Path
          d="M-20,225 Q70,180 160,215 T300,190 T380,230 L380,280 L-20,280 Z"
          fill="#0B0F0D"
        />
      </Svg>
    </View>
  );
};
