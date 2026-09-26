import AsyncStorage from '@react-native-async-storage/async-storage';

export interface BluetoothPrinter {
  id: string;
  name: string;
  address: string; // MAC Address or Bluetooth Identifier
  paired?: boolean;
}

const SAVED_PRINTER_STORAGE_KEY = '@billing_app_saved_thermal_printer';
const BLUETOOTH_STATE_STORAGE_KEY = '@billing_app_bluetooth_state';

// Standard paired thermal printer presets for initial selection
export const MOCK_PAIRED_PRINTERS: BluetoothPrinter[] = [
  { id: 'bt-5801', name: 'POS-58 Thermal Printer', address: '00:11:22:33:44:55', paired: true },
  { id: 'bt-8002', name: 'RP80 Bluetooth Printer', address: '66:77:88:99:AA:BB', paired: true },
  { id: 'bt-3103', name: 'MTP-II Portable 58mm', address: 'CC:DD:EE:FF:11:22', paired: true },
];

export class PrinterService {
  /**
   * Save selected printer locally for automatic re-connection
   */
  static async savePrinter(printer: BluetoothPrinter): Promise<void> {
    try {
      await AsyncStorage.setItem(SAVED_PRINTER_STORAGE_KEY, JSON.stringify(printer));
    } catch (e) {
      console.error('Error saving printer:', e);
    }
  }

  /**
   * Load saved printer from local storage
   */
  static async getSavedPrinter(): Promise<BluetoothPrinter | null> {
    try {
      const jsonStr = await AsyncStorage.getItem(SAVED_PRINTER_STORAGE_KEY);
      return jsonStr ? JSON.parse(jsonStr) : null;
    } catch (e) {
      console.error('Error loading saved printer:', e);
      return null;
    }
  }

  /**
   * Clear saved printer
   */
  static async clearSavedPrinter(): Promise<void> {
    try {
      await AsyncStorage.removeItem(SAVED_PRINTER_STORAGE_KEY);
    } catch (e) {
      console.error('Error clearing saved printer:', e);
    }
  }

  /**
   * Save simulated Bluetooth power state
   */
  static async saveBluetoothState(isOn: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(BLUETOOTH_STATE_STORAGE_KEY, JSON.stringify(isOn));
    } catch (e) {
      console.error('Error saving bluetooth state:', e);
    }
  }

  /**
   * Get initial Bluetooth power state (defaults to true)
   */
  static async getBluetoothState(): Promise<boolean> {
    try {
      const val = await AsyncStorage.getItem(BLUETOOTH_STATE_STORAGE_KEY);
      return val !== null ? JSON.parse(val) : true;
    } catch (e) {
      return true;
    }
  }

  /**
   * Attempt native Bluetooth connection to printer
   */
  static async connectToPrinter(printer: BluetoothPrinter): Promise<boolean> {
    // Simulate real native socket connection timeout & validation
    return new Promise((resolve) => {
      setTimeout(() => {
        // Validation: verify printer address is non-empty
        if (printer && printer.address) {
          resolve(true);
        } else {
          resolve(false);
        }
      }, 1200);
    });
  }

  /**
   * Format ESC/POS commands for thermal bill printing
   */
  static generateEscPosReceipt(data: {
    billNumber: string;
    tableNumber: string;
    timestamp: string;
    items: { name: string; qty: number; price: number }[];
    subtotal: number;
    discountAmount: number;
    totalAmount: number;
  }): string {
    const ESC = '\x1B';
    const GS = '\x1D';

    let commands = '';
    // Initialize printer
    commands += ESC + '@';
    // Center alignment
    commands += ESC + 'a' + '\x01';
    // Double height + double width for header
    commands += ESC + '!' + '\x38';
    commands += 'MADHAVAN SHOP\n';
    // Normal text size
    commands += ESC + '!' + '\x00';
    commands += 'Ayapakkam, Ambattur, Chennai\n';
    commands += 'Ph: +91 9361104618\n';
    commands += '--------------------------------\n';

    // Left align
    commands += ESC + 'a' + '\x00';
    commands += `Bill No: ${data.billNumber}\n`;
    commands += `Date   : ${data.timestamp}\n`;
    commands += '--------------------------------\n';
    commands += 'Item            Qty  Price  Total\n';
    commands += '--------------------------------\n';

    data.items.forEach((item) => {
      const namePadded = item.name.padEnd(16).substring(0, 16);
      const qtyPadded = item.qty.toString().padStart(3);
      const pricePadded = item.price.toString().padStart(6);
      const totalPadded = (item.qty * item.price).toString().padStart(6);
      commands += `${namePadded}${qtyPadded}${pricePadded}${totalPadded}\n`;
    });

    commands += '--------------------------------\n';
    // Bold for Total
    commands += ESC + 'E' + '\x01';
    commands += `TOTAL AMOUNT          : Rs.${data.totalAmount}\n`;
    commands += ESC + 'E' + '\x00';
    commands += '--------------------------------\n';

    // Center alignment for footer
    commands += ESC + 'a' + '\x01';
    commands += 'Thank you! Visit again\n';
    commands += 'Madhavan Shop\n\n\n';

    // Paper cut command
    commands += GS + 'V' + '\x41' + '\x03';

    return commands;
  }
}

export default PrinterService;
