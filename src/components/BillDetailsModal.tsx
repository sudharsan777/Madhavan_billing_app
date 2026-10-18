/**
 * BillDetailsModal — View Customer Details & Manage Bill
 *
 * Displays full customer details (name, phone), line items, financial totals,
 * with direct actions to:
 * 1. Download / Export the complete bill as PDF with customer details
 * 2. Delete the bill from Cloud Firestore with confirmation dialog
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BillData } from '../types/bill';
import { deleteBillFromFirestore } from '../services/billService';
import { generateAndShareSingleBillPdf } from '../services/reportService';
import colors from '../theme/colors';
import spacing from '../theme/spacing';
import typography from '../theme/typography';
import { CloseIcon, TrashIcon, ReceiptIcon } from './icons';

interface BillDetailsModalProps {
  visible: boolean;
  bill: BillData | null;
  onClose: () => void;
  onBillDeleted?: (billId: string) => void;
}

export const BillDetailsModal: React.FC<BillDetailsModalProps> = ({
  visible,
  bill,
  onClose,
  onBillDeleted,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  if (!bill) return null;

  const billDate = bill.createdAt
    ? new Date(bill.createdAt).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'N/A';

  const handleDownloadPdf = async () => {
    if (isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      const res = await generateAndShareSingleBillPdf(bill);
      if (!res.success) {
        Alert.alert('PDF Export Notice', res.error || 'Failed to generate PDF.');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not export PDF.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleDelete = () => {
    const docId = bill.id;
    if (!docId) {
      Alert.alert('Cannot Delete', 'This bill does not have a valid Firestore document ID.');
      return;
    }

    Alert.alert(
      'Delete Bill Confirmation',
      `Are you sure you want to permanently delete bill ${bill.billNumber} from Cloud Firestore?\n\nThis action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              const res = await deleteBillFromFirestore(docId);
              if (res.success) {
                if (onBillDeleted) {
                  onBillDeleted(docId);
                }
                onClose();
                Alert.alert('Bill Deleted', `Bill ${bill.billNumber} has been removed from Firestore.`);
              } else {
                Alert.alert('Delete Failed', res.error || 'Failed to delete bill.');
              }
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Could not delete bill.');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleCallCustomer = () => {
    if (bill.customerPhone) {
      const cleanPhone = bill.customerPhone.replace(/[^0-9+]/g, '');
      Linking.openURL(`tel:${cleanPhone}`).catch(() => {
        Alert.alert('Unable to dial', `Could not initiate call to ${bill.customerPhone}`);
      });
    }
  };

  const subtotal = Number(bill.subtotal) || Number(bill.totalAmount) || 0;
  const discountAmount = Number(bill.discountAmount) || 0;
  const totalAmount = Number(bill.totalAmount) || 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <ReceiptIcon size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.billNumber}>{bill.billNumber}</Text>
                <Text style={styles.billDate}>{billDate}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <CloseIcon size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.bodyScroll} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
            {/* Line Items Table */}
            <View style={styles.sectionBox}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionEmoji}>🍽️</Text>
                <Text style={styles.sectionTitle}>Order Items ({bill.items ? bill.items.length : 0})</Text>
              </View>

              <View style={styles.itemsTable}>
                {bill.items && bill.items.length > 0 ? (
                  bill.items.map((it, idx) => {
                    const qty = Number(it.quantity) || 1;
                    const price = Number(it.price) || 0;
                    const itemTot = Number(it.itemTotal) || price * qty;
                    return (
                      <View key={`${it.productId || idx}-${idx}`} style={[styles.itemRow, idx > 0 && styles.itemBorder]}>
                        <View style={styles.itemInfo}>
                          <Text style={styles.itemName}>{it.name}</Text>
                          {it.category ? <Text style={styles.itemCategory}>{it.category}</Text> : null}
                        </View>
                        <Text style={styles.itemQty}>{qty}×</Text>
                        <Text style={styles.itemRate}>₹{price}</Text>
                        <Text style={styles.itemTotal}>₹{itemTot}</Text>
                      </View>
                    );
                  })
                ) : (
                  <Text style={styles.noItemsText}>No item details recorded</Text>
                )}
              </View>
            </View>

            {/* Payment & Totals Summary */}
            <View style={styles.sectionBox}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>₹{subtotal.toLocaleString('en-IN')}</Text>
              </View>
              {discountAmount > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.danger }]}>Discount</Text>
                  <Text style={[styles.summaryValue, { color: colors.danger }]}>
                    -₹{discountAmount.toLocaleString('en-IN')}
                  </Text>
                </View>
              )}
              <View style={[styles.summaryRow, styles.grandTotalRow]}>
                <Text style={styles.grandTotalLabel}>Grand Total</Text>
                <Text style={styles.grandTotalValue}>₹{totalAmount.toLocaleString('en-IN')}</Text>
              </View>

              <View style={styles.paymentMethodRow}>
                <Text style={styles.paymentMethodLabel}>Payment Method:</Text>
                <View
                  style={[
                    styles.pmBadge,
                    bill.paymentMethod === 'UPI' && styles.pmBadgeUpi,
                    bill.paymentMethod === 'CARD' && styles.pmBadgeCard,
                  ]}>
                  <Text style={styles.pmBadgeText}>{bill.paymentMethod || 'CASH'}</Text>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionFooter}>
            <TouchableOpacity
              style={styles.pdfButton}
              onPress={handleDownloadPdf}
              disabled={isExportingPdf}
              activeOpacity={0.85}>
              <LinearGradient
                colors={colors.gradients.gold}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.pdfButtonGradient}>
                {isExportingPdf ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.pdfButtonIcon}>📥</Text>
                    <Text style={styles.pdfButtonText}>Download Bill PDF</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDelete}
              disabled={isDeleting}
              activeOpacity={0.85}>
              {isDeleting ? (
                <ActivityIndicator size="small" color={colors.danger} />
              ) : (
                <>
                  <TrashIcon size={16} color={colors.danger} />
                  <Text style={styles.deleteButtonText}>Delete Bill</Text>
                </>
              )}
            </TouchableOpacity>
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
    padding: spacing.md,
  },
  modalCard: {
    width: '100%',
    maxWidth: 540,
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FAFAF9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  billNumber: {
    ...typography.h3,
    fontSize: 18,
    fontWeight: '800',
    color: '#1C1917',
  },
  billDate: {
    ...typography.caption,
    fontSize: 12,
    color: '#78716C',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  bodyScroll: {
    flex: 1,
  },
  bodyContent: {
    padding: 18,
    gap: 14,
  },
  sectionBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E7E2D7',
    padding: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F4',
  },
  sectionEmoji: {
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#44403C',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  customerGrid: {
    gap: 10,
  },
  customerField: {
    gap: 3,
  },
  customerLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 0.4,
  },
  customerValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C1917',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  callButton: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  callButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  itemsTable: {
    gap: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  itemBorder: {
    borderTopWidth: 1,
    borderTopColor: '#F5F5F4',
  },
  itemInfo: {
    flex: 5,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1C1917',
  },
  itemCategory: {
    fontSize: 10,
    color: '#A8A29E',
    marginTop: 1,
  },
  itemQty: {
    flex: 1.5,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    color: '#1C1917',
  },
  itemRate: {
    flex: 2,
    fontSize: 12,
    textAlign: 'right',
    color: '#78716C',
  },
  itemTotal: {
    flex: 2.5,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'right',
    color: '#1C1917',
  },
  noItemsText: {
    textAlign: 'center',
    color: '#A8A29E',
    fontStyle: 'italic',
    paddingVertical: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#78716C',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1C1917',
  },
  grandTotalRow: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1.5,
    borderTopColor: '#FDE68A',
  },
  grandTotalLabel: {
    fontSize: 15,
    fontWeight: '900',
    color: '#78350F',
  },
  grandTotalValue: {
    fontSize: 17,
    fontWeight: '900',
    color: '#78350F',
  },
  paymentMethodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F4',
  },
  paymentMethodLabel: {
    fontSize: 12,
    color: '#78716C',
    fontWeight: '600',
  },
  pmBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pmBadgeUpi: {
    backgroundColor: '#DBEAFE',
  },
  pmBadgeCard: {
    backgroundColor: '#EDE9FE',
  },
  pmBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#065F46',
  },
  actionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: '#FAFAF9',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 12,
  },
  pdfButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  pdfButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    gap: 8,
    paddingHorizontal: 14,
  },
  pdfButtonIcon: {
    fontSize: 15,
  },
  pdfButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    gap: 6,
  },
  deleteButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.danger,
  },
});

export default BillDetailsModal;
