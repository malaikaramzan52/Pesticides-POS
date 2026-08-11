import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  Printer, 
  Search, 
  X, 
  Calendar, 
  BookOpen, 
  Wallet, 
  ShoppingBag, 
  Scale, 
  ArrowDownRight, 
  ArrowUpRight, 
  TrendingUp, 
  TrendingDown, 
  RotateCcw,
  Boxes,
  Percent
} from 'lucide-react';
import DateFilterBar from './DateFilterBar';
import { isItemInDateRange } from '../utils/dateUtils';
import PrintHeader from './PrintHeader';
import { PRODUCTS, getStoredData } from '../utils/mockData';
import { useLanguage } from '../context/LanguageContext';

export default function CompanyLedgerModal({ company, invoices = [], onClose, selectedCity, setSelectedCity, cities = [] }) {
  const { t } = useLanguage();
  // Local date filter state initialized to All Time (can be adjusted inside modal)
  const [dateFilter, setDateFilter] = useState({ preset: 'All Time', startDate: '', endDate: '' });
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch POs from localStorage or fallback
  const purchaseOrders = useMemo(() => {
    return getStoredData('AGRO_ERP_PURCHASE_ORDERS', []);
  }, []);

  // Fetch Return records from localStorage or fallback
  const returnRecords = useMemo(() => {
    return getStoredData('AGRO_ERP_RETURN_RECORDS', []);
  }, []);

  // Link products belonging to this company
  const companyProducts = useMemo(() => {
    const targetCompId = (company._id || company.id || '').toString();
    const targetCompName = (company.name || '').toLowerCase().trim();
    return PRODUCTS.filter(p => {
      const pCompId = p.company_id?._id || p.company_id?.id || p.company_id || '';
      if (pCompId.toString() === targetCompId) return true;
      const pCompName = typeof p.company_id === 'object' ? p.company_id?.name : '';
      if (pCompName && pCompName.toLowerCase().trim() === targetCompName) return true;
      if (p.company_name && p.company_name.toLowerCase().trim() === targetCompName) return true;
      return false;
    });
  }, [company]);

  const companyProductIds = useMemo(() => new Set(companyProducts.map(p => (p._id || p.id || '').toString())), [companyProducts]);
  const companyProductNames = useMemo(() => new Set(companyProducts.map(p => (p.name || '').toLowerCase().trim())), [companyProducts]);

  // ─── Filtered Data sets ───────────────────────────────────────────────────────
  
  const filteredPurchases = useMemo(() => {
    return purchaseOrders.filter(po => {
      const isCompanyPO = po.supplier && po.supplier.toLowerCase().includes(company.name.toLowerCase());
      if (!isCompanyPO) return false;
      return isItemInDateRange(po.date, dateFilter.startDate, dateFilter.endDate);
    });
  }, [purchaseOrders, company, dateFilter]);

  const filteredSales = useMemo(() => {
    const rows = [];
    invoices.forEach(inv => {
      if (inv.status === 'Cancelled') return;
      if (!isItemInDateRange(inv.date, dateFilter.startDate, dateFilter.endDate)) return;
      
      const companyItems = (inv.items || inv.cart || []).filter(item => {
        const itemId = (item.product_id?._id || item.product_id || item.product_id?.id || '').toString();
        const itemName = (item.product_name || item.name || '').toLowerCase().trim();
        return companyProductIds.has(itemId) || (itemName && companyProductNames.has(itemName));
      });
      if (companyItems.length > 0) {
        rows.push({
          ...inv,
          companyItems
        });
      }
    });
    return rows;
  }, [invoices, companyProductIds, companyProductNames, dateFilter]);

  const filteredReturns = useMemo(() => {
    return returnRecords.filter(r => {
      if (r.type !== 'Purchase Return') return false;
      const isCompanyReturn = r.supplier && r.supplier.toLowerCase().includes(company.name.toLowerCase());
      if (!isCompanyReturn) return false;
      return isItemInDateRange(r.date, dateFilter.startDate, dateFilter.endDate);
    });
  }, [returnRecords, company, dateFilter]);

  // ─── Summary Calculations ────────────────────────────────────────────────────

  const uniqueProductsPurchased = useMemo(() => {
    const prodNames = new Set();
    filteredPurchases.filter(p => p.status === 'Received').forEach(po => {
      (po.items || []).forEach(item => {
        prodNames.add(item.name || item.product_name);
      });
    });
    return prodNames.size;
  }, [filteredPurchases]);

  const totalPurchaseQty = useMemo(() => {
    return filteredPurchases.filter(p => p.status === 'Received').reduce((sum, po) => {
      return sum + (po.items || []).reduce((s, item) => s + (parseInt(item.qty || item.quantity) || 0), 0);
    }, 0);
  }, [filteredPurchases]);

  const totalPurchaseAmount = useMemo(() => {
    return filteredPurchases.filter(p => p.status === 'Received').reduce((sum, po) => sum + (po.total || 0), 0);
  }, [filteredPurchases]);

  const uniqueProductsSold = useMemo(() => {
    const prodIds = new Set();
    filteredSales.forEach(inv => {
      inv.companyItems.forEach(item => {
        prodIds.add(item.product_id || item.product_name);
      });
    });
    return prodIds.size;
  }, [filteredSales]);

  const totalSalesQty = useMemo(() => {
    return filteredSales.reduce((sum, inv) => {
      return sum + inv.companyItems.reduce((s, item) => s + (parseInt(item.quantity || item.qty) || 0), 0);
    }, 0);
  }, [filteredSales]);

  const totalSalesAmount = useMemo(() => {
    return filteredSales.reduce((sum, inv) => {
      return sum + inv.companyItems.reduce((s, item) => s + (parseFloat(item.line_total || (item.quantity * item.price)) || 0), 0);
    }, 0);
  }, [filteredSales]);

  const currentStock = useMemo(() => {
    return companyProducts.reduce((sum, prod) => {
      return sum + (prod.batches || []).reduce((s, b) => s + (parseInt(b.stock_qty) || 0), 0);
    }, 0);
  }, [companyProducts]);

  const totalReturnsAmount = useMemo(() => {
    return filteredReturns.reduce((sum, r) => sum + (r.refund_total || r.total || 0), 0);
  }, [filteredReturns]);
  const returnsCount = filteredReturns.length;

  const lastPurchaseDate = useMemo(() => {
    const receivedPOs = filteredPurchases.filter(p => p.status === 'Received');
    if (receivedPOs.length === 0) return '—';
    const dates = receivedPOs.map(po => new Date(po.date));
    const maxDate = new Date(Math.max(...dates));
    return maxDate.toISOString().split('T')[0];
  }, [filteredPurchases]);

  const lastSaleDate = useMemo(() => {
    if (filteredSales.length === 0) return '—';
    const dates = filteredSales.map(inv => new Date(inv.date));
    const maxDate = new Date(Math.max(...dates));
    return maxDate.toISOString().split('T')[0];
  }, [filteredSales]);

  const netSummary = totalSalesAmount - totalPurchaseAmount;

  // ─── Transaction History Formatting ──────────────────────────────────────────

  const purchaseTransactions = useMemo(() => {
    return filteredPurchases.map(po => ({
      date: po.date,
      type: 'Purchase',
      ref_no: po.id,
      details: (po.items || []).map(i => `${i.name || i.product_name} (Qty: ${i.qty || i.quantity})`).join(', '),
      amount: -po.total,
      status: po.status
    }));
  }, [filteredPurchases]);

  const salesTransactions = useMemo(() => {
    return filteredSales.map(inv => {
      const amt = inv.companyItems.reduce((s, item) => s + (parseFloat(item.line_total || (item.quantity * item.price)) || 0), 0);
      return {
        date: inv.date,
        type: 'Sale',
        ref_no: inv.invoice_no,
        details: inv.companyItems.map(i => `${i.product_name || i.name} (Qty: ${i.quantity || i.qty})`).join(', '),
        amount: amt,
        status: inv.payment_status
      };
    });
  }, [filteredSales]);

  const returnTransactions = useMemo(() => {
    return filteredReturns.map(r => ({
      date: r.date,
      type: 'Purchase Return',
      ref_no: r.id,
      details: (r.items || []).map(i => `${i.name || i.product_name} (Qty: ${i.qty || i.quantity})`).join(', ') || r.product || 'Items Returned',
      amount: r.refund_total || r.total,
      status: r.status
    }));
  }, [filteredReturns]);

  const allTransactions = useMemo(() => {
    const list = [...purchaseTransactions, ...salesTransactions, ...returnTransactions];
    return list.sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [purchaseTransactions, salesTransactions, returnTransactions]);

  const filteredTransactions = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return allTransactions;
    return allTransactions.filter(t => 
      t.ref_no.toLowerCase().includes(q) ||
      t.type.toLowerCase().includes(q) ||
      t.details.toLowerCase().includes(q)
    );
  }, [allTransactions, searchQuery]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 print-wrapper">
      <div className="bg-white rounded-2xl w-full max-w-6xl border border-gray-200 shadow-2xl flex flex-col max-h-[90vh] printable-area overflow-hidden">
        
        {/* ── SCREEN VIEW HEADER ── */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center px-6 py-4 border-b border-gray-100 no-print gap-4">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-indigo-100 to-indigo-200 p-3 rounded-xl text-indigo-700 shadow-inner">
              <BookOpen size={24} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-gray-800 uppercase tracking-wider">{company.name} Ledger</h2>
              <p className="text-[10px] text-gray-500 font-bold uppercase mt-0.5 tracking-wider bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-150 w-fit">
                {company.company_type || 'Manufacturer'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer">
              <Printer size={14} /> Print Statement
            </button>
            <button onClick={onClose} className="p-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl transition cursor-pointer">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── PRINT VIEW EXACT LAYOUT ── */}
        <div className="hidden print:block p-8 font-sans text-[11px] text-black w-full">
          <PrintHeader title={`Company Ledger Statement: ${company.name}`} subtitle={`Store(s): Main Store`} dateRange={dateFilter.preset} />

          <div className="flex justify-between items-end mb-2 font-bold text-xs font-mono">
            <div className="w-1/2 text-left">{company.name} ({company.company_type || 'Manufacturer'})</div>
            <div className="w-1/2 text-right">Opening balance: &nbsp;&nbsp;&nbsp;&nbsp; Rs. 0.00</div>
          </div>

          <table className="w-full text-left border-collapse mb-1 font-mono">
            <thead>
              <tr className="border-y border-black font-bold">
                <th className="py-1.5 font-bold">Transaction date</th>
                <th className="py-1.5 font-bold">Store</th>
                <th className="py-1.5 font-bold">Type</th>
                <th className="py-1.5 font-bold">Document no.</th>
                <th className="py-1.5 font-bold">Details</th>
                <th className="py-1.5 font-bold text-right">Amount (Rs.)</th>
              </tr>
            </thead>
            <tbody>
              {allTransactions.map((row, idx) => {
                const isPurchase = row.type === 'Purchase';
                return (
                  <tr key={idx}>
                    <td className="py-1">{row.date}</td>
                    <td className="py-1">Main Store</td>
                    <td className="py-1">{row.type}</td>
                    <td className="py-1 font-mono">{row.ref_no}</td>
                    <td className="py-1 max-w-[220px] truncate">{row.details}</td>
                    <td className="py-1 text-right font-bold">
                      {isPurchase ? '-' : '+'}Rs. {Math.abs(row.amount).toLocaleString('en-US', {minimumFractionDigits: 2})}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="flex justify-end pt-1 border-t border-black font-mono">
            <div className="w-1/2 flex flex-col gap-0.5 pl-20 pr-1">
              <div className="flex justify-between">
                <span>Total Purchases:</span>
                <span>Rs. {totalPurchaseAmount.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Sales:</span>
                <span>Rs. {totalSalesAmount.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Returns:</span>
                <span>Rs. {totalReturnsAmount.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end mt-1 pt-1 border-b border-black font-bold mb-10 pb-1 font-mono">
            <div className="w-1/2 flex justify-between pl-20 pr-1 text-xs">
              <span>Closing Net position:</span>
              <span className={netSummary >= 0 ? 'text-green-700' : 'text-red-755'}>
                {netSummary >= 0 ? '+' : '-'}Rs. {Math.abs(netSummary).toLocaleString('en-US', {minimumFractionDigits: 2})}
              </span>
            </div>
          </div>
        </div>

        {/* ── SCREEN VIEW BODY ── */}
        <div className="p-6 overflow-y-auto no-print space-y-6 flex-1 bg-gray-50/50">
          
          {/* Date Filter Bar */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
            <DateFilterBar 
              dateFilter={dateFilter} 
              setDateFilter={setDateFilter} 
              selectedCity={selectedCity} 
              setSelectedCity={setSelectedCity} 
              cities={cities} 
            />
          </div>

          {/* Metrics Dashboard */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Purchases Card */}
            <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm relative overflow-hidden group hover:border-blue-200 transition-all duration-300">
              <div className="absolute -right-4 -top-4 p-4 opacity-[0.03] group-hover:scale-110 group-hover:opacity-10 transition-all duration-500 text-blue-600">
                <ShoppingBag size={80} />
              </div>
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner">
                  <ShoppingBag size={15} />
                </div>
                <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">Purchase History</span>
              </div>
              <span className="text-xl font-black text-gray-900 block mt-1">
                Rs. {totalPurchaseAmount.toLocaleString()}
              </span>
              <div className="text-[10px] text-gray-400 font-semibold mt-2 space-y-0.5">
                <div>Products: <strong className="text-gray-700">{uniqueProductsPurchased}</strong> unique</div>
                <div>Quantity: <strong className="text-gray-700">{totalPurchaseQty}</strong> items</div>
                <div>Last: <strong className="text-gray-700">{lastPurchaseDate}</strong></div>
              </div>
            </div>

            {/* Sales Card */}
            <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm relative overflow-hidden group hover:border-emerald-200 transition-all duration-300">
              <div className="absolute -right-4 -top-4 p-4 opacity-[0.03] group-hover:scale-110 group-hover:opacity-10 transition-all duration-500 text-emerald-600">
                <TrendingUp size={80} />
              </div>
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner">
                  <TrendingUp size={15} />
                </div>
                <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">Sales Revenue</span>
              </div>
              <span className="text-xl font-black text-gray-900 block mt-1">
                Rs. {totalSalesAmount.toLocaleString()}
              </span>
              <div className="text-[10px] text-gray-400 font-semibold mt-2 space-y-0.5">
                <div>Products: <strong className="text-gray-700">{uniqueProductsSold}</strong> unique</div>
                <div>Quantity: <strong className="text-gray-700">{totalSalesQty}</strong> sold</div>
                <div>Last: <strong className="text-gray-700">{lastSaleDate}</strong></div>
              </div>
            </div>

            {/* Stock & Returns Card */}
            <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm relative overflow-hidden group hover:border-amber-200 transition-all duration-300">
              <div className="absolute -right-4 -top-4 p-4 opacity-[0.03] group-hover:scale-110 group-hover:opacity-10 transition-all duration-500 text-amber-600">
                <Boxes size={80} />
              </div>
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shadow-inner">
                  <Boxes size={15} />
                </div>
                <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">Stock & Returns</span>
              </div>
              <span className="text-xl font-black text-gray-900 block mt-1">
                {currentStock.toLocaleString()} <span className="text-xs text-gray-400 font-bold uppercase">Units in Stock</span>
              </span>
              <div className="text-[10px] text-gray-400 font-semibold mt-2 space-y-0.5">
                <div>Returns Count: <strong className="text-gray-700">{returnsCount}</strong> cases</div>
                <div>Returned Amt: <strong className="text-gray-700">Rs. {totalReturnsAmount.toLocaleString()}</strong></div>
              </div>
            </div>

            {/* Net Balance Card */}
            <div className={`p-5 rounded-2xl shadow-sm relative overflow-hidden group transition-all duration-300 border ${
              netSummary >= 0 
                ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 hover:border-green-300' 
                : 'bg-gradient-to-br from-red-50 to-orange-50 border-red-200 hover:border-red-300'
            }`}>
              <div className={`absolute -right-4 -top-4 p-4 opacity-[0.03] group-hover:scale-110 group-hover:opacity-10 transition-all duration-500 ${netSummary >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {netSummary >= 0 ? <TrendingUp size={80} /> : <TrendingDown size={80} />}
              </div>
              <div className="flex items-center gap-2.5 mb-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-inner ${netSummary >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {netSummary >= 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
                </div>
                <span className={`text-[10px] font-extrabold uppercase tracking-wider ${netSummary >= 0 ? 'text-green-800' : 'text-red-800'}`}>Net Business Position</span>
              </div>
              <span className={`text-xl font-black block mt-1 ${netSummary >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                {netSummary >= 0 ? '+' : '-'} Rs. {Math.abs(netSummary).toLocaleString()}
              </span>
              <p className={`text-[10px] font-semibold mt-2 ${netSummary >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {netSummary >= 0 
                  ? 'Net Surplus (Sales revenue exceeds purchase rates)' 
                  : 'Net Deficit (Investments in purchases exceeds sales)'}
              </p>
            </div>

          </div>

          {/* Search & Transaction History */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="space-y-0.5">
                <h3 className="text-xs font-extrabold text-gray-800 uppercase tracking-wider">Transaction History Log</h3>
                <p className="text-[10px] text-gray-400 font-semibold">Consolidated ledger entries from purchases, sales and return modules</p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search Ref, Type, Details..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold text-gray-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition placeholder-gray-400"
                />
              </div>
            </div>

            <div className="overflow-x-auto border border-gray-100 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider border-b border-gray-200">
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Type</th>
                    <th className="py-2.5 px-4">Ref/Doc No</th>
                    <th className="py-2.5 px-4">Details</th>
                    <th className="py-2.5 px-4 text-right">Amount (Rs.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-gray-400 font-semibold">
                        No transactions found for the selected range.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((row, idx) => {
                      const isPurchase = row.type === 'Purchase';
                      const isReturn = row.type === 'Purchase Return';
                      return (
                        <tr key={idx} className="hover:bg-gray-50/60 transition font-medium">
                          <td className="py-3 px-4 text-gray-500">{row.date}</td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                              isPurchase ? 'bg-blue-100 text-blue-700 border-blue-200' :
                              isReturn ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                         'bg-green-100 text-green-700 border-green-200'
                            }`}>
                              {row.type}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-gray-700">{row.ref_no}</td>
                          <td className="py-3 px-4 text-gray-600 max-w-md truncate" title={row.details}>{row.details}</td>
                          <td className={`py-3 px-4 text-right font-bold text-sm ${isPurchase ? 'text-red-600' : 'text-green-600'}`}>
                            {isPurchase ? '-' : '+'} Rs. {Math.abs(row.amount).toLocaleString()}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center text-[10px] text-gray-400 font-semibold px-1 pt-2">
              <span>{filteredTransactions.length} of {allTransactions.length} transaction entries shown</span>
            </div>

          </div>

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
