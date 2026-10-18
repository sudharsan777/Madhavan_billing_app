import {
  collection,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { getDb } from '../lib/firebase';
import { isFirebaseConfigured } from '../lib/firebaseConfig';
import {
  BillData,
  SaveBillResult,
  FirestoreTestResult,
  BillProductItem,
  PaymentMethod,
  SalesAnalytics,
  DailySalesPoint,
  BestSellingProduct,
  PaymentBreakdown,
} from '../types/bill';
import SHOP_CONFIG from '../constants/shop';

const BILLS_COLLECTION = 'bills';

/**
 * Saves a completed bill to the Cloud Firestore 'bills' collection.
 * Ensures the bill is saved once with a unique bill ID, timestamp, and complete line items.
 */
export async function saveBillToFirestore(
  billInput: {
    billNumber: string;
    items: {
      id: string;
      name: string;
      category?: string;
      price: number;
      quantity: number;
    }[];
    subtotal: number;
    discountAmount?: number;
    totalAmount: number;
    paymentMethod?: PaymentMethod;
    customerName?: string;
    customerPhone?: string;
  }
): Promise<SaveBillResult> {
  if (!isFirebaseConfigured()) {
    return {
      success: false,
      error: 'Firebase is not yet configured. Please provide your Firebase Web Configuration in src/lib/firebaseConfig.ts or .env.',
    };
  }

  try {
    const db = getDb();
    
    // Transform line items into structured BillProductItem array
    const formattedItems: BillProductItem[] = billInput.items.map((it) => ({
      productId: it.id,
      name: it.name,
      category: it.category || 'General',
      quantity: it.quantity,
      price: it.price,
      itemTotal: it.price * it.quantity,
    }));

    const now = new Date();
    const billDocRef = doc(collection(db, BILLS_COLLECTION));
    const billId = billDocRef.id;

    const billPayload: Record<string, any> = {
      id: billId,
      billNumber: billInput.billNumber,
      shopName: SHOP_CONFIG.name,
      items: formattedItems,
      subtotal: billInput.subtotal,
      discountAmount: billInput.discountAmount || 0,
      totalAmount: billInput.totalAmount,
      paymentMethod: billInput.paymentMethod || 'CASH',
      createdAt: now.toISOString(),
      timestampMillis: now.getTime(),
      serverTimestamp: serverTimestamp(),
      status: 'COMPLETED',
    };

    // Only persist customer fields if provided
    if (billInput.customerName && billInput.customerName.trim().length > 0) {
      billPayload.customerName = billInput.customerName.trim();
    }
    if (billInput.customerPhone && billInput.customerPhone.trim().length > 0) {
      billPayload.customerPhone = billInput.customerPhone.trim();
    }

    await setDoc(billDocRef, billPayload);

    return {
      success: true,
      billId,
      billNumber: billInput.billNumber,
    };
  } catch (error: any) {
    console.error('[Firestore] Error saving bill:', error);
    return {
      success: false,
      error: error?.message || 'Failed to save bill to Firestore. Please check your network and Firestore rules.',
    };
  }
}

/**
 * Updates the payment method of an already-saved bill in Cloud Firestore.
 */
export async function updateBillPaymentMethod(
  billId: string,
  paymentMethod: PaymentMethod
): Promise<boolean> {
  if (!isFirebaseConfigured() || !billId) return false;
  try {
    const db = getDb();
    const docRef = doc(db, BILLS_COLLECTION, billId);
    await updateDoc(docRef, { paymentMethod });
    return true;
  } catch (e) {
    console.error('[Firestore] Error updating payment method:', e);
    return false;
  }
}

/**
 * Deletes a bill document from Cloud Firestore by its document ID.
 */
export async function deleteBillFromFirestore(
  billId: string
): Promise<{ success: boolean; error?: string }> {
  if (!isFirebaseConfigured()) {
    return { success: false, error: 'Firebase is not configured.' };
  }
  if (!billId || billId.trim().length === 0) {
    return { success: false, error: 'Invalid bill ID.' };
  }

  try {
    const db = getDb();
    const docRef = doc(db, BILLS_COLLECTION, billId);
    await deleteDoc(docRef);
    return { success: true };
  } catch (error: any) {
    console.error('[Firestore] Error deleting bill:', error);
    return {
      success: false,
      error: error?.message || 'Failed to delete bill from Cloud Firestore.',
    };
  }
}

/**
 * Retrieves saved bills from Cloud Firestore ordered by latest first.
 */
export async function getSavedBills(limitCount: number = 200): Promise<BillData[]> {
  if (!isFirebaseConfigured()) {
    console.warn('[Firestore] Cannot fetch bills: Firebase not configured.');
    return [];
  }

  try {
    const db = getDb();
    const billsQuery = query(
      collection(db, BILLS_COLLECTION),
      orderBy('timestampMillis', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(billsQuery);
    const bills: BillData[] = [];

    snapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      bills.push({
        id: docSnapshot.id,
        billNumber: data.billNumber || docSnapshot.id,
        items: data.items || [],
        subtotal: data.subtotal || 0,
        discountAmount: data.discountAmount || 0,
        totalAmount: data.totalAmount || 0,
        paymentMethod: data.paymentMethod || 'CASH',
        createdAt: data.createdAt || new Date().toISOString(),
        timestampMillis: data.timestampMillis || 0,
        status: data.status || 'COMPLETED',
        shopName: data.shopName,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
      });
    });

    return bills;
  } catch (error: any) {
    console.error('[Firestore] Error fetching saved bills:', error);
    throw error;
  }
}

/**
 * Subscribes to real-time updates from Cloud Firestore 'bills' collection.
 * Automatically pushes new bills whenever saved from ANY device without manual refresh.
 */
export function subscribeToSavedBills(
  limitCount: number = 300,
  onUpdate: (bills: BillData[]) => void,
  onError?: (error: any) => void
): () => void {
  if (!isFirebaseConfigured()) {
    onUpdate([]);
    return () => {};
  }

  try {
    const db = getDb();
    const billsQuery = query(
      collection(db, BILLS_COLLECTION),
      orderBy('timestampMillis', 'desc'),
      limit(limitCount)
    );

    const unsubscribe = onSnapshot(
      billsQuery,
      (snapshot) => {
        const bills: BillData[] = [];
        snapshot.forEach((docSnapshot) => {
          const data = docSnapshot.data();
          bills.push({
            id: docSnapshot.id,
            billNumber: data.billNumber || docSnapshot.id,
            items: data.items || [],
            subtotal: data.subtotal || 0,
            discountAmount: data.discountAmount || 0,
            totalAmount: data.totalAmount || 0,
            paymentMethod: data.paymentMethod || 'CASH',
            createdAt: data.createdAt || new Date().toISOString(),
            timestampMillis: data.timestampMillis || 0,
            status: data.status || 'COMPLETED',
            shopName: data.shopName,
            customerName: data.customerName,
            customerPhone: data.customerPhone,
          });
        });
        onUpdate(bills);
      },
      (error) => {
        console.error('[Firestore] Real-time subscription error:', error);
        if (onError) onError(error);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.error('[Firestore] Failed to initiate subscription:', err);
    if (onError) onError(err);
    return () => {};
  }
}

/**
 * Simple test to verify Cloud Firestore write and read connectivity.
 * Saves a test bill, reads it back to confirm consistency, and removes the test doc.
 */
export async function testFirestoreConnection(): Promise<FirestoreTestResult> {
  if (!isFirebaseConfigured()) {
    return {
      success: false,
      message: 'Firebase is not yet configured. Please provide your Firebase Web Configuration.',
    };
  }

  try {
    const db = getDb();
    const testDocId = `test_${Date.now()}`;
    const testDocRef = doc(db, '_connection_tests', testDocId);

    const testPayload = {
      testId: testDocId,
      billNumber: 'TEST-0001',
      description: 'Firebase Firestore connectivity verification test',
      shopName: SHOP_CONFIG.name,
      testTimestamp: new Date().toISOString(),
      serverTimestamp: serverTimestamp(),
      sampleItem: {
        name: 'Test Tea',
        price: 15,
        quantity: 1,
        total: 15,
      },
    };

    // 1. Write Test
    await setDoc(testDocRef, testPayload);

    // 2. Read Test
    const fetchedDoc = await getDoc(testDocRef);
    if (!fetchedDoc.exists()) {
      return {
        success: false,
        message: 'Write succeeded but document could not be read back. Check Firestore Read permissions.',
      };
    }

    // 3. Clean up test document
    await deleteDoc(testDocRef);

    return {
      success: true,
      message: 'Cloud Firestore is connected! Successfully saved, read, and verified test record.',
      testBillId: testDocId,
    };
  } catch (error: any) {
    console.error('[Firestore Test] Connection test failed:', error);
    return {
      success: false,
      message: error?.message || 'Firestore connection test failed. Check rules and network connection.',
    };
  }
}

/**
 * Calculates complete sales analytics from Firestore bill records
 * using the device's local calendar dates.
 */
export function calculateSalesAnalytics(bills: BillData[]): SalesAnalytics {
  const now = new Date();
  const todayYear = now.getFullYear();
  const todayMonth = now.getMonth();
  const todayDate = now.getDate();

  // Create date boundary for today (start of day local time)
  const startOfToday = new Date(todayYear, todayMonth, todayDate, 0, 0, 0, 0);

  // Yesterday boundary
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfToday.getDate() - 1);

  // 7 days ago boundary
  const startOf7DaysAgo = new Date(startOfToday);
  startOf7DaysAgo.setDate(startOfToday.getDate() - 6);

  // Start of current month
  const startOfMonth = new Date(todayYear, todayMonth, 1, 0, 0, 0, 0);

  let todaySales = 0;
  let todayBillCount = 0;
  let yesterdaySales = 0;
  let yesterdayBillCount = 0;
  let weeklySales = 0;
  let weeklyBillCount = 0;
  let monthlySales = 0;
  let monthlyBillCount = 0;
  let totalAllTimeSales = 0;
  let totalAllTimeBills = bills.length;

  // Payment Breakdown
  const paymentBreakdown: PaymentBreakdown = {
    cash: 0,
    cashCount: 0,
    upi: 0,
    upiCount: 0,
    card: 0,
    cardCount: 0,
    total: 0,
    totalCount: 0,
  };

  // Best Selling Products Map
  const productSalesMap = new Map<string, BestSellingProduct>();

  // Daily Trend Map for the last 7 days
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dailyTrend: DailySalesPoint[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(startOfToday);
    d.setDate(startOfToday.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const isToday = i === 0;
    const dayLabel = isToday ? 'Today' : dayNames[d.getDay()];

    dailyTrend.push({
      dayLabel,
      dateStr,
      sales: 0,
      count: 0,
      isToday,
    });
  }

  // Process all bills
  bills.forEach((bill) => {
    const billDate = new Date(bill.timestampMillis || bill.createdAt);
    const amount = Number(bill.totalAmount) || 0;

    totalAllTimeSales += amount;

    // Check Today
    if (
      billDate.getFullYear() === todayYear &&
      billDate.getMonth() === todayMonth &&
      billDate.getDate() === todayDate
    ) {
      todaySales += amount;
      todayBillCount += 1;
    }

    // Check Yesterday
    if (
      billDate.getFullYear() === startOfYesterday.getFullYear() &&
      billDate.getMonth() === startOfYesterday.getMonth() &&
      billDate.getDate() === startOfYesterday.getDate()
    ) {
      yesterdaySales += amount;
      yesterdayBillCount += 1;
    }

    // Check Weekly (Last 7 Days)
    if (billDate >= startOf7DaysAgo) {
      weeklySales += amount;
      weeklyBillCount += 1;
    }

    // Check Monthly (This Month)
    if (billDate >= startOfMonth) {
      monthlySales += amount;
      monthlyBillCount += 1;
    }

    // Add to 7-day trend
    const billDateStr = billDate.toISOString().split('T')[0];
    const trendPoint = dailyTrend.find((pt) => pt.dateStr === billDateStr);
    if (trendPoint) {
      trendPoint.sales += amount;
      trendPoint.count += 1;
    }

    // Payment breakdown
    const method = (bill.paymentMethod || 'CASH').toUpperCase();
    paymentBreakdown.total += amount;
    paymentBreakdown.totalCount += 1;

    if (method === 'UPI') {
      paymentBreakdown.upi += amount;
      paymentBreakdown.upiCount += 1;
    } else if (method === 'CARD') {
      paymentBreakdown.card += amount;
      paymentBreakdown.cardCount += 1;
    } else {
      paymentBreakdown.cash += amount;
      paymentBreakdown.cashCount += 1;
    }

    // Best Sellers aggregation
    if (Array.isArray(bill.items)) {
      bill.items.forEach((item) => {
        const prodId = item.productId || item.name;
        const qty = Number(item.quantity) || 0;
        const rev = Number(item.itemTotal) || (Number(item.price) || 0) * qty;

        const existing = productSalesMap.get(prodId);
        if (existing) {
          existing.quantity += qty;
          existing.revenue += rev;
        } else {
          productSalesMap.set(prodId, {
            productId: prodId,
            name: item.name || 'Unnamed Item',
            category: item.category || 'General',
            quantity: qty,
            revenue: rev,
          });
        }
      });
    }
  });

  // Calculate Average Bill Amount
  const averageBillAmount = todayBillCount > 0 ? Math.round(todaySales / todayBillCount) : 0;

  // Sort best sellers by quantity descending (top 15)
  const bestSellers = Array.from(productSalesMap.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 15);

  return {
    todaySales,
    todayBillCount,
    averageBillAmount,
    yesterdaySales,
    yesterdayBillCount,
    weeklySales,
    weeklyBillCount,
    monthlySales,
    monthlyBillCount,
    dailyTrend,
    paymentBreakdown,
    bestSellers,
    totalAllTimeSales,
    totalAllTimeBills,
  };
}

