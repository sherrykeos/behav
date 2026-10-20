import React from 'react';
import { View, StyleSheet, StyleProp, TextStyle, ViewStyle } from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme';

export type IconName =
  | 'home'
  | 'insights'
  | 'analytics'
  | 'behaviors'
  | 'settings'
  | 'plus'
  | 'minus'
  | 'check'
  | 'close'
  | 'back'
  | 'chevron-right'
  | 'chevron-left'
  | 'chevron-down'
  | 'flame'
  | 'sparkles'
  | 'cigarette'
  | 'time'
  | 'fast-food'
  | 'wine'
  | 'heart'
  | 'leaf'
  | 'moon'
  | 'water'
  | 'calendar'
  | 'note'
  | 'trend-down'
  | 'trend-up'
  | 'shield'
  | 'bell'
  | 'data'
  | 'help'
  | 'info'
  | 'user'
  | 'lock'
  | 'trash';

interface AppIconProps {
  name: IconName | string;
  size?: number;
  color?: string;
  style?: any;
}

export const AppIcon: React.FC<AppIconProps> = ({
  name,
  size = 20,
  color = colors.text.primary,
  style
}) => {
  switch (name) {
    // Navigation
    case 'home':
      return <Ionicons name="home-outline" size={size} color={color} style={style} />;
    case 'insights':
    case 'analytics':
      return <Ionicons name="bar-chart-outline" size={size} color={color} style={style} />;
    case 'behaviors':
      return <Ionicons name="layers-outline" size={size} color={color} style={style} />;
    case 'settings':
      return <Ionicons name="options-outline" size={size} color={color} style={style} />;
    case 'plus':
      return <Ionicons name="add" size={size} color={color} style={style} />;
    case 'minus':
      return <Ionicons name="remove" size={size} color={color} style={style} />;
    case 'check':
      return <Ionicons name="checkmark" size={size} color={color} style={style} />;
    case 'close':
      return <Ionicons name="close" size={size} color={color} style={style} />;
    case 'back':
    case 'chevron-left':
      return <Ionicons name="chevron-back" size={size} color={color} style={style} />;
    case 'chevron-right':
      return <Ionicons name="chevron-forward" size={size} color={color} style={style} />;
    case 'chevron-down':
      return <Ionicons name="chevron-down" size={size} color={color} style={style} />;

    // Behaviors & Categories
    case 'cigarette':
    case 'smoke':
      return <MaterialCommunityIcons name="smoking" size={size} color={color} style={style} />;
    case 'time':
    case 'screen':
      return <Ionicons name="time-outline" size={size} color={color} style={style} />;
    case 'fast-food':
    case 'junk-food':
    case 'food':
      return <Ionicons name="fast-food-outline" size={size} color={color} style={style} />;
    case 'wine':
    case 'alcohol':
      return <Ionicons name="wine-outline" size={size} color={color} style={style} />;
    case 'heart':
    case 'habit':
      return <Ionicons name="heart-outline" size={size} color={color} style={style} />;
    case 'leaf':
    case 'mindfulness':
      return <Ionicons name="leaf-outline" size={size} color={color} style={style} />;
    case 'flame':
    case 'streak':
      return <Ionicons name="flame" size={size} color={color} style={style} />;
    case 'sparkles':
      return <Ionicons name="sparkles-outline" size={size} color={color} style={style} />;
    case 'moon':
    case 'sleep':
      return <Ionicons name="moon-outline" size={size} color={color} style={style} />;
    case 'water':
      return <Ionicons name="water-outline" size={size} color={color} style={style} />;
    case 'calendar':
      return <Ionicons name="calendar-outline" size={size} color={color} style={style} />;
    case 'note':
      return <Ionicons name="document-text-outline" size={size} color={color} style={style} />;
    case 'trend-down':
      return <Feather name="trending-down" size={size} color={color} style={style} />;
    case 'trend-up':
      return <Feather name="trending-up" size={size} color={color} style={style} />;

    // Settings & Meta
    case 'shield':
    case 'privacy':
      return <Ionicons name="shield-checkmark-outline" size={size} color={color} style={style} />;
    case 'bell':
    case 'notifications':
      return <Ionicons name="notifications-outline" size={size} color={color} style={style} />;
    case 'data':
    case 'export':
      return <Ionicons name="server-outline" size={size} color={color} style={style} />;
    case 'help':
      return <Ionicons name="help-circle-outline" size={size} color={color} style={style} />;
    case 'info':
      return <Ionicons name="information-circle-outline" size={size} color={color} style={style} />;
    case 'user':
    case 'profile':
      return <Ionicons name="person-outline" size={size} color={color} style={style} />;
    case 'lock':
      return <Ionicons name="lock-closed-outline" size={size} color={color} style={style} />;
    case 'trash':
      return <Ionicons name="trash-outline" size={size} color={color} style={style} />;

    default:
      return <Ionicons name="ellipse-outline" size={size} color={color} style={style} />;
  }
};

interface BehaviorIconBadgeProps {
  icon: string;
  color?: string;
  size?: number;
  badgeSize?: number;
}

export const BehaviorIconBadge: React.FC<BehaviorIconBadgeProps> = ({
  icon,
  color = colors.primary.base,
  size = 20,
  badgeSize = 42
}) => {
  return (
    <View
      style={[
        styles.badge,
        {
          width: badgeSize,
          height: badgeSize,
          borderRadius: Math.round(badgeSize * 0.34),
          backgroundColor: color ? `${color}22` : colors.background.elevated,
          borderColor: color ? `${color}44` : colors.background.border
        }
      ]}
    >
      <AppIcon name={icon} size={size} color={color} />
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1
  }
});
