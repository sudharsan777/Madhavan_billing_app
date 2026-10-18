import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MenuItem, CATEGORY_ICONS } from '../data/menu';
import { getProductImageSource } from '../data/productImages';
import { useCart } from '../context/CartContext';
import { useResponsive } from '../utils/responsive';
import colors from '../theme/colors';
import spacing from '../theme/spacing';
import typography from '../theme/typography';
import { PlusIcon, MinusIcon } from './icons';

interface ProductCardProps {
  item: MenuItem;
}

export const ProductCard: React.FC<ProductCardProps> = React.memo(({ item }) => {
  const { addToCart, updateQuantity, getItemQuantity } = useCart();
  const { isSmallPhone, isTablet } = useResponsive();
  const quantity = getItemQuantity(item.id);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Reset image state when item changes in recycled cards
  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
  }, [item.id]);

  const categoryEmoji = CATEGORY_ICONS[item.category] || '🍽️';
  const imageHeight = isSmallPhone ? 105 : isTablet ? 138 : 122;
  const imageSource = getProductImageSource(item.id, item.image);

  return (
    <View style={[styles.card, isTablet && styles.cardTablet, quantity > 0 && styles.cardSelected]}>
      {/* Visual Image Header */}
      <View style={[styles.imageContainer, { height: imageHeight }]}>
        {!imageError && imageSource ? (
          <>
            <Image
              source={imageSource}
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
            <Text style={styles.fallbackText} numberOfLines={1}>{item.name}</Text>
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
              activeOpacity={0.85}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <LinearGradient
                colors={colors.gradients.gold}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.addButtonGradient}>
                <PlusIcon size={isTablet ? 14 : 12} color="#FFFFFF" strokeWidth={3} />
                <Text style={[styles.addButtonText, isTablet && styles.addButtonTextTablet]}>ADD</Text>
              </LinearGradient>
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
                <LinearGradient
                  colors={colors.gradients.gold}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}>
                  <View style={styles.plusIconCenter}>
                    <PlusIcon size={isTablet ? 14 : 12} color="#FFFFFF" strokeWidth={2.5} />
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E7E2D7',
    margin: spacing.xs,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#1C1917',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
  },
  cardTablet: {
    borderRadius: 18,
    margin: spacing.sm,
  },
  cardSelected: {
    borderColor: '#D97706',
    backgroundColor: '#FFFDF7',
  },
  imageContainer: {
    width: '100%',
    backgroundColor: '#F7F5F0',
    position: 'relative',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageSkeleton: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#E7E2D7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageFallback: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#FAF9F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackEmoji: {
    fontSize: 38,
  },
  fallbackText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    marginTop: 4,
    paddingHorizontal: 8,
    textAlign: 'center',
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
    backgroundColor: 'rgba(28, 25, 23, 0.85)',
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
    fontWeight: '800',
    color: '#FFFFFF',
  },
  categoryPill: {
    position: 'absolute',
    bottom: 6,
    left: 8,
    backgroundColor: 'rgba(28, 25, 23, 0.82)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(253, 230, 138, 0.4)',
  },
  categoryPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FDE68A',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
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
    fontWeight: '800',
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
    borderTopColor: '#F7F5F0',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currencySymbol: {
    fontSize: 13,
    fontWeight: '800',
    color: '#B45309',
    marginRight: 1,
  },
  price: {
    ...typography.price,
    fontSize: 16,
    fontWeight: '900',
    color: '#B45309',
  },
  priceTablet: {
    fontSize: 18,
  },
  addButton: {
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 2,
  },
  addButtonTablet: {
    borderRadius: 11,
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 68,
    height: 34,
    paddingHorizontal: 10,
    gap: 4,
  },
  addButtonText: {
    ...typography.button,
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  addButtonTextTablet: {
    fontSize: 13,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F5F0',
    borderRadius: 10,
    padding: 2,
    borderWidth: 1.5,
    borderColor: '#E7E2D7',
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
    overflow: 'hidden',
  },
  qtyButtonTablet: {
    width: 32,
    height: 32,
    borderRadius: 9,
  },
  qtyButtonPlus: {
    backgroundColor: 'transparent',
  },
  plusIconCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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

ProductCard.displayName = 'ProductCard';

export default ProductCard;
