import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { usePrinter } from '../context/PrinterContext';
import { BluetoothDevice } from '../services/printer/PrinterTypes';
import colors from '../theme/colors';
import spacing from '../theme/spacing';
import typography from '../theme/typography';
import PrimaryButton from './PrimaryButton';
import SecondaryButton from './SecondaryButton';
import PrinterList from './PrinterList';
import { PrinterIcon, BluetoothIcon, BluetoothOffIcon, CloseIcon, SearchIcon } from './icons';

interface PrinterConnectionModalProps {
  visible: boolean;
  onClose: () => void;
}

export const PrinterConnectionModal: React.FC<PrinterConnectionModalProps> = ({
  visible,
  onClose,
}) => {
  const {
    preferredPrinter,
    connectionStatus,
    scanState,
    discoveredDevices,
    isBluetoothOn,
    isNativeBuildRequired,
    permissionError,
    startDeviceScan,
    stopDeviceScan,
    connectToPrinterDevice,
    forgetPreferredPrinter,
    attemptAutoReconnect,
    printBill,
    openBluetoothSettings,
  } = usePrinter();

  const [connectingId, setConnectingId] = useState<string | null>(null);

  const handleConnect = async (device: BluetoothDevice) => {
    setConnectingId(device.id);
    const success = await connectToPrinterDevice(device);
    setConnectingId(null);

    if (success) {
      Alert.alert(
        'Printer Connected',
        `Successfully connected and saved ${device.name} as preferred printer!`
      );
    } else {
      Alert.alert(
        'Connection Failed',
        `Could not establish connection to ${device.name}. Ensure printer is powered ON and paired in Android Bluetooth settings.`
      );
    }
  };

  const handleTestPrint = async () => {
    const result = await printBill({
      billNumber: 'TEST-58MM',
      tableNumber: 'Table 1',
      timestamp: new Date().toLocaleTimeString(),
      items: [
        { name: 'Veg Maggi', qty: 1, price: 50 },
        { name: 'Blueberry Mojito', qty: 1, price: 60 },
      ],
      subtotal: 110,
      discountAmount: 0,
      totalAmount: 110,
    });

    if (result.success) {
      Alert.alert('ESC/POS Print Sent', result.message);
    } else {
      Alert.alert('Print Error', result.message);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <PrinterIcon size={22} color={colors.primary} />
              <Text style={styles.title}>Bluetooth Thermal Printer</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <CloseIcon size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* Bluetooth Hardware Status Card */}
            <View style={styles.cardSection}>
              <View style={styles.rowBetween}>
                <View style={styles.rowLeft}>
                  {isNativeBuildRequired ? (
                    <BluetoothOffIcon size={20} color={colors.warning} />
                  ) : isBluetoothOn ? (
                    <BluetoothIcon size={20} color={colors.primary} />
                  ) : (
                    <BluetoothOffIcon size={20} color={colors.textMuted} />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sectionHeading}>Bluetooth Hardware</Text>
                    <Text style={styles.subText}>
                      {isNativeBuildRequired
                        ? 'Dev build required — Expo Go cannot access Bluetooth'
                        : isBluetoothOn
                        ? 'Bluetooth is ON'
                        : 'Bluetooth is OFF'}
                    </Text>
                  </View>
                </View>

                {!isNativeBuildRequired && (
                  <TouchableOpacity
                    onPress={openBluetoothSettings}
                    style={styles.btSettingsBtn}>
                    <Text style={styles.btSettingsText}>
                      {isBluetoothOn ? 'BT Settings' : 'Turn ON'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {isNativeBuildRequired && (
                <View style={styles.expoGoBanner}>
                  <Text style={styles.expoGoBannerText}>
                    Install the development APK to enable Bluetooth scanning and printing.
                  </Text>
                  <Text style={styles.expoGoBannerCmd}>
                    eas build --platform android --profile development
                  </Text>
                </View>
              )}
            </View>

            {/* Permission Denied Alert */}
            {permissionError && (
              <View style={styles.permissionErrorCard}>
                <Text style={styles.permissionErrorTitle}>Permission Notice</Text>
                <Text style={styles.permissionErrorText}>{permissionError}</Text>
                <SecondaryButton
                  title="Retry Permissions & Scan"
                  onPress={startDeviceScan}
                  style={{ marginTop: spacing.xs, height: 38 }}
                  textStyle={{ fontSize: 12 }}
                />
              </View>
            )}

            {/* Active Printer Connection Info */}
            <View style={styles.cardSection}>
              <Text style={styles.sectionHeading}>Active Printer Connection</Text>

              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Connection Status:</Text>
                <Text
                  style={[
                    styles.statusValue,
                    connectionStatus === 'CONNECTED' && { color: colors.price },
                    connectionStatus === 'CONNECTING' && { color: colors.info },
                    connectionStatus === 'DISCONNECTED' && { color: colors.warning },
                    connectionStatus === 'BLUETOOTH_OFF' && { color: colors.textMuted },
                    connectionStatus === 'NATIVE_BUILD_REQUIRED' && { color: colors.warning },
                  ]}>
                  {connectionStatus === 'NATIVE_BUILD_REQUIRED'
                    ? 'DEV BUILD REQUIRED'
                    : connectionStatus}
                </Text>
              </View>

              {preferredPrinter ? (
                <View style={styles.preferredPrinterBox}>
                  <Text style={styles.preferredPrinterName}>{preferredPrinter.name}</Text>
                  <Text style={styles.preferredPrinterAddr}>MAC: {preferredPrinter.address}</Text>

                  <View style={styles.preferredActions}>
                    <SecondaryButton
                      title="Reconnect"
                      onPress={attemptAutoReconnect}
                      disabled={!isBluetoothOn || connectionStatus === 'CONNECTING'}
                      style={{ height: 36, paddingHorizontal: 12 }}
                      textStyle={{ fontSize: 12 }}
                    />
                    <TouchableOpacity onPress={forgetPreferredPrinter} style={styles.forgetBtn}>
                      <Text style={styles.forgetText}>Forget Printer</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <Text style={styles.noPrinterText}>No preferred thermal printer saved. Scan to select one.</Text>
              )}
            </View>

            {/* Scan Controls */}
            <View style={styles.cardSection}>
              <View style={styles.rowBetween}>
                <View>
                  <Text style={styles.sectionHeading}>Discover Printers</Text>
                  <Text style={styles.subText}>Find 58mm/2-inch thermal Bluetooth printers</Text>
                </View>

                {scanState === 'SCANNING' ? (
                  <SecondaryButton
                    title="Stop Scan"
                    onPress={stopDeviceScan}
                    style={{ height: 38, paddingHorizontal: 12 }}
                    textStyle={{ fontSize: 12, color: colors.danger }}
                  />
                ) : (
                  <PrimaryButton
                    title="Scan for Devices"
                    onPress={startDeviceScan}
                    disabled={isNativeBuildRequired || !isBluetoothOn}
                    icon={<SearchIcon size={16} color={colors.textOnPrimary} />}
                    style={{ height: 38, paddingHorizontal: 14 }}
                    textStyle={{ fontSize: 12 }}
                  />
                )}
              </View>

              {/* Scanning feed indicator */}
              {scanState === 'SCANNING' && (
                <View style={styles.scanningNotice}>
                  <Text style={styles.scanningText}>Scanning nearby Bluetooth devices...</Text>
                </View>
              )}

              {/* Device List */}
              <View style={{ marginTop: spacing.sm }}>
                <PrinterList
                  devices={discoveredDevices}
                  preferredPrinter={preferredPrinter}
                  connectionStatus={connectionStatus}
                  onConnectDevice={handleConnect}
                  connectingDeviceId={connectingId}
                />
              </View>
            </View>

            {/* Test Print Action */}
            {connectionStatus === 'CONNECTED' && (
              <PrimaryButton
                title="Send Test Receipt (58mm ESC/POS)"
                onPress={handleTestPrint}
                icon={<PrinterIcon size={18} color={colors.textOnPrimary} />}
                variant="primary"
                style={{ marginTop: spacing.xs }}
              />
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.sm,
  },
  modalCard: {
    width: '94%',
    maxWidth: 540,
    maxHeight: '90%',
    backgroundColor: colors.surface,
    borderRadius: spacing.radiusLg,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surfaceVariant,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    ...typography.sectionTitle,
    fontSize: 16,
    color: colors.textPrimary,
  },
  closeBtn: {
    padding: 4,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  cardSection: {
    backgroundColor: colors.surface,
    borderRadius: spacing.radiusMd,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  permissionErrorCard: {
    backgroundColor: colors.warningLight,
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: spacing.radiusMd,
    padding: spacing.md,
  },
  permissionErrorTitle: {
    ...typography.sectionTitle,
    fontSize: 14,
    color: colors.warning,
    fontWeight: '700',
  },
  permissionErrorText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textPrimary,
    marginTop: 2,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionHeading: {
    ...typography.sectionTitle,
    fontSize: 14,
    color: colors.textPrimary,
  },
  subText: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: spacing.xs,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statusLabel: {
    ...typography.body,
    fontSize: 13,
    color: colors.textSecondary,
  },
  statusValue: {
    ...typography.body,
    fontSize: 13,
    fontWeight: '800',
  },
  preferredPrinterBox: {
    marginTop: spacing.xs,
    backgroundColor: colors.surfaceVariant,
    padding: spacing.sm,
    borderRadius: spacing.radiusSm,
  },
  preferredPrinterName: {
    ...typography.productName,
    fontSize: 14,
    color: colors.textPrimary,
  },
  preferredPrinterAddr: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
  },
  preferredActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  forgetBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  forgetText: {
    ...typography.caption,
    color: colors.danger,
    fontWeight: '700',
  },
  noPrinterText: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  scanningNotice: {
    backgroundColor: colors.primarySurface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: spacing.radiusSm,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  scanningText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.primary,
    fontWeight: '700',
  },
  btSettingsBtn: {
    backgroundColor: colors.primarySurface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: spacing.radiusSm,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  btSettingsText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.primary,
    fontWeight: '700',
  },
  expoGoBanner: {
    marginTop: spacing.sm,
    backgroundColor: colors.warningLight,
    borderRadius: spacing.radiusSm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  expoGoBannerText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  expoGoBannerCmd: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
    fontFamily: 'monospace',
  },
});

export default PrinterConnectionModal;
