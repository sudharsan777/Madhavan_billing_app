import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Modal, ScrollView, StyleSheet, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { CartItem } from '../context/CartContext';
import { usePrinter } from '../context/PrinterContext';
import { saveBillToFirestore, updateBillPaymentMethod, deleteBillFromFirestore } from '../services/billService';
import { triggerBillSavedNotification } from '../services/notificationService';
import { PaymentMethod } from '../types/bill';
import colors from '../theme/colors';
import spacing from '../theme/spacing';
import typography from '../theme/typography';
import PrimaryButton from './PrimaryButton';
import SecondaryButton from './SecondaryButton';
import SHOP_CONFIG from '../constants/shop';
import { PrinterIcon, CheckIcon, CloseIcon, ReceiptIcon, TrashIcon } from './icons';

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
  const { printBill } = usePrinter();
  const [billNumber, setBillNumber] = useState('');
  const [savedBillId, setSavedBillId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const savingRef = useRef(false);

  const saveCurrentBill = async (
    targetBillNum?: string,
    targetPaymentMethod?: PaymentMethod
  ): Promise<boolean> => {
    if (savedBillId) {
      // Bill is already saved to Firestore, avoid duplicate writes
      return true;
    }
    if (savingRef.current) {
      return false;
    }

    if (cartItems.length === 0) {
      return false;
    }

    const bNum = targetBillNum || billNumber;
    const pMethod = targetPaymentMethod || paymentMethod;

    if (!bNum) return false;

    savingRef.current = true;
    setIsSaving(true);
    try {
      const result = await saveBillToFirestore({
        billNumber: bNum,
        items: cartItems.map((ci) => ({
          id: ci.item.id,
          name: ci.item.name,
          category: ci.item.category,
          price: ci.item.price,
          quantity: ci.quantity,
        })),
        subtotal,
        discountAmount,
        totalAmount,
        paymentMethod: pMethod,
      });

      if (result.success && result.billId) {
        setSavedBillId(result.billId);
        triggerBillSavedNotification(bNum, totalAmount, result.billId);
        return true;
      } else {
        console.warn('[BillModal] Firestore save warning:', result.error);
        return false;
      }
    } catch (err: any) {
      console.error('[BillModal] Firestore save error:', err);
      return false;
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (visible && cartItems.length > 0) {
      const generatedBillNum = `INV-${Math.floor(100000 + Math.random() * 900000)}`;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBillNumber(generatedBillNum);
      setSavedBillId(null);
      setIsPrinting(false);
      setPaymentMethod('CASH');
      savingRef.current = false;
    } else if (!visible) {
      setSavedBillId(null);
      setIsSaving(false);
      setIsPrinting(false);
      savingRef.current = false;
    }
  }, [visible]);

  const handleSelectPaymentMethod = (method: PaymentMethod) => {
    setPaymentMethod(method);
    if (savedBillId) {
      updateBillPaymentMethod(savedBillId, method);
    }
  };

  const timestamp = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const handlePrintReceipt = async () => {
    if (isPrinting || isSaving) return;

    setIsPrinting(true);
    try {
      // 1. Print the bill on the Bluetooth thermal printer
      const printResult = await printBill({
        billNumber,
        tableNumber,
        timestamp,
        items: cartItems.map((ci) => ({
          name: ci.item.name,
          qty: ci.quantity,
          price: ci.item.price,
        })),
        subtotal,
        discountAmount,
        totalAmount,
      });

      // STRICT RULE: Only save to Firestore AFTER the bill is printed successfully!
      if (!printResult.success) {
        Alert.alert(
          'Printing Failed — Bill Not Saved',
          `${printResult.message || 'Thermal printer is not connected or printing failed.'}\n\nThe bill was NOT saved to Firestore. Please connect the printer and try again.`,
          [{ text: 'OK' }]
        );
        return;
      }

      // 2. ONLY AFTER print succeeds, store the bill in Cloud Firestore (saved only once)
      const isSaved = await saveCurrentBill();

      if (isSaved) {
        Alert.alert('Bill Printed & Saved', `Bill ${billNumber} printed and recorded in Cloud Firestore!`, [
          { text: 'Complete Order', onPress: onCompleteOrder },
        ]);
      } else {
        Alert.alert(
          'Printed',
          `Bill ${billNumber} printed successfully, but failed to save to Firestore. Please check internet connection.`
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Encountered printing error. Bill was not saved.');
    } finally {
      setIsPrinting(false);
    }
  };


  const handleDeleteSavedBill = () => {
    if (!savedBillId) {
      onClose();
      return;
    }

    Alert.alert(
      'Delete Bill Confirmation',
      `Are you sure you want to permanently delete bill ${billNumber} from Cloud Firestore?\n\nTotal Amount: ₹${totalAmount}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsSaving(true);
            try {
              const res = await deleteBillFromFirestore(savedBillId);
              if (res.success) {
                Alert.alert('Bill Deleted', `Bill ${billNumber} was removed from Cloud Firestore.`);
                setSavedBillId(null);
                onClose();
              } else {
                Alert.alert('Delete Failed', res.error || 'Failed to delete bill.');
              }
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Could not delete bill.');
            } finally {
              setIsSaving(false);
            }
          },
        },
      ]
    );
  };

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
              <Text style={styles.restaurantSub}>{SHOP_CONFIG.addressLine1}</Text>
              <Text style={styles.restaurantSub}>{SHOP_CONFIG.addressLine2}</Text>
              <Text style={styles.restaurantSub}>Ph: {SHOP_CONFIG.formattedPhone}</Text>
            </View>

            <View style={styles.metaDivider} />

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Bill No: {billNumber}</Text>
              {savedBillId ? (
                <View style={styles.savedBadgeContainer}>
                  <View style={styles.savedBadge}>
                    <Text style={styles.savedBadgeText}>✓ SAVED IN CLOUD</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteMiniBtn}
                    onPress={handleDeleteSavedBill}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <TrashIcon size={13} color={colors.danger} />
                    <Text style={styles.deleteMiniText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
            <Text style={styles.metaDate}>Date: {timestamp}</Text>

            <View style={styles.metaDivider} />

            {/* Payment Method Selector */}
            <View style={styles.paymentSection}>
              <Text style={styles.paymentLabel}>Payment Method:</Text>
              <View style={styles.paymentBtnRow}>
                {(['CASH', 'UPI', 'CARD'] as PaymentMethod[]).map((pm) => (
                  <TouchableOpacity
                    key={pm}
                    style={[
                      styles.paymentMethodBtn,
                      paymentMethod === pm && styles.paymentMethodBtnActive,
                    ]}
                    onPress={() => handleSelectPaymentMethod(pm)}>
                    <Text
                      style={[
                        styles.paymentMethodBtnText,
                        paymentMethod === pm && styles.paymentMethodBtnTextActive,
                      ]}>
                      {pm}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.thinDivider} />

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
              <Text style={styles.visitAgainText}>{SHOP_CONFIG.receiptName}</Text>
              <Text style={styles.visitAgainText}>{SHOP_CONFIG.addressLine1}</Text>
              <Text style={styles.visitAgainText}>{SHOP_CONFIG.addressLine2}</Text>
            </View>
          </ScrollView>

          {/* Modal Bottom Actions */}
          <View style={styles.actionRow}>
            {savedBillId ? (
              <>
                <TouchableOpacity
                  style={styles.deleteBillBtn}
                  onPress={handleDeleteSavedBill}
                  disabled={isSaving}
                  activeOpacity={0.8}>
                  <TrashIcon size={16} color={colors.danger} />
                  <Text style={styles.deleteBillText}>Delete</Text>
                </TouchableOpacity>

                <SecondaryButton
                  title="Print Again"
                  onPress={handlePrintReceipt}
                  loading={isPrinting}
                  icon={<PrinterIcon size={18} color={colors.textPrimary} />}
                  style={{ flex: 1 }}
                />

                <PrimaryButton
                  title="Complete Order"
                  onPress={onCompleteOrder}
                  icon={<CheckIcon size={18} color={colors.textOnPrimary} />}
                  variant="success"
                  style={{ flex: 1.2 }}
                />
              </>
            ) : (
              <>
                <SecondaryButton
                  title="Close"
                  onPress={onClose}
                  icon={<CloseIcon size={18} color={colors.textSecondary} />}
                  style={{ flex: 1 }}
                />

                <PrimaryButton
                  title="Print & Save Bill"
                  onPress={handlePrintReceipt}
                  loading={isPrinting || isSaving}
                  icon={<PrinterIcon size={18} color={colors.textOnPrimary} />}
                  variant="primary"
                  style={{ flex: 1.5 }}
                />
              </>
            )}
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
    width: 80,
    height: 80,
    marginBottom: 8,
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
    alignItems: 'center',
  },
  deleteBillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    height: 48,
    borderRadius: spacing.radiusMd,
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FECACA',
    gap: 6,
  },
  deleteBillText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.danger,
  },
  savedBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  savedBadge: {
    backgroundColor: '#DEF7EC',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#31C48D',
  },
  savedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#03543F',
  },
  deleteMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  deleteMiniText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.danger,
  },
  paymentSection: {
    marginVertical: 4,
  },
  paymentLabel: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  paymentBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  paymentMethodBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentMethodBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  paymentMethodBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  paymentMethodBtnTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  customerSection: {
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: '#F0FDF4',
    borderRadius: spacing.radiusSm,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 1,
  },
  customerLabel: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  customerValue: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
});

export default BillModal;
