import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useCart } from '../context/CartContext';
import { useResponsive } from '../utils/responsive';
import colors from '../theme/colors';
import spacing from '../theme/spacing';
import typography from '../theme/typography';
import SHOP_CONFIG from '../constants/shop';
import { SearchIcon, CartIcon, CloseIcon, SettingsIcon } from './icons';
import PrinterStatus from './PrinterStatus';
import PrinterConnectionModal from './PrinterConnectionModal';

interface HeaderProps {
  onOpenCart?: () => void;
  onOpenHistory?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenCart }) => {
  const { searchQuery, setSearchQuery, totalItemCount, totalAmount } = useCart();
  const { isSmallPhone, isPhone } = useResponsive();
  const [printerModalVisible, setPrinterModalVisible] = useState(false);

  return (
    <View style={[styles.headerContainer, isPhone && styles.headerPhone]}>
      {/* Left Brand Section */}
      <View style={styles.brandSection}>
        <View style={styles.brandLogoContainer}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.brandLogo}
            resizeMode="contain"
          />
        </View>
        {!isSmallPhone && (
          <View>
            <Text style={styles.brandTitle} numberOfLines={1}>
              {SHOP_CONFIG.name}
            </Text>
            {!isPhone && (
              <Text style={styles.brandSubtitle}>
                {SHOP_CONFIG.addressLine1} • Ph: {SHOP_CONFIG.phone}
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Center Search Input */}
      <View style={[styles.searchContainer, isPhone && styles.searchContainerPhone]}>
        <SearchIcon size={16} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder={isSmallPhone ? 'Search...' : 'Search menu...'}
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="never"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <CloseIcon size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Right Actions */}
      <View style={styles.actionsContainer}>
        {/* Printer Connection Status Indicator */}
        {!isSmallPhone && (
          <PrinterStatus onPress={() => setPrinterModalVisible(true)} />
        )}

        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => setPrinterModalVisible(true)}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <SettingsIcon size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        {isPhone && onOpenCart && totalItemCount > 0 && (
          <TouchableOpacity style={styles.cartBadgeButton} onPress={onOpenCart} activeOpacity={0.8}>
            <CartIcon size={18} color={colors.textOnPrimary} />
            <Text style={styles.cartBadgeText}>₹{totalAmount}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Bluetooth Printer Connection & Scan Modal */}
      <PrinterConnectionModal
        visible={printerModalVisible}
        onClose={() => setPrinterModalVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    height: 64,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    elevation: 2,
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  headerPhone: {
    height: 58,
    paddingHorizontal: spacing.xs,
    gap: spacing.xs,
  },
  brandSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  brandLogoContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  brandLogo: {
    width: 38,
    height: 38,
  },
  brandTitle: {
    ...typography.sectionTitle,
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  brandSubtitle: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
  },
  searchContainer: {
    flex: 1,
    maxWidth: 320,
    height: 38,
    backgroundColor: colors.surfaceVariant,
    borderRadius: spacing.radiusFull,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchContainerPhone: {
    maxWidth: 180,
    height: 36,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: spacing.radiusMd,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cartBadgeButton: {
    height: 38,
    paddingHorizontal: spacing.sm,
    borderRadius: spacing.radiusFull,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cartBadgeText: {
    ...typography.button,
    fontSize: 12,
    fontWeight: '700',
    color: colors.textOnPrimary,
  },
});

export default Header;
