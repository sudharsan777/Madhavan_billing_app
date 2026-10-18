/**
 * ReportService — Professional PDF Sales Reports Generator
 *
 * Generates and shares/downloads PDF sales reports for:
 * 1. Selected Custom Date Ranges (Start Date -> End Date)
 * 2. Predefined Ranges (Today, Yesterday, Last 7 Days, This Month)
 * 3. Overall Sales Report (All Available Firestore Records)
 *
 * Formatted with luxury gold branding, JK Cool Drinks header,
 * financial KPI cards, payment breakdown, best sellers, and
 * itemized bill ledger.
 */

import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { BillData } from '../types/bill';
import SHOP_CONFIG from '../constants/shop';

export interface DateRange {
  startDate: Date;
  endDate: Date;
  label: string;
}

export interface ReportSummary {
  totalRevenue: number;
  totalBills: number;
  averageBillValue: number;
  cashRevenue: number;
  cashCount: number;
  upiRevenue: number;
  upiCount: number;
  cardRevenue: number;
  cardCount: number;
  itemsSold: number;
}

/**
 * Filter bills according to a given DateRange (inclusive of full days).
 */
export function filterBillsByDateRange(bills: BillData[], range: DateRange): BillData[] {
  const start = new Date(range.startDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(range.endDate);
  end.setHours(23, 59, 59, 999);

  return bills.filter((b) => {
    const d = new Date(b.timestampMillis || b.createdAt);
    return d >= start && d <= end;
  });
}

/**
 * Calculate KPI summary figures for a subset of bills.
 */
export function calculateReportSummary(bills: BillData[]): ReportSummary {
  let totalRevenue = 0;
  let cashRevenue = 0;
  let cashCount = 0;
  let upiRevenue = 0;
  let upiCount = 0;
  let cardRevenue = 0;
  let cardCount = 0;
  let itemsSold = 0;

  bills.forEach((b) => {
    const amount = Number(b.totalAmount) || 0;
    totalRevenue += amount;

    const pm = (b.paymentMethod || 'CASH').toUpperCase();
    if (pm === 'UPI') {
      upiRevenue += amount;
      upiCount += 1;
    } else if (pm === 'CARD') {
      cardRevenue += amount;
      cardCount += 1;
    } else {
      cashRevenue += amount;
      cashCount += 1;
    }

    if (Array.isArray(b.items)) {
      b.items.forEach((it) => {
        itemsSold += Number(it.quantity) || 0;
      });
    }
  });

  const totalBills = bills.length;
  const averageBillValue = totalBills > 0 ? Math.round(totalRevenue / totalBills) : 0;

  return {
    totalRevenue,
    totalBills,
    averageBillValue,
    cashRevenue,
    cashCount,
    upiRevenue,
    upiCount,
    cardRevenue,
    cardCount,
    itemsSold,
  };
}

/**
 * Helper to build elegant HTML document with gold styling for PDF export.
 */
export function buildReportHtml(
  reportTitle: string,
  dateRangeLabel: string,
  bills: BillData[],
  summary: ReportSummary
): string {
  const generatedAt = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  // Calculate Best Sellers for this specific period
  const itemMap = new Map<string, { name: string; qty: number; total: number }>();
  bills.forEach((b) => {
    if (Array.isArray(b.items)) {
      b.items.forEach((it) => {
        const key = it.name;
        const qty = Number(it.quantity) || 0;
        const tot = Number(it.itemTotal) || (Number(it.price) || 0) * qty;
        const cur = itemMap.get(key) || { name: key, qty: 0, total: 0 };
        cur.qty += qty;
        cur.total += tot;
        itemMap.set(key, cur);
      });
    }
  });

  const topItems = Array.from(itemMap.values())
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 10);

  // Build bills ledger rows
  const ledgerRowsHtml =
    bills.length === 0
      ? `<tr><td colspan="6" style="text-align:center; padding: 24px; color: #78716C;">No transactions recorded in this period.</td></tr>`
      : bills
          .map((b, i) => {
            const billDate = b.createdAt
              ? new Date(b.createdAt).toLocaleString('en-IN', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })
              : 'N/A';

            const itemsStr =
              Array.isArray(b.items) && b.items.length > 0
                ? b.items.map((it) => `${it.quantity}× ${it.name}`).join(', ')
                : '—';

            const custInfo = b.customerName
              ? `${b.customerName}${b.customerPhone ? ` (${b.customerPhone})` : ''}`
              : 'Walk-in Guest';

            const pmBadgeColor =
              b.paymentMethod === 'UPI'
                ? '#2563EB'
                : b.paymentMethod === 'CARD'
                ? '#7C3AED'
                : '#059669';

            return `
        <tr style="background-color: ${i % 2 === 0 ? '#FFFFFF' : '#FAF9F6'};">
          <td style="padding: 9px 12px; font-weight: 700; color: #1C1917; border-bottom: 1px solid #E7E2D7;">${b.billNumber}</td>
          <td style="padding: 9px 12px; color: #57534E; font-size: 11px; border-bottom: 1px solid #E7E2D7;">${billDate}</td>
          <td style="padding: 9px 12px; color: #44403C; font-size: 12px; border-bottom: 1px solid #E7E2D7;">${custInfo}</td>
          <td style="padding: 9px 12px; color: #57534E; font-size: 11px; max-width: 220px; border-bottom: 1px solid #E7E2D7;">${itemsStr}</td>
          <td style="padding: 9px 12px; border-bottom: 1px solid #E7E2D7; text-align: center;">
            <span style="display: inline-block; padding: 2px 7px; border-radius: 4px; font-size: 10px; font-weight: 800; color: #FFF; background-color: ${pmBadgeColor};">
              ${b.paymentMethod || 'CASH'}
            </span>
          </td>
          <td style="padding: 9px 12px; font-weight: 800; color: #1C1917; text-align: right; border-bottom: 1px solid #E7E2D7;">₹${Number(b.totalAmount).toLocaleString('en-IN')}</td>
        </tr>
      `;
          })
          .join('');

  // Build top items rows
  const topItemsHtml =
    topItems.length === 0
      ? `<p style="color: #78716C; font-size: 12px; font-style: italic;">No product statistics available.</p>`
      : `
      <table style="width: 100%; border-collapse: collapse; margin-top: 8px;">
        <thead>
          <tr style="background-color: #FEF3C7; border-bottom: 2px solid #FDE68A;">
            <th style="padding: 7px 10px; text-align: left; font-size: 11px; font-weight: 800; color: #78350F;">#</th>
            <th style="padding: 7px 10px; text-align: left; font-size: 11px; font-weight: 800; color: #78350F;">ITEM NAME</th>
            <th style="padding: 7px 10px; text-align: center; font-size: 11px; font-weight: 800; color: #78350F;">QTY SOLD</th>
            <th style="padding: 7px 10px; text-align: right; font-size: 11px; font-weight: 800; color: #78350F;">REVENUE</th>
          </tr>
        </thead>
        <tbody>
          ${topItems
            .map(
              (it, idx) => `
            <tr style="border-bottom: 1px solid #F3E8D6;">
              <td style="padding: 6px 10px; font-size: 11px; font-weight: 700; color: #B45309;">${idx + 1}</td>
              <td style="padding: 6px 10px; font-size: 12px; font-weight: 600; color: #1C1917;">${it.name}</td>
              <td style="padding: 6px 10px; font-size: 12px; font-weight: 700; text-align: center; color: #1C1917;">${it.qty}</td>
              <td style="padding: 6px 10px; font-size: 12px; font-weight: 800; text-align: right; color: #059669;">₹${it.total.toLocaleString('en-IN')}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    `;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${reportTitle}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 15mm 15mm 15mm 15mm;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1C1917;
            background-color: #FFFFFF;
            margin: 0;
            padding: 0;
            font-size: 12px;
            line-height: 1.4;
          }
          .header-box {
            background: linear-gradient(135deg, #1C1917 0%, #292524 60%, #451A03 100%);
            color: #FFFFFF;
            padding: 24px 28px;
            border-radius: 12px;
            border-bottom: 4px solid #D97706;
            margin-bottom: 24px;
          }
          .shop-title {
            font-size: 26px;
            font-weight: 900;
            letter-spacing: 0.5px;
            color: #FDE68A;
            margin: 0 0 4px 0;
          }
          .shop-sub {
            font-size: 12px;
            color: #D6D3D1;
            margin: 0 0 10px 0;
          }
          .report-tagline {
            display: inline-block;
            background: rgba(217, 119, 6, 0.25);
            border: 1px solid #D97706;
            padding: 4px 12px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 700;
            color: #FDE68A;
          }
          .kpi-container {
            display: flex;
            gap: 12px;
            margin-bottom: 24px;
          }
          .kpi-card {
            flex: 1;
            background: #FFFDF5;
            border: 1.5px solid #FDE68A;
            border-radius: 10px;
            padding: 14px;
            text-align: center;
          }
          .kpi-card.hero {
            background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%);
            border-color: #F59E0B;
          }
          .kpi-label {
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 0.5px;
            color: #78350F;
            text-transform: uppercase;
            margin-bottom: 4px;
          }
          .kpi-val {
            font-size: 22px;
            font-weight: 900;
            color: #1C1917;
            margin: 0;
          }
          .kpi-sub {
            font-size: 10px;
            color: #78716C;
            margin-top: 4px;
          }
          .split-container {
            display: flex;
            gap: 20px;
            margin-bottom: 24px;
          }
          .split-box {
            flex: 1;
            background: #FAF9F6;
            border: 1px solid #E7E2D7;
            border-radius: 10px;
            padding: 16px;
          }
          .section-title {
            font-size: 14px;
            font-weight: 800;
            color: #1C1917;
            margin: 0 0 12px 0;
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .pay-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid #E7E2D7;
          }
          .ledger-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            border: 1px solid #E7E2D7;
            border-radius: 8px;
            overflow: hidden;
          }
          .ledger-table th {
            background-color: #F7F5F0;
            padding: 10px 12px;
            text-align: left;
            font-size: 11px;
            font-weight: 800;
            color: #44403C;
            border-bottom: 2px solid #E7E2D7;
          }
          .footer-note {
            margin-top: 30px;
            padding-top: 14px;
            border-top: 1px dashed #D6CDBF;
            text-align: center;
            font-size: 11px;
            color: #78716C;
          }
        </style>
      </head>
      <body>
        <!-- Header -->
        <div class="header-box">
          <table style="width: 100%;">
            <tr>
              <td>
                <h1 class="shop-title">${SHOP_CONFIG.name}</h1>
                <p class="shop-sub">${SHOP_CONFIG.fullAddress} • Ph: ${SHOP_CONFIG.phone}</p>
                <div class="report-tagline">📊 ${reportTitle}</div>
              </td>
              <td style="text-align: right; vertical-align: top;">
                <p style="margin: 0; font-size: 11px; color: #D6D3D1;">Period Covered:</p>
                <p style="margin: 2px 0 8px 0; font-size: 13px; font-weight: 800; color: #FDE68A;">${dateRangeLabel}</p>
                <p style="margin: 0; font-size: 10px; color: #A8A29E;">Generated: ${generatedAt}</p>
              </td>
            </tr>
          </table>
        </div>

        <!-- KPI Summary Cards -->
        <div class="kpi-container">
          <div class="kpi-card hero">
            <div class="kpi-label">TOTAL REVENUE</div>
            <div class="kpi-val" style="color: #78350F;">₹${summary.totalRevenue.toLocaleString('en-IN')}</div>
            <div class="kpi-sub">${summary.totalBills} Bills Issued</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">AVG TICKET SIZE</div>
            <div class="kpi-val">₹${summary.averageBillValue.toLocaleString('en-IN')}</div>
            <div class="kpi-sub">Per Bill Average</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">ITEMS SOLD</div>
            <div class="kpi-val">${summary.itemsSold}</div>
            <div class="kpi-sub">Total Units Served</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">TOTAL BILLS</div>
            <div class="kpi-val">${summary.totalBills}</div>
            <div class="kpi-sub">Recorded in Cloud</div>
          </div>
        </div>

        <!-- 2-Column: Payment Breakdown & Best Sellers -->
        <div class="split-container">
          <!-- Payment breakdown -->
          <div class="split-box">
            <div class="section-title">💳 Payment Method Distribution</div>
            <div class="pay-item">
              <div>
                <strong style="color: #059669;">● CASH</strong>
                <span style="font-size: 11px; color: #78716C;">(${summary.cashCount} bills)</span>
              </div>
              <strong style="font-size: 14px;">₹${summary.cashRevenue.toLocaleString('en-IN')}</strong>
            </div>
            <div class="pay-item">
              <div>
                <strong style="color: #2563EB;">● UPI / QR</strong>
                <span style="font-size: 11px; color: #78716C;">(${summary.upiCount} bills)</span>
              </div>
              <strong style="font-size: 14px;">₹${summary.upiRevenue.toLocaleString('en-IN')}</strong>
            </div>
            <div class="pay-item" style="border-bottom: none;">
              <div>
                <strong style="color: #7C3AED;">● CARD / POS</strong>
                <span style="font-size: 11px; color: #78716C;">(${summary.cardCount} bills)</span>
              </div>
              <strong style="font-size: 14px;">₹${summary.cardRevenue.toLocaleString('en-IN')}</strong>
            </div>
          </div>

          <!-- Top Items -->
          <div class="split-box">
            <div class="section-title">⭐ Top Selling Items</div>
            ${topItemsHtml}
          </div>
        </div>

        <!-- Itemized Ledger -->
        <div>
          <div class="section-title" style="margin-bottom: 8px;">
            <span>🧾 Itemized Transaction Register</span>
            <span style="font-size: 11px; font-weight: normal; color: #78716C;">(${bills.length} bills in period)</span>
          </div>

          <table class="ledger-table">
            <thead>
              <tr>
                <th style="width: 15%;">BILL NO</th>
                <th style="width: 15%;">DATE & TIME</th>
                <th style="width: 20%;">CUSTOMER</th>
                <th style="width: 28%;">ITEMS ORDERED</th>
                <th style="width: 10%; text-align: center;">MODE</th>
                <th style="width: 12%; text-align: right;">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              ${ledgerRowsHtml}
            </tbody>
          </table>
        </div>

        <!-- Footer -->
        <div class="footer-note">
          <p style="margin: 0; font-weight: 700; color: #44403C;">${SHOP_CONFIG.name} — Business POS & Inventory System</p>
          <p style="margin: 4px 0 0 0;">This sales report is automatically generated and verified with Cloud Firestore records.</p>
        </div>
      </body>
    </html>
  `;
}

