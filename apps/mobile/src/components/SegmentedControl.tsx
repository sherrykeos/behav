import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { colors, typography, radii } from '../theme';

interface SegmentedControlProps {
  options: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
  style?: ViewStyle;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  options,
  selectedIndex,
  onChange,
  style
}) => {
  return (
    <View style={[styles.container, style]}>
      {options.map((option, index) => {
        const isSelected = index === selectedIndex;
        return (
          <TouchableOpacity
            key={index}
            style={[styles.tab, isSelected && styles.activeTab]}
            onPress={() => onChange(index)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, isSelected && styles.activeTabText]}>
              {option}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#0E1310',
    padding: 3,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.background.border
  },
  tab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full
  },
  activeTab: {
    backgroundColor: colors.background.highlight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 2
  },
  tabText: {
    ...typography.caption,
    color: colors.text.muted,
    fontWeight: '500'
  },
  activeTabText: {
    color: colors.text.primary,
    fontWeight: '600'
  }
});
