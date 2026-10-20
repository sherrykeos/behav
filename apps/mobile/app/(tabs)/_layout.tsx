import React from 'react';
import { Tabs, router } from 'expo-router';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { colors, radii, spacing, typography } from '../../src/theme';
import { AppIcon } from '../../src/components';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.primary.base,
        tabBarInactiveTintColor: colors.text.muted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem
      }}
    >
      {/* 1. Home Dashboard */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <AppIcon name="home" size={22} color={color as string} />
          )
        }}
      />

      {/* 2. Insights / Statistics */}
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Insights',
          tabBarIcon: ({ color }) => (
            <AppIcon name="analytics" size={22} color={color as string} />
          )
        }}
      />

      {/* 3. Center Elevated Quick Log Action */}
      <Tabs.Screen
        name="quick-log"
        options={{
          title: '',
          tabBarButton: () => (
            <View style={styles.centerButtonContainer}>
              <TouchableOpacity
                onPress={() => router.push('/behavior/quick-log')}
                activeOpacity={0.8}
                style={styles.centerButton}
              >
                <AppIcon name="plus" size={26} color={colors.warm.creamDark} />
              </TouchableOpacity>
            </View>
          )
        }}
      />

      {/* 4. All Behaviors List */}
      <Tabs.Screen
        name="behaviors"
        options={{
          title: 'Behaviors',
          tabBarIcon: ({ color }) => (
            <AppIcon name="behaviors" size={22} color={color as string} />
          )
        }}
      />

      {/* 5. More / Settings */}
      <Tabs.Screen
        name="settings"
        options={{
          title: 'More',
          tabBarIcon: ({ color }) => (
            <AppIcon name="settings" size={22} color={color as string} />
          )
        }}
      />

      {/* Calendar (Hidden from tab bar, accessed via navigation) */}
      <Tabs.Screen
        name="calendar"
        options={{
          href: null
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.background.surface,
    borderTopColor: colors.background.border,
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 84 : 68,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    paddingTop: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.3,
    shadowRadius: 6
  },
  tabItem: {
    paddingVertical: 2
  },
  tabLabel: {
    ...typography.captionBold,
    fontSize: 10,
    marginTop: 2
  },
  centerButtonContainer: {
    top: -14,
    justifyContent: 'center',
    alignItems: 'center'
  },
  centerButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.warm.cream,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 6
  }
});
