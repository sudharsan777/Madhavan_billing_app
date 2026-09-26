import React, { useState } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, Text, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CartProvider, useCart } from '../context/CartContext';
import { PrinterProvider } from '../context/PrinterContext';
import { useResponsive } from '../utils/responsive';
import Header from '../components/Header';
import CategoryList from '../components/CategoryList';
import ProductGrid from '../components/ProductGrid';
import Cart from '../components/Cart';
import colors from '../theme/colors';
import spacing from '../theme/spacing';
import typography from '../theme/typography';
import { CartIcon, ArrowRightIcon } from '../components/icons';

function MainPOSContent() {
  const { isSmallPhone, isPhone, isTablet, isLargeTablet, isLandscape } = useResponsive();
  const { totalItemCount, totalAmount } = useCart();
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

  const isPhoneLandscape = isPhone && isLandscape;
  const isTabletPortrait = isTablet && !isLandscape && !isLargeTablet;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
      <View style={styles.appContainer}>
        {/* Responsive Header */}
        <Header onOpenCart={() => setMobileCartOpen(true)} />

        {/* Responsive Layout Matrix */}
        {isPhone && !isPhoneLandscape ? (
          /* ================= 1. PHONE PORTRAIT LAYOUT ================= */
          <View style={styles.phoneLayoutContainer}>
            {/* Horizontal Category Bar */}
            <CategoryList vertical={false} />

            {/* Product Grid */}
            <View style={styles.mainArea}>
              <ProductGrid />
            </View>

            {/* Floating Touch-Friendly Bottom Order Bar */}
            {totalItemCount > 0 && (
              <TouchableOpacity
                style={[styles.bottomBar, isSmallPhone && styles.bottomBarSmall]}
                onPress={() => setMobileCartOpen(true)}
                activeOpacity={0.85}>
                <View style={styles.bottomBarLeft}>
                  <View style={styles.cartBadgeCircle}>
                    <CartIcon size={18} color={colors.textOnPrimary} />
                  </View>
                  <View style={{ flexShrink: 1 }}>
                    <Text style={styles.bottomBarItemCount} numberOfLines={1}>
                      {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
                    </Text>
                    <Text style={styles.bottomBarViewCartText} numberOfLines={1}>
                      Tap to review order
                    </Text>
                  </View>
                </View>

                <View style={styles.bottomBarRight}>
                  <Text style={styles.bottomBarTotal}>₹{totalAmount}</Text>
                  <ArrowRightIcon size={18} color={colors.textOnPrimary} />
                </View>
              </TouchableOpacity>
            )}

            {/* Mobile Sliding Cart Sheet */}
            <Modal
              visible={mobileCartOpen}
              animationType="slide"
              presentationStyle="pageSheet"
              onRequestClose={() => setMobileCartOpen(false)}>
              <SafeAreaView style={styles.mobileCartSafeArea}>
                <Cart isMobileSheet onCloseMobileCart={() => setMobileCartOpen(false)} />
              </SafeAreaView>
            </Modal>
          </View>
        ) : isPhoneLandscape ? (
          /* ================= 2. PHONE LANDSCAPE LAYOUT ================= */
          <View style={styles.phoneLandscapeContainer}>
            <View style={styles.landscapeLeftPane}>
              <CategoryList vertical={false} />
              <View style={styles.mainArea}>
                <ProductGrid />
              </View>
            </View>

            <View style={styles.landscapeRightPane}>
              <Cart />
            </View>
          </View>
        ) : isTabletPortrait ? (
          /* ================= 3. TABLET PORTRAIT (600 <= width < 900) ================= */
          <View style={styles.tabletPortraitContainer}>
            {/* Left 60%: Horizontal Category Bar + Full Product Grid */}
            <View style={styles.tabletPortraitLeftPane}>
              <CategoryList vertical={false} />
              <View style={styles.mainArea}>
                <ProductGrid />
              </View>
            </View>

            {/* Right 40%: Persistent Order Cart */}
            <View style={styles.tabletPortraitRightPane}>
              <Cart />
            </View>
          </View>
        ) : (
          /* ================= 4. TABLET LANDSCAPE / LARGE TABLET 3-COLUMN POS ================= */
          <View style={styles.tabletLayoutContainer}>
            {/* Left Column: Persistent Category Sidebar */}
            <View style={[styles.tabletLeftColumn, isLargeTablet && styles.tabletLeftColumnLarge]}>
              <CategoryList vertical={true} />
            </View>

            {/* Center Column: Expansive Product Grid */}
            <View style={styles.tabletCenterColumn}>
              <ProductGrid />
            </View>

            {/* Right Column: Persistent Order & Checkout */}
            <View style={[styles.tabletRightColumn, isLargeTablet && styles.tabletRightColumnLarge]}>
              <Cart />
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

export default function POSHomeScreen() {
  return (
    <PrinterProvider>
      <CartProvider>
        <MainPOSContent />
      </CartProvider>
    </PrinterProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  appContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },

  /* Phone Portrait */
  phoneLayoutContainer: {
    flex: 1,
  },
  mainArea: {
    flex: 1,
  },
  bottomBar: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.md,
    right: spacing.md,
    height: 58,
    backgroundColor: colors.totalBackground,
    borderRadius: spacing.radiusLg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  bottomBarSmall: {
    bottom: spacing.sm,
    left: spacing.sm,
    right: spacing.sm,
    height: 54,
    paddingHorizontal: spacing.sm,
  },
  bottomBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  cartBadgeCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBarItemCount: {
    ...typography.button,
    fontSize: 14,
    color: colors.textOnPrimary,
  },
  bottomBarViewCartText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
  },
  bottomBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bottomBarTotal: {
    ...typography.heading,
    fontSize: 18,
    color: colors.textOnPrimary,
  },
  mobileCartSafeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },

  /* Phone Landscape */
  phoneLandscapeContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  landscapeLeftPane: {
    flex: 6,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  landscapeRightPane: {
    flex: 4,
  },

  /* Tablet Portrait (600 <= width < 900) */
  tabletPortraitContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  tabletPortraitLeftPane: {
    flex: 62,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  tabletPortraitRightPane: {
    flex: 38,
    minWidth: 290,
    maxWidth: 350,
  },

  /* Tablet 3-Column POS Layout (width >= 900 or Landscape) */
  tabletLayoutContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  tabletLeftColumn: {
    width: 195,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  tabletLeftColumnLarge: {
    width: 230,
  },
  tabletCenterColumn: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  tabletRightColumn: {
    width: 320,
  },
  tabletRightColumnLarge: {
    width: 360,
  },
});
