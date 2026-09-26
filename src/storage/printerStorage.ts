import AsyncStorage from '@react-native-async-storage/async-storage';
import { BluetoothDevice } from '../services/printer/PrinterTypes';

const PREFERRED_PRINTER_KEY = '@billing_app_preferred_thermal_printer';
const BLUETOOTH_POWER_KEY = '@billing_app_bluetooth_power_state';

export const printerStorage = {
  /**
   * Save selected preferred printer to AsyncStorage
   */
  async savePreferredPrinter(printer: BluetoothDevice): Promise<void> {
    try {
      await AsyncStorage.setItem(PREFERRED_PRINTER_KEY, JSON.stringify(printer));
    } catch (error) {
      console.error('[printerStorage] Failed to save preferred printer:', error);
    }
  },

  /**
   * Retrieve preferred printer from AsyncStorage
   */
  async getPreferredPrinter(): Promise<BluetoothDevice | null> {
    try {
      const json = await AsyncStorage.getItem(PREFERRED_PRINTER_KEY);
      return json ? JSON.parse(json) : null;
    } catch (error) {
      console.error('[printerStorage] Failed to get preferred printer:', error);
      return null;
    }
  },

  /**
   * Clear preferred printer
   */
  async clearPreferredPrinter(): Promise<void> {
    try {
      await AsyncStorage.removeItem(PREFERRED_PRINTER_KEY);
    } catch (error) {
      console.error('[printerStorage] Failed to clear preferred printer:', error);
    }
  },

  /**
   * Save Bluetooth power state preference
   */
  async saveBluetoothPowerState(enabled: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(BLUETOOTH_POWER_KEY, JSON.stringify(enabled));
    } catch (error) {
      console.error('[printerStorage] Failed to save bluetooth state:', error);
    }
  },

  /**
   * Retrieve Bluetooth power state
   */
  async getBluetoothPowerState(): Promise<boolean> {
    try {
      const val = await AsyncStorage.getItem(BLUETOOTH_POWER_KEY);
      return val !== null ? JSON.parse(val) : true;
    } catch (error) {
      return true;
    }
  },
};

export default printerStorage;
