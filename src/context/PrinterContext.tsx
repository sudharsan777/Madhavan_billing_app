import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { AppState, AppStateStatus, NativeModules } from 'react-native';
import { BluetoothEventSubscription, BluetoothDeviceEvent } from 'react-native-bluetooth-classic';
import type { StateChangeEvent } from 'react-native-bluetooth-classic/lib/BluetoothEvent';
import printerStorage from '../storage/printerStorage';
import printerService from '../services/printer/PrinterService';
import {
  BluetoothDevice,
  PrinterConnectionStatus,
  ScanState,
  ReceiptData,
  PrintResult,
} from '../services/printer/PrinterTypes';

// ─── Expo Go detection ───────────────────────────────────────────────────────
// The JS wrapper (RNBluetoothClassic) is always non-null, even in Expo Go.
// The actual native bridge (NativeModules.RNBluetoothClassic) is only present
// in a real development build that has the native module linked.
// We must check the bridge, NOT the wrapper.
const NATIVE_BT_AVAILABLE: boolean = NativeModules.RNBluetoothClassic != null;

// ─── context shape ───────────────────────────────────────────────────────────

interface PrinterContextType {
  preferredPrinter: BluetoothDevice | null;
  connectionStatus: PrinterConnectionStatus;
  scanState: ScanState;
  discoveredDevices: BluetoothDevice[];
  isBluetoothOn: boolean;
  isNativeBuildRequired: boolean;        // true when running in Expo Go
  permissionError: string | null;
  startDeviceScan: () => Promise<void>;
  stopDeviceScan: () => void;
  connectToPrinterDevice: (device: BluetoothDevice) => Promise<boolean>;
  forgetPreferredPrinter: () => Promise<void>;
  attemptAutoReconnect: () => Promise<boolean>;
  printBill: (receiptData: ReceiptData) => Promise<PrintResult>;
  openBluetoothSettings: () => void;
}

const PrinterContext = createContext<PrinterContextType | undefined>(undefined);

// ─── provider ────────────────────────────────────────────────────────────────

