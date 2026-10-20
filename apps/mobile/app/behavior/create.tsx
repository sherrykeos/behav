import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, radii } from '../../src/theme';
import { AppIcon, BehaviorIconBadge, Button } from '../../src/components';
import { useAuth } from '../../src/context/AuthContext';
import { useDatabase } from '../../src/context/DatabaseContext';
import { BehaviorCategory, MeasurementType, GoalType, EvaluationPeriod } from '@behav/domain';

const CATEGORIES: { label: string; value: BehaviorCategory; icon: string }[] = [
  { label: 'Substance', value: 'SUBSTANCE', icon: 'cigarette' },
  { label: 'Nutrition', value: 'HEALTH', icon: 'fast-food' },
  { label: 'Productivity', value: 'PRODUCTIVITY', icon: 'time' },
  { label: 'Digital', value: 'DIGITAL', icon: 'time' },
  { label: 'Mindfulness', value: 'MINDFULNESS', icon: 'leaf' },
  { label: 'Habit & Daily', value: 'HABIT', icon: 'sparkles' }
];

const ACCENT_COLORS = [
  '#4ADE80', // Mint / Sage
  '#38BDF8', // Cyan / Screen
  '#FB923C', // Orange / Cigarette
  '#FB7185', // Rose / Alcohol
  '#A78BFA', // Purple / Mindfulness
  '#FBBF24'  // Amber / Junk food
];

const GOAL_OPTIONS: { label: string; value: GoalType; desc: string }[] = [
  { label: 'Abstinence (0 per day)', value: 'ABSTINENCE', desc: 'Complete elimination (e.g. smoke-free days)' },
  { label: 'Reduction limit', value: 'REDUCTION', desc: 'Keep daily quantity at or below a ceiling' },
  { label: 'Frequency target', value: 'FREQUENCY', desc: 'Perform a positive behavior at least X times' }
];

