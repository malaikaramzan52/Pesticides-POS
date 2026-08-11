import React, { useState, useMemo } from 'react';
import { Search, Ban, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import { getWarehouseStock, setStoredData } from '../utils/mockData';
import { salesApi } from '../api';
import PaymentProcessor from './PaymentProcessor';
import DateFilterBar from './DateFilterBar';
import { isItemInDateRange } from '../utils/dateUtils';
import { useLanguage } from '../context/LanguageContext';

export default function CancelSaleScreen({ currentUser, invoices, setInvoices, addAuditLog, triggerNotificationToast, dateFilter, setDateFilter }) {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [cancelModal, setCancelModal] = useState(null);
  const [viewDetailsModal, setViewDetailsModal] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [error, setError] = useState('');

  // Refund states
  const [refundMode, setRefundMode] = useState(''); // 'now' or 'later'
  const [refundMethod, setRefundMethod] = useState('Cash');
  const [paymentDetails, setPaymentDetails] = useState({});
  const [refundAmount, setRefundAmount] = useState('');

  // Process pending refund states
  const [showProcessRefund, setShowProcessRefund] = useState(false);

  const dateFilteredInvoices = useMemo(() => {
    return invoices.filter(inv => isItemInDateRange(inv.date, dateFilter.startDate, dateFilter.endDate));
  }, [invoices, dateFilter]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return dateFilteredInvoices.filter(inv =>
      (!q || inv.invoice_no.toLowerCase().includes(q) || (inv.customer_name || '').toLowerCase().includes(q))
    );
  }, [dateFilteredInvoices, searchQuery]);

  const handleCancelClick = (inv) => {
    if (inv.status === 'Cancelled') return;
    setCancelModal(inv);
    setCancelReason('');
    setError('');
    setRefundMode('');
    setRefundMethod('Cash');
    setPaymentDetails({});
    setRefundAmount(inv.grand_total);
    setShowProcessRefund(false);
  };

  const handleConfirmCancel = () => {
    if (!cancelReason.trim()) {
      setError('Please enter a reason for cancellation.');
      return;
    }

    let rStatus = 'Not Required';
    let rMethod = '';
    let rDetails = {};

    if (cancelModal.payment_status !== 'Credit' && cancelModal.payment_status !== 'Cancelled') {
      if (!refundMode) {
        setError('Please select Refund Now or Refund Later.');
        return;
      }

      if (refundMode === 'now') {
        if (refundMethod === 'Card' && (!paymentDetails.card_type || !paymentDetails.card_number || !paymentDetails.card_name)) {
          setError('Please fill in all required Card details.');
          return;
        }
        if (refundMethod === 'Bank Transfer' && (!paymentDetails.bank_name || !paymentDetails.account_no || !paymentDetails.transaction_id)) {
          setError('Please fill in all required Bank Transfer details.');
          return;
        }
        if (refundMethod === 'Mobile Wallet' && (!paymentDetails.wallet_name || !paymentDetails.mobile_no || !paymentDetails.transaction_id)) {
          setError('Please fill in all required Mobile Wallet details.');
          return;
        }

        rStatus = 'Refunded';
        rMethod = refundMethod;
        rDetails = paymentDetails;
      } else {
        rStatus = 'Pending';
      }
    }

    // 1. Return stock to POS counter
    const currentStock = getWarehouseStock();
    let updatedStock = JSON.parse(JSON.stringify(currentStock));

    cancelModal.items.forEach(item => {
      const idx = updatedStock.findIndex(w => w.product_id === item.product_id);
      if (idx >= 0) {
        updatedStock[idx].pos_counter_qty = (updatedStock[idx].pos_counter_qty || 0) + item.quantity;
      }
    });
    setStoredData('AGRO_ERP_WAREHOUSE_STOCK', updatedStock);

    // 2. Update Invoice
    const cancellation_details = {
      by: currentUser ? currentUser.name : 'System User',
      on: new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }),
      reason: cancelReason,
      stock_reversed: true
    };

    const targetId = cancelModal._id || cancelModal.id;
    try {
      salesApi.cancelSale(targetId, {
        reason: cancelReason,
        refund_status: rStatus,
        refund_method: rMethod,
        refund_details: rDetails
      }).catch(() => {});
    } catch (e) {}

    const updatedInvoices = invoices.map(i => 
      (i._id || i.id) === targetId ? { 
        ...i, 
        payment_status: 'Cancelled', 
        status: 'Cancelled', 
        cancellation_details,
        refund_status: rStatus,
        refund_method: rMethod,
        refund_details: rDetails
      } : i
    );
    setInvoices(updatedInvoices);

    if (addAuditLog) {
      addAuditLog('Cancel Sale', `Cancelled invoice ${cancelModal.invoice_no}. Reason: ${cancelReason}`);
    }

    if (triggerNotificationToast) {
      triggerNotificationToast('Sale Cancelled', `Invoice ${cancelModal.invoice_no} cancelled successfully.`, 'success');
    }

    setCancelModal(null);
  };

  const handleProcessPendingRefund = () => {
    if (refundMethod === 'Card' && (!paymentDetails.card_type || !paymentDetails.card_number || !paymentDetails.card_name)) {
      setError('Please fill in all required Card details.');
      return;
    }
    if (refundMethod === 'Bank Transfer' && (!paymentDetails.bank_name || !paymentDetails.account_no || !paymentDetails.transaction_id)) {
      setError('Please fill in all required Bank Transfer details.');
      return;
    }
    if (refundMethod === 'Mobile Wallet' && (!paymentDetails.wallet_name || !paymentDetails.mobile_no || !paymentDetails.transaction_id)) {
      setError('Please fill in all required Mobile Wallet details.');
      return;
    }

    const updatedInvoices = invoices.map(i => 
      i.id === viewDetailsModal.id ? { 
        ...i, 
        refund_status: 'Refunded',
        refund_method: refundMethod,
        refund_details: paymentDetails
      } : i
    );
    setInvoices(updatedInvoices);
    
    if (triggerNotificationToast) {
      triggerNotificationToast('Refund Processed', `Refund for ${viewDetailsModal.invoice_no} has been successfully recorded.`, 'success');
    }
    
    // Update local state to reflect changes immediately
    setViewDetailsModal({
      ...viewDetailsModal,
      refund_status: 'Refunded',
      refund_method: refundMethod,
      refund_details: paymentDetails
    });
    setShowProcessRefund(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-black text-gray-900 tracking-tight">Cancel Sale</h1>
          <p className="text-xs text-gray-400 mt-0.5 font-medium">Cancel an existing sale invoice and revert stock to POS Counter.</p>
        </div>
      </div>

      {/* Date Filter Bar */}
      <DateFilterBar dateFilter={dateFilter} setDateFilter={setDateFilter} />

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text" placeholder="Search invoice # or customer..."
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-800 focus:border-red-500 focus:ring-2 focus:ring-red-500/10 focus:outline-none transition"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-xs border-collapse">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">
              <th className="py-3 px-4 text-left">Invoice #</th>
              <th className="py-3 px-4 text-left">Customer</th>
              <th className="py-3 px-4 text-left">Date</th>
              <th className="py-3 px-4 text-right">Total (Rs.)</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(inv => {
              const isCancelled = inv.payment_status === 'Cancelled' || inv.status === 'Cancelled';
              return (
                <tr key={inv.id} className="hover:bg-gray-50/60 transition">
                  <td className="py-3 px-4 font-mono font-bold text-gray-700">{inv.invoice_no}</td>
                  <td className="py-3 px-4 font-semibold text-gray-900">{inv.customer_name}</td>
                  <td className="py-3 px-4 font-medium text-gray-600">{inv.date}</td>
                  <td className="py-3 px-4 text-right font-black text-gray-800">{inv.grand_total.toLocaleString()}</td>
                  <td className="py-3 px-4 text-center">
                    {isCancelled ? (
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 border border-red-200 rounded-full text-[9px] font-bold">Cancelled</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 border border-green-200 rounded-full text-[9px] font-bold">{inv.payment_status}</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {isCancelled ? (
                      <button
                        onClick={() => setViewDetailsModal(inv)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold transition bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer"
                      >
                        View Details
                      </button>
                    ) : (
                      <button
                        onClick={() => handleCancelClick(inv)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold transition bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200 hover:border-red-600 cursor-pointer"
                      >
                        Cancel Sale
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="py-10 text-center text-gray-400">No invoices found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {cancelModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-md border border-gray-200 shadow-2xl p-6 my-8">
            <h2 className="text-lg font-black text-gray-900 mb-2 flex items-center gap-2">
              <Ban className="text-red-500" /> Cancel Invoice {cancelModal.invoice_no}
            </h2>
            
            {error && <div className="mb-4 text-xs font-bold text-red-600 bg-red-50 p-2 rounded-lg border border-red-200 flex items-center gap-1"><AlertTriangle size={12}/> {error}</div>}

            {cancelModal.payment_status !== 'Credit' ? (
              <div className="mb-5 space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div>
                  <p className="text-sm font-black text-gray-800">This sale has already been paid.</p>
                  <p className="text-xs font-medium text-gray-600 mt-1">Has the customer already received the refund?</p>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setRefundMode('now')} 
                    className={`p-3 rounded-xl border-2 transition ${refundMode === 'now' ? 'bg-red-50 border-red-500 text-red-700' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}
                  >
                    <span className="block font-bold text-sm">Refund Now</span>
                    <span className="block text-[10px]">Process immediately</span>
                  </button>
                  <button 
                    onClick={() => setRefundMode('later')} 
                    className={`p-3 rounded-xl border-2 transition ${refundMode === 'later' ? 'bg-orange-50 border-orange-500 text-orange-700' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}
                  >
                    <span className="block font-bold text-sm">Refund Later</span>
                    <span className="block text-[10px]">Set as pending</span>
                  </button>
                </div>

                {refundMode === 'now' && (
                  <div className="pt-3 border-t border-gray-200 mt-3">
                    <PaymentProcessor
                      paymentMethod={refundMethod}
                      setPaymentMethod={setRefundMethod}
                      grandTotal={cancelModal.grand_total}
                      receivedAmount={refundAmount}
                      setReceivedAmount={setRefundAmount}
                      paymentDetails={paymentDetails}
                      setPaymentDetails={setPaymentDetails}
                      layout="vertical"
                      transactionType="out"
                    />
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-500 mb-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
                This is a Credit sale. The customer's outstanding balance will be automatically reversed.
              </p>
            )}

            <div className="space-y-1 mb-5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Reason for Cancellation (Required)</label>
              <textarea
                rows={3}
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="Enter a reason..."
                className="w-full rounded-lg border border-gray-300 p-3 text-xs focus:border-red-500 focus:ring-2 focus:ring-red-500/10 focus:outline-none transition resize-none"
              ></textarea>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setCancelModal(null); setRefundMode(''); }} className="px-4 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition cursor-pointer">Close</button>
              <button onClick={handleConfirmCancel} className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition cursor-pointer flex items-center gap-2">
                <CheckCircle2 size={14} /> Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}

      {viewDetailsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl border border-gray-200 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 bg-red-600 text-white rounded-t-2xl flex items-center justify-between">
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
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b pb-1 mb-2">Invoice Information</h3>
                  <div className="flex gap-2"><span className="w-32 whitespace-nowrap font-bold text-gray-500">Invoice No :</span><span className="font-mono font-bold text-gray-900">{viewDetailsModal.invoice_no}</span></div>
                  <div className="flex gap-2"><span className="w-32 whitespace-nowrap font-bold text-gray-500">Customer :</span><span className="font-semibold">{viewDetailsModal.customer_name}</span></div>
                  <div className="flex gap-2"><span className="w-32 whitespace-nowrap font-bold text-gray-500">Invoice Date :</span><span>{viewDetailsModal.date}</span></div>
                  <div className="flex gap-2"><span className="w-32 whitespace-nowrap font-bold text-gray-500">Total Amount :</span><span className="font-black text-gray-800">Rs. {(viewDetailsModal.items || []).reduce((s, it) => s + (it.line_total || it.total || (it.price * it.quantity) || 0), 0).toLocaleString()}</span></div>
                  <div className="flex gap-2"><span className="w-32 whitespace-nowrap font-bold text-gray-500">Status :</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                      Cancelled
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
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <span className="block font-bold text-gray-500 mb-1">Refund Status:</span>
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        viewDetailsModal.refund_status === 'Refunded' ? 'bg-green-100 text-green-700' :
                        viewDetailsModal.refund_status === 'Pending' ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-200 text-gray-700'
                      }`}>
                        {viewDetailsModal.refund_status || 'N/A'}
                      </span>
                      {viewDetailsModal.refund_status === 'Pending' && !showProcessRefund && (
                        <button 
                          onClick={() => {
                            setRefundMethod('Cash');
                            setRefundAmount(viewDetailsModal.grand_total);
                            setPaymentDetails({});
                            setShowProcessRefund(true);
                          }}
                          className="px-3 py-1 bg-orange-600 text-white text-[10px] font-bold rounded-lg hover:bg-orange-700 transition"
                        >
                          Process Refund
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {showProcessRefund && (
                <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl space-y-4">
                  <h3 className="text-xs font-black text-orange-800 uppercase tracking-widest">Process Pending Refund</h3>
                  <PaymentProcessor
                    paymentMethod={refundMethod}
                    setPaymentMethod={setRefundMethod}
                    grandTotal={viewDetailsModal.grand_total}
                    receivedAmount={refundAmount}
                    setReceivedAmount={setRefundAmount}
                    paymentDetails={paymentDetails}
                    setPaymentDetails={setPaymentDetails}
                    layout="horizontal"
                    transactionType="out"
                  />
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => setShowProcessRefund(false)}
                      className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-xs font-bold rounded-lg"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleProcessPendingRefund}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-lg transition"
                    >
                      Complete Refund
                    </button>
                  </div>
                </div>
              )}

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
                      {(viewDetailsModal.items || []).map((it, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="p-2 font-medium">{it.product_name || it.name}</td>
                          <td className="p-2 text-center">{it.quantity}</td>
                          <td className="p-2 text-right font-semibold">Rs. {(it.line_total || it.total || (it.price * it.quantity) || 0).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t border-gray-200">
                      <tr>
                        <td colSpan={2} className="p-2 font-black text-right text-gray-600">Grand Total</td>
                        <td className="p-2 text-right font-black text-gray-900">Rs. {(viewDetailsModal.items || []).reduce((s, it) => s + (it.line_total || it.total || (it.price * it.quantity) || 0), 0).toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="p-4 rounded-xl border bg-orange-50 border-orange-200">
                <span className="block text-[10px] font-black uppercase mb-1 text-orange-600">Inventory Impact</span>
                <p className="text-xs font-semibold text-gray-700">
                  Yes - Stock was previously sold. The quantities have been reversed and added back to the POS Counter on {viewDetailsModal.cancellation_details?.on || 'N/A'}.
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
