/**
 * FCM Token Service
 *
 * Registers each device's Expo Push Token to the Firestore `deviceTokens`
 * collection so that the Cloud Function can fan-out push notifications
 * to all registered devices (tablet + phone, etc.).
 *
 * No FCM server keys are stored in the app.
 * The Expo Push Notification Service handles FCM internally.
 */

import { Platform } from 'react-native';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getDb } from '../lib/firebase';
import { isFirebaseConfigured } from '../lib/firebaseConfig';
import Constants from 'expo-constants';

const DEVICE_TOKENS_COLLECTION = 'deviceTokens';

let cachedInstallId: string | null = null;

function getStableInstallId(): string {
  if (!cachedInstallId) {
    // Prefer the EAS project ID + native install ID for maximum stability
    const projectId = Constants.easConfig?.projectId || 'billingapp';
    // Constants.installationId is available in Expo SDK 53+
    const nativeId = (Constants as any).installationId || (Constants as any).deviceId || '';
    cachedInstallId = nativeId
      ? `${projectId}_${Platform.OS}_${nativeId}`
      : `${projectId}_${Platform.OS}_${Math.random().toString(36).slice(2)}`;
  }
  return cachedInstallId;
}

/**
 * Requests Expo push token permission and saves the token to Firestore
 * `deviceTokens/{stableDeviceId}`. Safe to call on every app launch —
 * it upserts (overwrites) so tokens stay fresh.
 *
 * Requirements:
 * - Requires a Development Build (not Expo Go) for Android.
 * - Requires `expo-notifications` to be installed and compiled.
 * - No server credentials are stored client-side.
 */
export async function registerAndSavePushToken(): Promise<void> {
  if (!isFirebaseConfigured()) {
    console.warn('[FCMTokenService] Firebase not configured. Skipping token registration.');
    return;
  }

  // Guard: Expo Go does not support FCM push tokens
  try {
    const { isRunningInExpoGo } = await import('expo');
    if (isRunningInExpoGo()) {
      console.log('[FCMTokenService] Running in Expo Go — FCM push tokens require a Development Build.');
      return;
    }
  } catch {
    // If the import fails, we're likely in a dev build — continue
  }

  let Notifications: any;
  try {
    Notifications = await import('expo-notifications');
  } catch (err) {
    console.warn('[FCMTokenService] expo-notifications not available:', err);
    return;
  }

  try {
    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[FCMTokenService] Push notification permission not granted.');
      return;
    }

    // Setup Android notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('bill_notifications', {
        name: 'Bill Notifications',
        importance: Notifications.AndroidImportance?.HIGH ?? 4,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#D97706',
        sound: 'default',
      });
    }

    // Get Expo push token
    const projectId = Constants.easConfig?.projectId;
    if (!projectId) {
      console.warn('[FCMTokenService] EAS projectId not found in app config. Push tokens may not work.');
    }

    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const pushToken: string = tokenResponse.data;

    if (!pushToken || !pushToken.startsWith('ExponentPushToken')) {
      console.warn('[FCMTokenService] Received invalid push token:', pushToken);
      return;
    }

    // Persist to Firestore
    const db = getDb();
    const deviceId = getStableInstallId();
    const tokenDocRef = doc(db, DEVICE_TOKENS_COLLECTION, deviceId);

    await setDoc(
      tokenDocRef,
      {
        token: pushToken,
        platform: Platform.OS,
        deviceId,
        updatedAt: serverTimestamp(),
        appVersion: Constants.expoConfig?.version || '1.0.0',
      },
      { merge: true }
    );

    console.log(`[FCMTokenService] Push token registered: ${pushToken} (device: ${deviceId})`);

    // Listen for token refresh and re-save if it changes
    Notifications.addPushTokenListener?.((event: { data: string }) => {
      const newToken: string = event.data;
      if (newToken && newToken !== pushToken) {
        console.log('[FCMTokenService] Push token refreshed, updating Firestore...');
        setDoc(
          tokenDocRef,
          { token: newToken, updatedAt: serverTimestamp() },
          { merge: true }
        ).catch((err) => console.error('[FCMTokenService] Failed to update refreshed token:', err));
      }
    });
  } catch (error: any) {
    console.error('[FCMTokenService] Error registering push token:', error?.message || error);
  }
}
