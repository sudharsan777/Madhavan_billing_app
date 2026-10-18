export type PaymentMethod = 'CASH' | 'UPI' | 'CARD';

export interface BillProductItem {
  productId: string;
  name: string;
  category: string;
  quantity: number;
  price: number;
  itemTotal: number;
}

export interface BillData {
  id?: string;
  billNumber: string;
  items: BillProductItem[];
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  createdAt: string; // ISO String format
  timestampMillis: number;
  status: 'COMPLETED' | 'CANCELLED';
  shopName?: string;
  // Optional customer details
  customerName?: string;
  customerPhone?: string;
}

export interface SaveBillResult {
  success: boolean;
  billId?: string;
  billNumber?: string;
  error?: string;
}

export interface FirestoreTestResult {
  success: boolean;
  message: string;
  testBillId?: string;
}

export interface DailySalesPoint {
  dayLabel: string;
  dateStr: string;
  sales: number;
  count: number;
  isToday: boolean;
}

export interface BestSellingProduct {
  productId: string;
  name: string;
  category: string;
  quantity: number;
  revenue: number;
}

export interface PaymentBreakdown {
  cash: number;
  cashCount: number;
  upi: number;
  upiCount: number;
  card: number;
  cardCount: number;
  total: number;
  totalCount: number;
}

export interface SalesAnalytics {
  todaySales: number;
  todayBillCount: number;
  averageBillAmount: number;
  yesterdaySales: number;
  yesterdayBillCount: number;
  weeklySales: number;
  weeklyBillCount: number;
  monthlySales: number;
  monthlyBillCount: number;
  dailyTrend: DailySalesPoint[];
  paymentBreakdown: PaymentBreakdown;
  bestSellers: BestSellingProduct[];
  totalAllTimeSales: number;
  totalAllTimeBills: number;
}