export default function CreateBehaviorScreen() {
  const { user } = useAuth();
  const { behaviorRepo, goalRepo } = useDatabase();

  const [name, setName] = useState('');
  const [category, setCategory] = useState<BehaviorCategory>('SUBSTANCE');
  const [unit, setUnit] = useState('times');
  const [accentColor, setAccentColor] = useState(ACCENT_COLORS[2]); // default orange
  const [selectedIcon, setSelectedIcon] = useState('cigarette');

  // Goal settings
  const [goalType, setGoalType] = useState<GoalType>('ABSTINENCE');
  const [dailyLimit, setDailyLimit] = useState('0');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showGoalPicker, setShowGoalPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Please enter a name for the behavior.');
      return;
    }

    setLoading(true);
    try {
      const created = await behaviorRepo.create({
        userId: user.id,
        name: name.trim(),
        description: null,
        category,
        icon: selectedIcon,
        accentColor,
        measurementType: goalType === 'ABSTINENCE' ? 'COUNT' : 'NUMERIC',
        unit: unit.trim() || 'count'
      });

      const parsedLimit = parseFloat(dailyLimit) || 0;
      await goalRepo.create({
        userId: user.id,
        behaviorId: created.id,
        goalType,
        targetValue: goalType === 'ABSTINENCE' ? 0 : parsedLimit,
        evaluationPeriod: 'DAILY',
        startsAt: new Date().toISOString(),
        active: true
      });

      router.back();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create behavior.');
    } finally {
      setLoading(false);
    }
  };

  const selectedCatObj = CATEGORIES.find((c) => c.value === category) || CATEGORIES[0];
  const selectedGoalObj = GOAL_OPTIONS.find((g) => g.value === goalType) || GOAL_OPTIONS[0];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header: Cancel (left) | Add Behavior (center) | Save (right) */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.headerSideBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Behavior</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={loading}
            style={styles.headerSideBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.saveText}>{loading ? 'Saving...' : 'Save'}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Form Field: Name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Cigarettes, Screen Time"
              placeholderTextColor={colors.text.muted}
              style={styles.textInput}
            />
          </View>

          {/* Form Field: Category Dropdown */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Category</Text>
            <TouchableOpacity
              style={styles.selectorCard}
              onPress={() => setShowCategoryPicker(!showCategoryPicker)}
              activeOpacity={0.7}
            >
              <View style={styles.selectorLeft}>
                <AppIcon name={selectedCatObj.icon} size={18} color={accentColor} style={{ marginRight: 10 }} />
                <Text style={styles.selectorValue}>{selectedCatObj.label}</Text>
              </View>
              <AppIcon name={showCategoryPicker ? 'chevron-down' : 'chevron-right'} size={18} color={colors.text.muted} />
            </TouchableOpacity>

            {showCategoryPicker && (
              <View style={styles.dropdownContainer}>
                {CATEGORIES.map((c) => (
                  <TouchableOpacity
                    key={c.value}
                    style={[
                      styles.dropdownItem,
                      c.value === category && styles.dropdownItemActive
                    ]}
                    onPress={() => {
                      setCategory(c.value);
                      setSelectedIcon(c.icon);
                      setShowCategoryPicker(false);
                    }}
                  >
                    <AppIcon name={c.icon} size={16} color={c.value === category ? colors.primary.base : colors.text.muted} style={{ marginRight: 8 }} />
                    <Text style={[styles.dropdownItemText, c.value === category && { color: colors.primary.base }]}>
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Form Field: Unit */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Unit</Text>
            <TextInput
              value={unit}
              onChangeText={setUnit}
              placeholder="e.g. cigarettes, minutes, drinks"
              placeholderTextColor={colors.text.muted}
              style={styles.textInput}
            />
          </View>

          {/* Form Field: Goal Type Dropdown */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Goal Type</Text>
            <TouchableOpacity
              style={styles.selectorCard}
              onPress={() => setShowGoalPicker(!showGoalPicker)}
              activeOpacity={0.7}
            >
              <Text style={styles.selectorValue}>{selectedGoalObj.label}</Text>
              <AppIcon name={showGoalPicker ? 'chevron-down' : 'chevron-right'} size={18} color={colors.text.muted} />
            </TouchableOpacity>

            {showGoalPicker && (
              <View style={styles.dropdownContainer}>
                {GOAL_OPTIONS.map((g) => (
                  <TouchableOpacity
                    key={g.value}
                    style={[
                      styles.dropdownItem,
                      g.value === goalType && styles.dropdownItemActive
                    ]}
                    onPress={() => {
                      setGoalType(g.value);
                      if (g.value === 'ABSTINENCE') setDailyLimit('0');
                      setShowGoalPicker(false);
                    }}
                  >
                    <View>
                      <Text style={[styles.dropdownItemText, g.value === goalType && { color: colors.primary.base }]}>
                        {g.label}
                      </Text>
                      <Text style={styles.dropdownItemSub}>{g.desc}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Form Field: Daily Limit (optional for reduction/frequency) */}
          {goalType !== 'ABSTINENCE' && (
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Daily Limit / Target</Text>
              <TextInput
                value={dailyLimit}
                onChangeText={setDailyLimit}
                keyboardType="numeric"
                placeholder="e.g. 1"
                placeholderTextColor={colors.text.muted}
                style={styles.textInput}
              />
            </View>
          )}

          {/* Form Field: Accent Color Palette */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Color</Text>
            <View style={styles.colorPaletteRow}>
              {ACCENT_COLORS.map((col) => {
                const isSelected = col === accentColor;
                return (
                  <TouchableOpacity
                    key={col}
                    onPress={() => setAccentColor(col)}
                    style={[
                      styles.colorCircle,
                      { backgroundColor: col },
                      isSelected && styles.colorCircleSelected
                    ]}
                    activeOpacity={0.8}
                  />
                );
              })}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.border
  },
  headerSideBtn: {
    paddingVertical: 6,
    paddingHorizontal: 4
  },
  cancelText: {
    ...typography.body,
    color: colors.text.muted
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text.primary,
    fontWeight: '700'
  },
  saveText: {
    ...typography.bodyBold,
    color: colors.warm.cream,
    fontWeight: '700'
  },
  scrollContent: {
    padding: spacing.base,
    paddingBottom: 40
  },
  fieldGroup: {
    marginBottom: spacing.base
  },
  fieldLabel: {
    ...typography.captionBold,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6
  },
  textInput: {
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.base,
    paddingVertical: 12,
    color: colors.text.primary,
    ...typography.body
  },
  selectorCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.base,
    paddingVertical: 14
  },
  selectorLeft: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  selectorValue: {
    ...typography.bodyBold,
    color: colors.text.primary
  },
  dropdownContainer: {
    backgroundColor: colors.background.elevated,
    borderColor: colors.background.border,
    borderWidth: 1,
    borderRadius: radii.md,
    marginTop: 6,
    padding: spacing.xs
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radii.sm
  },
  dropdownItemActive: {
    backgroundColor: colors.background.highlight
  },
  dropdownItemText: {
    ...typography.bodyBold,
    color: colors.text.primary,
    fontSize: 13
  },
  dropdownItemSub: {
    ...typography.caption,
    color: colors.text.muted,
    marginTop: 1,
    fontSize: 11
  },
  colorPaletteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 4
  },
  colorCircle: {
    width: 38,
    height: 38,
    borderRadius: 19
  },
  colorCircleSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF'
  }
});
