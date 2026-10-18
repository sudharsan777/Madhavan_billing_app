import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useCart } from '../context/CartContext';
import { useResponsive } from '../utils/responsive';
import colors from '../theme/colors';
import spacing from '../theme/spacing';
import typography from '../theme/typography';
import SHOP_CONFIG from '../constants/shop';
import { SearchIcon, CartIcon, CloseIcon, SettingsIcon, ReceiptIcon, ChartBarIcon } from './icons';
import PrinterStatus from './PrinterStatus';
import PrinterConnectionModal from './PrinterConnectionModal';
import BillHistoryModal from './BillHistoryModal';

interface HeaderProps {
  onOpenCart?: () => void;
  onOpenHistory?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenCart }) => {
  const { searchQuery, setSearchQuery, totalItemCount, totalAmount } = useCart();
  const { isSmallPhone, isPhone } = useResponsive();
  const router = useRouter();
  const [printerModalVisible, setPrinterModalVisible] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);

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
          placeholder={isSmallPhone ? 'Search...' : 'Search menu items...'}
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
        {/* Sales Dashboard Gold Linear Gradient Button */}
        <TouchableOpacity
          style={styles.goldDashboardButton}
          onPress={() => router.push('/dashboard')}
          activeOpacity={0.85}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <LinearGradient
            colors={colors.gradients.gold}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.goldDashboardGradient}>
            <ChartBarIcon size={16} color="#FFFFFF" />
            {!isPhone && (
              <Text style={styles.goldDashboardButtonText}>Analytics</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Printer Connection Status Indicator */}
        {!isSmallPhone && (
          <PrinterStatus onPress={() => setPrinterModalVisible(true)} />
        )}

        {/* View Saved Bills History */}
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => setHistoryModalVisible(true)}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ReceiptIcon size={19} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => setPrinterModalVisible(true)}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <SettingsIcon size={19} color={colors.textSecondary} />
        </TouchableOpacity>

        {isPhone && onOpenCart && totalItemCount > 0 && (
          <TouchableOpacity style={styles.cartBadgeButton} onPress={onOpenCart} activeOpacity={0.85}>
            <LinearGradient
              colors={colors.gradients.gold}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cartBadgeGradient}>
              <CartIcon size={16} color="#FFFFFF" />
              <Text style={styles.cartBadgeText}>₹{totalAmount}</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>

      {/* Bluetooth Printer Connection & Scan Modal */}
      <PrinterConnectionModal
        visible={printerModalVisible}
        onClose={() => setPrinterModalVisible(false)}
      />

      {/* Cloud Firestore Saved Bills History Modal */}
      <BillHistoryModal
        visible={historyModalVisible}
        onClose={() => setHistoryModalVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    height: 66,
    backgroundColor: colors.surface,
    borderBottomWidth: 1.5,
    borderBottomColor: '#E7E2D7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    elevation: 3,
    shadowColor: '#1C1917',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
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
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
    elevation: 2,
    shadowColor: '#B45309',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  brandLogo: {
    width: 40,
    height: 40,
  },
  brandTitle: {
    ...typography.sectionTitle,
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  brandSubtitle: {
    ...typography.caption,
    fontSize: 11,
    color: '#78716C',
  },
  searchContainer: {
    flex: 1,
    maxWidth: 320,
    height: 40,
    backgroundColor: '#FAF9F6',
    borderRadius: spacing.radiusFull,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#E7E2D7',
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
    gap: 7,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FAF9F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E7E2D7',
  },
  cartBadgeButton: {
    borderRadius: spacing.radiusFull,
    overflow: 'hidden',
  },
  cartBadgeGradient: {
    height: 38,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  cartBadgeText: {
    ...typography.button,
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  goldDashboardButton: {
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 2,
  },
  goldDashboardGradient: {
    height: 38,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  goldDashboardButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});

export default Header;
