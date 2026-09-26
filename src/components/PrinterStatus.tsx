import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { usePrinter } from '../context/PrinterContext';
import { PrinterConnectionStatus } from '../services/printer/PrinterTypes';
import colors from '../theme/colors';
import spacing from '../theme/spacing';
import typography from '../theme/typography';
import { PrinterIcon, BluetoothOffIcon, CheckIcon } from './icons';

interface PrinterStatusProps {
  onPress?: () => void;
}

export const PrinterStatus: React.FC<PrinterStatusProps> = ({ onPress }) => {
  const { connectionStatus, preferredPrinter } = usePrinter();

  const getStatusConfig = (status: PrinterConnectionStatus) => {
    switch (status) {
      case 'CONNECTED':
        return {
          label: preferredPrinter ? `Connected (${preferredPrinter.name})` : 'Connected',
          bgColor: colors.successLight,
          textColor: colors.price,
          borderColor: colors.success,
          icon: <CheckIcon size={14} color={colors.price} strokeWidth={3} />,
        };
      case 'CONNECTING':
        return {
          label: 'Connecting...',
          bgColor: colors.infoLight,
          textColor: colors.info,
          borderColor: colors.info,
          icon: <PrinterIcon size={14} color={colors.info} />,
        };
      case 'DISCONNECTED':
        return {
          label: 'Printer Disconnected',
          bgColor: colors.warningLight,
          textColor: colors.warning,
          borderColor: colors.warning,
          icon: <PrinterIcon size={14} color={colors.warning} />,
        };
      case 'BLUETOOTH_OFF':
      default:
        return {
          label: 'Bluetooth is Off',
          bgColor: colors.surfaceVariant,
          textColor: colors.textMuted,
          borderColor: colors.borderStrong,
          icon: <BluetoothOffIcon size={14} color={colors.textMuted} />,
        };
    }
  };

  const config = getStatusConfig(connectionStatus);

  return (
    <TouchableOpacity
      style={[styles.badge, { backgroundColor: config.bgColor, borderColor: config.borderColor }]}
      onPress={onPress}
      activeOpacity={0.75}>
      <View style={styles.iconWrapper}>{config.icon}</View>
      <Text style={[styles.text, { color: config.textColor }]} numberOfLines={1}>
        {config.label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: spacing.radiusFull,
    borderWidth: 1,
    gap: 6,
    maxWidth: 220,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});

export default PrinterStatus;
