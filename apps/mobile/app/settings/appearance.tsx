import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { colors, spacing, typography, radii } from '../../src/theme';
import { Button, Header, TagChip } from '../../src/components';
import { ThemePreference } from '@behav/domain';

export default function AppearanceScreen() {
  const [theme, setTheme] = useState<ThemePreference>('dark');
  const [dayBoundary, setDayBoundary] = useState<number>(0);
  const [timezone] = useState('UTC (Universal Coordinated Time)');

  const handleSave = () => {
    Alert.alert('Preferences Saved', 'Your appearance and calendar boundaries are updated.', [
      { text: 'Done', onPress: () => router.back() }
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Header title="Appearance & Preferences" subtitle="Theme and calendar day boundaries" onBack={() => router.back()} />

      <View style={styles.form}>
        <Text style={styles.sectionLabel}>Theme Mode</Text>
        <View style={styles.chipsRow}>
          <TagChip
            label="Dark Charcoal (Default)"
            selected={theme === 'dark'}
            onPress={() => setTheme('dark')}
          />
          <TagChip
            label="System Default"
            selected={theme === 'system'}
            onPress={() => setTheme('system')}
          />
          <TagChip
            label="Light Mode"
            selected={theme === 'light'}
            onPress={() => setTheme('light')}
          />
        </View>

        <Text style={styles.sectionLabel}>Day Boundary Hour</Text>
        <Text style={styles.helperText}>
          If you stay awake past midnight, set your day boundary to 3 AM or 4 AM so late-night logs count toward the preceding evening.
        </Text>
        <View style={styles.boundaryRow}>
          {[0, 1, 2, 3, 4].map((h) => (
            <TouchableOpacity
              key={h}
              onPress={() => setDayBoundary(h)}
              style={[
                styles.hourBox,
                dayBoundary === h && styles.hourBoxActive
              ]}
              activeOpacity={0.7}
            >
              <Text style={[styles.hourNum, dayBoundary === h && styles.hourNumActive]}>
                {h === 0 ? 'Midnight' : `${h}:00 AM`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Active Timezone</Text>
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>{timezone}</Text>
        </View>

        <Button
          title="Save Preferences"
          onPress={handleSave}
          variant="primary"
          size="lg"
          style={styles.saveBtn}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.background.base,
    paddingBottom: spacing.xxl
  },
  form: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base
  },
  sectionLabel: {
    ...typography.captionBold,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.md,
    marginBottom: spacing.xs
  },
  helperText: {
    ...typography.caption,
    color: colors.text.muted,
    lineHeight: 18,
    marginBottom: spacing.sm
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.md
  },
  boundaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md
  },
  hourBox: {
    backgroundColor: colors.background.surface,
    borderColor: colors.background.border,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm
  },
  hourBoxActive: {
    backgroundColor: colors.primary.faint,
    borderColor: colors.primary.base
  },
  hourNum: {
    ...typography.captionBold,
    color: colors.text.secondary
  },
  hourNumActive: {
    color: colors.primary.light
  },
  infoCard: {
    backgroundColor: colors.background.surface,
    borderColor: colors.background.border,
    borderWidth: 1,
    borderRadius: radii.sm,
    padding: spacing.md,
    marginVertical: spacing.xs
  },
  infoText: {
    ...typography.body,
    color: colors.text.primary
  },
  saveBtn: {
    marginTop: spacing.xl
  }
});
