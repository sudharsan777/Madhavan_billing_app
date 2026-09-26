import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { CartItem as CartItemType, useCart } from '../context/CartContext';
import { CATEGORY_ICONS } from '../data/menu';
import colors from '../theme/colors';
import spacing from '../theme/spacing';
import typography from '../theme/typography';
import { PlusIcon, MinusIcon, TrashIcon } from './icons';

interface CartItemProps {
  cartItem: CartItemType;
}

export const CartItemComponent: React.FC<CartItemProps> = ({ cartItem }) => {
  const { updateQuantity, removeFromCart } = useCart();
  const { item, quantity } = cartItem;
  const itemTotal = item.price * quantity;
  const [imgError, setImgError] = useState(false);

  const categoryEmoji = CATEGORY_ICONS[item.category] || '🍽️';

  return (
    <View style={styles.container}>
      <View style={styles.mainRow}>
        {/* Item Thumbnail Image */}
        <View style={styles.thumbnailWrapper}>
          {!imgError && item.image ? (
            <Image
              source={{ uri: item.image }}
              style={styles.thumbnail}
              resizeMode="cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <View style={styles.thumbnailFallback}>
              <Text style={styles.fallbackEmoji}>{categoryEmoji}</Text>
            </View>
          )}

          {/* Veg/Non-Veg Mini Indicator */}
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

        {/* Info Column */}
        <View style={styles.infoCol}>
          <Text style={styles.name} numberOfLines={2}>
            {item.name}
          </Text>
          <View style={styles.priceRow}>
            <Text style={styles.unitPrice}>₹{item.price} each</Text>
            <Text style={styles.totalPrice}>₹{itemTotal}</Text>
          </View>
        </View>
      </View>

      {/* Bottom Controls Row */}
      <View style={styles.bottomRow}>
        {/* Quantity Controls */}
        <View style={styles.qtyContainer}>
          <TouchableOpacity
            style={styles.qtyBtn}
            onPress={() => updateQuantity(item.id, -1)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MinusIcon size={13} color={colors.textPrimary} strokeWidth={2.5} />
          </TouchableOpacity>

          <Text style={styles.qtyText}>{quantity}</Text>

          <TouchableOpacity
            style={[styles.qtyBtn, styles.qtyBtnPlus]}
            onPress={() => updateQuantity(item.id, 1)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <PlusIcon size={13} color={colors.textOnPrimary} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        {/* Remove Button */}
        <TouchableOpacity
          style={styles.removeBtn}
          onPress={() => removeFromCart(item.id)}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <TrashIcon size={14} color={colors.danger} />
          <Text style={styles.removeText}>Remove</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    marginBottom: spacing.xs,
    elevation: 1,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  thumbnailWrapper: {
    width: 52,
    height: 52,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    position: 'relative',
    marginRight: 10,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailFallback: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  fallbackEmoji: {
    fontSize: 22,
  },
  dietaryBox: {
    position: 'absolute',
    top: 3,
    left: 3,
    width: 12,
    height: 12,
    borderWidth: 1,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
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
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  vegDot: {
    backgroundColor: '#16A34A',
  },
  nonVegDot: {
    backgroundColor: '#DC2626',
  },
  infoCol: {
    flex: 1,
  },
  name: {
    ...typography.productName,
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 17,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 3,
  },
  unitPrice: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textMuted,
  },
  totalPrice: {
    ...typography.price,
    fontSize: 15,
    fontWeight: '800',
    color: '#059669',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  qtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  qtyBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnPlus: {
    backgroundColor: colors.primary,
  },
  qtyText: {
    ...typography.body,
    fontSize: 12,
    fontWeight: '800',
    color: colors.textPrimary,
    minWidth: 26,
    textAlign: 'center',
  },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
  },
  removeText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
    color: colors.danger,
  },
});

export default CartItemComponent;
