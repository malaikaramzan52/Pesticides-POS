import React, { useState, useMemo } from 'react';
import DateFilterBar from './DateFilterBar';
import { isItemInDateRange } from '../utils/dateUtils';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  ChevronRight, 
  FileSpreadsheet, 
  Percent, 
  ShieldAlert,
  ShoppingBag,
  Boxes,
  TrendingDown,
  BookOpen,
  Wallet,
  Download,
  Printer,
  PackageCheck,
  AlertCircle
} from 'lucide-react';
import { PRODUCTS, COMPANIES, CATEGORIES, CUSTOMERS, getStoredData } from '../utils/mockData';
import { purchaseApi, reportApi, productApi, expenseApi } from '../api';
import LedgerScreen from './LedgerScreen';
import CashBookScreen from './CashBookScreen';
import { useLanguage } from '../context/LanguageContext';

// Helper to resolve customer city
const getCustomerCity = (custName) => {
  const cust = CUSTOMERS.find(c => c.name === custName);
  if (cust?.city) return cust.city;
  const addr = cust?.address || '';
  if (addr.includes('Bathinda')) return 'Bathinda';
  if (addr.includes('Karnal')) return 'Karnal';
  if (addr.includes('Sonipat')) return 'Sonipat';
  if (addr.includes('Anand')) return 'Anand';
  if (addr.includes('Ludhiana')) return 'Ludhiana';
  return '';
};

// Helper to resolve supplier city
const getSupplierCity = (supplierName) => {
  const name = (supplierName || '').toLowerCase();
  if (name.includes('syngenta')) return 'Multan';
  if (name.includes('bayer')) return 'Lahore';
  if (name.includes('upl')) return 'Khanewal';
  if (name.includes('iffco')) return 'Rahim Yar Khan';
  if (name.includes('coromandel')) return 'Sahiwal';
  if (name.includes('crystal')) return 'Gujranwala';
  return '';
};

// Helper to resolve company city
const getCompanyCity = (companyId) => {
  const co = COMPANIES.find(c => c.id === companyId);
  return co?.city || getSupplierCity(co?.name) || '';
};

