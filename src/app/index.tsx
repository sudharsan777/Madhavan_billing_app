import React, { useState } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, Text, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
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
import PriceEditModal from '../components/PriceEditModal';
import ProductUploadModal from '../components/ProductUploadModal';

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
                style={[styles.bottomBarWrapper, isSmallPhone && styles.bottomBarWrapperSmall]}
                onPress={() => setMobileCartOpen(true)}
                activeOpacity={0.88}>
                <LinearGradient
                  colors={['#1C1917', '#292524', '#451A03']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.bottomBarGradient}>
                  <View style={styles.bottomBarLeft}>
                    <LinearGradient
                      colors={colors.gradients.gold}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.cartBadgeCircle}>
                      <CartIcon size={17} color="#FFFFFF" />
                    </LinearGradient>
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
                    <Text style={styles.bottomBarTotal}>₹{Number(totalAmount).toLocaleString('en-IN')}</Text>
                    <ArrowRightIcon size={18} color="#FDE68A" />
                  </View>
                </LinearGradient>
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

        {/* Global Price Edit & Product Upload Modals for Mobile & Tablet */}
        <PriceEditModal />
        <ProductUploadModal />
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
    backgroundColor: colors.background,
  },
  mainArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  bottomBarWrapper: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.md,
    right: spacing.md,
    borderRadius: spacing.radiusLg,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#1C1917',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#78350F',
  },
  bottomBarWrapperSmall: {
    bottom: spacing.sm,
    left: spacing.sm,
    right: spacing.sm,
  },
  bottomBarGradient: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  bottomBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  cartBadgeCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBarItemCount: {
    ...typography.button,
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  bottomBarViewCartText: {
    ...typography.caption,
    fontSize: 11,
    color: '#D6D3D1',
  },
  bottomBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bottomBarTotal: {
    ...typography.heading,
    fontSize: 19,
    fontWeight: '900',
    color: '#FFFFFF',
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
    borderRightWidth: 1.5,
    borderRightColor: '#E7E2D7',
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
    borderRightWidth: 1.5,
    borderRightColor: '#E7E2D7',
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
    width: 200,
    height: '100%',
    borderRightWidth: 1.5,
    borderRightColor: '#E7E2D7',
  },
  tabletLeftColumnLarge: {
    width: 235,
  },
  tabletCenterColumn: {
    flex: 1,
    borderRightWidth: 1.5,
    borderRightColor: '#E7E2D7',
  },
  tabletRightColumn: {
    width: 330,
  },
  tabletRightColumnLarge: {
    width: 370,
  },
});
