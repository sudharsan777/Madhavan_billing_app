export const colors = {
  // Brand & Gold Accent Colors
  primary: '#D97706', // Warm Amber Gold - Core Brand Primary
  primaryHover: '#B45309', // Deep Bronze Gold
  primaryActive: '#92400E', // Rich Dark Amber
  primaryLight: '#FEF3C7', // Soft Gold Tint
  primarySurface: '#FFFDF5', // Ultra-clean Champagne Tint
  primaryBorder: '#FDE68A', // Crisp Gold Border

  // Secondary & Dark Luxury Accents
  secondary: '#1C1917', // Warm Luxury Obsidian Slate
  secondaryLight: '#F5F5F4', // Warm Stone 100
  secondaryDark: '#0C0A09', // Deep Black Bronze

  // Background & Surfaces
  background: '#FAF9F6', // Luxury Warm Alabaster / Champagne Off-White
  surface: '#FFFFFF',
  surfaceVariant: '#F7F5F0', // Soft Warm Cream
  surfaceElevated: '#FFFFFF',

  // Borders & Dividers
  border: '#E7E2D7', // Subtle Warm Gold-Stone Border
  borderStrong: '#D6CDBF', // Defined Divider
  borderFocus: '#D97706', // Gold Focus Glow

  // Text Colors
  textPrimary: '#1C1917', // Deep Warm Obsidian
  textSecondary: '#57534E', // Warm Stone Gray
  textMuted: '#A8A29E', // Muted Silver Stone
  textOnPrimary: '#FFFFFF',
  textOnSecondary: '#FFFFFF',

  // Price & Success Accents
  price: '#059669', // Emerald 600
  success: '#10B981', // Emerald 500
  successLight: '#D1FAE5',

  // Actions & States
  danger: '#EF4444', // Red 500
  dangerHover: '#DC2626', // Red 600
  dangerLight: '#FEE2E2', // Red 100

  warning: '#F59E0B', // Amber 500
  warningLight: '#FEF3C7', // Amber 100

  info: '#3B82F6', // Blue 500
  infoLight: '#DBEAFE', // Blue 100

  // Cart & Highlights
  cartBadge: '#D97706',
  totalBackground: '#1C1917',
  totalText: '#FFFFFF',
  accentGold: '#D97706',

  // Gold Sales Dashboard Theme & Gradients
  gold: {
    primary: '#D97706', // Warm Amber Gold
    metallic: '#B45309', // Deep Bronze Gold
    shine: '#FBBF24', // Bright Gold Highlight
    dark: '#78350F', // Rich Dark Bronze
    light: '#FEF3C7', // Soft Gold Amber 100
    surface: '#FFFBEB', // Light Warm Gold Tint
    cardBorder: '#FDE68A', // Soft Gold Border
    subtle: '#FFFDF5', // Clean Off-white Gold
    textDark: '#78350F', // High contrast text on gold
    textMuted: '#92400E',
    badgeBg: '#FEF3C7',
    badgeText: '#B45309',
  },

  // Linear Gradient Color Presets
  gradients: {
    // Metallic Rich Gold Gradient
    gold: ['#B45309', '#D97706', '#F59E0B'] as const,
    // Radiant Champagne Gold
    goldLight: ['#FEF3C7', '#FDE68A', '#FCD34D'] as const,
    // Deep Luxury Bronze to Black Obsidian
    goldHero: ['#292524', '#1C1917', '#451A03'] as const,
    // Pure Gold Shimmer
    goldCard: ['#FFFBEB', '#FEF3C7', '#FDE68A'] as const,
    // Button Active Gold
    goldButton: ['#D97706', '#B45309'] as const,
    // Dark POS Bar
    darkTotal: ['#1C1917', '#292524'] as const,
  },
};

export default colors;
