import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, radii } from '../../src/theme';
import { AppIcon, BehaviorIconBadge, StreakBadge, EmptyState } from '../../src/components';
import { useAuth } from '../../src/context/AuthContext';
import { useDatabase } from '../../src/context/DatabaseContext';
import { Behavior } from '@behav/domain';

export default function BehaviorsListScreen() {
  const { user } = useAuth();
  const { behaviorRepo, goalRepo, streakRepo, entryRepo } = useDatabase();

  const [behaviors, setBehaviors] = useState<Behavior[]>([]);
  const [streaks, setStreaks] = useState<Map<string, number>>(new Map());
  const [todayCounts, setTodayCounts] = useState<Map<string, number>>(new Map());
  const [refreshing, setRefreshing] = useState(false);

  const loadBehaviors = async () => {
    if (!user) return;
    try {
      const list = await behaviorRepo.listByUser(user.id, false);
      setBehaviors(list);

      const todayStr = new Date().toISOString().substring(0, 10);
      const sMap = new Map<string, number>();
      const cMap = new Map<string, number>();

      for (const b of list) {
        const goals = await goalRepo.listByBehavior(user.id, b.id);
        if (goals.length > 0) {
          const s = await streakRepo.findByGoalId(goals[0].id, user.id);
          if (s) sMap.set(b.id, s.currentStreak);
        }

        const entries = await entryRepo.listByBehaviorAndRange(user.id, b.id, todayStr, todayStr);
        const total = entries.reduce((sum, e) => sum + e.quantity, 0);
        cMap.set(b.id, total);
      }

      setStreaks(sMap);
      setTodayCounts(cMap);
    } catch (err) {
      console.error('Failed to load behaviors:', err);
    } finally {
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadBehaviors();
    }, [user])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadBehaviors();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header with Title and Add + Button */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Behaviors</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/behavior/create')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <AppIcon name="plus" size={24} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary.base}
          />
        }
      >
        {behaviors.length === 0 ? (
          <EmptyState
            title="No Behaviors Tracked"
            description="Add your first habit, reduction goal, or custom behavior."
            actionTitle="Add Behavior"
            onAction={() => router.push('/behavior/create')}
          />
        ) : (
          <View style={styles.listContainer}>
            {behaviors.map((b) => {
              const currentStreak = streaks.get(b.id) || 0;
              const count = todayCounts.get(b.id) || 0;
              const formattedStatus =
                b.measurementType === 'NUMERIC' && (b.unit === 'min' || b.unit === 'minutes')
                  ? `${Math.floor(count / 60)}h ${count % 60}m today`
                  : `${count} today`;

              return (
                <TouchableOpacity
                  key={b.id}
                  style={styles.rowCard}
                  onPress={() => router.push(`/behavior/${b.id}`)}
                  activeOpacity={0.7}
                >
                  {/* Left: Colored Squircle Icon Badge */}
                  <BehaviorIconBadge
                    icon={b.icon || 'sparkles'}
                    color={b.accentColor}
                    size={22}
                    badgeSize={44}
                  />

                  {/* Center: Title & Subtitle */}
                  <View style={styles.rowCenter}>
                    <Text style={styles.behaviorName} numberOfLines={1}>
                      {b.name}
                    </Text>
                    <Text style={styles.behaviorStatus}>{formattedStatus}</Text>
                  </View>

                  {/* Right: Streak Pill Badge */}
                  <StreakBadge currentStreak={currentStreak} variant="compact" />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
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
  headerTitle: {
    ...typography.h1,
    color: colors.text.primary,
    fontSize: 26
  },
  addButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.background.border
  },
  scrollContent: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: 40
  },
  listContainer: {
    gap: 8
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: 14
  },
  rowCenter: {
    flex: 1,
    marginLeft: 14,
    marginRight: 10
  },
  behaviorName: {
    ...typography.bodyBold,
    color: colors.text.primary,
    fontSize: 14
  },
  behaviorStatus: {
    ...typography.caption,
    color: colors.text.muted,
    marginTop: 2,
    fontSize: 11
  }
});
