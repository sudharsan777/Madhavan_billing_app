import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MenuItem } from '../data/menu';
import { useProducts } from '../context/ProductContext';
import colors from '../theme/colors';
import spacing from '../theme/spacing';
import typography from '../theme/typography';
import { CloseIcon, CheckIcon } from './icons';

interface PriceEditModalProps {
  visible?: boolean;
  item?: MenuItem | null;
  onClose?: () => void;
}

export const PriceEditModal: React.FC<PriceEditModalProps> = ({
  visible: propVisible,
  item: propItem,
  onClose: propOnClose,
}) => {
  const { updatePrice, editingProduct, closePriceEdit } = useProducts();
  const activeItem = propItem !== undefined ? propItem : editingProduct;
  const isVisible = propVisible !== undefined ? propVisible : Boolean(editingProduct);
  const handleClose = propOnClose || closePriceEdit;

  const [prevItemId, setPrevItemId] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (activeItem && activeItem.id !== prevItemId) {
    setPrevItemId(activeItem.id);
    setPriceInput(String(activeItem.price));
  }

  if (!activeItem) return null;

  const handleAdjustDelta = (delta: number) => {
    const current = parseFloat(priceInput) || 0;
    const next = Math.max(0, current + delta);
    setPriceInput(String(next));
  };

  const handleSavePrice = async () => {
    const numericPrice = parseFloat(priceInput);
    if (isNaN(numericPrice) || numericPrice < 0) {
      Alert.alert('Invalid Price', 'Please enter a valid price equal to or greater than 0.');
      return;
    }

    setIsSaving(true);
    try {
      const result = await updatePrice(activeItem.id, numericPrice);
      setIsSaving(false);
      if (result.success) {
        Alert.alert('Price Updated', `Price for ${activeItem.name} set to ₹${numericPrice} and saved to Cloud Firestore.`);
        handleClose();
      } else {
        Alert.alert('Notice', result.error || 'Updated locally. Connect internet to sync to Firestore.');
        handleClose();
      }
    } catch (err: any) {
      setIsSaving(false);
      Alert.alert('Error', err?.message || 'Could not update price.');
    }
  };

  return (
    <Modal visible={isVisible} transparent animationType="fade" onRequestClose={handleClose}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardView}>
            <View style={styles.modalCard}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <View style={styles.headerLeft}>
                  <View style={styles.priceIconCircle}>
                    <Text style={styles.rupeeSymbol}>₹</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle} numberOfLines={1}>
                      Edit Price
                    </Text>
                    <Text style={styles.productSubtitle} numberOfLines={1}>
                      {activeItem.name}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handleClose}
                  style={styles.closeBtn}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                  <CloseIcon size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Body */}
              <View style={styles.body}>
                <Text style={styles.fieldLabel}>NEW PRICE FOR THIS ITEM</Text>

                {/* Big Price Display & Input */}
                <View style={styles.priceInputWrapper}>
                  <Text style={styles.inputPrefix}>₹</Text>
                  <TextInput
                    style={styles.priceTextInput}
                    value={priceInput}
                    onChangeText={setPriceInput}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    selectTextOnFocus
                    autoFocus
                    maxLength={6}
                  />
                </View>

                {/* Quick Step Buttons for Touchscreens */}
                <Text style={styles.quickLabel}>Quick Adjustment</Text>
                <View style={styles.quickButtonsRow}>
                  {[-10, -5, +5, +10, +20, +50].map((delta) => (
                    <TouchableOpacity
                      key={delta}
                      style={[
                        styles.quickBtn,
                        delta > 0 ? styles.quickBtnPositive : styles.quickBtnNegative,
                      ]}
                      onPress={() => handleAdjustDelta(delta)}
                      activeOpacity={0.75}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                      <Text
                        style={[
                          styles.quickBtnText,
                          delta > 0 ? styles.quickBtnTextPositive : styles.quickBtnTextNegative,
                        ]}>
                        {delta > 0 ? `+₹${delta}` : `-₹${Math.abs(delta)}`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.helperText}>
                  Changes persist directly to Cloud Firestore and sync live across all mobile & tablet devices.
                </Text>
              </View>

              {/* Action Footer */}
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleClose}
                  disabled={isSaving}
                  activeOpacity={0.75}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSavePrice}
                  disabled={isSaving}
                  activeOpacity={0.88}>
                  <LinearGradient
                    colors={colors.gradients.gold}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.saveButtonGradient}>
                    {isSaving ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <CheckIcon size={16} color="#FFFFFF" strokeWidth={3} />
                        <Text style={styles.saveButtonText}>Save Price</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(28, 25, 23, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  keyboardView: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#1C1917',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
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
    borderBottomColor: '#F0EBE1',
    backgroundColor: '#FAF9F6',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  priceIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rupeeSymbol: {
    fontSize: 20,
    fontWeight: '900',
    color: '#B45309',
  },
  modalTitle: {
    ...typography.heading,
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  productSubtitle: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F5F5F4',
  },
  body: {
    padding: spacing.lg,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: '#78716C',
    marginBottom: 8,
  },
  priceInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAF9F6',
    borderWidth: 2,
    borderColor: '#FDE68A',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 64,
    marginBottom: 16,
  },
  inputPrefix: {
    fontSize: 28,
    fontWeight: '900',
    color: '#B45309',
    marginRight: 6,
  },
  priceTextInput: {
    fontSize: 32,
    fontWeight: '900',
    color: '#1C1917',
    minWidth: 100,
    textAlign: 'center',
    paddingVertical: 0,
  },
  quickLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#78716C',
    marginBottom: 8,
  },
  quickButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  quickBtn: {
    flex: 1,
    minWidth: 54,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  quickBtnPositive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  quickBtnNegative: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  quickBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  quickBtnTextPositive: {
    color: '#15803D',
  },
  quickBtnTextNegative: {
    color: '#B91C1C',
  },
  helperText: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 16,
    textAlign: 'center',
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: '#FAF9F6',
    borderTopWidth: 1,
    borderTopColor: '#F0EBE1',
    gap: spacing.sm,
  },
  cancelButton: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E7E2D7',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  saveButton: {
    flex: 1.5,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#B45309',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    gap: 8,
    paddingHorizontal: 16,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});

export default PriceEditModal;
