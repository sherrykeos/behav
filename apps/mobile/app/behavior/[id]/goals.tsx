import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert
} from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { colors, spacing, typography, radii } from '../../../src/theme';
import { Card, Button, Input, Header, TagChip } from '../../../src/components';
import { useAuth } from '../../../src/context/AuthContext';
import { useDatabase } from '../../../src/context/DatabaseContext';
import { Goal, GoalVersion, GoalType, EvaluationPeriod } from '@behav/domain';

export default function GoalManagementScreen() {
  const { id: behaviorId } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { goalRepo, recalculateBehavior } = useDatabase();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [versionsByGoal, setVersionsByGoal] = useState<Map<string, GoalVersion[]>>(new Map());
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New goal state
  const [goalType, setGoalType] = useState<GoalType>('REDUCTION');
  const [targetValue, setTargetValue] = useState('2');
  const [period, setPeriod] = useState<EvaluationPeriod>('DAILY');
  const [loading, setLoading] = useState(false);

  const loadGoals = async () => {
    if (!user || !behaviorId) return;
    try {
      const gList = await goalRepo.listByBehavior(user.id, behaviorId);
      setGoals(gList);

      const vMap = new Map<string, GoalVersion[]>();
      for (const g of gList) {
        const vList = await goalRepo.listVersions(g.id, user.id);
        vMap.set(g.id, vList);
      }
      setVersionsByGoal(vMap);
    } catch (err) {
      console.error('Failed to load goals:', err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadGoals();
    }, [user, behaviorId])
  );

  const handleCreateGoal = async () => {
    if (!user || !behaviorId) return;
    setLoading(true);
    try {
      await goalRepo.create({
        userId: user.id,
        behaviorId,
        goalType,
        targetValue: parseFloat(targetValue) || 0,
        evaluationPeriod: period,
        startsAt: new Date().toISOString(),
        active: true
      });
      await recalculateBehavior(behaviorId);
      setShowCreateModal(false);
      loadGoals();
      Alert.alert('Goal Created', 'Independent streak tracking initialized for this goal.');
    } catch {
      Alert.alert('Error', 'Could not create goal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Header
        title="Goal Management"
        subtitle="Independent streaks & immutable versioning"
        onBack={() => router.back()}
        rightAction={{
          label: '+ Add Goal',
          onPress: () => setShowCreateModal(!showCreateModal)
        }}
      />

      <View style={styles.content}>
        {showCreateModal ? (
          <Card style={styles.createBox}>
            <Text style={styles.createTitle}>Establish an Independent Goal</Text>
            <Text style={styles.createSubtitle}>
              Each goal maintains its own streak without affecting other targets.
            </Text>

            <Text style={styles.fieldLabel}>Goal Type</Text>
            <View style={styles.chipsRow}>
              <TagChip
                label="Abstinence (Zero)"
                selected={goalType === 'ABSTINENCE'}
                onPress={() => {
                  setGoalType('ABSTINENCE');
                  setTargetValue('0');
                }}
              />
              <TagChip
                label="Reduction Limit"
                selected={goalType === 'REDUCTION'}
                onPress={() => {
                  setGoalType('REDUCTION');
                  if (targetValue === '0') setTargetValue('3');
                }}
              />
              <TagChip
                label="Frequency Target"
                selected={goalType === 'FREQUENCY'}
                onPress={() => {
                  setGoalType('FREQUENCY');
                  if (targetValue === '0') setTargetValue('1');
                }}
              />
            </View>

            {goalType !== 'ABSTINENCE' ? (
              <Input
                label={goalType === 'REDUCTION' ? 'Upper Limit' : 'Target Occurrences'}
                value={targetValue}
                onChangeText={setTargetValue}
                keyboardType="numeric"
              />
            ) : null}

            <View style={styles.btnRow}>
              <Button
                title="Save Goal"
                onPress={handleCreateGoal}
                loading={loading}
                variant="primary"
                size="md"
                style={styles.actionBtn}
              />
              <Button
                title="Cancel"
                onPress={() => setShowCreateModal(false)}
                variant="secondary"
                size="md"
                style={styles.actionBtn}
              />
            </View>
          </Card>
        ) : null}

        <Text style={styles.sectionTitle}>Active & Historical Goals</Text>

        {goals.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>No goals established yet for this behavior.</Text>
            <Button
              title="+ Add Goal"
              onPress={() => setShowCreateModal(true)}
              variant="primary"
              size="sm"
              style={styles.emptyBtn}
            />
          </Card>
        ) : (
          goals.map((g) => {
            const versions = versionsByGoal.get(g.id) || [];
            return (
              <Card key={g.id} style={styles.goalCard}>
                <View style={styles.goalTop}>
                  <View>
                    <Text style={styles.goalTypeTitle}>
                      {g.goalType === 'ABSTINENCE'
                        ? 'Abstinence (Zero Activity)'
                        : g.goalType === 'REDUCTION'
                        ? `Reduction (Max ${g.targetValue}/day)`
                        : `Frequency (Min ${g.targetValue}/day)`}
                    </Text>
                    <Text style={styles.goalPeriod}>{g.evaluationPeriod} • Active from {g.startsAt.substring(0, 10)}</Text>
                  </View>
                  <View style={styles.versionCountBadge}>
                    <Text style={styles.versionCountText}>v{versions.length}</Text>
                  </View>
                </View>

                {/* Versions Audit Trail */}
                {versions.length > 1 ? (
                  <View style={styles.versionAudit}>
                    <Text style={styles.auditTitle}>Version History (Immutable)</Text>
                    {versions.map((v) => (
                      <View key={v.id} style={styles.auditRow}>
                        <Text style={styles.auditVer}>v{v.versionNumber}:</Text>
                        <Text style={styles.auditDesc}>
                          Target {v.targetValue} ({v.effectiveFrom.substring(0, 10)} to {v.effectiveTo ? v.effectiveTo.substring(0, 10) : 'Present'})
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </Card>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xxl,
    backgroundColor: colors.background.base
  },
  content: {
    paddingTop: spacing.xs
  },
  createBox: {
    backgroundColor: colors.background.elevated,
    marginBottom: spacing.base
  },
  createTitle: {
    ...typography.bodyBold,
    color: colors.text.primary,
    marginBottom: 2
  },
  createSubtitle: {
    ...typography.caption,
    color: colors.text.muted,
    marginBottom: spacing.md
  },
  fieldLabel: {
    ...typography.captionBold,
    color: colors.text.secondary,
    marginBottom: spacing.xs
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.sm
  },
  btnRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md
  },
  actionBtn: {
    flex: 1
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginVertical: spacing.sm
  },
  emptyCard: {
    alignItems: 'center',
    padding: spacing.xl
  },
  emptyText: {
    ...typography.caption,
    color: colors.text.muted,
    marginBottom: spacing.md
  },
  emptyBtn: {
    minWidth: 140
  },
  goalCard: {
    marginVertical: 4
  },
  goalTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  goalTypeTitle: {
    ...typography.bodyBold,
    color: colors.text.primary
  },
  goalPeriod: {
    ...typography.caption,
    color: colors.text.muted,
    marginTop: 2
  },
  versionCountBadge: {
    backgroundColor: colors.background.elevated,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full
  },
  versionCountText: {
    ...typography.captionBold,
    color: colors.primary.light
  },
  versionAudit: {
    marginTop: spacing.md,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.background.borderSubtle
  },
  auditTitle: {
    ...typography.captionBold,
    color: colors.text.muted,
    marginBottom: 4
  },
  auditRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginVertical: 1
  },
  auditVer: {
    ...typography.captionBold,
    color: colors.primary.base,
    marginRight: 6
  },
  auditDesc: {
    ...typography.caption,
    color: colors.text.secondary
  }
});
