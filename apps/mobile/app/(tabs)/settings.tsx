import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, radii } from '../../src/theme';
import { Card, AppIcon } from '../../src/components';
import { useAuth } from '../../src/context/AuthContext';

export default function SettingsTabScreen() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out? Your records remain safely partitioned on this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/welcome');
          }
        }
      ]
    );
  };

  const navItems = [
    {
      title: 'Appearance',
      trailing: 'System',
      route: '/settings/appearance',
      iconName: 'moon'
    },
    {
      title: 'Notifications',
      trailing: 'Reminders & nudges',
      route: '/settings/help',
      iconName: 'bell'
    },
    {
      title: 'Data',
      trailing: 'Export, backup, manage',
      route: '/settings/export',
      iconName: 'data'
    },
    {
      title: 'Privacy',
      trailing: 'Local data only',
      route: '/settings/privacy',
      iconName: 'lock'
    },
    {
      title: 'Help',
      trailing: 'FAQ, support',
      route: '/settings/help',
      iconName: 'help'
    },
    {
      title: 'About',
      trailing: 'v1.0.0',
      route: '/settings/help',
      iconName: 'info'
    }
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header matching showcase: < Settings */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.backBtn}
        >
          <AppIcon name="chevron-left" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* User Card */}
        <Card style={styles.userCard}>
          <View style={styles.userRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(user?.displayName || 'U')[0].toUpperCase()}
              </Text>
            </View>
            <View style={styles.userCol}>
              <Text style={styles.userName}>{user?.displayName || 'Active Account'}</Text>
              <Text style={styles.userEmail}>{user?.email || 'Local Encrypted Partition'}</Text>
              <View style={styles.statusPill}>
                <Text style={styles.statusText}>STATUS: {user?.accountStatus || 'ACTIVE'}</Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Grouped Settings List matching Screen 11 */}
        <View style={styles.settingsGroup}>
          {navItems.map((item, idx) => {
            const isLast = idx === navItems.length - 1;
            return (
              <TouchableOpacity
                key={idx}
                onPress={() => router.push(item.route as never)}
                style={[styles.settingRow, isLast && styles.settingRowLast]}
                activeOpacity={0.7}
              >
                <View style={styles.rowLeft}>
                  <View style={styles.iconCircle}>
                    <AppIcon name={item.iconName} size={18} color={colors.text.primary} />
                  </View>
                  <Text style={styles.rowTitle}>{item.title}</Text>
                </View>

                <View style={styles.rowRight}>
                  <Text style={styles.rowTrailing}>{item.trailing}</Text>
                  <AppIcon name="chevron-right" size={16} color={colors.text.muted} style={{ marginLeft: 4 }} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Danger Zone / Sign Out */}
        <View style={styles.footerActions}>
          <TouchableOpacity
            onPress={() => router.push('/settings/deletion')}
            style={styles.deleteOption}
            activeOpacity={0.7}
          >
            <Text style={styles.deleteOptionText}>Account & Data Deletion</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleLogout}
            style={styles.logoutButton}
            activeOpacity={0.8}
          >
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.base
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.border
  },
  backBtn: {
    padding: 4
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text.primary,
    fontSize: 20
  },
  scrollContent: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: 40
  },
  userCard: {
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.base,
    marginBottom: spacing.md
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary.faint,
    borderColor: colors.primary.border,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary.base
  },
  userCol: {
    flex: 1
  },
  userName: {
    ...typography.bodyBold,
    color: colors.text.primary,
    fontSize: 15
  },
  userEmail: {
    ...typography.caption,
    color: colors.text.muted,
    marginTop: 1
  },
  statusPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.background.surface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.full,
    marginTop: 4
  },
  statusText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.primary.base
  },
  settingsGroup: {
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
    borderWidth: 1,
    borderRadius: radii.lg,
    overflow: 'hidden',
    marginBottom: spacing.lg
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.border
  },
  settingRowLast: {
    borderBottomWidth: 0
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md
  },
  rowTitle: {
    ...typography.bodyBold,
    color: colors.text.primary,
    fontSize: 15
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  rowTrailing: {
    ...typography.caption,
    color: colors.text.muted,
    fontSize: 13
  },
  footerActions: {
    marginTop: spacing.sm,
    gap: 12
  },
  deleteOption: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
    borderWidth: 1,
    borderRadius: radii.md
  },
  deleteOptionText: {
    ...typography.captionBold,
    color: colors.text.secondary,
    fontSize: 13
  },
  logoutButton: {
    backgroundColor: colors.accents.coralFaint,
    borderColor: colors.accents.coralBorder,
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center'
  },
  logoutText: {
    ...typography.bodyBold,
    color: colors.accents.coral,
    fontSize: 14
  }
});
