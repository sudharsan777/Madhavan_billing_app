import React from 'react';
import { View, Text, Modal, ScrollView, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { CartItem } from '../context/CartContext';
import colors from '../theme/colors';
import spacing from '../theme/spacing';
import typography from '../theme/typography';
import PrimaryButton from './PrimaryButton';
import SecondaryButton from './SecondaryButton';
import SHOP_CONFIG from '../constants/shop';
import { PrinterIcon, CheckIcon, CloseIcon, ReceiptIcon } from './icons';

interface BillModalProps {
  visible: boolean;
  onClose: () => void;
  onCompleteOrder: () => void;
  cartItems: CartItem[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  totalAmount: number;
  tableNumber: string;
}

export const BillModal: React.FC<BillModalProps> = ({
  visible,
  onClose,
  onCompleteOrder,
  cartItems,
  subtotal,
  discountPercent,
  discountAmount,
  totalAmount,
  tableNumber,
}) => {
  const billNumber = `INV-${Math.floor(100000 + Math.random() * 900000)}`;
  const timestamp = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleRow}>
              <ReceiptIcon size={22} color={colors.primary} />
              <Text style={styles.modalTitle}>Tax Invoice / Receipt</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <CloseIcon size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Printable Receipt Preview Body */}
          <ScrollView style={styles.receiptScroll} contentContainerStyle={styles.receiptBody}>
            <View style={styles.restaurantHeader}>
              <Image
                source={require('../../assets/images/logo.png')}
                style={styles.receiptLogo}
                resizeMode="contain"
              />
              <Text style={styles.restaurantName}>{SHOP_CONFIG.receiptName}</Text>
              <Text style={styles.restaurantSub}>{SHOP_CONFIG.fullAddress}</Text>
              <Text style={styles.restaurantSub}>Ph: {SHOP_CONFIG.formattedPhone}</Text>
            </View>

            <View style={styles.metaDivider} />

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Bill No: {billNumber}</Text>
            </View>
            <Text style={styles.metaDate}>Date: {timestamp}</Text>

            <View style={styles.metaDivider} />

            {/* Itemized Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableColName, styles.bold]}>Item</Text>
              <Text style={[styles.tableColQty, styles.bold]}>Qty</Text>
              <Text style={[styles.tableColPrice, styles.bold]}>Price</Text>
              <Text style={[styles.tableColTotal, styles.bold]}>Total</Text>
            </View>

            <View style={styles.thinDivider} />

            {/* Items */}
            {cartItems.map((ci) => (
              <View key={ci.item.id} style={styles.tableRow}>
                <Text style={styles.tableColName} numberOfLines={1}>
                  {ci.item.name}
                </Text>
                <Text style={styles.tableColQty}>{ci.quantity}</Text>
                <Text style={styles.tableColPrice}>₹{ci.item.price}</Text>
                <Text style={styles.tableColTotal}>₹{ci.item.price * ci.quantity}</Text>
              </View>
            ))}

            <View style={styles.metaDivider} />

            {/* Totals */}
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>TOTAL AMOUNT</Text>
              <Text style={styles.grandTotalValue}>₹{totalAmount}</Text>
            </View>

            <View style={styles.footerNote}>
              <Text style={styles.thankYouText}>Thank you! Visit again</Text>
              <Text style={styles.visitAgainText}>Madhavan Shop • Ayapakkam, Ambattur</Text>
            </View>
          </ScrollView>

          {/* Modal Bottom Actions */}
          <View style={styles.actionRow}>
            <SecondaryButton
              title="Print Receipt"
              onPress={() => {
                alert('Printing bill to thermal printer...');
              }}
              icon={<PrinterIcon size={18} color={colors.textPrimary} />}
              style={{ flex: 1 }}
            />
            <PrimaryButton
              title="Save & New Order"
              onPress={onCompleteOrder}
              icon={<CheckIcon size={18} color={colors.textOnPrimary} />}
              variant="success"
              style={{ flex: 1.2 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.sm,
  },
  modalCard: {
    width: '94%',
    maxWidth: 520,
    maxHeight: '90%',
    backgroundColor: colors.surface,
    borderRadius: spacing.radiusLg,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    alignSelf: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surfaceVariant,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  modalTitle: {
    ...typography.sectionTitle,
    fontSize: 16,
    color: colors.textPrimary,
  },
  closeBtn: {
    padding: 4,
  },
  receiptScroll: {
    maxHeight: 440,
  },
  receiptBody: {
    padding: spacing.md,
    backgroundColor: '#FFFFFF',
  },
  restaurantHeader: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  receiptLogo: {
    width: 64,
    height: 64,
    marginBottom: 6,
  },
  restaurantName: {
    ...typography.heading,
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  restaurantSub: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textSecondary,
  },
  metaDivider: {
    height: 1,
    backgroundColor: colors.borderStrong,
    marginVertical: spacing.sm,
  },
  thinDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaLabel: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  metaValue: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  metaDate: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
  },
  tableColName: {
    flex: 2,
    ...typography.body,
    fontSize: 13,
    color: colors.textPrimary,
  },
  tableColQty: {
    width: 35,
    textAlign: 'center',
    ...typography.body,
    fontSize: 13,
    color: colors.textPrimary,
  },
  tableColPrice: {
    width: 60,
    textAlign: 'right',
    ...typography.body,
    fontSize: 13,
    color: colors.textSecondary,
  },
  tableColTotal: {
    width: 65,
    textAlign: 'right',
    ...typography.body,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  bold: {
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryLabel: {
    ...typography.body,
    fontSize: 13,
    color: colors.textSecondary,
  },
  summaryValue: {
    ...typography.body,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
    borderTopWidth: 2,
    borderTopColor: colors.textPrimary,
    borderBottomWidth: 2,
    borderBottomColor: colors.textPrimary,
  },
  grandTotalLabel: {
    ...typography.heading,
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  grandTotalValue: {
    ...typography.heading,
    fontSize: 18,
    fontWeight: '800',
    color: colors.price,
  },
  footerNote: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  thankYouText: {
    ...typography.body,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  visitAgainText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
  },
  actionRow: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.surfaceVariant,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
});

export default BillModal;
