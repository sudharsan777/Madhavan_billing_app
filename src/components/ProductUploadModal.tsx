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
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { MENU_CATEGORIES, CATEGORY_ICONS } from '../data/menu';
import { useProducts } from '../context/ProductContext';
import { useResponsive } from '../utils/responsive';
import colors from '../theme/colors';
import spacing from '../theme/spacing';
import typography from '../theme/typography';
import { CloseIcon, PlusIcon, CheckIcon } from './icons';

interface ProductUploadModalProps {
  visible?: boolean;
  onClose?: () => void;
}

export const ProductUploadModal: React.FC<ProductUploadModalProps> = ({
  visible: propVisible,
  onClose: propOnClose,
}) => {
  const { uploadProduct, categories, isUploadModalOpen, closeUploadModal } = useProducts();
  const isVisible = propVisible !== undefined ? propVisible : isUploadModalOpen;
  const handleClose = propOnClose || closeUploadModal;
  const { isPhone } = useResponsive();

  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>(MENU_CATEGORIES[0]);
  const [price, setPrice] = useState('');
  const [isVeg, setIsVeg] = useState(true);
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const resetForm = () => {
    setName('');
    setCategory(MENU_CATEGORIES[0]);
    setPrice('');
    setIsVeg(true);
    setDescription('');
    setImageUri('');
    setIsUploading(false);
  };

  const handlePickFromGallery = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          'Permission Required',
          'Please allow access to your media library to select a product picture.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
      }
    } catch (err: any) {
      console.warn('[ProductUpload] Error picking image:', err);
      Alert.alert('Error', 'Could not open image picker.');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          'Permission Required',
          'Please allow camera access to take a photo of the food item.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
      }
    } catch (err: any) {
      console.warn('[ProductUpload] Error taking photo:', err);
      Alert.alert('Error', 'Could not launch camera.');
    }
  };

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Missing Name', 'Please enter a name for the product.');
      return;
    }

    const numericPrice = parseFloat(price);
    if (isNaN(numericPrice) || numericPrice < 0) {
      Alert.alert('Invalid Price', 'Please enter a valid price equal to or greater than 0.');
      return;
    }

    setIsUploading(true);
    try {
      const result = await uploadProduct({
        name: trimmedName,
        category,
        price: numericPrice,
        image: imageUri || undefined,
        isVeg,
        description: description.trim() || undefined,
      });

      setIsUploading(false);

      if (result.success) {
        Alert.alert(
          'Product Uploaded',
          `"${trimmedName}" has been successfully added to ${category} and saved to Cloud Firestore!`,
          [
            {
              text: 'OK',
              onPress: () => {
                resetForm();
                handleClose();
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Notice',
          result.error || 'Product saved locally. Please verify your Firestore connection.',
          [
            {
              text: 'OK',
              onPress: () => {
                resetForm();
                handleClose();
              },
            },
          ]
        );
      }
    } catch (err: any) {
      setIsUploading(false);
      Alert.alert('Upload Error', err?.message || 'Failed to upload product.');
    }
  };

  const allCategories = categories.length > 0 ? categories : (MENU_CATEGORIES as unknown as string[]);

  return (
    <Modal visible={isVisible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardContainer}>
          <View style={[styles.modalCard, isPhone && styles.modalCardPhone]}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.headerTitleGroup}>
                <LinearGradient
                  colors={colors.gradients.gold}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.goldIconCircle}>
                  <PlusIcon size={18} color="#FFFFFF" strokeWidth={3} />
                </LinearGradient>
                <View>
                  <Text style={styles.modalTitle}>Upload New Product</Text>
                  <Text style={styles.modalSubtitle}>Add item directly to Cloud Firestore & POS</Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={handleClose}
                style={styles.closeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <CloseIcon size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Scrollable Form Body */}
            <ScrollView
              style={styles.formScroll}
              contentContainerStyle={styles.formContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              {/* Product Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>PRODUCT NAME *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Special Mango Mojito"
                  placeholderTextColor={colors.textMuted}
                  value={name}
                  onChangeText={setName}
                />
              </View>

              {/* Price & Veg Toggle Row */}
              <View style={styles.twoColRow}>
                <View style={[styles.inputGroup, { flex: 1.2 }]}>
                  <Text style={styles.label}>PRICE (₹) *</Text>
                  <View style={styles.priceInputWrapper}>
                    <Text style={styles.rupeeSign}>₹</Text>
                    <TextInput
                      style={styles.priceInput}
                      placeholder="80"
                      placeholderTextColor={colors.textMuted}
                      value={price}
                      onChangeText={setPrice}
                      keyboardType="numeric"
                      maxLength={6}
                    />
                  </View>
                </View>

                {/* Dietary Veg / Non-Veg Toggle */}
                <View style={[styles.inputGroup, { flex: 1.2 }]}>
                  <Text style={styles.label}>TYPE</Text>
                  <View style={styles.vegToggleRow}>
                    <TouchableOpacity
                      style={[styles.vegToggleBtn, isVeg && styles.vegActive]}
                      onPress={() => setIsVeg(true)}
                      activeOpacity={0.8}>
                      <View style={[styles.dotIndicator, { backgroundColor: '#15803D' }]} />
                      <Text style={[styles.vegToggleText, isVeg && styles.vegTextActive]}>Veg</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.vegToggleBtn, !isVeg && styles.nonVegActive]}
                      onPress={() => setIsVeg(false)}
                      activeOpacity={0.8}>
                      <View style={[styles.dotIndicator, { backgroundColor: '#B91C1C' }]} />
                      <Text style={[styles.vegToggleText, !isVeg && styles.nonVegTextActive]}>Non-Veg</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Category Selector Chips */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>SELECT CATEGORY *</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoryChipsContainer}>
                  {allCategories.map((cat) => {
                    const isSelected = category === cat;
                    const emoji = CATEGORY_ICONS[cat] || '🍽️';
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
                        onPress={() => setCategory(cat)}
                        activeOpacity={0.75}>
                        <Text style={styles.categoryChipEmoji}>{emoji}</Text>
                        <Text
                          style={[
                            styles.categoryChipText,
                            isSelected && styles.categoryChipTextSelected,
                          ]}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Photo Upload Options */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>PRODUCT PHOTO (OPTIONAL)</Text>

                {imageUri ? (
                  <View style={styles.previewContainer}>
                    <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
                    <TouchableOpacity
                      style={styles.removeImageBtn}
                      onPress={() => setImageUri('')}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <CloseIcon size={14} color="#FFFFFF" />
                      <Text style={styles.removeImageText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.photoActionsRow}>
                    <TouchableOpacity
                      style={styles.photoActionBtn}
                      onPress={handlePickFromGallery}
                      activeOpacity={0.75}>
                      <Text style={styles.photoActionEmoji}>🖼️</Text>
                      <Text style={styles.photoActionText}>Choose from Gallery</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.photoActionBtn}
                      onPress={handleTakePhoto}
                      activeOpacity={0.75}>
                      <Text style={styles.photoActionEmoji}>📸</Text>
                      <Text style={styles.photoActionText}>Take Camera Photo</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Alternative: Image URL Input */}
                <TextInput
                  style={[styles.textInput, { marginTop: 8 }]}
                  placeholder="Or paste image URL (https://...)"
                  placeholderTextColor={colors.textMuted}
                  value={imageUri}
                  onChangeText={setImageUri}
                  autoCapitalize="none"
                />
              </View>

              {/* Description */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>DESCRIPTION / NOTES</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="e.g. Made with chilled milk, fresh pulps, and rich vanilla scoop"
                  placeholderTextColor={colors.textMuted}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={2}
                />
              </View>
            </ScrollView>

            {/* Modal Footer Actions */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleClose}
                disabled={isUploading}
                activeOpacity={0.75}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmit}
                disabled={isUploading}
                activeOpacity={0.88}>
                <LinearGradient
                  colors={colors.gradients.gold}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.submitButtonGradient}>
                  {isUploading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <CheckIcon size={16} color="#FFFFFF" strokeWidth={3} />
                      <Text style={styles.submitButtonText}>Upload to Menu</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
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
  keyboardContainer: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '92%',
  },
  modalCard: {
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
  modalCardPhone: {
    borderRadius: 16,
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
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  goldIconCircle: {
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
    fontWeight: '600',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F5F5F4',
  },
  formScroll: {
    maxHeight: 520,
  },
  formContent: {
    padding: spacing.lg,
    gap: 14,
  },
  inputGroup: {
    gap: 6,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    color: '#78716C',
  },
  textInput: {
    height: 44,
    backgroundColor: '#FAF9F6',
    borderWidth: 1.5,
    borderColor: '#E7E2D7',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#1C1917',
  },
  textArea: {
    height: 60,
    paddingTop: 8,
    textAlignVertical: 'top',
  },
  priceInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    backgroundColor: '#FAF9F6',
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  rupeeSign: {
    fontSize: 16,
    fontWeight: '900',
    color: '#B45309',
    marginRight: 4,
  },
  priceInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: '#1C1917',
    paddingVertical: 0,
  },
  vegToggleRow: {
    flexDirection: 'row',
    height: 44,
    gap: 6,
  },
  vegToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E7E2D7',
    backgroundColor: '#FAF9F6',
    gap: 6,
  },
  vegActive: {
    borderColor: '#15803D',
    backgroundColor: '#F0FDF4',
  },
  nonVegActive: {
    borderColor: '#B91C1C',
    backgroundColor: '#FEF2F2',
  },
  dotIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  vegToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#78716C',
  },
  vegTextActive: {
    color: '#15803D',
    fontWeight: '800',
  },
  nonVegTextActive: {
    color: '#B91C1C',
    fontWeight: '800',
  },
  categoryChipsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E7E2D7',
    backgroundColor: '#FAF9F6',
    gap: 6,
  },
  categoryChipSelected: {
    borderColor: '#D97706',
    backgroundColor: '#FFFDF5',
  },
  categoryChipEmoji: {
    fontSize: 14,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#78716C',
  },
  categoryChipTextSelected: {
    color: '#92400E',
    fontWeight: '800',
  },
  photoActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  photoActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E7E2D7',
    backgroundColor: '#FAF9F6',
    gap: 8,
  },
  photoActionEmoji: {
    fontSize: 16,
  },
  photoActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#44403C',
  },
  previewContainer: {
    position: 'relative',
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#E7E2D7',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(28, 25, 23, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  removeImageText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
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
  submitButton: {
    flex: 1.5,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#B45309',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    gap: 8,
    paddingHorizontal: 16,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});

export default ProductUploadModal;
