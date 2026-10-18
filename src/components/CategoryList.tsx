import React, { useMemo } from 'react';
import { View, ScrollView, StyleSheet, Text } from 'react-native';
import { MENU_CATEGORIES, CATEGORY_ICONS } from '../data/menu';
import { useCart } from '../context/CartContext';
import { useProducts } from '../context/ProductContext';
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
  const { products, categories: dynamicCategories } = useProducts();

  // Compute counts per category dynamically from active products
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: products.length };
    products.forEach((item) => {
      counts[item.category] = (counts[item.category] || 0) + 1;
    });
    return counts;
  }, [products]);

  const categories = useMemo(() => {
    const list = dynamicCategories.length > 0 ? dynamicCategories : (MENU_CATEGORIES as unknown as string[]);
    return ['ALL', ...list];
  }, [dynamicCategories]);

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
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalContent}
        keyboardShouldPersistTaps="handled"
        style={styles.horizontalScrollView}>
        {categories.map((cat) => (
          <CategoryButton
            key={cat}
            name={cat === 'ALL' ? 'All Items' : cat}
            icon={CATEGORY_ICONS[cat] || '🍽️'}
            count={categoryCounts[cat]}
            isSelected={selectedCategory === cat}
            onPress={() => setSelectedCategory(cat)}
            vertical={false}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  horizontalContainer: {
    height: 58,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  horizontalScrollView: {
    flex: 1,
  },
  horizontalContent: {
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    paddingVertical: 8,
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
    paddingBottom: 40,
  },
});

export default CategoryList;
