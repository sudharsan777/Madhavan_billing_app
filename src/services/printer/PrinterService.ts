import { Platform, PermissionsAndroid, NativeModules } from 'react-native';
import RNBluetoothClassic, {
  BluetoothDevice as RNBluetoothDevice,
  BluetoothEventSubscription,
  BluetoothDeviceEvent,
} from 'react-native-bluetooth-classic';
import type { StateChangeEvent } from 'react-native-bluetooth-classic/lib/BluetoothEvent';
import { BluetoothDevice, ReceiptData, PrintResult } from './PrinterTypes';

// ─── native module availability ──────────────────────────────────────────────
// react-native-bluetooth-classic wraps NativeModules.RNBluetoothClassic.
// The JS wrapper object (RNBluetoothClassic) is ALWAYS non-null — even in Expo Go.
// What IS null in Expo Go is the underlying native module it wraps (_nativeModule).
// Every event listener call flows through:
//   createBluetoothEventSubscription → this._nativeModule.addListener(...)
// which crashes with "Cannot read property 'addListener' of null".
//
// Fix: check the actual native module via NativeModules, not the wrapper.
const BT_AVAILABLE: boolean = NativeModules.RNBluetoothClassic != null;

/** A no-op subscription returned when the native module is unavailable. */
const NO_OP_SUBSCRIPTION: BluetoothEventSubscription = { remove: () => {} };

// ─── helpers ────────────────────────────────────────────────────────────────

/** Map library's BluetoothDevice to our internal BluetoothDevice type */
function mapDevice(d: RNBluetoothDevice): BluetoothDevice {
  const rawName = (d.name ?? '').trim();
  return {
    id: d.address,
    name: rawName || `Thermal Printer (${d.address})`,
    address: d.address,
    paired: d.bonded === true,
    rssi: typeof d.rssi === 'number' ? d.rssi : undefined,
    type: d.type === 'LOW_ENERGY' ? 'BLE' : 'CLASSIC',
  };
}

// ─── PrinterService class ────────────────────────────────────────────────────

export class PrinterService {
  private discoverySubscription: BluetoothEventSubscription | null = null;
  private isDiscovering: boolean = false;

  // ── permissions ────────────────────────────────────────────────────────────

  /**
   * Request Android runtime Bluetooth permissions.
   * Android 12+ needs BLUETOOTH_SCAN + BLUETOOTH_CONNECT.
   * Android 6–11 needs ACCESS_FINE_LOCATION for discovery.
   */
  async requestAndroidPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;

