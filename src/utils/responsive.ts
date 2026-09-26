import { useWindowDimensions } from 'react-native';

export const BREAKPOINTS = {
  SMALL_PHONE: 400,
  PHONE: 600,
  TABLET: 900,
} as const;

export interface ResponsiveInfo {
  width: number;
  height: number;
  isSmallPhone: boolean;
  isPhone: boolean;
  isTablet: boolean;
  isLargeTablet: boolean;
  isLandscape: boolean;
  isPortrait: boolean;
  gridColumns: number;
  cardPadding: number;
  contentPadding: number;
  fontSizeScale: number;
}

export function useResponsive(): ResponsiveInfo {
  const { width, height } = useWindowDimensions();

  const isLandscape = width > height;
  const isPortrait = !isLandscape;

  const isSmallPhone = width < BREAKPOINTS.SMALL_PHONE;
  const isPhone = width < BREAKPOINTS.PHONE;
  const isTablet = width >= BREAKPOINTS.PHONE && width < BREAKPOINTS.TABLET;
  const isLargeTablet = width >= BREAKPOINTS.TABLET;

  // Calculate dynamic product grid columns based on screen size & available width
  let gridColumns = 2;

  if (isSmallPhone) {
    gridColumns = isLandscape ? 2 : 1;
  } else if (isPhone) {
    gridColumns = isLandscape ? 3 : 2;
  } else if (isTablet) {
    gridColumns = isLandscape ? 3 : 2;
  } else if (isLargeTablet) {
    gridColumns = isLandscape ? 4 : 3;
  }

  const cardPadding = isSmallPhone ? 8 : isPhone ? 10 : 14;
  const contentPadding = isSmallPhone ? 8 : isPhone ? 12 : 20;

  // Smooth font scaling multiplier
  const fontSizeScale = isSmallPhone ? 0.92 : isLargeTablet ? 1.1 : isTablet ? 1.05 : 1.0;

  return {
    width,
    height,
    isSmallPhone,
    isPhone,
    isTablet: isTablet || isLargeTablet,
    isLargeTablet,
    isLandscape,
    isPortrait,
    gridColumns,
    cardPadding,
    contentPadding,
    fontSizeScale,
  };
}

export function getResponsiveFontSize(baseSize: number, scale: number): number {
  return Math.round(baseSize * scale);
}

export default useResponsive;
