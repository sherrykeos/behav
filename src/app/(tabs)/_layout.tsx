import React from 'react';
import { Tabs } from 'expo-router';
import { StyleSheet, View, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';

interface CustomTabBarProps {
  state: {
    routes: Array<{ key: string; name: string }>;
    index: number;
  };
  descriptors: Record<string, { options: { title?: string; tabBarAccessibilityLabel?: string } }>;
  navigateToTab: (routeKey: string) => void;
  insets?: any;
  emitter?: any;
}

function getTabIcon(routeName: string, isFocused: boolean): keyof typeof Ionicons.glyphMap {
  switch (routeName) {
    case 'index':
      return isFocused ? 'home' : 'home-outline';
    case 'stats':
    case 'insights':
      return isFocused ? 'stats-chart' : 'stats-chart-outline';
    case 'behaviors':
      return isFocused ? 'compass' : 'compass-outline';
    case 'settings':
      return isFocused ? 'person' : 'person-outline';
    default:
      return isFocused ? 'ellipse' : 'ellipse-outline';
  }
}

function FloatingDockTabBar({ state, descriptors, navigateToTab }: CustomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.dockContainer,
        {
          paddingBottom: Math.max(insets.bottom, 8),
        },
      ]}
    >
      <View style={styles.dock}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const iconName = getTabIcon(route.name, isFocused);
          const accessibilityLabel = options.tabBarAccessibilityLabel || options.title || route.name;

          const onPress = () => {
            if (!isFocused) {
              navigateToTab(route.key);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={accessibilityLabel}
              onPress={onPress}
              style={[styles.tabButton, isFocused && styles.tabButtonActive]}
              activeOpacity={0.7}
            >
              <Ionicons
                name={iconName}
                size={18}
                color={isFocused ? colors.accentPrimary : colors.textSecondary}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingDockTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'home',
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'stats',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'profile',
        }}
      />
      <Tabs.Screen
        name="behaviors"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  dockContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    alignItems: 'center',
    paddingTop: 8,
    zIndex: 100,
  },
  dock: {
    flexDirection: 'row',
    backgroundColor: 'rgba(26, 33, 29, 0.78)',
    borderRadius: 36,
    paddingVertical: 6,
    paddingHorizontal: 8,
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    elevation: 10,
    shadowColor: '#000000',
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  tabButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: 'rgba(185, 246, 202, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(185, 246, 202, 0.35)',
    elevation: 2,
    shadowColor: colors.accentPrimary,
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
  },
});