export const PrinterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preferredPrinter, setPreferredPrinter] = useState<BluetoothDevice | null>(null);

  // Start with NATIVE_BUILD_REQUIRED when in Expo Go, BLUETOOTH_OFF otherwise.
  // This prevents the wrong "Bluetooth is OFF" message before we've checked.
  const [connectionStatus, setConnectionStatus] = useState<PrinterConnectionStatus>(
    NATIVE_BT_AVAILABLE ? 'BLUETOOTH_OFF' : 'NATIVE_BUILD_REQUIRED'
  );

  const [scanState, setScanState] = useState<ScanState>('IDLE');
  const [discoveredDevices, setDiscoveredDevices] = useState<BluetoothDevice[]>([]);
  // isBluetoothOn only reflects real hardware state (always false in Expo Go)
  const [isBluetoothOn, setIsBluetoothOn] = useState<boolean>(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Track mounted state to prevent stale async state updates (fixes React warning)
  const mountedRef = useRef<boolean>(false);
  const isConnectingRef = useRef<boolean>(false);

  // ── auto-reconnect ─────────────────────────────────────────────────────────

  const attemptAutoReconnect = useCallback(async (): Promise<boolean> => {
    if (!mountedRef.current) return false;
    if (!NATIVE_BT_AVAILABLE) return false;

    const targetPrinter = preferredPrinter ?? (await printerStorage.getPreferredPrinter());
    if (!mountedRef.current) return false;

    const btOn = await printerService.isBluetoothEnabled();
    if (!mountedRef.current) return false;

    if (!btOn) {
      setConnectionStatus('BLUETOOTH_OFF');
      return false;
    }

    if (!targetPrinter) {
      setConnectionStatus('DISCONNECTED');
      return false;
    }

    if (isConnectingRef.current) return false;

    isConnectingRef.current = true;
    setConnectionStatus('CONNECTING');

    try {
      const success = await printerService.connectToDevice(targetPrinter);
      if (!mountedRef.current) { isConnectingRef.current = false; return false; }

      if (success) {
        setConnectionStatus('CONNECTED');
        setPreferredPrinter(targetPrinter);
      } else {
        setConnectionStatus('DISCONNECTED');
      }
      isConnectingRef.current = false;
      return success;
    } catch {
      if (mountedRef.current) setConnectionStatus('DISCONNECTED');
      isConnectingRef.current = false;
      return false;
    }
  }, [preferredPrinter]);

  // ── init on app launch ─────────────────────────────────────────────────────
  // FIX: use mountedRef (not a local `let mounted`) so stale async callbacks
  // throughout the component lifetime all share the same ref value.

  useEffect(() => {
    mountedRef.current = true;

    // In Expo Go, skip all native calls entirely — status is already set to
    // NATIVE_BUILD_REQUIRED in initial useState. No async work needed.
    if (!NATIVE_BT_AVAILABLE) return;

    async function init() {
      const [btEnabled, saved] = await Promise.all([
        printerService.isBluetoothEnabled(),
        printerStorage.getPreferredPrinter(),
      ]);

      if (!mountedRef.current) return; // component unmounted before async resolved

      setIsBluetoothOn(btEnabled);
      if (saved) setPreferredPrinter(saved);

      if (!btEnabled) {
        setConnectionStatus('BLUETOOTH_OFF');
      } else if (saved) {
        // Do not call attemptAutoReconnect() directly here — it reads
        // `preferredPrinter` state which hasn't updated from the setPreferredPrinter
        // above yet (state updates are batched). Pass saved directly instead.
        isConnectingRef.current = true;
        setConnectionStatus('CONNECTING');
        const success = await printerService.connectToDevice(saved);
        if (!mountedRef.current) { isConnectingRef.current = false; return; }
        setConnectionStatus(success ? 'CONNECTED' : 'DISCONNECTED');
        if (success) setPreferredPrinter(saved);
        isConnectingRef.current = false;
      } else {
        setConnectionStatus('DISCONNECTED');
      }
    }

    init();

    return () => {
      mountedRef.current = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── real Bluetooth adapter state events ────────────────────────────────────

  useEffect(() => {
    if (!NATIVE_BT_AVAILABLE) return; // skip — no-op subscription in Expo Go

    const stateSub: BluetoothEventSubscription = printerService.onBluetoothStateChanged(
      async (event: StateChangeEvent) => {
        if (!mountedRef.current) return;
        const enabled = event.enabled;
        setIsBluetoothOn(enabled);

        if (!enabled) {
          printerService.stopDiscovery();
          setScanState('IDLE');
          setConnectionStatus('BLUETOOTH_OFF');
        } else {
          setConnectionStatus('DISCONNECTED');
          const saved = preferredPrinter ?? (await printerStorage.getPreferredPrinter());
          if (!mountedRef.current) return;
          if (saved) setTimeout(() => { if (mountedRef.current) attemptAutoReconnect(); }, 600);
        }
      }
    );

    return () => stateSub.remove();
  }, [preferredPrinter, attemptAutoReconnect]);

  // ── detect unexpected printer disconnection ────────────────────────────────

  useEffect(() => {
    if (!NATIVE_BT_AVAILABLE) return; // no-op subscription guard in Expo Go

    const disconnectSub: BluetoothEventSubscription = printerService.onDeviceDisconnected(
      (event: BluetoothDeviceEvent) => {
        if (!mountedRef.current) return;
        const addr = event.device?.address;
        if (preferredPrinter && addr === preferredPrinter.address) {
          setConnectionStatus('DISCONNECTED');
        }
      }
    );

    return () => disconnectSub.remove();
  }, [preferredPrinter]);

  // ── reconnect on app foreground ────────────────────────────────────────────

  useEffect(() => {
    if (!NATIVE_BT_AVAILABLE) return;

    const sub = AppState.addEventListener('change', async (nextState: AppStateStatus) => {
      if (nextState !== 'active') return;
      if (!mountedRef.current) return;

      const btEnabled = await printerService.isBluetoothEnabled();
      if (!mountedRef.current) return;

      setIsBluetoothOn(btEnabled);
      if (!btEnabled) {
        setConnectionStatus('BLUETOOTH_OFF');
      } else {
        const saved = preferredPrinter ?? (await printerStorage.getPreferredPrinter());
        if (!mountedRef.current) return;
        if (saved && connectionStatus !== 'CONNECTED') attemptAutoReconnect();
      }
    });

    return () => sub.remove();
  }, [connectionStatus, preferredPrinter, attemptAutoReconnect]);

  // ── scan ───────────────────────────────────────────────────────────────────

  const startDeviceScan = async (): Promise<void> => {
    if (!NATIVE_BT_AVAILABLE) {
      setPermissionError(
        'A native development build is required for Bluetooth scanning. ' +
        'Expo Go does not include the Bluetooth native module. ' +
        'Run: eas build --platform android --profile development'
      );
      return;
    }

    const btEnabled = await printerService.isBluetoothEnabled();
    if (!mountedRef.current) return;

    if (!btEnabled) {
      setConnectionStatus('BLUETOOTH_OFF');
      setPermissionError('Bluetooth is OFF on your device. Turn it on to scan for printers.');
      return;
    }

    setPermissionError(null);
    setScanState('SCANNING');
    setDiscoveredDevices([]);

    // Load already-bonded devices immediately (instant, no scan needed)
    const bonded = await printerService.getBondedDevices();
    if (!mountedRef.current) return;
    if (bonded.length > 0) setDiscoveredDevices(bonded);

    const success = await printerService.startDiscovery(
      (newDevice) => {
        if (!mountedRef.current) return;
        setDiscoveredDevices((prev) => {
          if (prev.some((d) => d.address === newDevice.address)) return prev;
          return [...prev, newDevice];
        });
      },
      () => {
        if (mountedRef.current) setScanState('FINISHED');
      }
    );

    if (!success && mountedRef.current) {
      setScanState('PERMISSION_DENIED');
      setPermissionError('Bluetooth permission denied. Go to device Settings and grant Bluetooth permissions.');
    }
  };

  const stopDeviceScan = (): void => {
    printerService.stopDiscovery();
    setScanState('FINISHED');
  };

  // ── connect ────────────────────────────────────────────────────────────────

  const connectToPrinterDevice = async (device: BluetoothDevice): Promise<boolean> => {
    if (!NATIVE_BT_AVAILABLE) return false;

    const btEnabled = await printerService.isBluetoothEnabled();
    if (!mountedRef.current) return false;
    if (!btEnabled) { setConnectionStatus('BLUETOOTH_OFF'); return false; }

    stopDeviceScan();
    setConnectionStatus('CONNECTING');

    const success = await printerService.connectToDevice(device);
    if (!mountedRef.current) return false;

    if (success) {
      setConnectionStatus('CONNECTED');
      setPreferredPrinter(device);
      await printerStorage.savePreferredPrinter(device);
      return true;
    } else {
      setConnectionStatus('DISCONNECTED');
      return false;
    }
  };

  // ── forget printer ─────────────────────────────────────────────────────────

  const forgetPreferredPrinter = async (): Promise<void> => {
    if (preferredPrinter && NATIVE_BT_AVAILABLE) {
      await printerService.disconnectDevice(preferredPrinter.address);
    }
    await printerStorage.clearPreferredPrinter();
    if (!mountedRef.current) return;
    setPreferredPrinter(null);
    if (!NATIVE_BT_AVAILABLE) {
      setConnectionStatus('NATIVE_BUILD_REQUIRED');
      return;
    }
    const btOn = await printerService.isBluetoothEnabled();
    if (mountedRef.current) setConnectionStatus(btOn ? 'DISCONNECTED' : 'BLUETOOTH_OFF');
  };

  // ── print bill ─────────────────────────────────────────────────────────────

  const printBill = async (receiptData: ReceiptData): Promise<PrintResult> => {
    if (!NATIVE_BT_AVAILABLE) {
      return {
        success: false,
        message: 'Printing requires a native development build. Expo Go does not support Bluetooth.',
      };
    }

    const btEnabled = await printerService.isBluetoothEnabled();
    if (!btEnabled) return { success: false, message: 'Bluetooth is OFF. Turn it on to print.' };

    const targetPrinter = preferredPrinter ?? (await printerStorage.getPreferredPrinter());
    if (!targetPrinter) return { success: false, message: 'No printer selected. Open Printer Settings to connect.' };

    let connected = connectionStatus === 'CONNECTED';
    if (!connected) connected = await attemptAutoReconnect();
    if (!connected) return { success: false, message: 'Could not connect to printer. Ensure it is powered on and nearby.' };

    return printerService.printEscPosReceipt(targetPrinter, receiptData);
  };

  // ── open system Bluetooth settings ────────────────────────────────────────

  const openBluetoothSettings = (): void => {
    if (!NATIVE_BT_AVAILABLE) return;
    printerService.openBluetoothSettings();
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <PrinterContext.Provider
      value={{
        preferredPrinter,
        connectionStatus,
        scanState,
        discoveredDevices,
        isBluetoothOn,
        isNativeBuildRequired: !NATIVE_BT_AVAILABLE,
        permissionError,
        startDeviceScan,
        stopDeviceScan,
        connectToPrinterDevice,
        forgetPreferredPrinter,
        attemptAutoReconnect,
        printBill,
        openBluetoothSettings,
      }}
    >
      {children}
    </PrinterContext.Provider>
  );
};

export const usePrinter = (): PrinterContextType => {
  const ctx = useContext(PrinterContext);
  if (!ctx) throw new Error('usePrinter must be used within a PrinterProvider');
  return ctx;
};

export default PrinterContext;
