import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { MenuItem, CATEGORY_ICONS } from '../data/menu';
import { useCart } from '../context/CartContext';
import { useResponsive } from '../utils/responsive';
import colors from '../theme/colors';
import spacing from '../theme/spacing';
import typography from '../theme/typography';
import { PlusIcon, MinusIcon } from './icons';

interface ProductCardProps {
  item: MenuItem;
}

export const ProductCard: React.FC<ProductCardProps> = ({ item }) => {
  const { addToCart, updateQuantity, getItemQuantity } = useCart();
  const { isSmallPhone, isTablet } = useResponsive();
  const quantity = getItemQuantity(item.id);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const categoryEmoji = CATEGORY_ICONS[item.category] || '🍽️';
  const imageHeight = isSmallPhone ? 105 : isTablet ? 138 : 122;

  return (
    <View style={[styles.card, isTablet && styles.cardTablet, quantity > 0 && styles.cardSelected]}>
      {/* Visual Image Header */}
      <View style={[styles.imageContainer, { height: imageHeight }]}>
        {!imageError && item.image ? (
          <>
            <Image
              source={{ uri: item.image }}
              style={styles.image}
              resizeMode="cover"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
            />
            {!imageLoaded && (
              <View style={styles.imageSkeleton}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            )}
          </>
        ) : (
          <View style={styles.imageFallback}>
            <Text style={styles.fallbackEmoji}>{categoryEmoji}</Text>
          </View>
        )}

        {/* Veg / Non-Veg Indicator Badge */}
        <View style={styles.dietaryBadgeContainer}>
          <View
            style={[
              styles.dietaryBox,
              item.isVeg ? styles.vegBox : styles.nonVegBox,
            ]}>
            <View
              style={[
                styles.dietaryDot,
                item.isVeg ? styles.vegDot : styles.nonVegDot,
              ]}
            />
          </View>
        </View>

        {/* Star Rating Badge */}
        {item.rating !== undefined && (
          <View style={styles.ratingBadge}>
            <Text style={styles.starIcon}>★</Text>
            <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
          </View>
        )}

        {/* Category Pill on Image */}
        <View style={styles.categoryPill}>
          <Text style={styles.categoryPillText} numberOfLines={1}>
            {item.category}
          </Text>
        </View>
      </View>

      {/* Product Information */}
      <View style={[styles.contentSection, isTablet && styles.contentSectionTablet]}>
        <Text
          style={[styles.name, isTablet && styles.nameTablet]}
          numberOfLines={2}>
          {item.name}
        </Text>

        {item.description ? (
          <Text
            style={[styles.description, isTablet && styles.descriptionTablet]}
            numberOfLines={isTablet ? 2 : 1}>
            {item.description}
          </Text>
        ) : null}

        {/* Price & Action Row */}
        <View style={styles.footerRow}>
          <View style={styles.priceContainer}>
            <Text style={styles.currencySymbol}>₹</Text>
            <Text style={[styles.price, isTablet && styles.priceTablet]}>{item.price}</Text>
          </View>

          {quantity === 0 ? (
            <TouchableOpacity
              style={[styles.addButton, isTablet && styles.addButtonTablet]}
              onPress={() => addToCart(item)}
              activeOpacity={0.8}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <PlusIcon size={isTablet ? 14 : 12} color={colors.textOnPrimary} strokeWidth={3} />
              <Text style={[styles.addButtonText, isTablet && styles.addButtonTextTablet]}>ADD</Text>
            </TouchableOpacity>
          ) : (
            <View style={[styles.quantityContainer, isTablet && styles.quantityContainerTablet]}>
              <TouchableOpacity
                style={[styles.qtyButton, isTablet && styles.qtyButtonTablet]}
                onPress={() => updateQuantity(item.id, -1)}
                activeOpacity={0.7}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <MinusIcon size={isTablet ? 14 : 12} color={colors.textPrimary} strokeWidth={2.5} />
              </TouchableOpacity>

              <Text style={[styles.qtyText, isTablet && styles.qtyTextTablet]}>{quantity}</Text>

              <TouchableOpacity
                style={[styles.qtyButton, styles.qtyButtonPlus, isTablet && styles.qtyButtonTablet]}
                onPress={() => updateQuantity(item.id, 1)}
                activeOpacity={0.7}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <PlusIcon size={isTablet ? 14 : 12} color={colors.textOnPrimary} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    margin: spacing.xs,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  cardTablet: {
    borderRadius: 18,
    margin: spacing.sm,
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#FBFDFD',
  },
  imageContainer: {
    width: '100%',
    backgroundColor: '#F1F5F9',
    position: 'relative',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageSkeleton: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageFallback: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackEmoji: {
    fontSize: 42,
  },
  dietaryBadgeContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 4,
    padding: 2,
    elevation: 2,
  },
  dietaryBox: {
    width: 16,
    height: 16,
    borderWidth: 1.5,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vegBox: {
    borderColor: '#16A34A',
  },
  nonVegBox: {
    borderColor: '#DC2626',
  },
  dietaryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  vegDot: {
    backgroundColor: '#16A34A',
  },
  nonVegDot: {
    backgroundColor: '#DC2626',
  },
  ratingBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 3,
  },
  starIcon: {
    fontSize: 10,
    color: '#FBBF24',
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  categoryPill: {
    position: 'absolute',
    bottom: 6,
    left: 8,
    backgroundColor: 'rgba(15, 118, 110, 0.92)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  categoryPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  contentSection: {
    padding: 10,
    justifyContent: 'space-between',
    flex: 1,
  },
  contentSectionTablet: {
    padding: 12,
  },
  name: {
    ...typography.productName,
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 18,
    minHeight: 36,
  },
  nameTablet: {
    fontSize: 15,
    lineHeight: 20,
    minHeight: 40,
  },
  description: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: 4,
  },
  descriptionTablet: {
    fontSize: 12,
    lineHeight: 15,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currencySymbol: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
    marginRight: 1,
  },
  price: {
    ...typography.price,
    fontSize: 16,
    fontWeight: '800',
    color: '#059669',
  },
  priceTablet: {
    fontSize: 18,
  },
  addButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 68,
    height: 34,
    borderRadius: 10,
    paddingHorizontal: 10,
    gap: 4,
    elevation: 2,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  addButtonTablet: {
    minWidth: 76,
    height: 38,
    borderRadius: 11,
    paddingHorizontal: 12,
  },
  addButtonText: {
    ...typography.button,
    fontSize: 12,
    fontWeight: '800',
    color: colors.textOnPrimary,
    letterSpacing: 0.5,
  },
  addButtonTextTablet: {
    fontSize: 13,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 2,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    height: 34,
  },
  quantityContainerTablet: {
    height: 38,
    borderRadius: 11,
  },
  qtyButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
  },
  qtyButtonTablet: {
    width: 32,
    height: 32,
    borderRadius: 9,
  },
  qtyButtonPlus: {
    backgroundColor: colors.primary,
  },
  qtyText: {
    ...typography.body,
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
    minWidth: 22,
    textAlign: 'center',
  },
  qtyTextTablet: {
    fontSize: 14,
    minWidth: 26,
  },
});

export default ProductCard;
