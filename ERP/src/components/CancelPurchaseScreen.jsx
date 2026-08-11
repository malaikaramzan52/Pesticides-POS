import React, { useState, useMemo, useEffect } from 'react';
import { Search, Ban, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import { getStoredData, setStoredData, getWarehouseStock } from '../utils/mockData';
import { purchaseApi } from '../api';
import DateFilterBar from './DateFilterBar';
import { isItemInDateRange } from '../utils/dateUtils';
import { useLanguage } from '../context/LanguageContext';

export default function CancelPurchaseScreen({ currentUser, addAuditLog, triggerNotificationToast, dateFilter, setDateFilter }) {
  const { t } = useLanguage();
  const [poList, setPoList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [cancelModal, setCancelModal] = useState(null);
  const [viewDetailsModal, setViewDetailsModal] = useState(null);
  const [isReverseMode, setIsReverseMode] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [error, setError] = useState('');

  // Load POs on mount
  useEffect(() => {
    const fetchPOs = async () => {
      try {
        const data = await purchaseApi.getAll();
        if (data && Array.isArray(data) && data.length > 0) setPoList(data);
      } catch (e) {}
    };
    fetchPOs();
  }, []);

  const dateFilteredPOs = useMemo(() => {
    return poList.filter(po => isItemInDateRange(po.date, dateFilter.startDate, dateFilter.endDate));
  }, [poList, dateFilter]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return dateFilteredPOs.filter(po => {
      const poId = po.po_no || po.po_number || po.id || po._id || '';
      return (!q || poId.toLowerCase().includes(q) || (po.supplier || '').toLowerCase().includes(q));
    });
  }, [dateFilteredPOs, searchQuery]);

  const handleCancelClick = (po) => {
    if (po.status === 'Cancelled' || po.status === 'Returned') return;
    setCancelModal(po);
    setIsReverseMode(po.status === 'Received');
    setCancelReason('');
    setError('');
  };

  const handleConfirmCancel = () => {
    if (!cancelReason.trim()) {
      setError('Please enter a reason for cancellation.');
      return;
    }

    // 1. If PO was already received, deduct stock from main warehouse (Reverse Receipt)
    if (isReverseMode) {
      const currentStock = getWarehouseStock();
      let updatedStock = JSON.parse(JSON.stringify(currentStock));

      cancelModal.items.forEach(item => {
        const idx = updatedStock.findIndex(w => w.product_name && w.product_name.toLowerCase() === item.name.toLowerCase());
        if (idx >= 0) {
          const deductQty = item.qty;
          updatedStock[idx].warehouse_qty = Math.max(0, (updatedStock[idx].warehouse_qty || 0) - deductQty);
        }
      });
      setStoredData('AGRO_ERP_WAREHOUSE_STOCK', updatedStock);
    }

    // 2. Update PO status and save cancellation details
    const newStatus = isReverseMode ? 'Returned' : 'Cancelled';
    const cancellation_details = {
      by: currentUser ? currentUser.name : 'System User',
      on: new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }),
      reason: cancelReason,
      stock_reversed: isReverseMode
    };

    const targetId = cancelModal._id || cancelModal.id;
    try {
      purchaseApi.updateStatus(targetId, newStatus).catch(() => {});
    } catch (e) {}

    const updatedPoList = poList.map(p => 
      (p._id || p.id) === targetId ? { ...p, status: newStatus, cancellation_details } : p
    );
    setPoList(updatedPoList);
    setStoredData('AGRO_ERP_PURCHASE_ORDERS', updatedPoList);

    const poDisplayNum = cancelModal.po_no || cancelModal.po_number || cancelModal.id;

    if (addAuditLog) {
      addAuditLog(isReverseMode ? 'Reverse Receipt' : 'Cancel Purchase', `${isReverseMode ? 'Reversed' : 'Cancelled'} PO ${poDisplayNum}. Reason: ${cancelReason}`);
    }

    if (triggerNotificationToast) {
      triggerNotificationToast(isReverseMode ? 'Receipt Reversed' : 'Purchase Cancelled', `PO ${poDisplayNum} ${isReverseMode ? 'reversed' : 'cancelled'} successfully.`, 'success');
    }

    setCancelModal(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-black text-gray-900 tracking-tight">Cancel Purchase</h1>
          <p className="text-xs text-gray-400 mt-0.5 font-medium">Cancel an existing purchase order and automatically deduct reverted stock from Warehouse.</p>
        </div>
      </div>

      {/* Date Filter Bar */}
      <DateFilterBar dateFilter={dateFilter} setDateFilter={setDateFilter} />

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text" placeholder="Search PO # or supplier..."
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-800 focus:border-red-500 focus:ring-2 focus:ring-red-500/10 focus:outline-none transition"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-xs border-collapse">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">
              <th className="py-3 px-4 text-left">PO #</th>
              <th className="py-3 px-4 text-left">Supplier</th>
              <th className="py-3 px-4 text-left">Products</th>
              <th className="py-3 px-4 text-left hidden sm:table-cell">Date</th>
              <th className="py-3 px-4 text-right">Total (Rs.)</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((po, idx) => {
              const isActionDisabled = po.status === 'Cancelled' || po.status === 'Returned';
              const isReceived = po.status === 'Received';
              return (
                <tr key={po._id || po.id || po.po_no || `po_${idx}`} className="hover:bg-gray-50/60 transition">
                  <td className="py-3 px-4 font-mono font-bold text-gray-700 whitespace-nowrap">{po.po_no || po.po_number || po.id || 'PO-2026'}</td>
                  <td className="py-3 px-4 font-semibold text-gray-900 whitespace-nowrap">{po.supplier}</td>
                  <td className="py-3 px-4 text-left font-medium text-gray-800">
                    <div className="space-y-1">
                      {po.items?.map((it, idx) => (
                        <div key={idx} className="flex items-center space-x-1.5">
                          <span className="w-1 h-1 rounded-full bg-gray-400 shrink-0" />
                          <span className="font-bold text-gray-800 text-[11px] leading-tight">{it.name}</span>
                          <span className="text-[9px] text-gray-500 font-mono font-semibold bg-gray-100 px-1 rounded whitespace-nowrap">
                            x{it.qty}
                          </span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-medium text-gray-600 whitespace-nowrap hidden sm:table-cell">{po.date}</td>
                  <td className="py-3 px-4 text-right font-black text-gray-800 whitespace-nowrap">{po.total?.toLocaleString()}</td>
                  <td className="py-3 px-4 text-center">
                    {po.status === 'Cancelled' || po.status === 'Returned' ? (
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 border border-red-200 rounded-full text-[9px] font-bold">{po.status}</span>
                    ) : po.status === 'Received' ? (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 border border-green-200 rounded-full text-[9px] font-bold">Received</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 border border-blue-200 rounded-full text-[9px] font-bold">{po.status}</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {isActionDisabled ? (
                      <button
                        onClick={() => setViewDetailsModal(po)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold transition bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer"
                      >
                        View Details
                      </button>
                    ) : (
                      <button
                        onClick={() => handleCancelClick(po)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${isReceived ? 'bg-orange-50 text-orange-600 hover:bg-orange-600 hover:text-white border border-orange-200 hover:border-orange-600 cursor-pointer' : 'bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200 hover:border-red-600 cursor-pointer'}`}
                      >
                        {isReceived ? 'Reverse Receipt' : 'Cancel Purchase'}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="py-10 text-center text-gray-400">No purchase orders found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {cancelModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md border border-gray-200 shadow-2xl p-6">
            <h2 className="text-lg font-black text-gray-900 mb-2 flex items-center gap-2">
              <Ban className={isReverseMode ? "text-orange-500" : "text-red-500"} /> 
              {isReverseMode ? 'Reverse Receipt' : 'Cancel Purchase'} {cancelModal.po_no || cancelModal.po_number || cancelModal.id}
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              {isReverseMode 
                ? 'This action will reverse the receipt of this Purchase Order, deduct the items from Warehouse stock, and mark it as Returned. This cannot be undone.' 
                : 'This action will mark the Purchase Order as cancelled. No stock changes will be made. This cannot be undone.'}
            </p>
            {error && <div className="mb-4 text-xs font-bold text-red-600 bg-red-50 p-2 rounded-lg border border-red-200 flex items-center gap-1"><AlertTriangle size={12}/> {error}</div>}
            <div className="space-y-1 mb-5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Reason for Cancellation (Required)</label>
              <textarea
                rows={3}
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="Enter a reason..."
                className="w-full rounded-lg border border-red-300 p-3 text-xs focus:border-red-500 focus:ring-2 focus:ring-red-500/10 focus:outline-none transition resize-none"
              ></textarea>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setCancelModal(null)} className="px-4 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition cursor-pointer">Close</button>
              <button onClick={handleConfirmCancel} className={`px-4 py-2 text-xs font-bold text-white ${isReverseMode ? 'bg-orange-600 hover:bg-orange-700' : 'bg-red-600 hover:bg-red-700'} rounded-lg transition cursor-pointer`}>
                {isReverseMode ? 'Confirm Reverse' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewDetailsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl border border-gray-200 shadow-2xl flex flex-col max-h-[90vh]">
            <div className={`p-4 text-white rounded-t-2xl flex items-center justify-between ${viewDetailsModal.status === 'Returned' ? 'bg-orange-600' : 'bg-red-600'}`}>
              <h2 className="text-sm font-black flex items-center gap-2 uppercase tracking-wide">
                <FileText size={16} /> Cancellation Details
              </h2>
              <button onClick={() => setViewDetailsModal(null)} className="p-1 hover:bg-white/20 rounded-full transition cursor-pointer">
                <Ban size={18} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
              <div className="grid grid-cols-2 gap-6 bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div className="space-y-3">
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b pb-1 mb-2">Purchase Information</h3>
                  <div className="flex gap-2"><span className="w-32 whitespace-nowrap font-bold text-gray-500">Purchase Order :</span><span className="font-mono font-bold text-gray-900">{viewDetailsModal.po_no || viewDetailsModal.po_number || viewDetailsModal.id}</span></div>
                  <div className="flex gap-2"><span className="w-32 whitespace-nowrap font-bold text-gray-500">Supplier :</span><span className="font-semibold">{viewDetailsModal.supplier}</span></div>
                  <div className="flex gap-2"><span className="w-32 whitespace-nowrap font-bold text-gray-500">Purchase Date :</span><span>{viewDetailsModal.date}</span></div>
                  <div className="flex gap-2"><span className="w-32 whitespace-nowrap font-bold text-gray-500">Total Amount :</span><span className="font-black text-gray-800">Rs. {viewDetailsModal.total.toLocaleString()}</span></div>
                  <div className="flex gap-2"><span className="w-32 whitespace-nowrap font-bold text-gray-500">Status :</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${viewDetailsModal.status === 'Returned' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                      {viewDetailsModal.status}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 border-l pl-6">
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b pb-1 mb-2">Cancellation Information</h3>
                  <div className="flex gap-2"><span className="w-28 whitespace-nowrap font-bold text-gray-500">Cancelled By :</span><span className="font-bold text-gray-900">{viewDetailsModal.cancellation_details?.by || 'Unknown'}</span></div>
                  <div className="flex gap-2"><span className="w-28 whitespace-nowrap font-bold text-gray-500">Cancelled On :</span><span>{viewDetailsModal.cancellation_details?.on || 'N/A'}</span></div>
                  <div className="mt-3">
                    <span className="block font-bold text-gray-500 mb-1">Reason:</span>
                    <p className="text-gray-800 italic bg-white p-2 rounded border border-gray-200">"{viewDetailsModal.cancellation_details?.reason || 'No reason provided'}"</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Affected Products</h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-100 border-b border-gray-200">
                      <tr className="text-[10px] font-bold text-gray-500 text-left">
                        <th className="p-2">Product</th>
                        <th className="p-2 text-center">Qty</th>
                        <th className="p-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {viewDetailsModal.items.map((it, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="p-2 font-medium">{it.name}</td>
                          <td className="p-2 text-center">{it.qty}</td>
                          <td className="p-2 text-right font-semibold">Rs. {it.total.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t border-gray-200">
                      <tr>
                        <td colSpan={2} className="p-2 font-black text-right text-gray-600">Grand Total</td>
                        <td className="p-2 text-right font-black text-gray-900">Rs. {viewDetailsModal.total.toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className={`p-4 rounded-xl border ${viewDetailsModal.cancellation_details?.stock_reversed ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200'}`}>
                <span className={`block text-[10px] font-black uppercase mb-1 ${viewDetailsModal.cancellation_details?.stock_reversed ? 'text-orange-600' : 'text-blue-600'}`}>Inventory Impact</span>
                <p className="text-xs font-semibold text-gray-700">
                  {viewDetailsModal.cancellation_details?.stock_reversed 
                    ? `Yes - Stock was previously received. The quantities have been reversed and deducted from the Warehouse on ${viewDetailsModal.cancellation_details?.on}.` 
                    : 'No stock was added because the purchase was cancelled before receiving.'}
                </p>
              </div>

            </div>
            
            <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex justify-end">
              <button onClick={() => setViewDetailsModal(null)} className="px-5 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 rounded-lg transition cursor-pointer">
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
