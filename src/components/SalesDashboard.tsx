/**
 * SalesDashboard — Full-Screen Page Component
 *
 * A modern, premium, clean, and professional dashboard with a luxury gold linear-gradient scheme.
 * This is a full-screen screen (Expo Router '/dashboard'), responsive for tablets & phones.
 *
 * Key Capabilities:
 * - Real-time synchronization with Cloud Firestore via onSnapshot
 * - Today's, yesterday's, weekly, monthly, and all-time sales metrics
 * - Custom Date Range filtering (Start Date to End Date) with quick presets
 * - PDF Sales Report generation and downloads (Custom Date Range & All-Time)
 * - Interactive 7-day sales chart with gold highlights
 * - Payment breakdown (Cash, UPI, Card) with distribution bars
 * - Best-selling products leaderboard with gold rank badges
 * - Searchable bill explorer with instant filtering
 * - Optimized for phones (<600px), portrait tablets, and wide landscape tablets (>=1024px)
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
  StatusBar,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  getSavedBills,
  subscribeToSavedBills,
  calculateSalesAnalytics,
  deleteBillFromFirestore,
} from '../services/billService';
import {
  generateAndShareSalesReport,
  calculateReportSummary,
  generateAndShareSingleBillPdf,
} from '../services/reportService';
import { isFirebaseConfigured } from '../lib/firebaseConfig';
import { BillData, SalesAnalytics } from '../types/bill';
import SHOP_CONFIG from '../constants/shop';
import colors from '../theme/colors';
import spacing from '../theme/spacing';
import typography from '../theme/typography';
import { CloseIcon, ChartBarIcon, SearchIcon, ReceiptIcon, TrashIcon } from './icons';
import BillDetailsModal from './BillDetailsModal';

type DatePreset = 'ALL' | 'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH' | 'CUSTOM';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`;
}

function formatCompact(value: number): string {
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}k`;
  return `₹${value}`;
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseISODate(str: string): Date | null {
  const parts = str.split('-');
  if (parts.length !== 3) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  return new Date(y, m, d);
}

// ─── Sub-components ─────────────────────────────────────────────────────────

interface KPICardProps {
  label: string;
  value: string;
  sub: string;
  highlight?: boolean;
}

function KPICard({ label, value, sub, highlight }: KPICardProps) {
  return (
    <View style={[kpiStyles.card, highlight && kpiStyles.cardHighlight]}>
      <Text style={[kpiStyles.label, highlight && kpiStyles.labelHighlight]}>{label}</Text>
      <Text style={[kpiStyles.value, highlight && kpiStyles.valueHighlight]}>{value}</Text>
      <Text style={[kpiStyles.sub, highlight && kpiStyles.subHighlight]}>{sub}</Text>
    </View>
  );
}

const kpiStyles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 140,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    elevation: 2,
    shadowColor: '#1C1917',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  cardHighlight: {
    backgroundColor: '#FFFDF5',
    borderColor: '#FDE68A',
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    marginBottom: 4,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  labelHighlight: {
    color: '#92400E',
  },
  value: {
    fontSize: 21,
    fontWeight: '900',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  valueHighlight: {
    color: '#78350F',
  },
  sub: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
  subHighlight: {
    color: '#B45309',
  },
});

// ─── Main Component ─────────────────────────────────────────────────────────

interface SalesDashboardProps {
  showBack?: boolean;
}

export const SalesDashboard: React.FC<SalesDashboardProps> = ({ showBack = true }) => {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const isLargeTablet = width >= 1024;
  const isPhone = width < 768;
  const isSmallPhone = width < 380;

  const [bills, setBills] = useState<BillData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(() => isFirebaseConfigured());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(() =>
    !isFirebaseConfigured()
      ? 'Firebase is not yet configured. Please configure .env or firebaseConfig.ts.'
      : null
  );

  // Date Filtering State
  const [selectedPreset, setSelectedPreset] = useState<DatePreset>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Custom Date Range Modal State
  const [customRangeModalVisible, setCustomRangeModalVisible] = useState(false);
  const [customStartDate, setCustomStartDate] = useState(() => toISODate(new Date()));
  const [customEndDate, setCustomEndDate] = useState(() => toISODate(new Date()));

  // Active custom date bounds
  const [appliedCustomStart, setAppliedCustomStart] = useState<Date | null>(null);
  const [appliedCustomEnd, setAppliedCustomEnd] = useState<Date | null>(null);

  // PDF Exporting State
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Customer Details & Bill Modal State
  const [selectedBillForDetails, setSelectedBillForDetails] = useState<BillData | null>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [deletingBillId, setDeletingBillId] = useState<string | null>(null);

  const handleOpenCustomerDetails = (bill: BillData) => {
    setSelectedBillForDetails(bill);
    setDetailsModalVisible(true);
  };

  const handleDownloadSinglePdf = async (bill: BillData) => {
    try {
      const res = await generateAndShareSingleBillPdf(bill);
      if (!res.success) {
        Alert.alert('PDF Notice', res.error || 'Could not export bill PDF.');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to export bill PDF.');
    }
  };

  const handleDeleteBill = (bill: BillData) => {
    const docId = bill.id;
    if (!docId) {
      Alert.alert('Cannot Delete', 'This bill does not have a valid Firestore document ID.');
      return;
    }

    Alert.alert(
      'Delete Bill Confirmation',
      `Are you sure you want to permanently delete bill ${bill.billNumber} from Cloud Firestore?\n\nTotal Amount: ${formatCurrency(bill.totalAmount)}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingBillId(docId);
            try {
              const res = await deleteBillFromFirestore(docId);
              if (res.success) {
                setBills((prev) => prev.filter((b) => b.id !== docId));
                if (selectedBillForDetails?.id === docId) {
                  setDetailsModalVisible(false);
                }
                Alert.alert('Bill Deleted', `Bill ${bill.billNumber} has been removed from Firestore.`);
              } else {
                Alert.alert('Delete Failed', res.error || 'Failed to delete bill.');
              }
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Could not delete bill.');
            } finally {
              setDeletingBillId(null);
            }
          },
        },
      ]
    );
  };

  // 1. Real-time Firebase Firestore Subscription
  useEffect(() => {
    if (!isFirebaseConfigured()) {
      return;
    }

    const unsubscribe = subscribeToSavedBills(
      500,
      (liveBills) => {
        setBills(liveBills);
        setIsLoading(false);
        setIsLiveConnected(true);
        setErrorMessage(null);
      },
      (error) => {
        console.error('[Dashboard] Real-time sync error:', error);
        setErrorMessage(error?.message || 'Failed to sync live data from Firestore.');
        setIsLoading(false);
        setIsLiveConnected(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  // Manual refresh fallback
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const fetched = await getSavedBills(500);
      setBills(fetched);
      setErrorMessage(null);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Refresh failed.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // 2. Computed Sales Analytics
  const analytics: SalesAnalytics = useMemo(() => calculateSalesAnalytics(bills), [bills]);

  // Date boundaries
  const dateBounds = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear(),
      m = now.getMonth(),
      d = now.getDate();
    const startOfToday = new Date(y, m, d, 0, 0, 0, 0);
    const endOfToday = new Date(y, m, d, 23, 59, 59, 999);

    const startOfYesterday = new Date(y, m, d - 1, 0, 0, 0, 0);
    const endOfYesterday = new Date(y, m, d - 1, 23, 59, 59, 999);

    const startOf7Days = new Date(y, m, d - 6, 0, 0, 0, 0);
    const startOfMonth = new Date(y, m, 1, 0, 0, 0, 0);

    return { startOfToday, endOfToday, startOfYesterday, endOfYesterday, startOf7Days, startOfMonth };
  }, []);

  // Filter bills by current preset or custom date range
  const filteredBills = useMemo(() => {
    const { startOfToday, endOfToday, startOfYesterday, endOfYesterday, startOf7Days, startOfMonth } =
      dateBounds;
    const q = searchQuery.toLowerCase().trim();

    return bills.filter((bill) => {
      const billDate = new Date(bill.timestampMillis || bill.createdAt);

      if (selectedPreset === 'TODAY') {
        if (billDate < startOfToday || billDate > endOfToday) return false;
      } else if (selectedPreset === 'YESTERDAY') {
        if (billDate < startOfYesterday || billDate > endOfYesterday) return false;
      } else if (selectedPreset === 'WEEK') {
        if (billDate < startOf7Days) return false;
      } else if (selectedPreset === 'MONTH') {
        if (billDate < startOfMonth) return false;
      } else if (selectedPreset === 'CUSTOM') {
        if (appliedCustomStart && appliedCustomEnd) {
          const s = new Date(appliedCustomStart);
          s.setHours(0, 0, 0, 0);
          const e = new Date(appliedCustomEnd);
          e.setHours(23, 59, 59, 999);
          if (billDate < s || billDate > e) return false;
        }
      }

      if (q.length > 0) {
        const matchBillNo = bill.billNumber.toLowerCase().includes(q);
        const matchItem = bill.items?.some((it) => it.name.toLowerCase().includes(q));
        const matchCustomer = bill.customerName?.toLowerCase().includes(q);
        const matchPhone = bill.customerPhone?.includes(q);
        return matchBillNo || matchItem || matchCustomer || matchPhone;
      }

      return true;
    });
  }, [bills, selectedPreset, appliedCustomStart, appliedCustomEnd, searchQuery, dateBounds]);

  // Dynamic summary for the selected period
  const periodSummary = useMemo(() => {
    return calculateReportSummary(filteredBills);
  }, [filteredBills]);

  // Current period label for display & PDF
  const activePeriodLabel = useMemo(() => {
    if (selectedPreset === 'TODAY') return 'Today';
    if (selectedPreset === 'YESTERDAY') return 'Yesterday';
    if (selectedPreset === 'WEEK') return 'Last 7 Days';
    if (selectedPreset === 'MONTH') return 'This Month';
    if (selectedPreset === 'CUSTOM' && appliedCustomStart && appliedCustomEnd) {
      return `${toISODate(appliedCustomStart)} to ${toISODate(appliedCustomEnd)}`;
    }
    return 'All Records';
  }, [selectedPreset, appliedCustomStart, appliedCustomEnd]);

  // Chart max
  const maxDaySale = useMemo(() => {
    const max = Math.max(...analytics.dailyTrend.map((d) => d.sales), 0);
    return max > 0 ? max : 1;
  }, [analytics.dailyTrend]);

  // Payment Breakdown percentages for currently filtered view
  const paymentTotal = periodSummary.totalRevenue > 0 ? periodSummary.totalRevenue : 1;
  const cashPercent = Math.round((periodSummary.cashRevenue / paymentTotal) * 100);
  const upiPercent = Math.round((periodSummary.upiRevenue / paymentTotal) * 100);
  const cardPercent = Math.max(0, 100 - cashPercent - upiPercent);

  // 3. PDF Sales Report Generator Handlers
  const handleExportPeriodPdf = async () => {
    if (filteredBills.length === 0) {
      Alert.alert('No Records', 'There are no bills in the selected date range to export.');
      return;
    }

    setIsExportingPdf(true);
    const result = await generateAndShareSalesReport(
      `Sales Report — ${activePeriodLabel}`,
      activePeriodLabel,
      filteredBills
    );
    setIsExportingPdf(false);

    if (!result.success) {
      Alert.alert('Export Failed', result.error || 'Could not generate PDF report.');
    }
  };

  const handleExportAllTimePdf = async () => {
    if (bills.length === 0) {
      Alert.alert('No Records', 'No bills have been saved to Firestore yet.');
      return;
    }

    setIsExportingPdf(true);
    const result = await generateAndShareSalesReport(
      'Overall Comprehensive Sales Report',
      'All Time Available Records',
      bills
    );
    setIsExportingPdf(false);

    if (!result.success) {
      Alert.alert('Export Failed', result.error || 'Could not generate PDF report.');
    }
  };

  // Custom date range modal submission
  const handleApplyCustomRange = () => {
    const s = parseISODate(customStartDate);
    const e = parseISODate(customEndDate);
    if (!s || !e) {
      Alert.alert('Invalid Date', 'Please specify valid dates in YYYY-MM-DD format.');
      return;
    }
    if (s > e) {
      Alert.alert('Invalid Date Range', 'Start date must be before or equal to end date.');
      return;
    }

    setAppliedCustomStart(s);
    setAppliedCustomEnd(e);
    setSelectedPreset('CUSTOM');
    setCustomRangeModalVisible(false);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#1C1917" />

      {/* ── Top Bar with Gold Linear Gradient Accent ── */}
      <View style={[styles.topBar, isPhone && styles.topBarPhone]}>
        <View style={[styles.topBarLeft, isPhone && styles.topBarLeftPhone]}>
          <LinearGradient
            colors={colors.gradients.gold}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.goldIconCircle, isPhone && styles.goldIconCirclePhone]}>
            <ChartBarIcon size={isPhone ? 18 : 20} color="#FFFFFF" />
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <View style={styles.titleRow}>
              <Text style={[styles.topBarTitle, isPhone && styles.topBarTitlePhone]} numberOfLines={1}>
                {isSmallPhone ? 'Analytics' : 'Sales Analytics'}
              </Text>
              {isLiveConnected && (
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveBadgeText}>LIVE</Text>
                </View>
              )}
            </View>
            {!isSmallPhone && (
              <Text style={styles.topBarSubtitle} numberOfLines={1}>
                {SHOP_CONFIG.name} · Cloud Dashboard
              </Text>
            )}
          </View>
        </View>

        <View style={[styles.topBarRight, isPhone && styles.topBarRightPhone]}>
          {/* Quick PDF Export Button */}
          <TouchableOpacity
            onPress={handleExportPeriodPdf}
            style={styles.pdfHeaderBtn}
            disabled={isExportingPdf}
            activeOpacity={0.8}>
            <LinearGradient
              colors={['#FEF3C7', '#FDE68A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.pdfHeaderBtnGradient, isPhone && styles.pdfHeaderBtnGradientPhone]}>
              {isExportingPdf ? (
                <ActivityIndicator size="small" color="#78350F" />
              ) : (
                <>
                  <ReceiptIcon size={14} color="#78350F" />
                  <Text style={styles.pdfHeaderBtnText}>
                    {isTablet ? 'Download PDF Report' : 'PDF'}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleRefresh}
            style={[styles.refreshBtn, isPhone && styles.refreshBtnPhone]}
            disabled={isLoading || isRefreshing}
            activeOpacity={0.7}>
            {isRefreshing ? (
              <ActivityIndicator size="small" color={colors.gold.primary} />
            ) : (
              <Text style={styles.refreshBtnText}>↺ Sync</Text>
            )}
          </TouchableOpacity>

          {showBack && (
            <TouchableOpacity
              onPress={() => {
                if (router.canGoBack()) router.back();
                else router.replace('/');
              }}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <CloseIcon size={isPhone ? 18 : 20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Main Scrollable Content ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, isTablet && styles.scrollContentTablet]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.gold.primary}
            colors={[colors.gold.primary]}
          />
        }>
        {/* Error Banner */}
        {errorMessage ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>⚠ {errorMessage}</Text>
            <TouchableOpacity onPress={handleRefresh} style={styles.retryBtn}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Loading Overlay */}
        {isLoading && bills.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.gold.primary} />
            <Text style={styles.loadingText}>Syncing live sales data from Cloud Firestore…</Text>
          </View>
        ) : (
          <>
            {/* ─── Hero Card with Luxury Obsidian & Gold Linear Gradient ─── */}
            <LinearGradient
              colors={['#1C1917', '#292524', '#451A03']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.heroCard, isTablet && styles.heroCardTablet]}>
              <View style={styles.heroTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.heroPreLabel}>
                    {selectedPreset === 'ALL'
                      ? "TODAY'S REVENUE"
                      : `${activePeriodLabel.toUpperCase()} REVENUE`}
                  </Text>
                  <Text style={[styles.heroAmount, isPhone && styles.heroAmountPhone]}>
                    {selectedPreset === 'ALL'
                      ? formatCurrency(analytics.todaySales)
                      : formatCurrency(periodSummary.totalRevenue)}
                  </Text>
                </View>

                <LinearGradient
                  colors={colors.gradients.gold}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.heroBadgePill}>
                  <Text style={styles.heroBadgeText}>
                    {selectedPreset === 'ALL'
                      ? `${analytics.todayBillCount} ${analytics.todayBillCount === 1 ? 'BILL' : 'BILLS'}`
                      : `${periodSummary.totalBills} ${periodSummary.totalBills === 1 ? 'BILL' : 'BILLS'}`}
                  </Text>
                </LinearGradient>
              </View>

              <View style={styles.heroDivider} />

              <View style={[styles.heroStatsRow, isPhone && styles.heroStatsRowPhone]}>
                <View style={[styles.heroStatCol, isPhone && styles.heroStatColPhone]}>
                  <Text style={styles.heroStatLabel}>Avg Ticket</Text>
                  <Text style={styles.heroStatValue}>
                    {selectedPreset === 'ALL'
                      ? formatCurrency(analytics.averageBillAmount)
                      : formatCurrency(periodSummary.averageBillValue)}
                  </Text>
                </View>

                <View style={[styles.heroStatCol, isPhone && styles.heroStatColPhone]}>
                  <Text style={styles.heroStatLabel}>Cash Sales</Text>
                  <Text style={[styles.heroStatValue, { color: '#34D399' }]}>
                    {selectedPreset === 'ALL'
                      ? formatCurrency(analytics.paymentBreakdown.cash)
                      : formatCurrency(periodSummary.cashRevenue)}
                  </Text>
                </View>

                <View style={[styles.heroStatCol, isPhone && styles.heroStatColPhone]}>
                  <Text style={styles.heroStatLabel}>UPI Sales</Text>
                  <Text style={[styles.heroStatValue, { color: '#60A5FA' }]}>
                    {selectedPreset === 'ALL'
                      ? formatCurrency(analytics.paymentBreakdown.upi)
                      : formatCurrency(periodSummary.upiRevenue)}
                  </Text>
                </View>

                <View style={[styles.heroStatCol, isPhone && styles.heroStatColPhone]}>
                  <Text style={styles.heroStatLabel}>All-Time Sales</Text>
                  <Text style={[styles.heroStatValue, { color: '#FDE68A' }]}>
                    {formatCurrency(analytics.totalAllTimeSales)}
                  </Text>
                </View>
              </View>
            </LinearGradient>

            {/* ─── KPI Metric Cards Grid ─── */}
            <View style={[styles.kpiGrid, isTablet && styles.kpiGridTablet]}>
              <KPICard
                label="Yesterday"
                value={formatCurrency(analytics.yesterdaySales)}
                sub={`${analytics.yesterdayBillCount} orders recorded`}
              />
              <KPICard
                label="Weekly (7 Days)"
                value={formatCurrency(analytics.weeklySales)}
                sub={`${analytics.weeklyBillCount} orders recorded`}
                highlight
              />
              <KPICard
                label="This Month"
                value={formatCurrency(analytics.monthlySales)}
                sub={`${analytics.monthlyBillCount} orders this month`}
              />
              <KPICard
                label="All-Time Orders"
                value={String(analytics.totalAllTimeBills)}
                sub="Cloud Firestore Total"
              />
            </View>

            {/* ─── PDF Report Action Panel ─── */}
            <View style={styles.reportActionCard}>
              <View style={styles.reportActionLeft}>
                <Text style={styles.reportActionTitle}>📄 Sales Reports & PDF Export</Text>
                <Text style={styles.reportActionSubtitle}>
                  Current View: <Text style={{ fontWeight: '800', color: '#B45309' }}>{activePeriodLabel}</Text> ({filteredBills.length} bills · {formatCurrency(periodSummary.totalRevenue)})
                </Text>
              </View>

              <View style={styles.reportActionRight}>
                <TouchableOpacity
                  style={styles.goldReportButton}
                  onPress={handleExportPeriodPdf}
                  disabled={isExportingPdf}
                  activeOpacity={0.85}>
                  <LinearGradient
                    colors={colors.gradients.gold}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.goldReportButtonGradient}>
                    {isExportingPdf ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.goldReportButtonText}>Download Period PDF</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.outlineReportButton}
                  onPress={handleExportAllTimePdf}
                  disabled={isExportingPdf}
                  activeOpacity={0.8}>
                  <Text style={styles.outlineReportButtonText}>Download All-Time PDF</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* ─── Tablet: Chart + Payment side by side ─── */}
            {isTablet ? (
              <View style={styles.twoColRow}>
                {/* 7-Day Chart */}
                <View style={[styles.sectionCard, { flex: 6 }]}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitle}>7-Day Sales Trend</Text>
                    <Text style={styles.sectionSubtitle}>Last 7 local calendar days revenue</Text>
                  </View>
                  <ChartBars analytics={analytics} maxDaySale={maxDaySale} />
                </View>

                {/* Payment breakdown */}
                <View style={[styles.sectionCard, { flex: 4 }]}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitle}>Payment Breakdown</Text>
                    <Text style={styles.sectionSubtitle}>
                      {selectedPreset === 'ALL' ? 'All-time distribution' : `${activePeriodLabel} distribution`}
                    </Text>
                  </View>
                  <PaymentBreakdownSection
                    summary={periodSummary}
                    cashPercent={cashPercent}
                    upiPercent={upiPercent}
                    cardPercent={cardPercent}
                    compact
                  />
                </View>
              </View>
            ) : (
              <>
                {/* Phone: Chart */}
                <View style={styles.sectionCard}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitle}>7-Day Sales Trend</Text>
                    <Text style={styles.sectionSubtitle}>Last 7 local calendar days revenue</Text>
                  </View>
                  <ChartBars analytics={analytics} maxDaySale={maxDaySale} />
                </View>

                {/* Phone: Payment */}
                <View style={styles.sectionCard}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitle}>Payment Breakdown</Text>
                    <Text style={styles.sectionSubtitle}>
                      {selectedPreset === 'ALL' ? 'All-time distribution' : `${activePeriodLabel} distribution`}
                    </Text>
                  </View>
                  <PaymentBreakdownSection
                    summary={periodSummary}
                    cashPercent={cashPercent}
                    upiPercent={upiPercent}
                    cardPercent={cardPercent}
                  />
                </View>
              </>
            )}

            {/* ─── Best Sellers Leaderboard ─── */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Best-Selling Items</Text>
                <Text style={styles.sectionSubtitle}>Ranked by units sold (all time)</Text>
              </View>

              {analytics.bestSellers.length === 0 ? (
                <EmptyState icon="🛒" text="No item sales data recorded yet." />
              ) : (
                analytics.bestSellers.slice(0, isLargeTablet ? 12 : 8).map((prod, idx) => (
                  <View key={`${prod.productId}-${idx}`} style={styles.leaderboardRow}>
                    <View
                      style={[
                        styles.rankBadge,
                        idx === 0 && styles.rankBadgeGold,
                        idx === 1 && styles.rankBadgeSilver,
                        idx === 2 && styles.rankBadgeBronze,
                      ]}>
                      <Text
                        style={[
                          styles.rankText,
                          idx === 0 && styles.rankTextGold,
                          idx === 1 && styles.rankTextSilver,
                          idx === 2 && styles.rankTextBronze,
                        ]}>
                        #{idx + 1}
                      </Text>
                    </View>
                    <View style={styles.productInfo}>
                      <Text style={styles.productName} numberOfLines={1}>
                        {prod.name}
                      </Text>
                      <Text style={styles.productCategory}>{prod.category}</Text>
                    </View>
                    <View style={styles.productSales}>
                      <Text style={styles.productQty}>{prod.quantity} sold</Text>
                      <Text style={styles.productRevenue}>{formatCurrency(prod.revenue)}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* ─── Bill Explorer with Date Filter & Custom Range ─── */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>Bills & Orders Explorer</Text>
                  <Text style={styles.sectionSubtitle}>
                    {filteredBills.length} transactions in {activePeriodLabel}
                  </Text>
                </View>

                {/* Custom Range Trigger */}
                <TouchableOpacity
                  style={[
                    styles.customRangeBtn,
                    selectedPreset === 'CUSTOM' && styles.customRangeBtnActive,
                  ]}
                  onPress={() => setCustomRangeModalVisible(true)}
                  activeOpacity={0.8}>
                  <Text
                    style={[
                      styles.customRangeBtnText,
                      selectedPreset === 'CUSTOM' && styles.customRangeBtnTextActive,
                    ]}>
                    📅 {selectedPreset === 'CUSTOM' ? 'Range Active' : 'Custom Date Range'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Date Filter Pills */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterPillsScroll}
                contentContainerStyle={styles.filterPillsContainer}>
                {(
                  [
                    { key: 'ALL', label: 'All Time' },
                    { key: 'TODAY', label: 'Today' },
                    { key: 'YESTERDAY', label: 'Yesterday' },
                    { key: 'WEEK', label: 'Last 7 Days' },
                    { key: 'MONTH', label: 'This Month' },
                  ] as { key: DatePreset; label: string }[]
                ).map((pill) => (
                  <TouchableOpacity
                    key={pill.key}
                    style={[
                      styles.filterPill,
                      selectedPreset === pill.key && styles.filterPillActive,
                    ]}
                    onPress={() => setSelectedPreset(pill.key)}>
                    <Text
                      style={[
                        styles.filterPillText,
                        selectedPreset === pill.key && styles.filterPillTextActive,
                      ]}>
                      {pill.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Search Bar */}
              <View style={styles.searchBar}>
                <SearchIcon size={16} color={colors.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by Bill No, Item, Customer name or phone…"
                  placeholderTextColor={colors.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setSearchQuery('')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <CloseIcon size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Bills List */}
              {filteredBills.length === 0 ? (
                <EmptyState
                  icon="🧾"
                  title="No bills found"
                  text={
                    bills.length === 0
                      ? 'No bills have been saved to Firestore yet. Complete a checkout in POS to see it live.'
                      : `No bills match "${searchQuery || activePeriodLabel}".`
                  }
                />
              ) : (
                filteredBills.slice(0, 30).map((b) => {
                  const billDate = b.createdAt
                    ? new Date(b.createdAt).toLocaleString('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })
                    : 'N/A';

                  return (
                    <View key={b.id || b.billNumber} style={styles.billItemCard}>
                      <TouchableOpacity
                        style={styles.billItemMainRow}
                        onPress={() => handleOpenCustomerDetails(b)}
                        activeOpacity={0.75}>
                        <View style={styles.billItemLeft}>
                          <View style={styles.billItemTopRow}>
                            <Text style={styles.billItemNo}>{b.billNumber}</Text>
                          </View>
                          <Text style={styles.billItemTime}>{billDate}</Text>
                          <Text style={styles.billItemProducts} numberOfLines={1}>
                            {b.items && b.items.length > 0
                              ? b.items.map((it) => `${it.quantity}× ${it.name}`).join(', ')
                              : 'No items'}
                          </Text>
                        </View>
                        <View style={styles.billItemRight}>
                          <Text style={styles.billItemTotal}>{formatCurrency(b.totalAmount)}</Text>
                          <View
                            style={[
                              styles.billItemBadge,
                              b.paymentMethod === 'UPI' && styles.billItemBadgeUpi,
                              b.paymentMethod === 'CARD' && styles.billItemBadgeCard,
                            ]}>
                            <Text style={styles.billItemBadgeText}>{b.paymentMethod || 'CASH'}</Text>
                          </View>
                        </View>
                      </TouchableOpacity>

                      {/* Bill Actions Row: View Bill Details, PDF, Delete */}
                      <View style={styles.billCardActionRow}>
                        <TouchableOpacity
                          style={styles.billActionCustomerBtn}
                          onPress={() => handleOpenCustomerDetails(b)}
                          activeOpacity={0.75}>
                          <Text style={styles.billActionCustomerText}>🧾 Bill Details</Text>
                        </TouchableOpacity>

                        <View style={styles.billCardRightActions}>
                          <TouchableOpacity
                            style={styles.billActionPdfBtn}
                            onPress={() => handleDownloadSinglePdf(b)}
                            activeOpacity={0.75}>
                            <Text style={styles.billActionPdfText}>📥 PDF</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.billActionDeleteBtn}
                            onPress={() => handleDeleteBill(b)}
                            disabled={deletingBillId === b.id}
                            activeOpacity={0.75}>
                            {deletingBillId === b.id ? (
                              <ActivityIndicator size="small" color={colors.danger} />
                            ) : (
                              <TrashIcon size={14} color={colors.danger} />
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
              {filteredBills.length > 30 && (
                <Text style={styles.moreResultsNote}>
                  Showing 30 of {filteredBills.length} records in this view.
                </Text>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* ─── Customer Details & Bill Modal ─── */}
      <BillDetailsModal
        visible={detailsModalVisible}
        bill={selectedBillForDetails}
        onClose={() => setDetailsModalVisible(false)}
        onBillDeleted={(id) => {
          setBills((prev) => prev.filter((b) => b.id !== id));
        }}
      />

      {/* ─── Custom Date Range Modal ─── */}
      <Modal
        visible={customRangeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCustomRangeModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, isTablet && styles.modalCardTablet]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select Custom Date Range</Text>
                <Text style={styles.modalSubtitle}>Filter analytics & generate custom PDF reports</Text>
              </View>
              <TouchableOpacity
                onPress={() => setCustomRangeModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <CloseIcon size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.dateInputGroup}>
                <Text style={styles.dateInputLabel}>START DATE (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.dateTextInput}
                  value={customStartDate}
                  onChangeText={setCustomStartDate}
                  placeholder="2026-09-01"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={styles.dateInputGroup}>
                <Text style={styles.dateInputLabel}>END DATE (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.dateTextInput}
                  value={customEndDate}
                  onChangeText={setCustomEndDate}
                  placeholder="2026-09-30"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              {/* Quick preset buttons inside modal */}
              <View style={styles.modalQuickRow}>
                <TouchableOpacity
                  style={styles.quickModalBtn}
                  onPress={() => {
                    const todayStr = toISODate(new Date());
                    setCustomStartDate(todayStr);
                    setCustomEndDate(todayStr);
                  }}>
                  <Text style={styles.quickModalBtnText}>Today</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.quickModalBtn}
                  onPress={() => {
                    const now = new Date();
                    const endStr = toISODate(now);
                    now.setDate(now.getDate() - 7);
                    const startStr = toISODate(now);
                    setCustomStartDate(startStr);
                    setCustomEndDate(endStr);
                  }}>
                  <Text style={styles.quickModalBtnText}>Last 7 Days</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.quickModalBtn}
                  onPress={() => {
                    const now = new Date();
                    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                    setCustomStartDate(toISODate(startOfMonth));
                    setCustomEndDate(toISODate(now));
                  }}>
                  <Text style={styles.quickModalBtnText}>This Month</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setCustomRangeModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalApplyBtn}
                onPress={handleApplyCustomRange}
                activeOpacity={0.85}>
                <LinearGradient
                  colors={colors.gradients.gold}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.modalApplyBtnGradient}>
                  <Text style={styles.modalApplyText}>Apply Range & View</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ─── 7-Day Chart Sub-component ───────────────────────────────────────────────

function ChartBars({ analytics, maxDaySale }: { analytics: SalesAnalytics; maxDaySale: number }) {
  return (
    <View style={chartStyles.container}>
      {analytics.dailyTrend.map((pt, idx) => {
        const barHeightPct = Math.max(8, Math.min(100, Math.round((pt.sales / maxDaySale) * 100)));
        return (
          <View key={`${pt.dateStr}-${idx}`} style={chartStyles.col}>
            <Text style={chartStyles.amtLabel}>
              {pt.sales > 0 ? formatCompact(pt.sales) : '₹0'}
            </Text>
            <View style={chartStyles.track}>
              <LinearGradient
                colors={pt.isToday ? colors.gradients.gold : ['#CBD5E1', '#94A3B8']}
                start={{ x: 0, y: 1 }}
                end={{ x: 0, y: 0 }}
                style={[chartStyles.fill, { height: `${barHeightPct}%` }]}
              />
            </View>
            <Text style={[chartStyles.dayLabel, pt.isToday && chartStyles.dayLabelToday]}>
              {pt.dayLabel}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const chartStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 145,
    paddingTop: 16,
    paddingBottom: 4,
  },
  col: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  amtLabel: { fontSize: 9, fontWeight: '700', color: colors.textSecondary, marginBottom: 4 },
  track: {
    width: 16,
    height: 94,
    backgroundColor: '#F7F5F0',
    borderRadius: 8,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E7E2D7',
  },
  fill: { width: '100%', borderRadius: 8 },
  dayLabel: { fontSize: 10, color: colors.textSecondary, marginTop: 6, fontWeight: '600' },
  dayLabelToday: { color: colors.gold.metallic, fontWeight: '800' },
});

// ─── Payment Breakdown Sub-component ─────────────────────────────────────────

interface PaymentBreakdownSectionProps {
  summary: ReturnType<typeof calculateReportSummary>;
  cashPercent: number;
  upiPercent: number;
  cardPercent: number;
  compact?: boolean;
}

function PaymentBreakdownSection({
  summary,
  cashPercent,
  upiPercent,
  cardPercent,
  compact,
}: PaymentBreakdownSectionProps) {
  return (
    <>
      <View style={payStyles.bar}>
        {cashPercent > 0 && <View style={[payStyles.barCash, { flex: cashPercent }]} />}
        {upiPercent > 0 && <View style={[payStyles.barUpi, { flex: upiPercent }]} />}
        {cardPercent > 0 && <View style={[payStyles.barCard, { flex: cardPercent }]} />}
      </View>
      <View style={[payStyles.row, compact && payStyles.rowCompact]}>
        <PaymentStat
          color="#059669"
          name="CASH"
          amount={summary.cashRevenue}
          pct={cashPercent}
          count={summary.cashCount}
          compact={compact}
        />
        <PaymentStat
          color="#2563EB"
          name="UPI"
          amount={summary.upiRevenue}
          pct={upiPercent}
          count={summary.upiCount}
          compact={compact}
        />
        <PaymentStat
          color="#7C3AED"
          name="CARD"
          amount={summary.cardRevenue}
          pct={cardPercent}
          count={summary.cardCount}
          compact={compact}
        />
      </View>
    </>
  );
}

function PaymentStat({
  color,
  name,
  amount,
  pct,
  count,
  compact,
}: {
  color: string;
  name: string;
  amount: number;
  pct: number;
  count: number;
  compact?: boolean;
}) {
  return (
    <View style={[payStyles.statCard, compact && payStyles.statCardCompact]}>
      <View style={[payStyles.dot, { backgroundColor: color }]} />
      <Text style={payStyles.statName}>{name}</Text>
      <Text style={payStyles.statAmount}>{formatCurrency(amount)}</Text>
      <Text style={payStyles.statPct}>
        {pct}% ({count} bills)
      </Text>
    </View>
  );
}

const payStyles = StyleSheet.create({
  bar: {
    height: 12,
    borderRadius: 6,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: spacing.md,
    backgroundColor: '#E7E2D7',
  },
  barCash: { backgroundColor: '#059669' },
  barUpi: { backgroundColor: '#2563EB' },
  barCard: { backgroundColor: '#7C3AED' },
  row: { flexDirection: 'row', gap: spacing.sm },
  rowCompact: { flexDirection: 'column', gap: spacing.xs },
  statCard: {
    flex: 1,
    backgroundColor: '#FAF9F6',
    borderRadius: 10,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: '#E7E2D7',
  },
  statCardCompact: {
    flex: undefined,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 8,
  },
  dot: { width: 10, height: 10, borderRadius: 5, marginBottom: 2 },
  statName: { fontSize: 11, fontWeight: '800', color: colors.textSecondary },
  statAmount: { fontSize: 14, fontWeight: '900', color: colors.textPrimary, marginVertical: 1 },
  statPct: { fontSize: 10, color: colors.textMuted },
});

// ─── Empty State Sub-component ───────────────────────────────────────────────

function EmptyState({ icon, title, text }: { icon: string; title?: string; text: string }) {
  return (
    <View style={emptyStyles.container}>
      <Text style={emptyStyles.icon}>{icon}</Text>
      {title ? <Text style={emptyStyles.title}>{title}</Text> : null}
      <Text style={emptyStyles.text}>{text}</Text>
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: spacing.xl },
  icon: { fontSize: 32, marginBottom: spacing.sm },
  title: { ...typography.heading, fontSize: 16, color: colors.textPrimary, marginBottom: 4 },
  text: {
    ...typography.body,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 320,
  },
});

// ─── Main Styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },

  // ── Top Bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  topBarTitle: {
    ...typography.heading,
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  topBarSubtitle: {
    ...typography.caption,
    fontSize: 11,
    color: '#92400E',
    fontWeight: '600',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#065F46',
    letterSpacing: 0.4,
  },
  goldIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pdfHeaderBtn: {
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  pdfHeaderBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  pdfHeaderBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#78350F',
  },
  refreshBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 65,
    alignItems: 'center',
  },
  refreshBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  closeBtn: {
    padding: 8,
    backgroundColor: colors.surfaceVariant,
    borderRadius: spacing.radiusMd,
    borderWidth: 1,
    borderColor: colors.border,
  },
  topBarPhone: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    gap: spacing.xs,
  },
  topBarLeftPhone: {
    gap: 8,
  },
  goldIconCirclePhone: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  topBarTitlePhone: {
    fontSize: 14,
  },
  topBarRightPhone: {
    gap: 5,
  },
  pdfHeaderBtnGradientPhone: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  refreshBtnPhone: {
    minWidth: 50,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },

  // ── Scroll
  scroll: { flex: 1, backgroundColor: colors.background },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  scrollContentTablet: {
    padding: spacing.lg,
    gap: spacing.lg,
    maxWidth: 1240,
    alignSelf: 'center',
    width: '100%',
  },

  // ── Loading / Error
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: spacing.md,
  },
  loadingText: {
    ...typography.body,
    fontSize: 14,
    color: colors.textMuted,
  },
  errorBanner: {
    backgroundColor: colors.dangerLight,
    padding: spacing.md,
    borderRadius: spacing.radiusMd,
    borderWidth: 1,
    borderColor: colors.danger,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  errorText: {
    fontSize: 13,
    color: colors.danger,
    fontWeight: '600',
    flex: 1,
  },
  retryBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: colors.danger,
    borderRadius: spacing.radiusSm,
  },
  retryBtnText: { fontSize: 11, fontWeight: '700', color: '#FFF' },

  // ── Hero Card (Obsidian with Gold Linear Gradient)
  heroCard: {
    borderRadius: 16,
    padding: spacing.lg,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#78350F',
  },
  heroCardTablet: {
    padding: spacing.xl,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroPreLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#FDE68A',
    marginBottom: 4,
  },
  heroAmount: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  heroAmountPhone: {
    fontSize: 27,
  },
  heroBadgePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroDivider: {
    height: 1,
    backgroundColor: 'rgba(253, 230, 138, 0.25)',
    marginVertical: spacing.md,
  },
  heroStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroStatsRowPhone: {
    flexWrap: 'wrap',
    rowGap: 10,
  },
  heroStatCol: { flex: 1 },
  heroStatColPhone: {
    width: '50%',
    flex: undefined,
  },
  heroStatLabel: {
    fontSize: 11,
    color: '#D6D3D1',
    marginBottom: 2,
    fontWeight: '600',
  },
  heroStatValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // ── KPI Grid
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  kpiGridTablet: {
    flexWrap: 'nowrap',
    gap: spacing.md,
  },

  // ── PDF Report Action Panel
  reportActionCard: {
    backgroundColor: '#FFFDF5',
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.md,
    elevation: 2,
    shadowColor: '#B45309',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  reportActionLeft: { flex: 1, minWidth: 240 },
  reportActionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#78350F',
    marginBottom: 2,
  },
  reportActionSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  reportActionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  goldReportButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  goldReportButtonGradient: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goldReportButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  outlineReportButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D97706',
    backgroundColor: '#FFFFFF',
  },
  outlineReportButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
  },

  // ── Tablet Two-Column Row
  twoColRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },

  // ── Section Cards
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // ── Custom Range Trigger Button
  customRangeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FAF9F6',
    borderWidth: 1,
    borderColor: '#E7E2D7',
  },
  customRangeBtnActive: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  customRangeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  customRangeBtnTextActive: {
    color: '#78350F',
    fontWeight: '800',
  },

  // ── Best Sellers Leaderboard
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F7F5F0',
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F7F5F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  rankBadgeGold: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
  },
  rankBadgeSilver: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: '#94A3B8',
  },
  rankBadgeBronze: {
    backgroundColor: '#FFEDD5',
    borderWidth: 1.5,
    borderColor: '#FB923C',
  },
  rankText: { fontSize: 11, fontWeight: '800', color: colors.textSecondary },
  rankTextGold: { color: '#B45309' },
  rankTextSilver: { color: '#475569' },
  rankTextBronze: { color: '#C2410C' },
  productInfo: { flex: 1 },
  productName: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  productCategory: { fontSize: 11, color: colors.textMuted },
  productSales: { alignItems: 'flex-end' },
  productQty: { fontSize: 12, fontWeight: '700', color: colors.textPrimary },
  productRevenue: { fontSize: 11, color: colors.price, fontWeight: '700' },

  // ── Bill Explorer
  filterPillsScroll: { marginBottom: spacing.sm },
  filterPillsContainer: { gap: spacing.xs, paddingVertical: spacing.xs },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: spacing.radiusFull,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterPillActive: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  filterPillText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  filterPillTextActive: { color: '#78350F', fontWeight: '800' },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceVariant,
    borderRadius: spacing.radiusMd,
    paddingHorizontal: spacing.md,
    height: spacing.inputHeight,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
    paddingVertical: 0,
  },

  billItemCard: {
    paddingVertical: spacing.sm,
    paddingHorizontal: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0ECE1',
    marginBottom: 8,
    gap: 8,
  },
  billItemMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  billCardActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F4',
  },
  billActionCustomerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFDF5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  billActionCustomerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },
  billCardRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  billActionPdfBtn: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  billActionPdfText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  billActionDeleteBtn: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  billItemLeft: { flex: 1 },
  billItemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  billItemNo: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  billItemTime: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  billItemCustomerPhone: { fontSize: 11, color: colors.textSecondary, marginTop: 1 },
  billItemProducts: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  customerPill: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  customerPillText: { fontSize: 10, fontWeight: '700', color: '#065F46' },

  billItemRight: { alignItems: 'flex-end', gap: 4 },
  billItemTotal: { fontSize: 14, fontWeight: '900', color: colors.textPrimary },
  billItemBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    backgroundColor: '#D1FAE5',
  },
  billItemBadgeUpi: { backgroundColor: '#DBEAFE' },
  billItemBadgeCard: { backgroundColor: '#EDE9FE' },
  billItemBadgeText: { fontSize: 9, fontWeight: '800', color: colors.textSecondary },

  moreResultsNote: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.md,
    fontStyle: 'italic',
  },

  // ── Custom Date Range Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(28, 25, 23, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 440,
    borderWidth: 1,
    borderColor: '#FDE68A',
    elevation: 8,
  },
  modalCardTablet: {
    maxWidth: 500,
    padding: spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modalBody: {
    gap: spacing.md,
    marginVertical: spacing.sm,
  },
  dateInputGroup: {
    gap: 4,
  },
  dateInputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#78350F',
    letterSpacing: 0.5,
  },
  dateTextInput: {
    height: 44,
    borderWidth: 1.5,
    borderColor: '#E7E2D7',
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: '#FAF9F6',
  },
  modalQuickRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 4,
  },
  quickModalBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 6,
    backgroundColor: '#F7F5F0',
    borderWidth: 1,
    borderColor: '#E7E2D7',
  },
  quickModalBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#78350F',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  modalApplyBtn: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  modalApplyBtnGradient: {
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  modalApplyText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});

export default SalesDashboard;
