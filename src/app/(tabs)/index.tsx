import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper, Card, Button, Badge } from '@/components/common';
import { BehaviorHomeCard } from '@/components/behaviors/BehaviorHomeCard';
import { BehaviorModal } from '@/components/behaviors/BehaviorModal';
import { QuickLogModal } from '@/components/logging/QuickLogModal';
import { EditLogModal } from '@/components/logging/EditLogModal';
import { useBehaviors } from '@/context/BehaviorContext';
import { colors, radii, spacing, typography } from '@/theme';
import { type LogEntryWithBehavior } from '@/types/database';

export default function HomeScreen() {
  const router = useRouter();
  const {
    behaviors,
    todaySummaries,
    todayEntries,
    quickLog,
    createLogEntry,
    updateLogEntry,
    deleteLogEntry,
    createBehavior,
  } = useBehaviors();

  const [quickLogVisible, setQuickLogVisible] = useState(false);
  const [selectedBehaviorIdForLog, setSelectedBehaviorIdForLog] = useState<string | null>(null);
  const [createBehaviorVisible, setCreateBehaviorVisible] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState<LogEntryWithBehavior | null>(null);

  // Formatted date and greeting
  const today = new Date();
  const formattedDate = today.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const getGreeting = () => {
    const hour = today.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const handleQuickAddOne = async (behaviorId: string) => {
    try {
      await quickLog(behaviorId, 1);
    } catch (err) {
      console.error('Quick add failed:', err);
    }
  };

  const handleOpenLogModal = (behaviorId?: string) => {
    setSelectedBehaviorIdForLog(behaviorId || null);
    setQuickLogVisible(true);
  };

  return (
    <ScreenWrapper scrollable>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.dateText}>{formattedDate}</Text>
          </View>
          <Badge label="Offline" variant="sage" />
        </View>
      </View>

      {/* Primary Action Button */}
      <View style={styles.actionContainer}>
        <Button
          label="Quick Log"
          onPress={() => {
            if (behaviors.length === 0) {
              setCreateBehaviorVisible(true);
            } else {
              handleOpenLogModal();
            }
          }}
          variant="primary"
          size="lg"
          icon={<Ionicons name="add-circle-outline" size={20} color={colors.textInverse} />}
        />
        <Text style={styles.actionSubtext}>
          {behaviors.length === 0
            ? 'Set up your first behavior to start logging'
            : 'Tap to log occurrences or use + on cards below'}
        </Text>
      </View>

      {/* Today's Behaviors */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Today's Behaviors</Text>
        <Badge
          label={`${todaySummaries.length} tracked`}
          variant={todaySummaries.length > 0 ? 'primary' : 'neutral'}
        />
      </View>

      {todaySummaries.length === 0 ? (
        <Card style={styles.emptyCard}>
          <View style={styles.emptyContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="sparkles-outline" size={26} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>Welcome to Behav</Text>
            <Text style={styles.emptyDescription}>
              No behaviors created yet. Add a habit or routine you want to track
              calmly throughout the day.
            </Text>
            <Button
              label="Add Your First Behavior"
              onPress={() => setCreateBehaviorVisible(true)}
              variant="secondary"
              size="sm"
              icon={<Ionicons name="add" size={16} color={colors.textPrimary} />}
              style={styles.emptyButton}
            />
          </View>
        </Card>
      ) : (
        <View style={styles.behaviorsList}>
          {todaySummaries.map((summary) => (
            <BehaviorHomeCard
              key={summary.behaviorId}
              summary={summary}
              onQuickAdd={handleQuickAddOne}
              onPressCard={(id) => handleOpenLogModal(id)}
            />
          ))}
        </View>
      )}

      {/* Today's Recent Logs Section (Correct & Review) */}
      {todayEntries.length > 0 && (
        <View style={styles.recentLogsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Logs Today</Text>
            <Text style={styles.tapToEditHint}>Tap entry to edit or delete</Text>
          </View>

          <Card style={styles.logsCard}>
            {todayEntries.map((entry, index) => {
              const timeString = new Date(entry.occurredAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <Pressable
                  key={entry.id}
                  onPress={() => setEntryToEdit(entry)}
                  style={[
                    styles.logRow,
                    index < todayEntries.length - 1 && styles.logRowDivider,
                  ]}
                  android_ripple={{ color: colors.surfaceHover }}
                >
                  <View style={styles.logLeft}>
                    <Text style={styles.logBehaviorName}>{entry.behaviorName}</Text>
                    {entry.note ? (
                      <Text style={styles.logNote} numberOfLines={1}>
                        "{entry.note}"
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.logRight}>
                    <Text style={styles.logValue}>
                      +{entry.value} {entry.behaviorUnit}
                    </Text>
                    <Text style={styles.logTime}>{timeString}</Text>
                  </View>
                </Pressable>
              );
            })}
          </Card>
        </View>
      )}

      {/* Quick Log Modal */}
      <QuickLogModal
        visible={quickLogVisible}
        behaviors={behaviors}
        initialBehaviorId={selectedBehaviorIdForLog}
        onClose={() => setQuickLogVisible(false)}
        onLog={async (bId, val, note) => {
          await createLogEntry({ behaviorId: bId, value: val, note });
        }}
      />

      {/* Create Behavior Modal (from Home screen shortcut) */}
      <BehaviorModal
        visible={createBehaviorVisible}
        onClose={() => setCreateBehaviorVisible(false)}
        onSave={async (data) => {
          await createBehavior(data);
        }}
      />

      {/* Edit / Delete Mistaken Log Modal */}
      <EditLogModal
        visible={entryToEdit !== null}
        entry={entryToEdit}
        onClose={() => setEntryToEdit(null)}
        onSave={async (id, val, note) => {
          await updateLogEntry(id, { value: val, note });
        }}
        onDelete={async (id) => {
          await deleteLogEntry(id);
        }}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    ...typography.titleLarge,
    color: colors.textPrimary,
  },
  dateText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  actionContainer: {
    marginBottom: spacing.lg,
  },
  actionSubtext: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm + 2,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    ...typography.titleMedium,
    fontSize: 17,
  },
  tapToEditHint: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    fontSize: 11,
  },
  behaviorsList: {
    marginBottom: spacing.md,
  },
  emptyCard: {
    marginBottom: spacing.lg,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: radii.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.titleSmall,
    marginBottom: spacing.xs,
  },
  emptyDescription: {
    ...typography.bodyMedium,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  emptyButton: {
    alignSelf: 'center',
  },
  recentLogsSection: {
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  logsCard: {
    padding: 0,
    overflow: 'hidden',
  },
  logRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  logRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  logLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  logBehaviorName: {
    ...typography.labelLarge,
    fontSize: 14,
    color: colors.textPrimary,
  },
  logNote: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  logRight: {
    alignItems: 'flex-end',
  },
  logValue: {
    ...typography.labelLarge,
    fontSize: 14,
    color: colors.primary,
  },
  logTime: {
    ...typography.bodySmall,
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 2,
  },
});
