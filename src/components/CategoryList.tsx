import React, { useMemo } from 'react';
import { View, ScrollView, StyleSheet, FlatList, Text } from 'react-native';
import { MENU_CATEGORIES, MENU_ITEMS, CATEGORY_ICONS } from '../data/menu';
import { useCart } from '../context/CartContext';
import CategoryButton from './CategoryButton';
import colors from '../theme/colors';
import spacing from '../theme/spacing';
import typography from '../theme/typography';
import { CategoryIcon } from './icons';

interface CategoryListProps {
  vertical?: boolean;
}

export const CategoryList: React.FC<CategoryListProps> = ({ vertical = false }) => {
  const { selectedCategory, setSelectedCategory } = useCart();

  // Compute counts per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: MENU_ITEMS.length };
    MENU_ITEMS.forEach((item) => {
      counts[item.category] = (counts[item.category] || 0) + 1;
    });
    return counts;
  }, []);

  const categories = useMemo(() => ['ALL', ...MENU_CATEGORIES], []);

  if (vertical) {
    return (
      <View style={styles.verticalContainer}>
        <View style={styles.verticalHeader}>
          <CategoryIcon size={18} color={colors.primary} />
          <Text style={styles.verticalTitle}>Menu Categories</Text>
        </View>
        <ScrollView
          style={styles.verticalScrollView}
          contentContainerStyle={styles.verticalContent}
          showsVerticalScrollIndicator={false}>
          {categories.map((cat) => (
            <CategoryButton
              key={cat}
              name={cat === 'ALL' ? 'All Items' : cat}
              icon={CATEGORY_ICONS[cat] || '🍽️'}
              count={categoryCounts[cat]}
              isSelected={selectedCategory === cat}
              onPress={() => setSelectedCategory(cat)}
              vertical
            />
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.horizontalContainer}>
      <FlatList
        data={categories}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item}
        contentContainerStyle={styles.horizontalContent}
        renderItem={({ item }) => (
          <CategoryButton
            name={item === 'ALL' ? 'All Items' : item}
            icon={CATEGORY_ICONS[item] || '🍽️'}
            count={categoryCounts[item]}
            isSelected={selectedCategory === item}
            onPress={() => setSelectedCategory(item)}
          />
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  horizontalContainer: {
    height: 56,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  horizontalContent: {
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  verticalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  verticalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  verticalTitle: {
    ...typography.sectionTitle,
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  verticalScrollView: {
    flex: 1,
  },
  verticalContent: {
    padding: spacing.md,
  },
});

export default CategoryList;