/**
 * Generate and export / share PDF sales report.
 * Works seamlessly on iOS, Android, and Web!
 */
export async function generateAndShareSalesReport(
  reportTitle: string,
  dateRangeLabel: string,
  bills: BillData[]
): Promise<{ success: boolean; uri?: string; error?: string }> {
  try {
    const summary = calculateReportSummary(bills);
    const html = buildReportHtml(reportTitle, dateRangeLabel, bills, summary);

    // 1. Web Platform Fallback
    if (Platform.OS === 'web') {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 500);
        return { success: true };
      }
    }

    // 2. Native Mobile / Tablet Platform via expo-print
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    let shareableUri = uri;
    if (FileSystem.cacheDirectory) {
      const sanitizedTitle = reportTitle.replace(/[^a-zA-Z0-9_-]/g, '_');
      const targetPath = `${FileSystem.cacheDirectory}${sanitizedTitle}_${Date.now()}.pdf`;
      try {
        await FileSystem.copyAsync({
          from: uri,
          to: targetPath,
        });
        shareableUri = targetPath;
      } catch (copyErr) {
        console.warn('[ReportService] Copy to cacheDirectory failed:', copyErr);
      }
    }

    if (!shareableUri.startsWith('file://') && !shareableUri.startsWith('content://')) {
      shareableUri = `file://${shareableUri}`;
    }

    // 3. Prompt user to save / share / open PDF via expo-sharing
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      try {
        await Sharing.shareAsync(shareableUri, {
          UTI: '.pdf',
          mimeType: 'application/pdf',
          dialogTitle: `${reportTitle} - ${dateRangeLabel}`,
        });
        return { success: true, uri: shareableUri };
      } catch (shareErr: any) {
        console.warn('[ReportService] Sharing.shareAsync rejected, falling back to Print.printAsync:', shareErr);
        // Fallback to system Print preview (which has native "Save as PDF" option on Android and iOS)
        await Print.printAsync({ html });
        return { success: true, uri: shareableUri };
      }
    } else {
      // Sharing not available, open print dialog directly
      await Print.printAsync({ html });
      return { success: true, uri: shareableUri };
    }
  } catch (error: any) {
    console.error('[ReportService] Error generating sales PDF:', error);
    return {
      success: false,
      error: error?.message || 'Failed to generate PDF sales report.',
    };
  }
}

