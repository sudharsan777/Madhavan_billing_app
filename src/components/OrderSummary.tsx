import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useCart } from '../context/CartContext';
import colors from '../theme/colors';
import spacing from '../theme/spacing';
import typography from '../theme/typography';

export const OrderSummary: React.FC = () => {
  const { totalItemCount, totalAmount } = useCart();

  return (
    <View style={styles.container}>
      {/* Breakdown Rows */}
      <View style={styles.breakdownSection}>
        <View style={styles.row}>
          <Text style={styles.label}>Total Items</Text>
          <Text style={styles.value}>
            {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Subtotal</Text>
          <Text style={styles.value}>₹{totalAmount}</Text>
        </View>
      </View>

      {/* Total Banner */}
      <View style={styles.totalContainer}>
        <Text style={styles.totalLabel}>TOTAL AMOUNT</Text>
        <Text style={styles.totalValue}>₹{totalAmount}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  breakdownSection: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  value: {
    ...typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
    fontSize: 14,
  },
  totalContainer: {
    backgroundColor: colors.totalBackground,
    borderRadius: spacing.radiusMd,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  totalLabel: {
    ...typography.heading,
    fontSize: 15,
    fontWeight: '800',
    color: colors.totalText,
    letterSpacing: 0.5,
  },
  totalValue: {
    ...typography.heading,
    fontSize: 22,
    fontWeight: '800',
    color: colors.totalText,
  },
});

export default OrderSummary;
