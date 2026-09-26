export type PrinterConnectionStatus =
  | 'NATIVE_BUILD_REQUIRED'   // Expo Go — native module not linked; BT state unknown
  | 'BLUETOOTH_OFF'            // Native module available, but BT adapter is OFF
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED';

export type ScanState = 'IDLE' | 'SCANNING' | 'FINISHED' | 'PERMISSION_DENIED';

export interface BluetoothDevice {
  id: string;
  name: string;
  address: string;
  paired: boolean;
  rssi?: number;
  type?: 'CLASSIC' | 'BLE';
}

export interface ReceiptItem {
  name: string;
  qty: number;
  price: number;
}

export interface ReceiptData {
  billNumber: string;
  tableNumber?: string;
  timestamp: string;
  items: ReceiptItem[];
  subtotal: number;
  discountAmount?: number;
  totalAmount: number;
}

export interface PrintResult {
  success: boolean;
  message: string;
}
