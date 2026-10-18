import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
          <Text style={styles.value}>₹{Number(totalAmount).toLocaleString('en-IN')}</Text>
        </View>
      </View>

      {/* Luxury Obsidian & Gold Total Banner */}
      <View style={styles.totalWrapper}>
        <LinearGradient
          colors={['#1C1917', '#292524', '#451A03']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.totalGradient}>
          <View>
            <Text style={styles.totalLabel}>TOTAL PAYABLE</Text>
            <Text style={styles.totalItemsSub}>{totalItemCount} items selected</Text>
          </View>
          <Text style={styles.totalValue}>₹{Number(totalAmount).toLocaleString('en-IN')}</Text>
        </LinearGradient>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: '#E7E2D7',
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
    fontWeight: '800',
    color: colors.textPrimary,
    fontSize: 14,
  },
  totalWrapper: {
    borderRadius: spacing.radiusMd,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#1C1917',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    borderWidth: 1,
    borderColor: '#78350F',
    marginBottom: 4,
  },
  totalGradient: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalLabel: {
    ...typography.heading,
    fontSize: 13,
    fontWeight: '800',
    color: '#FDE68A',
    letterSpacing: 0.6,
  },
  totalItemsSub: {
    fontSize: 11,
    color: '#D6D3D1',
    marginTop: 1,
  },
  totalValue: {
    ...typography.heading,
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});

export default OrderSummary;
