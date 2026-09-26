import React, { useMemo } from 'react';
import { View, FlatList, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MENU_ITEMS, MenuItem, CATEGORY_ICONS } from '../data/menu';
import { useCart } from '../context/CartContext';
import { useResponsive } from '../utils/responsive';
import ProductCard from './ProductCard';
import colors from '../theme/colors';
import spacing from '../theme/spacing';
import typography from '../theme/typography';
import { SearchIcon, CloseIcon } from './icons';

export const ProductGrid: React.FC = () => {
  const { selectedCategory, searchQuery, setSearchQuery, setSelectedCategory } = useCart();
  const { gridColumns, isPhone } = useResponsive();

  const filteredItems = useMemo(() => {
    return MENU_ITEMS.filter((item) => {
      const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
      const matchesSearch =
        searchQuery.trim() === '' ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase().trim());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  const categoryEmoji = CATEGORY_ICONS[selectedCategory] || '🍽️';

  const renderItem = ({ item }: { item: MenuItem }) => <ProductCard item={item} />;

  return (
    <View style={styles.container}>
      {/* Active Filter Header */}
      <View style={styles.activeFilterBar}>
        <View style={styles.filterTitleGroup}>
          <Text style={styles.filterEmoji}>{categoryEmoji}</Text>
          <Text style={styles.filterTitle}>
            {selectedCategory === 'ALL' ? 'All Menu Items' : selectedCategory}
          </Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{filteredItems.length}</Text>
          </View>
        </View>

        {(selectedCategory !== 'ALL' || searchQuery !== '') && (
          <TouchableOpacity
            style={styles.resetFilterButton}
            onPress={() => {
              setSelectedCategory('ALL');
              setSearchQuery('');
            }}>
            <CloseIcon size={13} color={colors.textSecondary} />
            <Text style={styles.resetFilterText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Grid or Empty State */}
      {filteredItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <SearchIcon size={32} color={colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>No matching delicious items</Text>
          <Text style={styles.emptySubtitle}>
            No dishes found for &quot;{searchQuery || selectedCategory}&quot;.
          </Text>
          <TouchableOpacity
            style={styles.clearSearchBtn}
            onPress={() => {
              setSearchQuery('');
              setSelectedCategory('ALL');
            }}>
            <Text style={styles.clearSearchBtnText}>Reset Search</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          key={`grid-${gridColumns}`} // Key forces re-mount when columns change responsively
          data={filteredItems}
          keyExtractor={(item) => item.id}
          numColumns={gridColumns}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            { padding: isPhone ? spacing.xs : spacing.sm },
          ]}
          showsVerticalScrollIndicator={false}
          initialNumToRender={12}
          maxToRenderPerBatch={16}
          windowSize={7}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  activeFilterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  filterTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterEmoji: {
    fontSize: 18,
  },
  filterTitle: {
    ...typography.sectionTitle,
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  countBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  resetFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  resetFilterText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  listContent: {
    paddingBottom: 40,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.h3,
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    ...typography.body,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  clearSearchBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: 10,
  },
  clearSearchBtnText: {
    ...typography.button,
    fontSize: 13,
    fontWeight: '700',
    color: colors.textOnPrimary,
  },
});

export default ProductGrid;