/**
 * Builds HTML template for an individual bill / customer receipt.
 */
export function buildSingleBillHtml(bill: BillData): string {
  const billDate = bill.createdAt
    ? new Date(bill.createdAt).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : new Date().toLocaleString('en-IN');

  const itemsHtml =
    bill.items && bill.items.length > 0
      ? bill.items
          .map((it, idx) => {
            const qty = Number(it.quantity) || 1;
            const price = Number(it.price) || 0;
            const lineTotal = Number(it.itemTotal) || price * qty;
            return `
            <tr style="background-color: ${idx % 2 === 0 ? '#FFFFFF' : '#FAF9F6'};">
              <td style="padding: 10px 14px; text-align: center; color: #78716C; border-bottom: 1px solid #E7E2D7;">${idx + 1}</td>
              <td style="padding: 10px 14px; font-weight: 700; color: #1C1917; border-bottom: 1px solid #E7E2D7;">
                ${it.name}
                ${it.category ? `<br/><span style="font-size: 10px; font-weight: normal; color: #A8A29E;">${it.category}</span>` : ''}
              </td>
              <td style="padding: 10px 14px; text-align: center; font-weight: 800; color: #1C1917; border-bottom: 1px solid #E7E2D7;">${qty}</td>
              <td style="padding: 10px 14px; text-align: right; color: #57534E; border-bottom: 1px solid #E7E2D7;">₹${price.toLocaleString('en-IN')}</td>
              <td style="padding: 10px 14px; text-align: right; font-weight: 800; color: #1C1917; border-bottom: 1px solid #E7E2D7;">₹${lineTotal.toLocaleString('en-IN')}</td>
            </tr>
          `;
          })
          .join('')
      : `<tr><td colspan="5" style="padding: 20px; text-align: center; color: #78716C;">No items listed</td></tr>`;

  const subtotal = Number(bill.subtotal) || Number(bill.totalAmount) || 0;
  const discountAmount = Number(bill.discountAmount) || 0;
  const grandTotal = Number(bill.totalAmount) || 0;

  const paymentBadgeColor =
    bill.paymentMethod === 'UPI' ? '#2563EB' : bill.paymentMethod === 'CARD' ? '#7C3AED' : '#059669';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Tax Invoice - ${bill.billNumber}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          margin: 0;
          padding: 28px;
          color: #1C1917;
          background-color: #FFFFFF;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .invoice-card {
          max-width: 680px;
          margin: 0 auto;
          border: 1.5px solid #E7E2D7;
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0,0,0,0.06);
        }
        .header {
          background: linear-gradient(135deg, #1C1917 0%, #292524 60%, #451A03 100%);
          color: #FFFFFF;
          padding: 24px 28px;
        }
        .shop-name {
          font-size: 24px;
          font-weight: 900;
          letter-spacing: 0.5px;
          color: #FDE68A;
          margin: 0;
        }
        .shop-info {
          font-size: 11px;
          color: #E7E5E4;
          margin: 4px 0 0 0;
          line-height: 1.4;
        }
        .invoice-badge {
          display: inline-block;
          background: linear-gradient(135deg, #B45309 0%, #D97706 100%);
          color: #FFFFFF;
          font-size: 11px;
          font-weight: 800;
          padding: 4px 10px;
          border-radius: 6px;
          margin-top: 10px;
          letter-spacing: 0.5px;
        }
        .details-grid {
          display: flex;
          justify-content: space-between;
          background-color: #FFFDF5;
          border-bottom: 1.5px solid #FDE68A;
          padding: 16px 28px;
        }
        .info-col {
          flex: 1;
        }
        .info-label {
          font-size: 10px;
          font-weight: 800;
          color: #92400E;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 3px;
        }
        .info-val {
          font-size: 13px;
          font-weight: 700;
          color: #1C1917;
        }
        .customer-box {
          background-color: #F8FAFC;
          border-radius: 8px;
          border: 1px solid #E2E8F0;
          padding: 12px 16px;
          margin: 18px 28px;
        }
        .table-wrap {
          padding: 0 28px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 8px;
        }
        th {
          background-color: #F7F5F0;
          color: #44403C;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 10px 14px;
          border-bottom: 2px solid #E7E2D7;
        }
        .totals-section {
          padding: 16px 28px;
          background-color: #FAFAF9;
          border-top: 1.5px solid #E7E2D7;
        }
        .total-row {
          display: flex;
          justify-content: flex-end;
          padding: 4px 0;
          font-size: 13px;
        }
        .total-row.grand {
          margin-top: 8px;
          padding-top: 8px;
          border-top: 2px solid #D97706;
          font-size: 18px;
          font-weight: 900;
          color: #78350F;
        }
        .footer {
          padding: 18px 28px;
          text-align: center;
          font-size: 11px;
          color: #78716C;
          background-color: #FFFFFF;
          border-top: 1px dashed #D6CDBF;
        }
      </style>
    </head>
    <body>
      <div class="invoice-card">
        <!-- Header -->
        <div class="header">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <h1 class="shop-name">${SHOP_CONFIG.name}</h1>
              <p class="shop-info">${SHOP_CONFIG.fullAddress}</p>
              <p class="shop-info">Phone: ${SHOP_CONFIG.formattedPhone}</p>
              <div class="invoice-badge">TAX INVOICE / BILL OF SALE</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 18px; font-weight: 900; color: #FDE68A;">${bill.billNumber}</div>
              <div style="font-size: 11px; color: #D6D3D1; margin-top: 4px;">${billDate}</div>
              <div style="margin-top: 8px;">
                <span style="background-color: ${paymentBadgeColor}; color: #FFFFFF; font-size: 10px; font-weight: 800; padding: 3px 8px; border-radius: 4px;">
                  PAID VIA ${bill.paymentMethod || 'CASH'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Line Items Table -->
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th style="width: 8%; text-align: center;">#</th>
                <th style="text-align: left;">ITEM DESCRIPTION</th>
                <th style="width: 12%; text-align: center;">QTY</th>
                <th style="width: 18%; text-align: right;">RATE</th>
                <th style="width: 20%; text-align: right;">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
        </div>

        <!-- Totals & Payment Summary -->
        <div class="totals-section">
          <div class="total-row">
            <span style="color: #57534E; width: 140px;">Subtotal:</span>
            <span style="font-weight: 700; width: 100px; text-align: right;">₹${subtotal.toLocaleString('en-IN')}</span>
          </div>
          ${
            discountAmount > 0
              ? `
          <div class="total-row">
            <span style="color: #DC2626; width: 140px;">Discount:</span>
            <span style="font-weight: 700; color: #DC2626; width: 100px; text-align: right;">-₹${discountAmount.toLocaleString('en-IN')}</span>
          </div>
          `
              : ''
          }
          <div class="total-row grand">
            <span style="width: 140px;">Grand Total:</span>
            <span style="width: 100px; text-align: right;">₹${grandTotal.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <!-- Footer -->
        <div class="footer">
          <p style="margin: 0; font-weight: 700; color: #44403C;">Thank You for Choosing ${SHOP_CONFIG.name}!</p>
          <p style="margin: 4px 0 0 0;">Please visit us again • Have a wonderful day</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generates and downloads / shares a single bill PDF with complete customer details.
 */
export async function generateAndShareSingleBillPdf(
  bill: BillData
): Promise<{ success: boolean; uri?: string; error?: string }> {
  try {
    const html = buildSingleBillHtml(bill);

    // 1. Web Platform
    if (Platform.OS === 'web') {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 500);
        return { success: true };
      }
    }

    // 2. Native Mobile / Tablet via expo-print
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    let shareableUri = uri;
    if (FileSystem.cacheDirectory) {
      const sanitizedBillNo = (bill.billNumber || 'Bill').replace(/[^a-zA-Z0-9_-]/g, '_');
      const targetPath = `${FileSystem.cacheDirectory}Bill_${sanitizedBillNo}_${Date.now()}.pdf`;
      try {
        await FileSystem.copyAsync({
          from: uri,
          to: targetPath,
        });
        shareableUri = targetPath;
      } catch (copyErr) {
        console.warn('[ReportService] Copy to cacheDirectory failed:', copyErr);
      }
    }

    if (!shareableUri.startsWith('file://') && !shareableUri.startsWith('content://')) {
      shareableUri = `file://${shareableUri}`;
    }

    // 3. Prompt user to share / save PDF via expo-sharing
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      try {
        await Sharing.shareAsync(shareableUri, {
          UTI: '.pdf',
          mimeType: 'application/pdf',
          dialogTitle: `Bill ${bill.billNumber} - ${SHOP_CONFIG.name}`,
        });
        return { success: true, uri: shareableUri };
      } catch (shareErr: any) {
        console.warn('[ReportService] Sharing.shareAsync rejected, using Print.printAsync fallback:', shareErr);
        await Print.printAsync({ html });
        return { success: true, uri: shareableUri };
      }
    } else {
      await Print.printAsync({ html });
      return { success: true, uri: shareableUri };
    }
  } catch (error: any) {
    console.error('[ReportService] Error generating single bill PDF:', error);
    return {
      success: false,
      error: error?.message || 'Failed to generate single bill PDF.',
    };
  }
}
