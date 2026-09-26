import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

export const DiscountIcon: React.FC<IconProps> = ({ size = 20, color = 'currentColor' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M19 5L5 19" />
    <Circle cx="7.5" cy="7.5" r="1.5" fill={color} />
    <Circle cx="16.5" cy="16.5" r="1.5" fill={color} />
  </Svg>
);

export default DiscountIcon;
