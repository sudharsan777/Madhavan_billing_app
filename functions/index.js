/**
 * Firebase Cloud Functions — BillingApp Push Notification Fan-out
 *
 * Trigger: Firestore onDocumentCreated on bills/{billId}
 *
 * When a new bill is saved on any device (tablet / phone), this function:
 *   1. Reads all registered device tokens from the `deviceTokens` collection.
 *   2. Sends a push notification to every token via the Expo Push API.
 *   3. Logs results. Does NOT expose any server credentials client-side.
 *
 * This uses the Expo Managed Push Service (https://exp.host/--/api/v2/push/send),
 * so no FCM server key is needed here. Expo handles FCM / APNs internally.
 *
 * Deployment:
 *   npm install -g firebase-tools
 *   firebase login
 *   firebase use billingapp-1e564
 *   cd functions && npm install
 *   cd .. && firebase deploy --only functions
 */

const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const https = require('https');
const { Buffer } = require('node:buffer');

initializeApp();

const DEVICE_TOKENS_COLLECTION = 'deviceTokens';
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Sends an array of messages to the Expo Push API.
 * Batches up to 100 messages per request (Expo's limit).
 */
async function sendExpoPushNotifications(messages) {
  if (messages.length === 0) return [];

  // Chunk into batches of 100
  const batches = [];
  for (let i = 0; i < messages.length; i += 100) {
    batches.push(messages.slice(i, i + 100));
  }

  const allResults = [];

  for (const batch of batches) {
    const body = JSON.stringify(batch);

    const result = await new Promise((resolve, reject) => {
      const url = new URL(EXPO_PUSH_URL);
      const options = {
        hostname: url.hostname,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Length': Buffer.byteLength(body),
        },
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve({ data: [] });
          }
        });
      });

      req.on('error', reject);
      req.write(body);
      req.end();
    });

    allResults.push(result);
  }

  return allResults;
}

/**
 * onBillCreated — triggered whenever a new document is created in the
 * `bills` collection. Sends a push notification to all registered devices.
 *
 * Deduplication: Cloud Functions run exactly once per onCreate event,
 * so there is no risk of sending duplicate notifications.
 */
exports.onBillCreated = onDocumentCreated(
  {
    document: 'bills/{billId}',
    region: 'asia-south1', // Mumbai — closest to India
  },
  async (event) => {
    const bill = event.data?.data();

    if (!bill) {
      console.error('[onBillCreated] No bill data found in event.');
      return null;
    }

    const billNumber = bill.billNumber || event.params.billId;
    const totalAmount = bill.totalAmount || 0;
    const customerName = bill.customerName || null;

    console.log(`[onBillCreated] New bill: ${billNumber} — ₹${totalAmount}`);

    // 1. Fetch all device tokens
    const db = getFirestore();
    let tokensSnapshot;
    try {
      tokensSnapshot = await db.collection(DEVICE_TOKENS_COLLECTION).get();
    } catch (err) {
      console.error('[onBillCreated] Failed to read deviceTokens:', err);
      return null;
    }

    if (tokensSnapshot.empty) {
      console.warn('[onBillCreated] No device tokens registered. Skipping notification.');
      return null;
    }

    // 2. Build Expo push messages for each token
    const messages = [];
    const validTokenPrefix = 'ExponentPushToken';

    tokensSnapshot.forEach((doc) => {
      const data = doc.data();
      const token = data?.token;

      if (token && token.startsWith(validTokenPrefix)) {
        const cleanNumber = billNumber.startsWith('INV-')
          ? billNumber.replace('INV-', '')
          : billNumber;

        const bodyParts = [`Bill #${cleanNumber} — ₹${totalAmount.toLocaleString('en-IN')}`];
        if (customerName) bodyParts.push(`Customer: ${customerName}`);

        messages.push({
          to: token,
          sound: 'default',
          title: '🧾 New Bill Saved!',
          body: bodyParts.join('\n'),
          data: {
            billId: event.params.billId,
            billNumber,
            totalAmount,
            customerName: customerName || null,
          },
          channelId: 'bill_notifications',
          priority: 'high',
          ttl: 3600, // 1 hour TTL
        });
      } else {
        console.warn(`[onBillCreated] Skipping invalid token for device ${doc.id}: ${token}`);
      }
    });

    if (messages.length === 0) {
      console.warn('[onBillCreated] No valid Expo push tokens found. Ensure devices have registered.');
      return null;
    }

    console.log(`[onBillCreated] Sending ${messages.length} push notification(s)...`);

    // 3. Send notifications via Expo Push API
    try {
      const results = await sendExpoPushNotifications(messages);
      console.log('[onBillCreated] Expo push results:', JSON.stringify(results));
    } catch (err) {
      console.error('[onBillCreated] Error sending push notifications:', err);
    }

    return null;
  }
);
