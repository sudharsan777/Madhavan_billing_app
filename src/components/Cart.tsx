import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useCart } from '../context/CartContext';
import { usePrinter } from '../context/PrinterContext';
import CartItemComponent from './CartItem';
import OrderSummary from './OrderSummary';
import PrimaryButton from './PrimaryButton';
import SecondaryButton from './SecondaryButton';
import BillModal from './BillModal';
import colors from '../theme/colors';
import spacing from '../theme/spacing';
import typography from '../theme/typography';
import { CartIcon, TrashIcon, PrinterIcon, CheckIcon, CloseIcon } from './icons';

interface CartProps {
  onCloseMobileCart?: () => void;
  isMobileSheet?: boolean;
}

export const Cart: React.FC<CartProps> = ({ onCloseMobileCart, isMobileSheet = false }) => {
  const {
    cartItems,
    clearCart,
    totalItemCount,
    tableNumber,
    setTableNumber,
    subtotal,
    discountPercent,
    discountAmount,
    totalAmount,
  } = useCart();

  const { printBill } = usePrinter();

  const [billModalVisible, setBillModalVisible] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const handleSaveBill = () => {
    if (cartItems.length === 0) return;
    setBillModalVisible(true);
  };

  const handleDirectPrintBill = async () => {
    if (cartItems.length === 0) return;
    setIsPrinting(true);

    const billNumber = `INV-${Math.floor(100000 + Math.random() * 900000)}`;
    const result = await printBill({
      billNumber,
      tableNumber,
      timestamp: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
      items: cartItems.map((ci) => ({
        name: ci.item.name,
        qty: ci.quantity,
        price: ci.item.price,
      })),
      subtotal,
      discountAmount,
      totalAmount,
    });

    setIsPrinting(false);

    if (result.success) {
      Alert.alert('Print Successful', result.message, [
        {
          text: 'New Order',
          onPress: () => {
            clearCart();
            if (onCloseMobileCart) onCloseMobileCart();
          },
        },
      ]);
    } else {
      Alert.alert('Printer Error', result.message || 'Printer not connected.', [
        { text: 'View Preview', onPress: () => setBillModalVisible(true) },
        { text: 'OK' },
      ]);
    }
  };

  const handleCompleteOrder = () => {
    setBillModalVisible(false);
    clearCart();
    if (onCloseMobileCart) {
      onCloseMobileCart();
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleGroup}>
          <CartIcon size={20} color={colors.primary} />
          <Text style={styles.title}>Current Order</Text>
          {totalItemCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{totalItemCount}</Text>
            </View>
          )}
        </View>

        <View style={styles.headerRightGroup}>
          {cartItems.length > 0 && (
            <TouchableOpacity onPress={clearCart} style={styles.clearBtn} activeOpacity={0.7}>
              <TrashIcon size={16} color={colors.danger} />
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          )}

          {isMobileSheet && onCloseMobileCart && (
            <TouchableOpacity onPress={onCloseMobileCart} style={styles.closeBtn}>
              <CloseIcon size={20} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Cart Items List or Empty State */}
      {cartItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <CartIcon size={36} color={colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>Cart is empty</Text>
          <Text style={styles.emptySubtitle}>
            Select items from the menu on the left to add them to this order.
          </Text>
        </View>
      ) : (
        <FlatList
          data={cartItems}
          keyExtractor={(ci) => ci.item.id}
          renderItem={({ item }) => <CartItemComponent cartItem={item} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Order Summary & Actions */}
      {cartItems.length > 0 && (
        <View style={styles.footer}>
          <OrderSummary />

          <View style={styles.actionButtons}>
            <SecondaryButton
              title="PRINT BILL"
              onPress={handleDirectPrintBill}
              loading={isPrinting}
              icon={<PrinterIcon size={18} color={colors.textPrimary} />}
              style={{ flex: 1 }}
            />
            <PrimaryButton
              title="SAVE BILL"
              onPress={handleSaveBill}
              icon={<CheckIcon size={18} color={colors.textOnPrimary} />}
              variant="primary"
              style={{ flex: 1 }}
            />
          </View>
        </View>
      )}

      {/* Printable Receipt Modal */}
      <BillModal
        visible={billModalVisible}
        onClose={() => setBillModalVisible(false)}
        onCompleteOrder={handleCompleteOrder}
        cartItems={cartItems}
        subtotal={subtotal}
        discountPercent={discountPercent}
        discountAmount={discountAmount}
        totalAmount={totalAmount}
        tableNumber={tableNumber}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surfaceVariant,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    ...typography.sectionTitle,
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  badge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: spacing.radiusFull,
  },
  badgeText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
    color: colors.textOnPrimary,
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.dangerLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: spacing.radiusSm,
  },
  clearText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '600',
    color: colors.danger,
  },
  closeBtn: {
    padding: 4,
  },
  listContent: {
    padding: spacing.md,
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
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.heading,
    fontSize: 17,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    ...typography.body,
    fontSize: 13,
    textAlign: 'center',
    color: colors.textMuted,
  },
  footer: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
});

export default Cart;
