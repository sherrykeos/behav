import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors, radii, spacing, typography } from '../theme';

interface TagChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
}

export const TagChip: React.FC<TagChipProps> = ({ label, selected = false, onPress }) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.primary.faint : colors.background.surface,
          borderColor: selected ? colors.primary.base : colors.background.border
        }
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: selected ? colors.primary.mint : colors.text.secondary
          }
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.full,
    borderWidth: 1,
    marginRight: spacing.xs,
    marginBottom: spacing.xs
  },
  text: {
    ...typography.captionBold,
    fontSize: 12
  }
});
