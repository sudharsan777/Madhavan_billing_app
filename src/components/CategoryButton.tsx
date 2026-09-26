import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import colors from '../theme/colors';
import spacing from '../theme/spacing';
import typography from '../theme/typography';

interface CategoryButtonProps {
  name: string;
  icon?: string;
  count?: number;
  isSelected: boolean;
  onPress: () => void;
  vertical?: boolean;
}

export const CategoryButton: React.FC<CategoryButtonProps> = ({
  name,
  icon,
  count,
  isSelected,
  onPress,
  vertical = false,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        vertical ? styles.buttonVertical : styles.buttonHorizontal,
        isSelected && styles.buttonSelected,
      ]}
      onPress={onPress}
      activeOpacity={0.75}>
      <View style={styles.leftContent}>
        {icon ? <Text style={styles.icon}>{icon}</Text> : null}
        <Text
          style={[styles.label, isSelected && styles.labelSelected]}
          numberOfLines={1}>
          {name}
        </Text>
      </View>

      {count !== undefined && (
        <View style={[styles.badge, isSelected && styles.badgeSelected]}>
          <Text style={[styles.badgeText, isSelected && styles.badgeTextSelected]}>
            {count}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  icon: {
    fontSize: 16,
  },
  buttonHorizontal: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginRight: 8,
    height: 40,
    gap: 6,
  },
  buttonVertical: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6,
    width: '100%',
    minHeight: 46,
    gap: 8,
  },
  buttonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    ...typography.body,
    fontWeight: '700',
    color: '#334155',
    fontSize: 13,
  },
  labelSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  badge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: spacing.radiusFull,
  },
  badgeSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
  },
  badgeText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  badgeTextSelected: {
    color: '#FFFFFF',
  },
});

export default CategoryButton;