    try {
      if (Platform.Version >= 31) {
        const granted = await PermissionsAndroid.requestMultiple([
          'android.permission.BLUETOOTH_SCAN' as any,
          'android.permission.BLUETOOTH_CONNECT' as any,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);
        return (
          granted['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED &&
          granted['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED
        );
      } else {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        return result === PermissionsAndroid.RESULTS.GRANTED;
      }
    } catch (err) {
      console.warn('[PrinterService] Permission request error:', err);
      return false;
    }
  }

  // ── Bluetooth state ────────────────────────────────────────────────────────

  /** Returns whether Bluetooth is currently enabled on the device. */
  async isBluetoothEnabled(): Promise<boolean> {
    if (!BT_AVAILABLE) return false;
    try {
      return await RNBluetoothClassic.isBluetoothEnabled();
    } catch {
      return false;
    }
  }

  /**
   * Prompt Android system UI to enable Bluetooth.
   * Resolves true if the user accepted.
   */
  async requestBluetoothEnabled(): Promise<boolean> {
    if (!BT_AVAILABLE) return false;
    try {
      return await RNBluetoothClassic.requestBluetoothEnabled();
    } catch {
      return false;
    }
  }

  /**
   * Subscribe to Bluetooth adapter state changes (enabled/disabled).
   * Returns a subscription handle — call .remove() to unsubscribe.
   */
  onBluetoothStateChanged(
    listener: (event: StateChangeEvent) => void
  ): BluetoothEventSubscription {
    if (!BT_AVAILABLE) return NO_OP_SUBSCRIPTION;
    return RNBluetoothClassic.onStateChanged(listener);
  }

  // ── discovery ──────────────────────────────────────────────────────────────

  /**
   * Fetch already-paired (bonded) devices from the Android Bluetooth adapter.
   */
  async getBondedDevices(): Promise<BluetoothDevice[]> {
    if (!BT_AVAILABLE) return [];
    try {
      const devices = await RNBluetoothClassic.getBondedDevices();
      return devices.map(mapDevice);
    } catch (err) {
      console.warn('[PrinterService] getBondedDevices error:', err);
      return [];
    }
  }

  /**
   * Start Bluetooth Classic device discovery.
   * - Fires `onDeviceDiscovered` for each new device found.
   * - Fires `onFinished` after the scan completes (typically 12 s on Android).
   *
   * Returns false if permissions were denied or Bluetooth is off.
   */
  async startDiscovery(
    onDeviceDiscovered: (device: BluetoothDevice) => void,
    onFinished: () => void
  ): Promise<boolean> {
    if (!BT_AVAILABLE) { onFinished(); return false; }
    const hasPermission = await this.requestAndroidPermissions();
    if (!hasPermission) return false;

    const btEnabled = await this.isBluetoothEnabled();
    if (!btEnabled) return false;

    // Clean up any previous subscription
    this.stopDiscovery();
    this.isDiscovering = true;

    // Subscribe to DEVICE_DISCOVERED events before starting
    this.discoverySubscription = RNBluetoothClassic.onDeviceDiscovered(
      (event: BluetoothDeviceEvent) => {
        if (event.device) {
          onDeviceDiscovered(mapDevice(event.device as RNBluetoothDevice));
        }
      }
    );

    try {
      // startDiscovery() resolves with the full list once discovery finishes
      const discovered = await RNBluetoothClassic.startDiscovery();
      this.isDiscovering = false;
      this.cleanupDiscoverySubscription();
      // Emit any stragglers not caught by the event (belt-and-suspenders)
      discovered.forEach((d) => onDeviceDiscovered(mapDevice(d)));
      onFinished();
      return true;
    } catch (err) {
      console.warn('[PrinterService] startDiscovery error:', err);
      this.isDiscovering = false;
      this.cleanupDiscoverySubscription();
      onFinished();
      return false;
    }
  }

  /** Cancel an in-progress discovery scan */
  stopDiscovery(): void {
    this.isDiscovering = false;
    this.cleanupDiscoverySubscription();
    if (BT_AVAILABLE && Platform.OS === 'android') {
      RNBluetoothClassic.cancelDiscovery().catch(() => {});
    }
  }

  private cleanupDiscoverySubscription(): void {
    if (this.discoverySubscription) {
      this.discoverySubscription.remove();
      this.discoverySubscription = null;
    }
  }

  getIsScanning(): boolean {
    return this.isDiscovering;
  }

  // ── connection ─────────────────────────────────────────────────────────────

  /**
   * Connect to a device over SPP (RFCOMM).
   * If the device is not yet bonded, Android will show its pairing dialog.
   * Returns true on success.
   */
  async connectToDevice(device: BluetoothDevice): Promise<boolean> {
    if (!BT_AVAILABLE) return false;
    try {
      const connected = await RNBluetoothClassic.connectToDevice(device.address);
      return connected !== null && connected !== undefined;
    } catch (err) {
      console.warn('[PrinterService] connectToDevice error:', err);
      return false;
    }
  }

  /** Check if the device at `address` is currently connected */
  async isDeviceConnected(address: string): Promise<boolean> {
    if (!BT_AVAILABLE) return false;
    try {
      return await RNBluetoothClassic.isDeviceConnected(address);
    } catch {
      return false;
    }
  }

  /** Disconnect from the device at `address` */
  async disconnectDevice(address: string): Promise<void> {
    if (!BT_AVAILABLE) return;
    try {
      await RNBluetoothClassic.disconnectFromDevice(address);
    } catch (err) {
      console.warn('[PrinterService] disconnectDevice error:', err);
    }
  }

  /**
   * Subscribe to device disconnection events.
   * Useful for detecting unexpected printer power-off.
   */
  onDeviceDisconnected(
    listener: (event: BluetoothDeviceEvent) => void
  ): BluetoothEventSubscription {
    if (!BT_AVAILABLE) return NO_OP_SUBSCRIPTION;
    return RNBluetoothClassic.onDeviceDisconnected(listener);
  }

  // ── printing ───────────────────────────────────────────────────────────────

  /**
   * Format and transmit an ESC/POS 58mm receipt to the thermal printer.
   * Bytes are written via the Bluetooth Classic SPP socket.
   */
  async printEscPosReceipt(device: BluetoothDevice, data: ReceiptData): Promise<PrintResult> {
    try {
      const ESC = '\x1B';
      const GS = '\x1D';

      let receipt = '';

      // ── Reset ──────────────────────────────────────────────────────────────
      receipt += ESC + '@';

      // ── Header (centered, double-size) ─────────────────────────────────────
      receipt += ESC + 'a' + '\x01';           // Center align
      receipt += ESC + '!' + '\x38';           // Double height + width
      receipt += 'JK COOL DRINKS\n';
      receipt += ESC + '!' + '\x00';           // Normal size
      receipt += '91/4, 1st Main Road, TNHB Anna Park\n';
      receipt += 'Opp. Ayappakam, Chennai - 600 077\n';
      receipt += 'Ph: +91 93611 04618\n';
      receipt += '--------------------------------\n';

      // ── Bill details (left-aligned) ────────────────────────────────────────
      receipt += ESC + 'a' + '\x00';           // Left align
      receipt += `Bill No : ${data.billNumber}\n`;
      receipt += `Date    : ${data.timestamp}\n`;
      receipt += '--------------------------------\n';
      receipt += 'Item            Qty   Price  Amt\n';
      receipt += '--------------------------------\n';

      data.items.forEach((item) => {
        const nameStr  = item.name.padEnd(16).substring(0, 16);
        const qtyStr   = item.qty.toString().padStart(3);
        const priceStr = item.price.toFixed(0).padStart(6);
        const totalStr = (item.qty * item.price).toFixed(0).padStart(6);
        receipt += `${nameStr}${qtyStr}${priceStr}${totalStr}\n`;
      });

      receipt += '--------------------------------\n';

      // ── Bold grand total ───────────────────────────────────────────────────
      receipt += ESC + 'E' + '\x01';
      receipt += `TOTAL AMOUNT          : Rs.${data.totalAmount.toFixed(2)}\n`;
      receipt += ESC + 'E' + '\x00';
      receipt += '--------------------------------\n';

      // ── Footer ─────────────────────────────────────────────────────────────
      receipt += ESC + 'a' + '\x01';           // Center
      receipt += 'Thank you! Visit again\n';
      receipt += 'JK Cool Drinks\n\n\n';

      // ── Paper cut ──────────────────────────────────────────────────────────
      receipt += GS + 'V' + '\x41' + '\x03';

      // ── Write to printer ───────────────────────────────────────────────────
      if (!BT_AVAILABLE) throw new Error('Bluetooth not available in Expo Go. Install the development build.');
      await RNBluetoothClassic.writeToDevice(device.address, receipt, 'utf-8');

      console.log(`[PrinterService] Printed Bill ${data.billNumber} → ${device.name} (${device.address})`);

      return {
        success: true,
        message: `Bill ${data.billNumber} printed on ${device.name}`,
      };
    } catch (err: any) {
      console.error('[PrinterService] printEscPosReceipt error:', err);
      return {
        success: false,
        message: err?.message ?? 'Failed to communicate with thermal printer.',
      };
    }
  }

  /** Open Android's Bluetooth Settings activity so user can toggle Bluetooth ON. */
  openBluetoothSettings(): void {
    if (!BT_AVAILABLE) return;
    try {
      RNBluetoothClassic.openBluetoothSettings();
    } catch (err) {
      console.warn('[PrinterService] openBluetoothSettings error:', err);
    }
  }
}

export const printerService = new PrinterService();
export default printerService;
