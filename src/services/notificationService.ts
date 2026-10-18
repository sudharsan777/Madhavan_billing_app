import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';

// Cache to prevent duplicate notifications for the same bill
const notifiedBillIds = new Set<string>();

let notificationsModule: any = null;
let isInitialized = false;

/**
 * Safely loads the expo-notifications module.
 * 
 * Note: Expo SDK 53+ intentionally throws an error if expo-notifications is imported
 * on Android inside Expo Go (since Expo Go removed native notification code).
 * Local notifications require a Development Build on Android.
 */
function getNotifications() {
  if (isInitialized) {
    return notificationsModule;
  }
  isInitialized = true;

  // Guard: In Expo Go on Android, do not load expo-notifications to prevent the crash
  if (Platform.OS === 'android' && isRunningInExpoGo()) {
    console.log(
      '[NotificationService] Running in Expo Go on Android. Local notifications require a Development Build.'
    );
    return null;
  }

  try {
    const mod = require('expo-notifications');
    if (mod && typeof mod.setNotificationHandler === 'function') {
      mod.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    }
    notificationsModule = mod;
    return notificationsModule;
  } catch (err: any) {
    console.warn('[NotificationService] expo-notifications unavailable:', err?.message);
    return null;
  }
}

/**
 * Requests device notification permissions if not already granted.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  const Notifications = getNotifications();
  if (!Notifications) {
    return false;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('bill_notifications', {
        name: 'Bill Notifications',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#D97706',
        sound: 'default',
      });
    }

    return finalStatus === 'granted';
  } catch (error) {
    console.warn('[NotificationService] Error requesting notification permission:', error);
    return false;
  }
}

/**
 * Triggers a local notification on this device after a bill is confirmed saved in Cloud Firestore.
 * 
 * Guards:
 * - Checks for duplicate bill ID (notifies once per bill).
 * - Delivers immediately on the local device.
 * - Safely handles Expo Go where notifications are disabled by Expo SDK 53+.
 */
export async function triggerBillSavedNotification(
  billNumber: string,
  totalAmount: number,
  billId: string
): Promise<void> {
  if (!billId || notifiedBillIds.has(billId)) {
    return;
  }

  const Notifications = getNotifications();
  if (!Notifications) {
    // Graceful fallback in Expo Go or if native module not compiled in current client
    return;
  }

  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.warn('[NotificationService] Notification permission not granted');
      return;
    }

    // Mark as notified to prevent duplicate notifications
    notifiedBillIds.add(billId);

    const cleanNumber = billNumber.startsWith('INV-') ? billNumber.replace('INV-', '') : billNumber;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Bill saved successfully!',
        body: `Bill #${cleanNumber} - ₹${totalAmount}`,
        data: { billId, billNumber, totalAmount },
        sound: true,
      },
      trigger: null, // Immediate trigger
    });
  } catch (error) {
    console.warn('[NotificationService] Failed to schedule bill notification:', error);
  }
}
