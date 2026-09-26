import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

export const BluetoothOffIcon: React.FC<IconProps> = ({ size = 20, color = 'currentColor' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M16.5 16.5L12 21v-7.5l4.5 4.5zM12 7.5V3l5.5 5.5-3.5 3.5M2 2l20 20" />
  </Svg>
);

export default BluetoothOffIcon;
