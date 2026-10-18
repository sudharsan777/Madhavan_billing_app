import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
  const content = (
    <>
      <View style={vertical ? styles.verticalLeft : styles.horizontalLeft}>
        {icon ? <Text style={styles.icon}>{icon}</Text> : null}
        <Text
          style={[
            styles.label,
            vertical ? styles.labelVertical : styles.labelHorizontal,
            isSelected && styles.labelSelected,
          ]}
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
    </>
  );

  if (isSelected) {
    return (
      <TouchableOpacity
        style={[
          styles.touchableBase,
          vertical ? styles.touchableVertical : styles.touchableHorizontal,
          styles.selectedShadow,
        ]}
        onPress={onPress}
        activeOpacity={0.85}>
        <LinearGradient
          colors={colors.gradients.gold}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[vertical ? styles.verticalInner : styles.horizontalInner]}>
          {content}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.touchableBase,
        vertical ? styles.touchableVertical : styles.touchableHorizontal,
        styles.unselectedWrapper,
      ]}
      onPress={onPress}
      activeOpacity={0.75}>
      <View style={[vertical ? styles.verticalInner : styles.horizontalInner]}>
        {content}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  touchableBase: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  touchableHorizontal: {
    marginRight: 8,
    height: 42,
  },
  touchableVertical: {
    width: '100%',
    marginBottom: 8,
  },
  unselectedWrapper: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    elevation: 1,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  selectedShadow: {
    elevation: 4,
    shadowColor: '#B45309',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  horizontalInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 42,
    gap: 8,
  },
  verticalInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 48,
    width: '100%',
    gap: 8,
  },
  horizontalLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  verticalLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  icon: {
    fontSize: 16,
  },
  label: {
    ...typography.body,
    fontWeight: '700',
    color: '#334155',
  },
  labelHorizontal: {
    fontSize: 13,
  },
  labelVertical: {
    fontSize: 13,
    flexShrink: 1,
  },
  labelSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  badge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 22,
    alignItems: 'center',
    justifyContent: 'center',
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
