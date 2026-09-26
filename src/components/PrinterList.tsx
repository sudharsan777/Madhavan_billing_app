import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { BluetoothDevice } from '../services/printer/PrinterTypes';
import colors from '../theme/colors';
import spacing from '../theme/spacing';
import typography from '../theme/typography';
import { PrinterIcon, CheckIcon, BluetoothIcon } from './icons';

interface PrinterListProps {
  devices: BluetoothDevice[];
  preferredPrinter: BluetoothDevice | null;
  connectionStatus: string;
  onConnectDevice: (device: BluetoothDevice) => void;
  connectingDeviceId: string | null;
}

export const PrinterList: React.FC<PrinterListProps> = ({
  devices,
  preferredPrinter,
  connectionStatus,
  onConnectDevice,
  connectingDeviceId,
}) => {
  if (devices.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <BluetoothIcon size={28} color={colors.textMuted} />
        <Text style={styles.emptyText}>No Bluetooth thermal printers found.</Text>
        <Text style={styles.emptySubtext}>Tap &quot;Scan for Devices&quot; to discover nearby printers.</Text>
      </View>
    );
  }

  // Separate paired devices from newly discovered unpaired devices
  const pairedDevices = devices.filter((d) => d.paired);
  const newlyDiscoveredDevices = devices.filter((d) => !d.paired);

  const renderDeviceRow = (device: BluetoothDevice) => {
    const isPreferred = preferredPrinter?.id === device.id || preferredPrinter?.address === device.address;
    const isConnected = isPreferred && connectionStatus === 'CONNECTED';
    const isConnecting = connectingDeviceId === device.id || (isPreferred && connectionStatus === 'CONNECTING');
    const displayName = device.name?.trim() || `Printer (${device.address || 'Unknown'})`;

    return (
      <View key={device.id || device.address} style={[styles.deviceItem, isPreferred && styles.deviceItemSelected]}>
        <View style={styles.deviceInfoCol}>
          <View style={styles.nameRow}>
            <PrinterIcon size={18} color={isPreferred ? colors.primary : colors.textSecondary} />
            <Text style={[styles.deviceName, isPreferred && styles.deviceNameSelected]} numberOfLines={1}>
              {displayName}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.deviceAddress}>MAC: {device.address}</Text>
            {device.paired ? (
              <Text style={styles.pairedTag}>PAIRED</Text>
            ) : (
              <Text style={styles.unpairedTag}>NEW DEVICE</Text>
            )}
            {device.rssi !== undefined && <Text style={styles.rssiTag}>{device.rssi} dBm</Text>}
          </View>
        </View>

        {/* Connect Action Button */}
        {isConnected ? (
          <View style={styles.connectedBadge}>
            <CheckIcon size={14} color={colors.price} strokeWidth={3} />
            <Text style={styles.connectedBadgeText}>CONNECTED</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.connectButton, isConnecting && styles.connectButtonDisabled]}
            onPress={() => onConnectDevice(device)}
            disabled={isConnecting}
            activeOpacity={0.75}>
            {isConnecting ? (
              <ActivityIndicator size="small" color={colors.textPrimary} />
            ) : (
              <Text style={styles.connectButtonText}>{isPreferred ? 'RECONNECT' : 'CONNECT'}</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.listContainer}>
      {/* 1. Paired Devices Section */}
      {pairedDevices.length > 0 && (
        <View style={styles.sectionGroup}>
          <Text style={styles.sectionTitle}>PAIRED PRINTERS ({pairedDevices.length})</Text>
          <View style={styles.deviceList}>{pairedDevices.map(renderDeviceRow)}</View>
        </View>
      )}

      {/* 2. Newly Discovered Unpaired Devices Section */}
      {newlyDiscoveredDevices.length > 0 && (
        <View style={styles.sectionGroup}>
          <Text style={styles.sectionTitle}>NEWLY DISCOVERED NEARBY DEVICES ({newlyDiscoveredDevices.length})</Text>
          <View style={styles.deviceList}>{newlyDiscoveredDevices.map(renderDeviceRow)}</View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  listContainer: {
    gap: spacing.md,
  },
  sectionGroup: {
    gap: spacing.xs,
  },
  sectionTitle: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  deviceList: {
    gap: spacing.xs,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.surfaceVariant,
    borderRadius: spacing.radiusMd,
    gap: spacing.xs,
  },
  emptyText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  emptySubtext: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: spacing.radiusMd,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  deviceItemSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySurface,
  },
  deviceInfoCol: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  deviceName: {
    ...typography.productName,
    fontSize: 14,
    color: colors.textPrimary,
  },
  deviceNameSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  deviceAddress: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
  },
  pairedTag: {
    ...typography.caption,
    fontSize: 9,
    fontWeight: '700',
    color: colors.primary,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  unpairedTag: {
    ...typography.caption,
    fontSize: 9,
    fontWeight: '700',
    color: colors.warning,
    backgroundColor: colors.warningLight,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  rssiTag: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textMuted,
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.successLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: spacing.radiusSm,
  },
  connectedBadgeText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '800',
    color: colors.price,
  },
  connectButton: {
    backgroundColor: colors.surfaceVariant,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: spacing.radiusSm,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    minWidth: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectButtonDisabled: {
    opacity: 0.6,
  },
  connectButtonText: {
    ...typography.button,
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});

export default PrinterList;