export default function ReportsScreen({ invoices = [], expenses = [], defaultTab = 'sales', triggerNotificationToast, dateFilter, setDateFilter, selectedCity, setSelectedCity, cities = [] }) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = React.useState(defaultTab);
  const [livePOs, setLivePOs] = React.useState([]);
  const [liveProducts, setLiveProducts] = React.useState(PRODUCTS);
  const [liveExpenses, setLiveExpenses] = React.useState(expenses);

  React.useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  React.useEffect(() => {
    setLiveExpenses(expenses);
  }, [expenses]);

  React.useEffect(() => {
    const fetchReportsData = async () => {
      try {
        const [poRes, prodRes, expRes] = await Promise.all([
          purchaseApi.getAll().catch(() => []),
          productApi.getAll().catch(() => []),
          expenseApi.getAll().catch(() => [])
        ]);
        if (poRes && Array.isArray(poRes) && poRes.length > 0) setLivePOs(poRes);
        if (prodRes && Array.isArray(prodRes) && prodRes.length > 0) {
          setLiveProducts(prodRes);
        }
        if (expRes && Array.isArray(expRes) && expRes.length > 0) {
          setLiveExpenses(expRes);
        }
      } catch (e) {}
    };
    fetchReportsData();
  }, []);

  // Fetch POs & Returns from localStorage fallback
  const purchaseOrders = useMemo(() => {
    return livePOs.length > 0 ? livePOs : getStoredData('AGRO_ERP_PURCHASE_ORDERS', []);
  }, [livePOs]);

  const returnRecords = useMemo(() => {
    return getStoredData('AGRO_ERP_RETURN_RECORDS', []);
  }, []);

  // Filter helper based on the selected date filter
  const filterByDate = (dateStr) => {
    return isItemInDateRange(dateStr, dateFilter.startDate, dateFilter.endDate);
  };

  // Filter out cancelled sales and apply date and city filters
  const validInvoices = invoices.filter(i => {
    const matchesDate = filterByDate(i.date);
    const matchesCity = selectedCity === 'All' || getCustomerCity(i.customer_name) === selectedCity;
    return i.status !== 'Cancelled' && matchesDate && matchesCity;
  });

  // Math Computations for Sales Report
  const totalSales = validInvoices.reduce((sum, inv) => sum + inv.grand_total, 0);
  const totalDiscount = validInvoices.reduce((sum, inv) => sum + (inv.discount_amount || 0), 0);
  const totalTax = validInvoices.reduce((sum, inv) => sum + (inv.tax_amount || 0), 0);
  
  // Simulated COGS (Approx 72% of subtotal)
  const totalSub = validInvoices.reduce((sum, inv) => sum + (inv.subtotal || 0), 0);
  const estimatedCOGS = Math.round(totalSub * 0.72);
  const grossProfit = Math.round(totalSales - estimatedCOGS);
  const profitMargin = totalSales > 0 ? ((grossProfit / totalSales) * 100).toFixed(1) : 0;

  // Collection details (Only consider valid invoices for collections unless it's a refund, but we use CashBook for precise cash)
  const cashCollected = validInvoices.filter(i => i.payment_method === 'Cash').reduce((sum, i) => sum + (i.amount_paid !== undefined ? Number(i.amount_paid) : i.grand_total), 0);
  const bankCollected = validInvoices.filter(i => i.payment_method === 'Bank Transfer').reduce((sum, i) => sum + (i.amount_paid !== undefined ? Number(i.amount_paid) : i.grand_total), 0);
  const creditSales = validInvoices.filter(i => i.payment_status === 'Credit').reduce((sum, i) => sum + (i.remaining_amount || i.grand_total), 0);

  // Filter products by selected city (company's city)
  const filteredProducts = useMemo(() => {
    return liveProducts.filter(p => {
      const coCity = getCompanyCity(typeof p.company_id === 'object' ? (p.company_id?._id || p.company_id?.id) : p.company_id);
      return selectedCity === 'All' || !coCity || coCity.toLowerCase() === selectedCity.toLowerCase();
    });
  }, [selectedCity, liveProducts]);

  // Stock Report Computations — support both batched and flat stock_qty
  const getProductStock = (p) => {
    const batches = Array.isArray(p.batches) ? p.batches : [];
    if (batches.length > 0) return batches.reduce((s, b) => s + (Number(b.stock_qty) || 0), 0);
    return Number(p.stock_qty ?? p.total_stock ?? 0);
  };

  const totalStockQty = filteredProducts.reduce((acc, p) => acc + getProductStock(p), 0);

  const totalStockValueCost = filteredProducts.reduce((acc, p) => {
    const batches = Array.isArray(p.batches) ? p.batches : [];
    if (batches.length > 0) return acc + batches.reduce((bAcc, b) => bAcc + ((Number(b.stock_qty) || 0) * (Number(b.purchase_rate) || 0)), 0);
    return acc + (getProductStock(p) * (Number(p.purchase_price) || Number(p.dealer_price) || 0));
  }, 0);

  const totalStockValueRetail = filteredProducts.reduce((acc, p) => {
    const batches = Array.isArray(p.batches) ? p.batches : [];
    if (batches.length > 0) return acc + batches.reduce((bAcc, b) => bAcc + ((Number(b.stock_qty) || 0) * (Number(b.selling_rate) || 0)), 0);
    return acc + (getProductStock(p) * (Number(p.farmer_price) || Number(p.retail_price) || 0));
  }, 0);

  const lowStockItems = filteredProducts.filter(p => getProductStock(p) < (Number(p.min_stock) || 15));

  // Filter purchase orders by date range and selected city
  const validPurchases = useMemo(() => {
    return purchaseOrders.filter(po => {
      const poDate = po.date || po.createdAt;
      const matchesDate = isItemInDateRange(poDate, dateFilter.startDate, dateFilter.endDate);
      const matchesCity = !selectedCity || selectedCity === 'All' || (po.supplier_city || getSupplierCity(po.supplier)).toLowerCase() === selectedCity.toLowerCase();
      return po.status !== 'Cancelled' && matchesDate && matchesCity;
    });
  }, [purchaseOrders, dateFilter, selectedCity]);

  const totalProcurementValue = useMemo(() => {
    return validPurchases.reduce((sum, po) => sum + (Number(po.total) || 0), 0);
  }, [validPurchases]);

  const supplierBreakdown = useMemo(() => {
    const map = new Map();
    validPurchases.forEach(po => {
      const sName = po.supplier || po.company_name || 'Unknown Supplier';
      const key = sName.trim().toLowerCase();
      const existing = map.get(key) || { name: sName, ordersCount: 0, totalValue: 0, returnedValue: 0 };
      existing.ordersCount += 1;
      existing.totalValue += (Number(po.total) || 0);
      existing.returnedValue += (Number(po.total_returned_amount) || 0);
      map.set(key, existing);
    });
    return Array.from(map.values()).sort((a, b) => b.totalValue - a.totalValue);
  }, [validPurchases]);

  // Actual Purchase returns filtered by date and city
  const actualPurchaseReturns = useMemo(() => {
    const poReturnsTotal = validPurchases.reduce((sum, po) => sum + (Number(po.total_returned_amount) || 0), 0);
    const recReturnsTotal = returnRecords.filter(r => 
      r.type === 'Purchase Return' && 
      filterByDate(r.date) && 
      (!selectedCity || selectedCity === 'All' || getSupplierCity(r.supplier) === selectedCity)
    ).reduce((sum, r) => sum + (r.refund_total || r.total || r.amount || 0), 0);
    return Math.max(poReturnsTotal, recReturnsTotal);
  }, [validPurchases, returnRecords, dateFilter, selectedCity]);

  // Expenses for Expense Report — show all expenses (Paid + Pending) for full visibility
  const paidExpenses = liveExpenses.filter(e => {
    const statusMatch = !e.status || e.status === 'Paid' || e.status === 'paid';
    const dateMatch = filterByDate(e.date);
    return statusMatch && dateMatch;
  });
  const allDateFilteredExpenses = liveExpenses.filter(e => filterByDate(e.date));
  const actualExpensesTotal = allDateFilteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const netProfit = grossProfit - actualExpensesTotal;

  // Calculate expense category breakdown from all date-filtered expenses
  const categoryTotals = allDateFilteredExpenses.reduce((acc, curr) => {
    const cat = curr.category || 'Uncategorized';
    acc[cat] = (acc[cat] || 0) + (Number(curr.amount) || 0);
    return acc;
  }, {});
  
  const categoryBreakdown = Object.entries(categoryTotals)
    .map(([name, amt]) => ({
      name,
      amt,
      pct: actualExpensesTotal > 0 ? Math.round((amt / actualExpensesTotal) * 100) : 0
    }))
    .sort((a, b) => b.amt - a.amt);

  return (
    <div id="printable-report" className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6 animate-in fade-in duration-200">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div className="flex items-center space-x-3">
          <div className="bg-green-100 p-2.5 rounded-xl text-green-700">
            <BarChart3 size={24} />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-gray-900 tracking-tight">Financial & Analytical Reports</h2>
            <p className="text-xs text-gray-500 font-medium">Comprehensive Sales, Purchase, Stock movement, and Expense audit statements</p>
          </div>
        </div>

        {activeTab !== 'cashbook' && (
          <div className="flex items-center space-x-2 no-print">
            <button
              onClick={() => window.print()}
              className="flex items-center space-x-1.5 px-3.5 py-2 border border-gray-300 text-gray-700 bg-white rounded-xl text-xs font-bold hover:bg-gray-50 transition cursor-pointer"
            >
              <Printer size={14} />
              <span>Print Report</span>
            </button>
          </div>
        )}
      </div>

      {/* Removed Tabs Navigation */}

      {/* Date Filter Bar */}
      <div className="no-print">
        <DateFilterBar 
          dateFilter={dateFilter} 
          setDateFilter={setDateFilter} 
          selectedCity={selectedCity} 
          setSelectedCity={setSelectedCity} 
          cities={cities} 
        />
      </div>


      {/* 1. SALES REPORT TAB */}
      {activeTab === 'sales' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Quick Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-green-50/70 border border-green-200 p-4 rounded-2xl">
              <span className="text-[10px] font-extrabold text-green-800 uppercase tracking-wider block">Gross Sales Revenue</span>
              <span className="text-2xl font-black text-green-900 mt-1 block">Rs. {totalSales.toLocaleString()}</span>
              <span className="text-[10px] text-gray-500 font-semibold mt-1 block">Taxes Collected: Rs. {totalTax.toLocaleString()}</span>
            </div>

            <div className="bg-gray-50 border border-gray-200 p-4 rounded-2xl">
              <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider block">Estimated COGS</span>
              <span className="text-2xl font-black text-gray-800 mt-1 block">Rs. {estimatedCOGS.toLocaleString()}</span>
              <span className="text-[10px] text-gray-500 font-semibold mt-1 block">Purchase Cost of Goods Sold</span>
            </div>

            <div className="bg-emerald-600 text-white p-4 rounded-2xl shadow-sm">
              <span className="text-[10px] font-extrabold text-emerald-100 uppercase tracking-wider block">Gross Profit</span>
              <span className="text-2xl font-black mt-1 block">Rs. {grossProfit.toLocaleString()}</span>
              <span className="text-xs font-bold bg-emerald-700 px-2.5 py-0.5 rounded-full inline-block mt-1">{profitMargin}% Profit Margin</span>
            </div>

            <div className="bg-gray-50 border border-gray-200 p-4 rounded-2xl">
              <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider block">Total Discounts</span>
              <span className="text-2xl font-black text-amber-600 mt-1 block">Rs. {totalDiscount.toLocaleString()}</span>
              <span className="text-[10px] text-gray-500 font-semibold mt-1 block">Offered to Farmers & Dealers</span>
            </div>
          </div>

          {/* Payment Mode Collection Breakdown */}
          <div className="border border-gray-200 rounded-2xl p-5 space-y-4">
            <span className="text-xs font-extrabold text-gray-800 uppercase tracking-wide block">Payment Method Summary</span>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200">
                <span className="text-gray-400 block font-semibold text-[10px] uppercase">Cash Collected</span>
                <span className="font-black text-gray-900 text-sm block mt-1">Rs. {cashCollected.toLocaleString()}</span>
              </div>
              <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200">
                <span className="text-gray-400 block font-semibold text-[10px] uppercase">Bank Transfer</span>
                <span className="font-black text-gray-900 text-sm block mt-1">Rs. {bankCollected.toLocaleString()}</span>
              </div>
              <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200">
                <span className="text-gray-400 block font-semibold text-[10px] uppercase">Cheque Clearing</span>
                <span className="font-black text-gray-900 text-sm block mt-1">Rs. 0</span>
              </div>
              <div className="bg-red-50 p-3.5 rounded-xl border border-red-200">
                <span className="text-red-500 block font-semibold text-[10px] uppercase">Credit Balance Receivable</span>
                <span className="font-black text-red-600 text-sm block mt-1">Rs. {creditSales.toLocaleString()}</span>
              </div>
            </div>
          </div>
          <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="bg-gray-50 px-4 py-3 border-b font-extrabold text-gray-700 uppercase tracking-wide text-xs">
              Recent Sales Transactions
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Invoice #</th>
                    <th className="py-2.5 px-4">Customer</th>
                    <th className="py-2.5 px-4 text-center">Payment</th>
                    <th className="py-2.5 px-4 text-right">Discount</th>
                    <th className="py-2.5 px-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {invoices.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-gray-400 font-medium">No sales recorded yet.</td>
                    </tr>
                  ) : (
                    invoices.slice().reverse().map((inv, idx) => (
                      <tr key={idx} className={`hover:bg-gray-50/50 transition ${inv.status === 'Cancelled' ? 'opacity-60 bg-red-50/20' : ''}`}>
                        <td className="py-2.5 px-4 font-medium text-gray-600">{inv.date}</td>
                        <td className="py-2.5 px-4 font-bold text-indigo-700">
                          {inv.invoice_no}
                          {inv.status === 'Cancelled' && (
                            <span className="ml-2 text-[9px] px-1.5 py-0.5 bg-red-100 text-red-600 rounded uppercase tracking-wider border border-red-200">Cancelled</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-gray-800">
                          {inv.customer_name}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                            inv.payment_method === 'Cash' ? 'bg-green-100 text-green-700 border-green-200' :
                            inv.payment_method === 'Bank Transfer' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                            inv.payment_method === 'Card' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                            inv.payment_method === 'Credit' ? 'bg-red-100 text-red-700 border-red-200' :
                            'bg-gray-100 text-gray-700 border-gray-200'
                          }`}>
                            {inv.payment_method || 'N/A'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right text-gray-500 font-medium">Rs. {(inv.discount_amount || 0).toLocaleString()}</td>
                        <td className="py-2.5 px-4 text-right font-black text-gray-900">Rs. {(inv.grand_total || 0).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. PURCHASE REPORT TAB */}
      {activeTab === 'purchase' && (
        <div className="space-y-6 animate-in fade-in duration-150 text-xs font-sans">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl">
              <span className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider block">Total Procurement Value</span>
              <span className="text-2xl font-black text-amber-900 mt-1 block">Rs. {totalProcurementValue.toLocaleString()}</span>
              <span className="text-[10px] text-amber-700 font-semibold">Stock Inward Purchases ({dateFilter.preset})</span>
            </div>

            <div className="bg-gray-50 border border-gray-200 p-4 rounded-2xl">
              <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider block">Procured Suppliers</span>
              <span className="text-2xl font-black text-gray-800 mt-1 block">{supplierBreakdown.length} Suppliers</span>
              <span className="text-[10px] text-gray-500 font-semibold">Active supplier manufacturers in range</span>
            </div>

            <div className="bg-gray-50 border border-gray-200 p-4 rounded-2xl">
              <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider block">Purchase Returns</span>
              <span className="text-2xl font-black text-red-600 mt-1 block">Rs. {actualPurchaseReturns.toLocaleString()}</span>
              <span className="text-[10px] text-gray-500 font-semibold">Damaged or Expiry Returns</span>
            </div>

            <div className="bg-green-50 border border-green-200 p-4 rounded-2xl">
              <span className="text-[10px] font-extrabold text-green-800 uppercase tracking-wider block">Net Procurement Value</span>
              <span className="text-2xl font-black text-green-900 mt-1 block">Rs. {Math.max(0, totalProcurementValue - actualPurchaseReturns).toLocaleString()}</span>
              <span className="text-[10px] text-green-700 font-semibold">Purchases minus Returns</span>
            </div>
          </div>

          {/* Supplier Breakdown Table */}
          <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="bg-gray-50 px-4 py-3 border-b font-extrabold text-gray-700 uppercase tracking-wide text-xs">
              Supplier-Wise Purchase Breakdown
            </div>
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-100 text-[10px] font-bold text-gray-500 uppercase">
                <tr>
                  <th className="py-2.5 px-4">Supplier Name</th>
                  <th className="py-2.5 px-4">Primary Category</th>
                  <th className="py-2.5 px-4 text-center">Orders Received</th>
                  <th className="py-2.5 px-4 text-right">Gross Purchase</th>
                  <th className="py-2.5 px-4 text-right">Returns</th>
                  <th className="py-2.5 px-4 text-right">Net Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {supplierBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-gray-400 font-medium">No purchase records found for this period.</td>
                  </tr>
                ) : (
                  supplierBreakdown.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="py-3 px-4 font-bold text-gray-800">{item.name}</td>
                      <td className="py-3 px-4 text-gray-500 font-medium">Agro Chemicals / Fertilizers</td>
                      <td className="py-3 px-4 text-center font-semibold">{item.ordersCount} Orders</td>
                      <td className="py-3 px-4 text-right font-bold text-gray-700">Rs. {item.totalValue.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right font-medium text-red-600">
                        {item.returnedValue > 0 ? `Rs. ${item.returnedValue.toLocaleString()}` : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-gray-900">
                        Rs. {(item.totalValue - item.returnedValue).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Recent Purchase Orders Transaction Log */}
          <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="bg-gray-50 px-4 py-3 border-b font-extrabold text-gray-700 uppercase tracking-wide text-xs">
              Recent Purchase Orders Transaction Log
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">PO #</th>
                    <th className="py-2.5 px-4">Supplier</th>
                    <th className="py-2.5 px-4 text-center">Inward Status</th>
                    <th className="py-2.5 px-4 text-center">Payment Mode</th>
                    <th className="py-2.5 px-4 text-right">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {validPurchases.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-gray-400 font-medium">No purchase transactions found.</td>
                    </tr>
                  ) : (
                    validPurchases.slice().reverse().map((po, idx) => (
                      <tr key={po._id || po.id || idx} className="hover:bg-gray-50/50 transition">
                        <td className="py-2.5 px-4 font-medium text-gray-600">{po.date || po.createdAt?.split('T')[0]}</td>
                        <td className="py-2.5 px-4 font-bold text-amber-700 font-mono">
                          {po.po_no || po.po_number || po.id}
                          {po.return_status && po.return_status !== 'None' && (
                            <span className="ml-2 text-[9px] px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded uppercase font-bold border border-orange-200">
                              {po.return_status} Return
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-gray-800">{po.supplier}</td>
                        <td className="py-2.5 px-4 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${
                            po.stock_inward_done ? 'bg-green-100 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {po.stock_inward_done ? 'Received' : po.status || 'Pending'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-center font-medium text-gray-600">
                          {po.payment_mode || po.payment_method || 'Credit'}
                        </td>
                        <td className="py-2.5 px-4 text-right font-black text-gray-900">
                          Rs. {(po.total || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. STOCK REPORT TAB */}
      {activeTab === 'stock' && (
        <div className="space-y-6 animate-in fade-in duration-150 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl">
              <span className="text-[10px] font-extrabold text-blue-800 uppercase tracking-wider block">Stock Valuation (Cost Price)</span>
              <span className="text-2xl font-black text-blue-900 mt-1 block">Rs. {totalStockValueCost.toLocaleString()}</span>
              <span className="text-[10px] text-blue-700 font-semibold">{totalStockQty} Total Units in Depot</span>
            </div>

            <div className="bg-green-50 border border-green-200 p-4 rounded-2xl">
              <span className="text-[10px] font-extrabold text-green-800 uppercase tracking-wider block">Stock Valuation (Retail Price)</span>
              <span className="text-2xl font-black text-green-900 mt-1 block">Rs. {totalStockValueRetail.toLocaleString()}</span>
              <span className="text-[10px] text-green-700 font-semibold">Expected Sales Turnover Value</span>
            </div>

            <div className="bg-red-50 border border-red-200 p-4 rounded-2xl">
              <span className="text-[10px] font-extrabold text-red-800 uppercase tracking-wider block">Low Stock Alert Items</span>
              <span className="text-2xl font-black text-red-600 mt-1 block">{lowStockItems.length} Products</span>
              <span className="text-[10px] text-red-600 font-semibold">Reorder recommended (&lt; 15 units)</span>
            </div>
          </div>

          {/* Stock Table */}
          <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="bg-gray-50 px-4 py-3 border-b font-extrabold text-gray-700 uppercase tracking-wide text-xs">
              Inventory Stock & Batch Details
            </div>
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-100 text-[10px] font-bold text-gray-500 uppercase">
                <tr>
                  <th className="py-2.5 px-4">Product Name</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4 text-center">Batches Count</th>
                  <th className="py-2.5 px-4 text-right">Available Qty</th>
                  <th className="py-2.5 px-4 text-right">Stock Valuation</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-gray-400 font-medium">No products found.</td>
                  </tr>
                ) : filteredProducts.map(p => {
                  const batches = Array.isArray(p.batches) ? p.batches : [];
                  const qty = batches.length > 0 ? batches.reduce((s, b) => s + (Number(b.stock_qty) || 0), 0) : Number(p.stock_qty ?? p.total_stock ?? 0);
                  const val = batches.length > 0 ? batches.reduce((s, b) => s + ((Number(b.stock_qty) || 0) * (Number(b.selling_rate) || 0)), 0) : (qty * (Number(p.farmer_price) || Number(p.retail_price) || 0));
                  const minStock = Number(p.min_stock) || 15;
                  const isLow = qty < minStock;
                  const catName = typeof p.category_id === 'object' ? (p.category_id?.name || '—') : (p.category_id || '—');
                  return (
                    <tr key={p._id || p.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 font-bold text-gray-900">{p.name}</td>
                      <td className="py-3 px-4 text-gray-500 font-medium">{catName}</td>
                      <td className="py-3 px-4 text-center font-semibold">{batches.length || 0}</td>
                      <td className="py-3 px-4 text-right font-extrabold text-gray-800">{qty}</td>
                      <td className="py-3 px-4 text-right font-black text-gray-900">Rs. {val.toLocaleString()}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                          qty === 0 ? 'bg-red-100 text-red-700 border-red-200' :
                          isLow ? 'bg-amber-100 text-amber-700 border-amber-200' :
                          'bg-green-100 text-green-700 border-green-200'
                        }`}>
                          {qty === 0 ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. EXPENSE REPORT TAB */}
      {activeTab === 'expense' && (
        <div className="space-y-6 animate-in fade-in duration-150 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-red-50 border border-red-200 p-4 rounded-2xl">
              <span className="text-[10px] font-extrabold text-red-800 uppercase tracking-wider block">Total Recorded Expenses</span>
              <span className="text-2xl font-black text-red-900 mt-1 block">Rs. {actualExpensesTotal.toLocaleString()}</span>
              <span className="text-[10px] text-red-700 font-semibold">Total Paid Operational Expenses</span>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl">
              <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider block">Gross Profit</span>
              <span className="text-2xl font-black text-emerald-900 mt-1 block">Rs. {grossProfit.toLocaleString()}</span>
              <span className="text-[10px] text-emerald-700 font-semibold">Sales Revenue - COGS</span>
            </div>

            <div className="bg-gray-900 text-white p-4 rounded-2xl shadow-md">
              <span className="text-[10px] font-extrabold text-gray-300 uppercase tracking-wider block">Net Income (Bottom Line)</span>
              <span className="text-2xl font-black mt-1 block">Rs. {netProfit.toLocaleString()}</span>
              <span className="text-[10px] text-gray-400 font-semibold">Gross Profit - Total Operational Expenses</span>
            </div>
          </div>

          <div className="border border-gray-200 rounded-2xl p-5 space-y-4">
            <span className="text-xs font-extrabold text-gray-800 uppercase tracking-wide block">Category-Wise Expense Distribution</span>
            <div className="space-y-3">
              {categoryBreakdown.length === 0 ? (
                <div className="text-center text-gray-500 py-4 font-semibold">No paid expenses recorded yet.</div>
              ) : (
                categoryBreakdown.map(item => (
                  <div key={item.name} className="space-y-1">
                    <div className="flex justify-between items-center text-gray-700">
                      <span className="font-bold">{item.name}</span>
                      <span className="font-black text-gray-900">Rs. {item.amt.toLocaleString()} ({item.pct}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-red-500 h-full rounded-full" style={{ width: `${item.pct}%` }}></div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. CUSTOMER LEDGER TAB */}
      {activeTab === 'ledger' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <LedgerScreen invoices={invoices.filter(i => filterByDate(i.date))} />
        </div>
      )}

      {/* 6. CASH BOOK TAB */}
      {activeTab === 'cashbook' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <CashBookScreen invoices={validInvoices} expenses={expenses.filter(e => filterByDate(e.date))} triggerNotificationToast={triggerNotificationToast} />
        </div>
      )}

    </div>
  );
}
