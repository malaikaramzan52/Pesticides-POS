import React, { useState, useMemo } from 'react';
import {
  LayoutDashboard, Printer, Search, Download, RefreshCw,
  TrendingUp, TrendingDown, DollarSign, Scale,
  ChevronDown, ChevronRight, Building2, Package, Wallet,
  Users, Truck, AlertTriangle, CheckCircle2, FileSpreadsheet
} from 'lucide-react';
import DateFilterBar from './DateFilterBar';
import { isItemInDateRange } from '../utils/dateUtils';
import PrintHeader from './PrintHeader';
import { getStoredData, PRODUCTS, CUSTOMERS } from '../utils/mockData';
import { useLanguage } from '../context/LanguageContext';

// ── Number formatters ────────────────────────────────────────────────────────
const fmt  = (n) => Math.abs(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtS = (n) => (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── Main Balance Sheet Screen ────────────────────────────────────────────────
export default function BalanceSheetScreen({
  invoices = [],
  expenses = [],
  dateFilter, setDateFilter,
  selectedCity, setSelectedCity, cities = [],
  triggerNotificationToast
}) {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');

  const purchaseOrders = useMemo(() => getStoredData('AGRO_ERP_PURCHASE_ORDERS', []), []);
  const obConfig       = useMemo(() => getStoredData('AGRO_ERP_OPENING_BALANCE', { amount: 0, asOfDate: '' }), []);
  const products       = useMemo(() => getStoredData('AGRO_ERP_PRODUCTS', PRODUCTS), []);

  const periodStart = dateFilter.startDate || '';
  const periodEnd   = dateFilter.endDate   || '';

  const isInPeriod = (dateStr) => isItemInDateRange(dateStr, periodStart, periodEnd);

  // ── Compute all balance sheet values ────────────────────────────────────
  const bs = useMemo(() => {

    // ── ASSETS ──────────────────────────────────────────────────────────────

    // 1. Cash in Hand: cash payments received from sales in period - cash expenses paid
    const cashSalesReceipts = invoices
      .filter(inv => isInPeriod(inv.date) && inv.status !== 'Cancelled' && inv.payment_method === 'Cash')
      .reduce((s, inv) => s + (inv.paid_amount || 0), 0);
    const bankSalesReceipts = invoices
      .filter(inv => isInPeriod(inv.date) && inv.status !== 'Cancelled' && inv.payment_method === 'Bank Transfer')
      .reduce((s, inv) => s + (inv.paid_amount || 0), 0);
    const walletSalesReceipts = invoices
      .filter(inv => isInPeriod(inv.date) && inv.status !== 'Cancelled' && ['Mobile Wallet', 'Card'].includes(inv.payment_method))
      .reduce((s, inv) => s + (inv.paid_amount || 0), 0);
    const cashExpensesPaid = expenses
      .filter(exp => isInPeriod(exp.date) && exp.status === 'Paid' && exp.paymentMethod !== 'Bank Transfer')
      .reduce((s, exp) => s + (exp.amount || 0), 0);
    const bankExpensesPaid = expenses
      .filter(exp => isInPeriod(exp.date) && exp.status === 'Paid' && exp.paymentMethod === 'Bank Transfer')
      .reduce((s, exp) => s + (exp.amount || 0), 0);

    // Cash returns received (sale returns refunded in cash)
    const cashReturns = invoices
      .filter(inv => isInPeriod(inv.cancellation_details?.on || inv.date) && inv.status === 'Cancelled' && inv.refund_status === 'Refunded' && inv.payment_method === 'Cash')
      .reduce((s, inv) => s + (inv.grand_total || 0), 0);

    // Purchase payments out of cash
    const cashPurchasePaid = purchaseOrders
      .filter(po => isInPeriod(po.date) && po.status !== 'Cancelled' && po.payment_status === 'Paid')
      .reduce((s, po) => s + (po.total || 0), 0);

    const cashInHand = Math.max(0, cashSalesReceipts - cashExpensesPaid - cashReturns);
    const bankBalance = Math.max(0, bankSalesReceipts - bankExpensesPaid);
    const walletBalance = walletSalesReceipts;

    // 2. Accounts Receivable: credit sales unpaid
    const accountsReceivable = invoices
      .filter(inv => isInPeriod(inv.date) && inv.status !== 'Cancelled' && (inv.payment_status === 'Credit' || inv.payment_status === 'Partial'))
      .reduce((s, inv) => s + (inv.remaining_amount || 0), 0);

    // 3. Inventory Value: current stock × purchase_rate per batch
    const inventoryValue = products.reduce((total, prod) => {
      const stockVal = (prod.batches || []).reduce((s, b) => {
        const qty   = b.stock_qty || 0;
        const rate  = b.purchase_rate || prod.wholesale_price || 0;
        return s + qty * rate;
      }, 0);
      return total + stockVal;
    }, 0);

    // 4. Pre-paid expenses (pending expenses)
    const prepaidExpenses = expenses
      .filter(exp => isInPeriod(exp.date) && exp.status === 'Pending')
      .reduce((s, exp) => s + (exp.amount || 0), 0);

    // Opening Balance (initial OB from setup)
    const initialOB = obConfig.amount || 0;
    // Pre-period transactions for OB carry-forward
    const prePeriodNet = invoices
      .filter(inv => periodStart && inv.date < periodStart && inv.status !== 'Cancelled')
      .reduce((s, inv) => s + (inv.grand_total || 0), 0)
      - purchaseOrders
          .filter(po => periodStart && po.date < periodStart && po.status !== 'Cancelled')
          .reduce((s, po) => s + (po.total || 0), 0)
      - expenses
          .filter(exp => periodStart && exp.date < periodStart && exp.status === 'Paid')
          .reduce((s, exp) => s + (exp.amount || 0), 0);

    const obCarryForward = periodStart ? (initialOB + prePeriodNet) : initialOB;

    const totalAssets = cashInHand + bankBalance + walletBalance + accountsReceivable + inventoryValue + (obCarryForward > 0 ? obCarryForward : 0) + prepaidExpenses;

    // ── LIABILITIES ─────────────────────────────────────────────────────────

    // 1. Accounts Payable: purchases that are Credit or unpaid
    const accountsPayable = purchaseOrders
      .filter(po => isInPeriod(po.date) && po.status !== 'Cancelled' && (po.payment_status === 'Credit' || po.payment_status === 'Partial' || po.payment_status === 'Pending'))
      .reduce((s, po) => s + (po.total || 0), 0);

    // 2. Tax Payable (GST on sales in period)
    const taxPayable = invoices
      .filter(inv => isInPeriod(inv.date) && inv.status !== 'Cancelled')
      .reduce((s, inv) => s + (inv.tax_amount || 0), 0);

    // 3. Customer Advances (credit notes / returns pending refund)
    const customerAdvances = invoices
      .filter(inv => isInPeriod(inv.cancellation_details?.on || inv.date) && inv.status === 'Cancelled' && inv.refund_status === 'Pending')
      .reduce((s, inv) => s + (inv.grand_total || 0), 0);

    // 4. Accrued Expenses (pending/unpaid expenses)
    const accruedExpenses = expenses
      .filter(exp => isInPeriod(exp.date) && exp.status === 'Pending')
      .reduce((s, exp) => s + (exp.amount || 0), 0);

    const totalLiabilities = accountsPayable + taxPayable + customerAdvances + accruedExpenses;

    // ── EQUITY / NET POSITION ────────────────────────────────────────────────

    // Revenue (gross sales in period)
    const grossRevenue = invoices
      .filter(inv => isInPeriod(inv.date) && inv.status !== 'Cancelled')
      .reduce((s, inv) => s + (inv.subtotal || 0), 0);

    // Sales Discount
    const salesDiscount = invoices
      .filter(inv => isInPeriod(inv.date) && inv.status !== 'Cancelled')
      .reduce((s, inv) => s + (inv.discount_amount || 0) + (inv.bill_discount || 0), 0);

    const netRevenue = grossRevenue - salesDiscount;

    // Cost of Goods Sold (estimated from invoice totals minus tax)
    const cogs = invoices
      .filter(inv => isInPeriod(inv.date) && inv.status !== 'Cancelled')
      .reduce((s, inv) => {
        const items = inv.items || [];
        return s + items.reduce((is, it) => {
          const prod = products.find(p => p.id === it.product_id);
          const avgPurchaseRate = (prod?.batches || []).reduce((bs, b) => bs + (b.purchase_rate || 0), 0) / Math.max(1, (prod?.batches || []).length);
          return is + (it.quantity || 0) * avgPurchaseRate;
        }, 0);
      }, 0);

    const grossProfit = netRevenue - cogs;

    // Total Expenses
    const totalExpensesPaid = expenses
      .filter(exp => isInPeriod(exp.date) && exp.status === 'Paid')
      .reduce((s, exp) => s + (exp.amount || 0), 0);

    // Sales Returns
    const salesReturns = invoices
      .filter(inv => isInPeriod(inv.cancellation_details?.on || inv.date) && inv.status === 'Cancelled')
      .reduce((s, inv) => s + (inv.grand_total || 0), 0);

    const netIncome = grossProfit - totalExpensesPaid - salesReturns;
    const retainedEarnings = obCarryForward + netIncome;
    const ownersEquity = Math.max(0, obCarryForward > 0 ? obCarryForward : 0);
    const totalEquity = ownersEquity + netIncome;

    const netBalance = totalAssets - totalLiabilities;

    return {
      // Assets
      cashInHand, bankBalance, walletBalance,
      accountsReceivable, inventoryValue, prepaidExpenses, obCarryForward,
      totalAssets,
      // Liabilities (cleared for testing)
      accountsPayable: 0,
      taxPayable: 0,
      customerAdvances: 0,
      accruedExpenses: 0,
      totalLiabilities: 0,
      // Equity (cleared for testing)
      grossRevenue: 0,
      salesDiscount: 0,
      netRevenue: 0,
      cogs: 0,
      grossProfit: 0,
      totalExpensesPaid: 0,
      salesReturns: 0,
      netIncome: 0,
      ownersEquity: 0,
      totalEquity: 0,
      netBalance,
    };
  }, [invoices, expenses, purchaseOrders, products, obConfig, periodStart, periodEnd]);

  // ── Section item lists ───────────────────────────────────────────────────
  const assetItems = [
    ...(bs.obCarryForward > 0 ? [{ label: 'Opening Balance / Capital Brought Forward', amount: bs.obCarryForward, note: 'From General Ledger setup + pre-period net' }] : []),
    { label: 'Cash in Hand',          amount: bs.cashInHand,          note: 'Cash sales received − cash expenses' },
    { label: 'Bank Balance',           amount: bs.bankBalance,          note: 'Bank transfer receipts − bank expenses' },
    { label: 'Mobile Wallet / Card',   amount: bs.walletBalance,        note: 'Digital payment receipts' },
    { label: 'Accounts Receivable',    amount: bs.accountsReceivable,   note: 'Outstanding credit sales dues' },
    { label: 'Inventory Stock Value',  amount: bs.inventoryValue,       note: 'Current stock × purchase rate' },
    ...(bs.prepaidExpenses > 0 ? [{ label: 'Prepaid Expenses',   amount: bs.prepaidExpenses,   note: 'Pending expenses not yet paid' }] : []),
  ].filter(i => i.amount > 0);

  const liabilityItems = [
    { label: 'Accounts Payable',         amount: bs.accountsPayable,     note: 'Outstanding purchase orders' },
    { label: 'Tax Payable (GST)',         amount: bs.taxPayable,          note: 'GST collected on period sales' },
    ...(bs.customerAdvances > 0 ? [{ label: 'Customer Credit Notes / Refunds Due', amount: bs.customerAdvances, note: 'Refunds pending on cancelled sales' }] : []),
    ...(bs.accruedExpenses > 0 ? [{ label: 'Accrued Expenses',           amount: bs.accruedExpenses,     note: 'Approved but unpaid expenses' }] : []),
  ].filter(i => i.amount > 0);

  const equityItems = [
    ...(bs.ownersEquity > 0 ? [{ label: "Owner's Equity / Capital",     amount: bs.ownersEquity,        note: 'Opening balance capital' }] : []),
    { label: 'Gross Revenue',              amount: bs.grossRevenue,         note: 'Total sales before discounts' },
    ...(bs.salesDiscount > 0 ? [{ label: 'Less: Sales Discounts',       amount: -bs.salesDiscount,      note: 'Item + bill discounts given' }] : []),
    { label: 'Net Revenue',                amount: bs.netRevenue,           note: 'Revenue after all discounts' },
    ...(bs.cogs > 0 ? [{ label: 'Less: Cost of Goods Sold',             amount: -bs.cogs,               note: 'Avg purchase rate × qty sold' }] : []),
    { label: 'Gross Profit',               amount: bs.grossProfit,          note: 'Revenue − Cost of Goods' },
    ...(bs.totalExpensesPaid > 0 ? [{ label: 'Less: Operating Expenses', amount: -bs.totalExpensesPaid, note: 'All paid expenses in period' }] : []),
    ...(bs.salesReturns > 0 ? [{ label: 'Less: Sales Returns',          amount: -bs.salesReturns,       note: 'Cancelled / returned sales' }] : []),
    { label: 'Net Income (Profit/Loss)',   amount: bs.netIncome,            note: 'Gross Profit − Expenses − Returns' },
  ];

  // Prepare table rows for screen & print layout (combining assets on left, liabilities on right)
  const leftRows  = [
    ...assetItems,
    { label: '', amount: null, _spacer: true },
    { label: 'TOTAL ASSETS', amount: bs.totalAssets, _total: true },
  ];
  const rightRows = [
    { label: 'LIABILITIES', amount: null, _header: true },
    ...liabilityItems,
    { label: 'Total Liabilities', amount: bs.totalLiabilities, _subtotal: true },
    { label: '', amount: null, _spacer: true },
    { label: 'EQUITY & INCOME', amount: null, _header: true },
    ...equityItems,
    { label: 'Total Equity & Income', amount: bs.netIncome + bs.ownersEquity, _subtotal: true },
    { label: '', amount: null, _spacer: true },
    { label: 'NET BALANCE', amount: bs.netBalance, _total: true },
  ];
  const maxLen = Math.max(leftRows.length, rightRows.length);
  const rows = Array.from({ length: maxLen }, (_, i) => ({ left: leftRows[i], right: rightRows[i] }));


  // ── CSV Export ───────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    const csvRows = [
      ['Section', 'Account', 'Amount (Rs.)'],
      ...assetItems.map(i => ['ASSETS', i.label, i.amount.toFixed(2)]),
      ['ASSETS TOTAL', '', bs.totalAssets.toFixed(2)],
      ...liabilityItems.map(i => ['LIABILITIES', i.label, i.amount.toFixed(2)]),
      ['LIABILITIES TOTAL', '', bs.totalLiabilities.toFixed(2)],
      ...equityItems.map(i => ['EQUITY / INCOME', i.label, i.amount.toFixed(2)]),
      ['NET BALANCE', '', bs.netBalance.toFixed(2)],
    ];
    const csv = csvRows.map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `Balance_Sheet_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    if (triggerNotificationToast) triggerNotificationToast('CSV Exported', 'Balance Sheet downloaded as CSV.', 'success');
  };

  const renderTableCell = (item, isPrint = false, colorScheme = 'blue') => {
    if (!item) return null;
    if (item._spacer) return <div className="h-6"></div>;

    const theme = {
      blue: { 
        headerText: 'text-blue-500', line: 'bg-blue-200', 
        totalText: 'text-blue-800', totalAmt: 'text-blue-700', totalBorder: 'border-blue-200',
        subText: 'text-blue-700', subAmt: 'text-blue-900', subBorder: 'border-blue-100'
      },
      rose: { 
        headerText: 'text-rose-500', line: 'bg-rose-200', 
        totalText: 'text-rose-800', totalAmt: 'text-rose-700', totalBorder: 'border-rose-200',
        subText: 'text-rose-700', subAmt: 'text-rose-900', subBorder: 'border-rose-100'
      }
    }[colorScheme] || theme.blue;

    if (item._header) return (
      <div className={`font-black ${isPrint ? 'text-xs uppercase mt-4 mb-2' : `text-[11px] ${theme.headerText} uppercase tracking-widest mt-6 mb-3 flex items-center gap-2`}`}>
        {item.label}
        {!isPrint && <div className={`flex-1 h-px ${theme.line} opacity-50`}></div>}
      </div>
    );
    
    if (item._total) return (
      <div className={`flex justify-between items-center font-black mt-6 pt-4 border-t-2 ${isPrint ? 'border-black text-sm' : `${theme.totalBorder} text-sm`}`}>
        <span className={isPrint ? 'uppercase' : `${theme.totalText} uppercase tracking-wide`}>{item.label}</span>
        <span className={isPrint ? 'font-mono' : `${theme.totalAmt} font-mono text-base`}>Rs. {fmtS(item.amount)}</span>
      </div>
    );
    
    if (item._subtotal) return (
      <div className={`flex justify-between items-center font-extrabold mt-3 pt-3 border-t ${isPrint ? 'border-gray-500' : `${theme.subBorder} text-xs`}`}>
        <span className={isPrint ? '' : `${theme.subText} uppercase tracking-wider text-[10px]`}>{item.label}</span>
        <span className={isPrint ? 'font-mono' : `${theme.subAmt} font-mono text-sm`}>Rs. {fmtS(item.amount)}</span>
      </div>
    );
    
    return (
      <div className={`flex justify-between items-start py-1.5 ${isPrint ? 'text-xs' : 'text-sm'}`}>
        <div>
          <span className={`block font-bold ${isPrint ? '' : 'text-gray-700'}`}>{item.label}</span>
          {!isPrint && item.note && <span className="block text-[10px] text-gray-400 mt-0.5 font-medium">{item.note}</span>}
        </div>
        <span className={isPrint ? 'font-mono' : `font-mono font-black ${item.amount < 0 ? 'text-red-500' : 'text-gray-700'}`}>
          {item.amount < 0 ? '-' : ''}Rs. {fmt(item.amount)}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm no-print">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-violet-100 to-violet-200 p-3 rounded-xl text-violet-700 shadow-inner">
              <LayoutDashboard size={24} />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-gray-800 uppercase tracking-wider">Balance Sheet</h2>
              <p className="text-xs text-gray-500 font-medium">Auto-generated from Sales · Purchases · Inventory · Ledgers · Expenses</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <FileSpreadsheet size={13} /> Export CSV
            </button>
            <button
              onClick={() => { if (triggerNotificationToast) triggerNotificationToast('Print', 'Opening print window...', 'info'); setTimeout(() => window.print(), 200); }}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <Printer size={13} /> Print
            </button>
          </div>
        </div>
      </div>

      {/* ── Date Filter Bar ───────────────────────────────────────────────── */}
      <div className="no-print">
        <DateFilterBar
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          selectedCity={selectedCity}
          setSelectedCity={setSelectedCity}
          cities={cities}
        />
      </div>
      
      {/* ── Summary Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 no-print">
        <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-5 text-white shadow-lg shadow-blue-200">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-white/20 p-2 rounded-xl"><TrendingUp size={18} /></div>
            <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Total Assets</span>
          </div>
          <p className="text-2xl font-black font-mono">Rs. {fmtS(bs.totalAssets)}</p>
          <p className="text-[11px] opacity-70 mt-1 font-medium">Cash + Receivables + Inventory + Capital</p>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 p-5 text-white shadow-lg shadow-rose-200">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-white/20 p-2 rounded-xl"><TrendingDown size={18} /></div>
            <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Total Liabilities</span>
          </div>
          <p className="text-2xl font-black font-mono">Rs. {fmtS(bs.totalLiabilities)}</p>
          <p className="text-[11px] opacity-70 mt-1 font-medium">Payables + Tax Payable + Accruals</p>
        </div>

        <div className={`rounded-2xl p-5 text-white shadow-lg ${bs.netBalance >= 0 ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-emerald-200' : 'bg-gradient-to-br from-amber-500 to-amber-600 shadow-amber-200'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="bg-white/20 p-2 rounded-xl"><Scale size={18} /></div>
            <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Net Balance</span>
          </div>
          <p className="text-2xl font-black font-mono">{bs.netBalance < 0 ? '-' : ''}Rs. {fmt(bs.netBalance)}</p>
          <p className="text-[11px] opacity-70 mt-1 font-medium">Assets − Liabilities</p>
        </div>
      </div>

      {/* ── Balance check strip ──────────────────────────────────────────── */}
      <div className={`flex items-center gap-3 px-5 py-3 rounded-xl border text-xs font-semibold no-print ${
        Math.abs(bs.totalAssets - bs.totalLiabilities - bs.totalEquity) < 1
          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
          : 'bg-amber-50 border-amber-200 text-amber-800'
      }`}>
        {Math.abs(bs.totalAssets - bs.totalLiabilities - bs.totalEquity) < 1
          ? <><CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" /> Balance Sheet is balanced — Assets = Liabilities + Equity</>
          : <><AlertTriangle size={15} className="text-amber-500 flex-shrink-0" /> Difference detected. Ensure all transactions are recorded and Opening Balance is configured.</>
        }
      </div>

      {/* ── Screen UI: Enhanced 2-column view ────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 no-print">
          
        {/* Assets Side */}
        <div className="bg-gradient-to-b from-blue-50/50 to-white rounded-3xl border border-blue-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-blue-100 bg-blue-50/50">
            <h3 className="text-base font-black text-blue-800 uppercase tracking-widest flex items-center gap-3">
              <div className="p-2 bg-blue-600 text-white rounded-xl shadow-sm shadow-blue-200"><TrendingUp size={18} /></div>
              Assets
            </h3>
            <p className="text-[11px] text-blue-600/80 font-bold mt-2">Resources owned by the business</p>
          </div>
          <div className="p-6 flex-1">
            <div className="space-y-2">
              {rows.map((row, i) => (
                <div key={`left-${i}`} className="group hover:bg-blue-50/50 rounded-xl transition-colors px-2 -mx-2">
                  {renderTableCell(row.left, false, 'blue')}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Liabilities & Equity Side */}
        <div className="bg-gradient-to-b from-rose-50/50 to-white rounded-3xl border border-rose-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-rose-100 bg-rose-50/50">
            <h3 className="text-base font-black text-rose-800 uppercase tracking-widest flex items-center gap-3">
              <div className="p-2 bg-rose-600 text-white rounded-xl shadow-sm shadow-rose-200"><TrendingDown size={18} /></div>
              Liabilities & Equity
            </h3>
            <p className="text-[11px] text-rose-600/80 font-bold mt-2">Claims against the business resources</p>
          </div>
          <div className="p-6 flex-1">
            <div className="space-y-2">
              {rows.map((row, i) => (
                <div key={`right-${i}`} className="group hover:bg-rose-50/50 rounded-xl transition-colors px-2 -mx-2">
                  {renderTableCell(row.right, false, 'rose')}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Screen: Accounting Equation Footer */}
      <div className="mt-6 border-2 border-gray-100 bg-white p-5 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-center no-print">
        <div className="flex items-center gap-3 text-gray-500">
          <Scale size={20} className="text-gray-400" />
          <span className="text-xs font-black uppercase tracking-widest">
            Accounting Equation <span className="font-medium mx-2">•</span> Assets = Liabilities + Equity
          </span>
        </div>
        <div className="text-sm font-mono font-black text-gray-800 mt-3 md:mt-0 bg-gray-50 px-4 py-2 rounded-xl border border-gray-200">
          Rs. {fmtS(bs.totalAssets)} = Rs. {fmtS(bs.totalLiabilities)} + Rs. {fmtS(bs.netIncome + bs.ownersEquity)}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
           DEDICATED PRINT-ONLY BALANCE SHEET — Matches Ledger Style
          ════════════════════════════════════════════════════════════════════ */}
      <div className="hidden print:block p-8 font-sans text-[11px] text-black w-full printable-area">
        <PrintHeader title="Balance Sheet Statement" subtitle="Store(s): Main Store" />

        <div className="flex justify-between items-end mb-4 border-b border-black pb-2 font-mono">
          <div>
            <div className="text-sm font-bold">Financial Position</div>
            <div>Period: {periodStart || 'All Time'} to {periodEnd || new Date().toISOString().split('T')[0]}</div>
          </div>
          <div className="text-right">
            <div>As at: {new Date().toLocaleDateString('en-PK',{day:'2-digit',month:'long',year:'numeric'})}</div>
          </div>
        </div>

        <table className="w-full text-left border-collapse mb-1 font-mono align-top">
          <thead>
            <tr className="border-y border-black font-bold">
              <th className="py-2 font-bold w-1/2 border-r border-black pr-4 text-xs">ASSETS</th>
              <th className="py-2 font-bold w-1/2 pl-4 text-xs">LIABILITIES & EQUITY</th>
            </tr>
          </thead>
          <tbody>
            <tr className="align-top border-b border-black">
              <td className="py-4 border-r border-black pr-4">
                {rows.map((row, i) => (
                  <div key={`pleft-${i}`}>
                    {renderTableCell(row.left, true)}
                  </div>
                ))}
              </td>
              <td className="py-4 pl-4">
                {rows.map((row, i) => (
                  <div key={`pright-${i}`}>
                    {renderTableCell(row.right, true)}
                  </div>
                ))}
              </td>
            </tr>
          </tbody>
        </table>

        <div className="flex justify-end pt-1 font-mono mt-4">
          <div className="w-full flex flex-col gap-0.5">
            <div className="flex justify-between font-bold text-xs">
              <span>Accounting Equation: Assets = Liabilities + Equity</span>
              <span>Rs. {fmtS(bs.totalAssets)} = Rs. {fmtS(bs.totalLiabilities)} + Rs. {fmtS(bs.netIncome + bs.ownersEquity)}</span>
            </div>
          </div>
        </div>
        
        <div className="flex justify-between mt-20 pt-1 font-mono text-xs text-center w-full max-w-2xl mx-auto">
          <div className="w-1/3 border-t border-black pt-2">Prepared By</div>
          <div className="w-1/3 border-t border-black pt-2 mx-8">Reviewed By</div>
          <div className="w-1/3 border-t border-black pt-2">Authorized Signatory</div>
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-wrapper { position: absolute; left: 0; top: 0; width: 100%; height: 100%; background: transparent; z-index: 9999; }
          .printable-area, .printable-area * { visibility: visible !important; }
          .printable-area { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none; border: none; max-width: 100%; max-height: none; overflow: visible; }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
}
