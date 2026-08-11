import React, { useState, useMemo, useEffect, useRef } from 'react';
import { X, Printer, Search, BookOpen, Calendar, ArrowRight } from 'lucide-react';
import { COMPANIES, CATEGORIES, getStoredData } from '../utils/mockData';
import { isItemInDateRange } from '../utils/dateUtils';
import DateFilterBar from './DateFilterBar';
import { useLanguage } from '../context/LanguageContext';
import PrintHeader from './PrintHeader';

export default function ProductLedgerModal({ product, onClose, triggerNotificationToast }) {
  const { t } = useLanguage();
  const [dateFilter, setDateFilter] = useState({ preset: 'All Time', startDate: '', endDate: '' });
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Fetch relevant records from LocalStorage
  const purchaseOrders = useMemo(() => getStoredData('AGRO_ERP_PURCHASE_ORDERS', []), []);
  const invoices = useMemo(() => getStoredData('AGRO_ERP_INVOICES', []), []);
  const returnRecords = useMemo(() => getStoredData('AGRO_ERP_RETURN_RECORDS', []), []);
  const movements = useMemo(() => getStoredData('AGRO_ERP_STOCK_MOVEMENTS', []), []);

  // Helpers
  const company = useMemo(() => COMPANIES.find(c => c.id === product.company_id), [product]);
  const category = useMemo(() => CATEGORIES.find(c => c.id === product.category_id), [product]);

  // Matching check helper (fuzzy matching names or matching product_id)
  const isProductMatch = (productId, itemName) => {
    if (productId && productId === product.id) return true;
    if (!itemName) return false;
    const target = product.name.toLowerCase();
    const current = itemName.toLowerCase();
    return target.includes(current) || current.includes(target) || target.split(' ')[0] === current.split(' ')[0];
  };

  // Compile Chronological Transaction Logs
  const ledgerLogs = useMemo(() => {
    const logs = [];

    // A. Purchases
    purchaseOrders.filter(po => po.status !== 'Cancelled').forEach(po => {
      (po.items || []).forEach(item => {
        if (isProductMatch(item.productId || item.product_id, item.name || item.product_name)) {
          logs.push({
            id: `po-${po.id}-${logs.length}`,
            date: po.date,
            type: 'Purchase',
            ref: po.id,
            partner: po.supplier || 'Supplier',
            qty: parseInt(item.qty) || 0,
            rate: parseFloat(item.cost || item.rate || 0),
            total: (parseInt(item.qty) || 0) * (parseFloat(item.cost || item.rate || 0))
          });
        }
      });
    });

    // B. Sales
    invoices.filter(inv => inv.status !== 'Cancelled').forEach(inv => {
      (inv.cart || inv.items || []).forEach(item => {
        if (isProductMatch(item.id || item.product_id || item.productId, item.name || item.product_name)) {
          const qty = parseInt(item.qty || item.quantity || 0);
          const rate = parseFloat(item.price || item.rate || 0);
          logs.push({
            id: `sale-${inv.invoice_no}-${logs.length}`,
            date: inv.date,
            type: 'Sale',
            ref: inv.invoice_no,
            partner: inv.customer_name || 'Customer',
            qty: -qty,
            rate: rate,
            total: qty * rate
          });
        }
      });
    });

    // C. Returns (Sales Return & Purchase Return)
    returnRecords.forEach(rec => {
      if (rec.type === 'Sales Return') {
        (rec.items || []).forEach(item => {
          if (isProductMatch(item.productId || item.product_id, item.name || item.product_name)) {
            const qty = parseInt(item.qty || item.quantity || 0);
            const rate = parseFloat(item.rate || item.price || 0);
            logs.push({
              id: `sr-${rec.id}-${logs.length}`,
              date: rec.date,
              type: 'Sales Return',
              ref: rec.invoice_no || rec.id,
              partner: rec.customer || 'Customer',
              qty: qty,
              rate: rate,
              total: qty * rate
            });
          }
        });
      } else if (rec.type === 'Purchase Return') {
        // Purchase Return might be bound directly
        if (isProductMatch(rec.product_id, rec.product)) {
          const qty = parseInt(rec.qty || 0);
          const rate = parseFloat(rec.rate || 0);
          logs.push({
            id: `pr-${rec.id}-${logs.length}`,
            date: rec.date,
            type: 'Purchase Return',
            ref: rec.id,
            partner: rec.supplier || 'Supplier',
            qty: -qty,
            rate: rate,
            total: qty * rate
          });
        }
      }
    });

    // D. Stock Movements & Manual Adjustments
    movements.forEach(mov => {
      if (isProductMatch(null, mov.product)) {
        const qty = parseInt(mov.qty || 0);
        logs.push({
          id: `mov-${mov.id}-${logs.length}`,
          date: mov.date,
          type: mov.type === 'Adjustment' ? 'Stock Adjustment' : mov.type,
          ref: mov.id,
          partner: mov.ref || 'Internal',
          qty: qty,
          rate: parseFloat(mov.rate || product.retail_price || 0),
          total: Math.abs(qty) * parseFloat(mov.rate || product.retail_price || 0)
        });
      }
    });

    // Sort ascending by date to compute running balance correctly
    logs.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Compute running balance
    let currentBal = 0;
    return logs.map(log => {
      currentBal += log.qty;
      return { ...log, balance: currentBal };
    });
  }, [purchaseOrders, invoices, returnRecords, movements, product]);

  // Dynamic Statistics
  const dateFilteredLogs = useMemo(() => {
    return ledgerLogs.filter(log => {
      const matchesDate = isItemInDateRange(log.date, dateFilter.startDate, dateFilter.endDate);
      const matchesSearch = !searchQuery || 
        log.ref.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.partner.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.type.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesDate && matchesSearch;
    });
  }, [ledgerLogs, dateFilter, searchQuery]);

  // Derived metrics from transaction history
  const totalPurchasedQty = useMemo(() => {
    return dateFilteredLogs.filter(log => log.type === 'Purchase' || (log.type === 'Stock In' && log.qty > 0))
                     .reduce((sum, log) => sum + Math.abs(log.qty), 0);
  }, [dateFilteredLogs]);

  const totalSoldQty = useMemo(() => {
    return dateFilteredLogs.filter(log => log.type === 'Sale' || (log.type === 'Stock Out' && log.qty < 0))
                     .reduce((sum, log) => sum + Math.abs(log.qty), 0);
  }, [dateFilteredLogs]);

  const lastPurchaseDate = useMemo(() => {
    const purchs = dateFilteredLogs.filter(log => log.type === 'Purchase');
    return purchs.length > 0 ? purchs[purchs.length - 1].date : '—';
  }, [dateFilteredLogs]);

  const lastSaleDate = useMemo(() => {
    const sales = dateFilteredLogs.filter(log => log.type === 'Sale');
    return sales.length > 0 ? sales[sales.length - 1].date : '—';
  }, [dateFilteredLogs]);

  const currentStock = useMemo(() => {
    if (ledgerLogs.length === 0) return 0;
    const endBound = dateFilter.endDate || '9999-12-31';
    
    // Sum all valid stock transactions up to the end date of the selected period
    return ledgerLogs
      .filter(log => log.date <= endBound)
      .reduce((sum, log) => sum + log.qty, 0);
  }, [ledgerLogs, dateFilter.endDate]);

  const purchaseRate = product.batches?.[0]?.purchase_rate || product.dealer_price || 0;
  const sellingRate = product.batches?.[0]?.selling_rate || product.retail_price || 0;
  const stockValue = currentStock > 0 ? currentStock * purchaseRate : 0;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 print-wrapper">
      <div className="bg-white rounded-2xl w-full max-w-4xl border border-gray-200 shadow-2xl flex flex-col max-h-[92vh] printable-area overflow-hidden">
        
        {/* Header Block (No Print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50 no-print flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-2 rounded-xl text-purple-700 shadow-xs">
              <BookOpen size={20} />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-gray-800 uppercase tracking-wider">Product Ledger</h2>
              <p className="text-[10px] text-gray-500 font-medium">Transaction log, receipts, and dynamic stock ledger for {product.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg text-xs transition cursor-pointer"
            >
              <Printer size={13} /> Print Statement
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 transition cursor-pointer">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Scrollable Container (No Print) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-print">
          
          {/* Screen Filters (No Print) */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] font-extrabold text-gray-500 uppercase tracking-wider mb-1">Search Logs</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input
                    type="text"
                    placeholder="Search by invoice #, customer/supplier name..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none placeholder-gray-450 transition"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[9px] font-extrabold text-gray-500 uppercase tracking-wider mb-1">Filter Timeline</label>
                <DateFilterBar dateFilter={dateFilter} setDateFilter={setDateFilter} />
              </div>
            </div>
          </div>

          {/* Product Profile & Summary Cards (No Print) */}
          <div className="bg-gradient-to-br from-purple-50/50 to-indigo-50/20 border border-purple-100 rounded-2xl p-5 shadow-xs">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-purple-100/50 mb-5">
              <div>
                <span className="text-[9px] uppercase font-black text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded">
                  Product Profile
                </span>
                <h3 className="text-sm font-black text-gray-900 mt-2">{product.name}</h3>
                <span className="block text-[10px] text-gray-500 mt-0.5 font-medium">SKU: {product.code} | Barcode: {product.barcode || 'N/A'}</span>
              </div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs">
                <div><span className="text-gray-400 font-bold">Category:</span> <span className="font-extrabold text-gray-800">{category?.name || '—'}</span></div>
                <div><span className="text-gray-400 font-bold">Brand:</span> <span className="font-extrabold text-gray-800">{company?.name || '—'}</span></div>
                <div><span className="text-gray-400 font-bold">Purchase Rate:</span> <span className="font-mono font-bold text-gray-800">Rs. {purchaseRate}</span></div>
                <div><span className="text-gray-400 font-bold">Selling Rate:</span> <span className="font-mono font-bold text-gray-800">Rs. {sellingRate}</span></div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
              {[
                { label: 'Total Purchases', val: `${totalPurchasedQty} Units`, desc: `Last: ${lastPurchaseDate}`, color: 'text-green-700' },
                { label: 'Total Sold', val: `${totalSoldQty} Units`, desc: `Last: ${lastSaleDate}`, color: 'text-red-700' },
                { label: 'Current Stock', val: `${currentStock} Units`, desc: 'From transaction logs', color: 'text-gray-800' },
                { label: 'Stock Valuation', val: `Rs. ${stockValue.toLocaleString()}`, desc: 'At purchase price', color: 'text-blue-700 font-mono' }
              ].map((card, idx) => (
                <div key={idx} className="bg-white border border-gray-150 rounded-xl p-3 shadow-xs">
                  <span className="block text-[8px] font-black text-gray-400 uppercase tracking-wider">{card.label}</span>
                  <span className={`block text-sm font-black mt-1 ${card.color}`}>{card.val}</span>
                  <span className="block text-[8px] text-gray-400 font-semibold mt-0.5 truncate">{card.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Transaction Table */}
          <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs">
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-2.5 flex justify-between items-center text-[10px] font-black uppercase text-gray-500 tracking-wider">
              <span>Date-Wise Ledger Entries</span>
              <span>{dateFilteredLogs.length} Records</span>
            </div>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100/80 border-b border-gray-200 text-[10px] font-black text-gray-500 uppercase tracking-wider font-mono">
                  <th className="py-2.5 px-4 w-28">Date</th>
                  <th className="py-2.5 px-4 w-32">Type</th>
                  <th className="py-2.5 px-4 w-28">Ref #</th>
                  <th className="py-2.5 px-4">Partner/Supplier</th>
                  <th className="py-2.5 px-4 text-right w-24">Price (Rs.)</th>
                  <th className="py-2.5 px-4 text-right w-24">In/Out (Qty)</th>
                  <th className="py-2.5 px-4 text-right w-28">Running Bal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 font-mono text-[11px]">
                {dateFilteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400 font-bold font-sans">No product transactions found in this period.</td>
                  </tr>
                ) : (
                  dateFilteredLogs.map((log) => {
                    const isInward = log.qty > 0;
                    const isReturn = log.type.includes('Return');
                    const isAdjustment = log.type.includes('Adjustment');
                    
                    let typeCls = 'text-green-700';
                    if (log.type === 'Sale' || log.type === 'Purchase Return' || (isAdjustment && log.qty < 0)) {
                      typeCls = 'text-red-600';
                    } else if (isAdjustment) {
                      typeCls = 'text-amber-600';
                    }

                    return (
                      <tr key={log.id} className="hover:bg-gray-50/50 align-middle">
                        <td className="py-2 px-4 text-gray-600 font-bold">{log.date}</td>
                        <td className="py-2 px-4 font-bold">
                          <span className={typeCls}>{log.type}</span>
                        </td>
                        <td className="py-2 px-4 font-bold text-blue-600 text-left">{log.ref}</td>
                        <td className="py-2 px-4 font-sans text-gray-700 font-semibold">{log.partner}</td>
                        <td className="py-2 px-4 text-right font-black text-gray-900">Rs. {log.rate.toLocaleString()}</td>
                        <td className={`py-2 px-4 text-right font-black ${isInward ? 'text-green-700' : 'text-red-600'}`}>
                          {isInward ? `+${log.qty}` : log.qty}
                        </td>
                        <td className="py-2 px-4 text-right font-black text-gray-900 bg-gray-50/30">
                          {log.balance}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

        </div>

        {/* ── PRINT VIEW EXACT LAYOUT (Print Only) ── */}
        <div className="hidden print:block p-8 font-sans text-[11px] text-black w-full">
          <PrintHeader title={`Product Ledger Statement: ${product.name}`} dateRange={dateFilter.preset} />
          
          <div className="flex justify-between items-end mb-4 border-b border-black pb-2 font-mono text-[10px]">
            <div>
              <div className="font-bold text-xs">{product.name}</div>
              <div>SKU: {product.code} | Barcode: {product.barcode || 'N/A'}</div>
              <div>Category: {category?.name || '—'} | Brand: {company?.name || '—'}</div>
            </div>
            <div className="text-right">
              <div><strong>Current Stock:</strong> {currentStock} Units</div>
              <div><strong>Purchase Rate:</strong> Rs. {purchaseRate.toLocaleString()}</div>
              <div><strong>Selling Rate:</strong> Rs. {sellingRate.toLocaleString()}</div>
              <div><strong>Stock Value:</strong> Rs. {stockValue.toLocaleString()}</div>
            </div>
          </div>

          <table className="w-full text-left border-collapse mb-1 font-mono">
            <thead>
              <tr className="border-y border-black font-bold">
                <th className="py-1.5 font-bold">Date</th>
                <th className="py-1.5 font-bold">Type</th>
                <th className="py-1.5 font-bold">Ref #</th>
                <th className="py-1.5 font-bold">Partner/Supplier</th>
                <th className="py-1.5 font-bold text-right">Price (Rs.)</th>
                <th className="py-1.5 font-bold text-right">In/Out Qty</th>
                <th className="py-1.5 font-bold text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {dateFilteredLogs.map((log, idx) => (
                <tr key={idx} className="border-b border-gray-100 last:border-b-0">
                  <td className="py-1">{log.date}</td>
                  <td className="py-1">{log.type}</td>
                  <td className="py-1">{log.ref}</td>
                  <td className="py-1">{log.partner}</td>
                  <td className="py-1 text-right">Rs. {log.rate.toLocaleString()}</td>
                  <td className="py-1 text-right">{log.qty > 0 ? `+${log.qty}` : log.qty}</td>
                  <td className="py-1 text-right font-bold">{log.balance}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end pt-1 border-t border-black font-mono mt-4">
            <div className="w-1/2 flex flex-col gap-0.5 pl-20 pr-1">
              <div className="flex justify-between">
                <span>Total Purchased Qty:</span>
                <span>{totalPurchasedQty} Units</span>
              </div>
              <div className="flex justify-between">
                <span>Total Sold Qty:</span>
                <span>{totalSoldQty} Units</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-1 pt-1 border-b border-black font-bold mb-10 pb-1 font-mono">
            <div className="w-1/2 flex justify-between pl-20 pr-1 text-xs">
              <span>Closing balance qty:</span>
              <span>{currentStock} Units</span>
            </div>
          </div>
        </div>

      </div>

      {/* Printing stylesheet styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-wrapper { position: absolute; left: 0; top: 0; width: 100%; height: 100%; background: transparent; z-index: 9999; }
          .printable-area, .printable-area * { visibility: visible !important; }
          .printable-area { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none; border: none; max-width: 100%; max-height: none; overflow: visible; padding: 0 !important; }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
}
