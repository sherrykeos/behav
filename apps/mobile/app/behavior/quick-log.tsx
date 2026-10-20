import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radii, spacing, typography } from '../../src/theme';
import { AppIcon, BehaviorIconBadge, SegmentedControl, Button } from '../../src/components';
import { useAuth } from '../../src/context/AuthContext';
import { useDatabase } from '../../src/context/DatabaseContext';
import { Behavior } from '@behav/domain';

export default function LogBehaviorScreen() {
  const { behaviorId } = useLocalSearchParams<{ behaviorId?: string }>();
  const { user } = useAuth();
  const { behaviorRepo, entryRepo, recalculateBehavior } = useDatabase();

  const [behaviors, setBehaviors] = useState<Behavior[]>([]);
  const [selectedBehavior, setSelectedBehavior] = useState<Behavior | null>(null);
  const [modeIdx, setModeIdx] = useState<number>(0); // 0: Quick, 1: Custom, 2: Time
  const [quantity, setQuantity] = useState<number>(1);
  const [timeTag, setTimeTag] = useState<'Now' | 'Morning' | 'Afternoon' | 'Evening'>('Now');
  const [notes, setNotes] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [showPicker, setShowPicker] = useState<boolean>(false);

  useEffect(() => {
    async function loadBehaviors() {
      if (!user) return;
      const list = await behaviorRepo.listByUser(user.id, false);
      setBehaviors(list);

      if (behaviorId) {
        const match = list.find((b) => b.id === behaviorId);
        if (match) setSelectedBehavior(match);
        else if (list.length > 0) setSelectedBehavior(list[0]);
      } else if (list.length > 0) {
        setSelectedBehavior(list[0]);
      }
    }
    loadBehaviors();
  }, [user, behaviorId]);

  const handleIncrement = () => setQuantity((q) => q + 1);
  const handleDecrement = () => setQuantity((q) => Math.max(0, q - 1));

  const handleSave = async () => {
    if (!user || !selectedBehavior) return;
    if (quantity <= 0) {
      Alert.alert('Invalid Quantity', 'Please enter a quantity greater than zero.');
      return;
    }

    setSaving(true);
    try {
      await entryRepo.create({
        userId: user.id,
        behaviorId: selectedBehavior.id,
        quantity,
        occurredAt: new Date().toISOString(),
        timezone: 'UTC',
        notes: notes.trim() || null,
        contextTags: [timeTag.toLowerCase()]
      });

      await recalculateBehavior(selectedBehavior.id);
      router.back();
    } catch (err: any) {
      Alert.alert('Logging Failed', err.message || 'Unable to record entry.');
    } finally {
      setSaving(false);
    }
  };

  if (!selectedBehavior && behaviors.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <AppIcon name="close" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Log Behavior</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No behaviors found. Create one first!</Text>
          <Button
            title="Create Behavior"
            onPress={() => {
              router.back();
              router.push('/behavior/create');
            }}
            style={{ marginTop: 16 }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <AppIcon name="chevron-left" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Log Behavior</Text>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => setShowPicker(!showPicker)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <AppIcon name="chevron-down" size={20} color={colors.text.muted} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Behavior Selector Card */}
          <TouchableOpacity
            style={styles.behaviorCard}
            onPress={() => setShowPicker(!showPicker)}
            activeOpacity={0.7}
          >
            <View style={styles.behaviorLeft}>
              <BehaviorIconBadge
                icon={selectedBehavior?.icon || 'sparkles'}
                color={selectedBehavior?.accentColor || colors.primary.base}
                size={22}
                badgeSize={44}
              />
              <View style={styles.behaviorTextCol}>
                <Text style={styles.behaviorName}>{selectedBehavior?.name}</Text>
                <Text style={styles.behaviorCategory}>{selectedBehavior?.category}</Text>
              </View>
            </View>
            <AppIcon name="chevron-right" size={20} color={colors.text.muted} />
          </TouchableOpacity>

          {/* Behavior Dropdown Picker (Expandable) */}
          {showPicker && (
            <View style={styles.pickerDropdown}>
              {behaviors.map((b) => (
                <TouchableOpacity
                  key={b.id}
                  style={[
                    styles.pickerItem,
                    b.id === selectedBehavior?.id && styles.pickerItemActive
                  ]}
                  onPress={() => {
                    setSelectedBehavior(b);
                    setShowPicker(false);
                  }}
                >
                  <BehaviorIconBadge
                    icon={b.icon || 'sparkles'}
                    color={b.accentColor}
                    size={16}
                    badgeSize={32}
                  />
                  <Text style={[styles.pickerItemText, b.id === selectedBehavior?.id && { color: colors.primary.base }]}>
                    {b.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Mode Pills: [ Quick | Custom | Time ] */}
          <SegmentedControl
            options={['Quick', 'Custom', 'Time']}
            selectedIndex={modeIdx}
            onChange={setModeIdx}
            style={styles.segmented}
          />

          {/* Prominent Quantity Counter */}
          <View style={styles.counterCard}>
            <Text style={styles.counterNumber}>{quantity}</Text>
            <Text style={styles.counterUnit}>{selectedBehavior?.unit || 'count'}</Text>

            <View style={styles.counterControlsRow}>
              {/* Minus Button */}
              <TouchableOpacity
                onPress={handleDecrement}
                style={styles.counterBtnMinus}
                activeOpacity={0.7}
              >
                <AppIcon name="minus" size={24} color={colors.text.primary} />
              </TouchableOpacity>

              {/* Plus Button */}
              <TouchableOpacity
                onPress={handleIncrement}
                style={styles.counterBtnPlus}
                activeOpacity={0.7}
              >
                <AppIcon name="plus" size={26} color={colors.warm.creamDark} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Time Quick Tags: [ Now | Morning | Afternoon | Evening ] */}
          <View style={styles.timeTagsRow}>
            {(['Now', 'Morning', 'Afternoon', 'Evening'] as const).map((tag) => {
              const isActive = timeTag === tag;
              return (
                <TouchableOpacity
                  key={tag}
                  onPress={() => setTimeTag(tag)}
                  style={[styles.timeChip, isActive && styles.timeChipActive]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.timeChipText, isActive && styles.timeChipTextActive]}>
                    {tag}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Optional Note Row */}
          <View style={styles.noteInputContainer}>
            <AppIcon name="note" size={18} color={colors.text.muted} style={{ marginRight: 10 }} />
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Add a note (optional)"
              placeholderTextColor={colors.text.muted}
              style={styles.noteInput}
            />
          </View>
        </ScrollView>

        {/* Primary Warm Cream "Save Entry" Action */}
        <View style={styles.footer}>
          <Button
            title="Save Entry"
            onPress={handleSave}
            variant="primary"
            size="lg"
            loading={saving}
            style={styles.saveBtn}
          />
        </View>
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
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text.primary,
    fontWeight: '700'
  },
  scrollContent: {
    padding: spacing.base,
    paddingBottom: 24
  },
  behaviorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.base,
    marginBottom: spacing.md
  },
  behaviorLeft: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  behaviorTextCol: {
    marginLeft: spacing.md
  },
  behaviorName: {
    ...typography.h3,
    color: colors.text.primary
  },
  behaviorCategory: {
    ...typography.caption,
    color: colors.text.muted,
    marginTop: 2
  },
  pickerDropdown: {
    backgroundColor: colors.background.elevated,
    borderColor: colors.background.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.xs,
    marginBottom: spacing.md
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm
  },
  pickerItemActive: {
    backgroundColor: colors.background.highlight
  },
  pickerItemText: {
    ...typography.bodyBold,
    color: colors.text.primary,
    marginLeft: spacing.sm
  },
  segmented: {
    marginBottom: spacing.lg
  },
  counterCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
    borderWidth: 1,
    borderRadius: radii.lg,
    marginBottom: spacing.lg
  },
  counterNumber: {
    ...typography.displayHero,
    color: colors.text.primary
  },
  counterUnit: {
    ...typography.caption,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 4,
    marginBottom: 20
  },
  counterControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32
  },
  counterBtnMinus: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.background.elevated,
    borderColor: colors.background.border,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  counterBtnPlus: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.warm.cream,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4
  },
  timeTagsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg
  },
  timeChip: {
    flex: 1,
    marginHorizontal: 3,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
    borderWidth: 1,
    borderRadius: radii.full
  },
  timeChipActive: {
    backgroundColor: colors.background.highlight,
    borderColor: colors.primary.border
  },
  timeChipText: {
    ...typography.caption,
    color: colors.text.muted,
    fontWeight: '500'
  },
  timeChipTextActive: {
    color: colors.text.primary,
    fontWeight: '600'
  },
  noteInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.base,
    paddingVertical: 10
  },
  noteInput: {
    flex: 1,
    color: colors.text.primary,
    ...typography.body,
    padding: 0
  },
  footer: {
    padding: spacing.base,
    borderTopWidth: 1,
    borderTopColor: colors.background.border,
    backgroundColor: colors.background.base
  },
  saveBtn: {
    width: '100%'
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  emptyText: {
    ...typography.body,
    color: colors.text.muted,
    textAlign: 'center'
  }
});
