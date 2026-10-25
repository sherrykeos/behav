import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper, Card, Badge } from '@/components/common';
import { colors, radii, spacing, typography } from '@/theme';

export default function SettingsScreen() {
  return (
    <ScreenWrapper scrollable>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>
          Data portability, backups, and app architecture
        </Text>
      </View>

      {/* Data Portability Section */}
      <Card style={styles.contentCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.sectionTitle}>Data Management</Text>
          <Badge label="Local Only" variant="sage" />
        </View>

        <View style={styles.row}>
          <View style={styles.rowIcon}>
            <Ionicons name="download-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.rowContent}>
            <Text style={styles.rowTitle}>JSON Backup & Restore</Text>
            <Text style={styles.rowDesc}>Export complete database or restore safely (Phase 6)</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <View style={styles.rowIcon}>
            <Ionicons name="document-text-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.rowContent}>
            <Text style={styles.rowTitle}>Historical CSV Import</Text>
            <Text style={styles.rowDesc}>Preview and import spreadsheet records (Phase 7)</Text>
          </View>
        </View>
      </Card>

      {/* Data Safety Notice */}
      <Card variant="subtle" style={styles.contentCard}>
        <Text style={styles.infoTitle}>Data Ownership Guarantee</Text>
        <Text style={styles.infoText}>
          Behav has no server, no cloud accounts, and no background telemetry.
          All your tracking data remains strictly in your phone's local SQLite database.
        </Text>
        <Text style={[styles.infoText, { marginTop: spacing.sm, color: colors.textTertiary }]}>
          Remember: Because data is kept only on this device, exporting regular
          JSON backups to an external storage location protects you against device loss.
        </Text>
      </Card>

      {/* App Details Card */}
      <Card variant="subtle">
        <Text style={styles.infoTitle}>About Behav</Text>
        <View style={styles.specRow}>
          <Text style={styles.specKey}>Version</Text>
          <Text style={styles.specValue}>1.0.0 (MVP)</Text>
        </View>
        <View style={styles.specRow}>
          <Text style={styles.specKey}>Expo SDK</Text>
          <Text style={styles.specValue}>58.0.0</Text>
        </View>
        <View style={styles.specRow}>
          <Text style={styles.specKey}>Persistence</Text>
          <Text style={styles.specValue}>Local SQLite</Text>
        </View>
        <View style={styles.specRow}>
          <Text style={styles.specKey}>Architecture</Text>
          <Text style={styles.specValue}>Offline-First</Text>
        </View>
      </Card>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  title: {
    ...typography.titleLarge,
  },
  subtitle: {
    ...typography.bodyMedium,
    marginTop: spacing.xs,
  },
  contentCard: {
    marginBottom: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.titleSmall,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  rowContent: {
    flex: 1,
  },
  rowTitle: {
    ...typography.labelLarge,
    fontSize: 14,
  },
  rowDesc: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginVertical: spacing.xs,
  },
  infoTitle: {
    ...typography.titleSmall,
    fontSize: 15,
    marginBottom: spacing.sm,
  },
  infoText: {
    ...typography.bodyMedium,
    fontSize: 13,
    lineHeight: 18,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  specKey: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  specValue: {
    ...typography.labelSmall,
    color: colors.textPrimary,
  },
});
