import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getSavedBills, testFirestoreConnection, deleteBillFromFirestore } from '../services/billService';
import { generateAndShareSingleBillPdf } from '../services/reportService';
import { isFirebaseConfigured } from '../lib/firebaseConfig';
import { BillData } from '../types/bill';
import colors from '../theme/colors';
import spacing from '../theme/spacing';
import typography from '../theme/typography';
import { CloseIcon, ReceiptIcon, TrashIcon } from './icons';
import BillDetailsModal from './BillDetailsModal';

interface BillHistoryModalProps {
  visible: boolean;
  onClose: () => void;
}

export const BillHistoryModal: React.FC<BillHistoryModalProps> = ({ visible, onClose }) => {
  const [bills, setBills] = useState<BillData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);

  const fetchBills = async () => {
    if (!isFirebaseConfigured()) return;
    setIsLoading(true);
    try {
      const fetched = await getSavedBills(50);
      setBills(fetched);
    } catch (err: any) {
      Alert.alert('Firestore Error', err?.message || 'Failed to retrieve bills from Firestore.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchBills();
    }
  }, [visible]);

  const handleRunTest = async () => {
    setIsTesting(true);
    try {
      const result = await testFirestoreConnection();
      if (result.success) {
        Alert.alert('Firestore Test Passed', result.message);
        fetchBills();
      } else {
        Alert.alert('Firestore Test Failed', result.message);
      }
    } catch (err: any) {
      Alert.alert('Test Error', err?.message || 'Error occurred during Firestore test.');
    } finally {
      setIsTesting(false);
    }
  };

  const [selectedBillForDetails, setSelectedBillForDetails] = useState<BillData | null>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [deletingBillId, setDeletingBillId] = useState<string | null>(null);

  const handleOpenDetails = (bill: BillData) => {
    setSelectedBillForDetails(bill);
    setDetailsModalVisible(true);
  };

  const handleDownloadSinglePdf = async (bill: BillData) => {
    try {
      const res = await generateAndShareSingleBillPdf(bill);
      if (!res.success) {
        Alert.alert('PDF Notice', res.error || 'Failed to export bill PDF.');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not export bill PDF.');
    }
  };

  const handleDeleteBill = (bill: BillData) => {
    const docId = bill.id;
    if (!docId) {
      Alert.alert('Cannot Delete', 'This bill does not have a valid Firestore document ID.');
      return;
    }

    Alert.alert(
      'Delete Bill Confirmation',
      `Are you sure you want to permanently delete bill ${bill.billNumber} from Cloud Firestore?\n\nTotal: ₹${Number(bill.totalAmount).toLocaleString('en-IN')}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingBillId(docId);
            try {
              const res = await deleteBillFromFirestore(docId);
              if (res.success) {
                setBills((prev) => prev.filter((b) => b.id !== docId));
                if (selectedBillForDetails?.id === docId) {
                  setDetailsModalVisible(false);
                }
                Alert.alert('Bill Deleted', `Bill ${bill.billNumber} has been removed from Firestore.`);
              } else {
                Alert.alert('Delete Failed', res.error || 'Failed to delete bill.');
              }
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Could not delete bill.');
            } finally {
              setDeletingBillId(null);
            }
          },
        },
      ]
    );
  };

  const renderBillItem = ({ item }: { item: BillData }) => {
    const formattedDate = item.createdAt
      ? new Date(item.createdAt).toLocaleString('en-IN', {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      : 'N/A';

    return (
      <View style={styles.billCard}>
        <TouchableOpacity
          onPress={() => handleOpenDetails(item)}
          activeOpacity={0.75}>
          <View style={styles.billCardHeader}>
            <View>
              <Text style={styles.billNumber}>{item.billNumber}</Text>
              <Text style={styles.billDate}>{formattedDate}</Text>
            </View>
            <View style={styles.amountContainer}>
              <Text style={styles.billTotal}>₹{Number(item.totalAmount).toLocaleString('en-IN')}</Text>
              <View
                style={[
                  styles.paymentBadge,
                  item.paymentMethod === 'UPI' && styles.paymentBadgeUpi,
                  item.paymentMethod === 'CARD' && styles.paymentBadgeCard,
                ]}>
                <Text style={styles.paymentText}>{item.paymentMethod || 'CASH'}</Text>
              </View>
            </View>
          </View>

          {/* Line Items Summary */}
          <View style={styles.itemsSummary}>
            {item.items && item.items.length > 0 ? (
              item.items.map((it, idx) => (
                <View key={`${it.productId || idx}-${idx}`} style={styles.itemRow}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {it.quantity}× {it.name}
                  </Text>
                  <Text style={styles.itemPrice}>
                    ₹{(Number(it.itemTotal) || (Number(it.price) || 0) * (Number(it.quantity) || 1)).toLocaleString('en-IN')}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyItemsText}>No item details recorded</Text>
            )}
          </View>
        </TouchableOpacity>

        {/* Action Row */}
        <View style={styles.cardActionRow}>
          <TouchableOpacity
            style={styles.cardCustomerBtn}
            onPress={() => handleOpenDetails(item)}
            activeOpacity={0.75}>
            <Text style={styles.cardCustomerText}>🧾 Bill Details</Text>
          </TouchableOpacity>

          <View style={styles.cardRightActions}>
            <TouchableOpacity
              style={styles.cardPdfBtn}
              onPress={() => handleDownloadSinglePdf(item)}
              activeOpacity={0.75}>
              <Text style={styles.cardPdfText}>📥 PDF</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cardDeleteBtn}
              onPress={() => handleDeleteBill(item)}
              disabled={deletingBillId === item.id}
              activeOpacity={0.75}>
              {deletingBillId === item.id ? (
                <ActivityIndicator size="small" color={colors.danger} />
              ) : (
                <TrashIcon size={14} color={colors.danger} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleGroup}>
              <LinearGradient
                colors={colors.gradients.gold}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.goldIconWrapper}>
                <ReceiptIcon size={18} color="#FFFFFF" />
              </LinearGradient>
              <View>
                <Text style={styles.modalTitle}>Firestore Bill Archive</Text>
                <Text style={styles.modalSubtitle}>
                  {bills.length} recent orders stored in cloud
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <CloseIcon size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Test connection & refresh toolbar */}
          <View style={styles.toolbar}>
            <TouchableOpacity
              style={[styles.testButtonWrapper, isTesting && styles.btnDisabled]}
              onPress={handleRunTest}
              disabled={isTesting}
              activeOpacity={0.85}>
              <LinearGradient
                colors={colors.gradients.gold}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.testButtonGradient}>
                {isTesting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.testButtonText}>Verify Cloud Connection</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.refreshButton, isLoading && styles.btnDisabled]}
              onPress={fetchBills}
              disabled={isLoading}
              activeOpacity={0.7}>
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={styles.refreshButtonText}>Sync</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Configuration Warning if not configured */}
          {!isFirebaseConfigured() && (
            <View style={styles.warningBanner}>
              <Text style={styles.warningText}>
                Firebase configuration missing. Please provide your Firebase web config in{' '}
                <Text style={styles.boldText}>src/lib/firebaseConfig.ts</Text> or .env file.
              </Text>
            </View>
          )}

          {/* Content List */}
          {isLoading && bills.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Fetching bills from Cloud Firestore...</Text>
            </View>
          ) : bills.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No saved bills found</Text>
              <Text style={styles.emptySubtitle}>
                Completed orders will automatically sync and appear here in real-time.
              </Text>
            </View>
          ) : (
            <FlatList
              data={bills}
              keyExtractor={(item, index) => item.id || `${item.billNumber}-${index}`}
              renderItem={renderBillItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>

      {/* Bill & Customer Details Modal */}
      <BillDetailsModal
        visible={detailsModalVisible}
        bill={selectedBillForDetails}
        onClose={() => setDetailsModalVisible(false)}
        onBillDeleted={(id) => {
          setBills((prev) => prev.filter((b) => b.id !== id));
        }}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(28, 25, 23, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.sm,
  },
  modalCard: {
    width: '95%',
    maxWidth: 620,
    height: '85%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#1C1917',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    alignSelf: 'center',
    borderWidth: 1.5,
    borderColor: '#E7E2D7',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E7E2D7',
    backgroundColor: '#FAF9F6',
  },
  modalTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  goldIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    ...typography.heading,
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  modalSubtitle: {
    ...typography.caption,
    fontSize: 11,
    color: '#78716C',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F7F5F0',
  },
  toolbar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: '#FAF9F6',
    borderBottomWidth: 1,
    borderBottomColor: '#E7E2D7',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  testButtonWrapper: {
    borderRadius: 8,
    overflow: 'hidden',
    flex: 1,
  },
  testButtonGradient: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  refreshButton: {
    backgroundColor: '#F7F5F0',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#E7E2D7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshButtonText: {
    color: '#78350F',
    fontSize: 12,
    fontWeight: '800',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  warningBanner: {
    backgroundColor: '#FEF3C7',
    padding: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  warningText: {
    fontSize: 12,
    color: '#92400E',
    textAlign: 'center',
  },
  boldText: {
    fontWeight: '700',
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  billCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E7E2D7',
    padding: 12,
    marginBottom: spacing.xs,
    elevation: 2,
    shadowColor: '#1C1917',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  billCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#F7F5F0',
    paddingBottom: 8,
    marginBottom: 8,
  },
  billNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  billDate: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  billTotal: {
    fontSize: 16,
    fontWeight: '900',
    color: '#B45309',
  },
  paymentBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  paymentBadgeUpi: {
    backgroundColor: '#DBEAFE',
  },
  paymentBadgeCard: {
    backgroundColor: '#EDE9FE',
  },
  paymentText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1C1917',
  },
  customerRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  customerName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  customerPhone: {
    fontSize: 11,
    color: '#78716C',
  },
  itemsSummary: {
    gap: 3,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemName: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
    marginRight: 8,
  },
  itemPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptyItemsText: {
    fontSize: 11,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
  cardActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F4',
  },
  cardCustomerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  cardCustomerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },
  cardRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardPdfBtn: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  cardPdfText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  cardDeleteBtn: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default BillHistoryModal;
