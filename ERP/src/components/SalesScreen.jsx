import React, { useState, useMemo, useRef } from 'react';
import {
  Receipt,
  Search,
  Eye,
  Printer,
  RefreshCcw,
  X,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  Filter,
  TrendingUp,
  DollarSign,
  CreditCard,
} from 'lucide-react';
import DateFilterBar from './DateFilterBar';
import { isItemInDateRange } from '../utils/dateUtils';
import { getStoredData, setStoredData, CUSTOMERS } from '../utils/mockData';
import PaymentProcessor from './PaymentProcessor';
import { useLanguage } from '../context/LanguageContext';

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status, returnStatus }) {
  const map = {
    Paid:              { cls: 'bg-green-100 text-green-700  border-green-200',  icon: CheckCircle2 },
    Credit:            { cls: 'bg-amber-100 text-amber-700  border-amber-200',  icon: Clock },
    Unpaid:            { cls: 'bg-red-100   text-red-700    border-red-200',    icon: XCircle },
    Cancelled:         { cls: 'bg-gray-100  text-gray-700   border-gray-200',   icon: XCircle },
    'Fully Returned':  { cls: 'bg-purple-100 text-purple-700 border-purple-200', icon: RefreshCcw },
    'Partial Return':  { cls: 'bg-blue-100  text-blue-700  border-blue-200',   icon: RefreshCcw },
  };
  // If invoice status is a return state, show that first
  const displayStatus = (returnStatus === 'Full' || status === 'Fully Returned') ? 'Fully Returned'
    : (returnStatus === 'Partial' || status === 'Partial Return') ? 'Partial Return'
    : status;
  const { cls, icon: Icon } = map[displayStatus] || map['Unpaid'];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${cls}`}>
      <Icon size={9} /> {displayStatus}
    </span>
  );
}

// ─── Print Invoice (window.print trigger) ────────────────────────────────────
function printInvoice(inv) {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const shopInfo = getStoredData('AGRO_ERP_SHOP_INFO', {
    name: 'Pak Agro Pesticides & Seeds Wholesale Depot',
    owner: 'Tariq Mahmood & Sons',
    licenseNo: 'FERT-PK-2024-9981 / PEST-8812',
    gstin: 'NTN-9876543-1',
    phone: '+92 300 1234567',
    email: 'info@pakagroerp.pk',
    address: 'Shop No. 45, Grain Market Road, Multan, Punjab, Pakistan',
    website: 'www.pakagroerp.pk'
  });

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`
    <html><head><title>Invoice ${inv.invoice_no}</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box;}
      body{font-family:monospace;font-size:11px;padding:16px;color:#111}
      h2{text-align:center;font-size:14px;margin-bottom:4px;text-transform:uppercase;}
      p{text-align:center;font-size:10px;color:#555}
      .divider{border-top:1px dashed #999;margin:8px 0}
      .row{display:flex;justify-content:space-between;margin:3px 0}
      .bold{font-weight:bold}
      .right{text-align:right}
      table{width:100%;border-collapse:collapse;margin:6px 0}
      th{font-size:9px;text-align:left;border-bottom:1px solid #ccc;padding:2px}
      td{font-size:10px;padding:3px 0}
    </style></head><body>
    <h2>${shopInfo.name}</h2>
    <p>${shopInfo.address}</p>
    <p>Ph: ${shopInfo.phone} ${shopInfo.email ? ` | Email: ${shopInfo.email}` : ''}</p>
    <div class="divider"></div>
    <div class="row"><span class="bold">Invoice No:</span><span>${inv.invoice_no}</span></div>
    <div class="row"><span class="bold">Date:</span><span>${inv.date} ${inv.time || ''}</span></div>
    <div class="row"><span class="bold">Customer:</span><span>${inv.customer_name}</span></div>
    <div class="row"><span class="bold">Type:</span><span>${inv.customer_type}</span></div>
    <div class="divider"></div>
    <table>
      <thead><tr><th>Product</th><th>Qty</th><th>Rate</th><th class="right">Total</th></tr></thead>
      <tbody>
        ${inv.items.map(i => `<tr>
          <td>${i.product_name}</td>
          <td>${i.quantity}</td>
          <td>${i.price}</td>
          <td class="right">${i.line_total.toLocaleString()}</td>
        </tr>`).join('')}
      </tbody>
    </table>
    <div class="divider"></div>
    <div class="row"><span>Subtotal</span><span>Rs. ${inv.subtotal?.toLocaleString()}</span></div>
    ${(inv.discount_amount > 0 && (!inv.bill_discount || inv.discount_amount > inv.bill_discount)) ? `<div class="row" style="color:green;font-size:9px"><span>(Item Savings)</span><span>Rs. ${inv.discount_amount - (inv.bill_discount || 0)}</span></div>` : ''}
    <div class="row"><span>GST/Tax</span><span>+ Rs. ${(inv.tax_amount||0).toLocaleString()}</span></div>
    ${inv.bill_discount > 0 ? `<div class="row" style="color:red"><span>Bill Discount ${inv.bill_discount_type === 'Percentage' ? `(${inv.bill_discount_value}%)` : ''}</span><span>- Rs. ${inv.bill_discount.toLocaleString()}</span></div>` : ''}
    <div class="row"><span>Freight</span><span>+ Rs. ${(inv.freight||0).toLocaleString()}</span></div>
    <div class="divider"></div>
    <div class="row bold" style="font-size:13px"><span>GRAND TOTAL</span><span>Rs. ${inv.grand_total?.toLocaleString()}</span></div>
    <div class="row"><span>Paid</span><span>Rs. ${inv.paid_amount?.toLocaleString()}</span></div>
    <div class="row"><span>Balance Due</span><span>Rs. ${inv.remaining_amount?.toLocaleString()}</span></div>
    <div class="divider"></div>
    <div class="row"><span>Payment:</span><span>${inv.payment_method}</span></div>
    <div class="row"><span>Status:</span><span>${inv.payment_status}</span></div>
    <div class="divider"></div>
    <p>Thank you for your business!</p>
    <p style="margin-top:4px">Cashier: ${inv.cashier_name || '—'}</p>
    </body></html>
  `);
  doc.close();
  iframe.contentWindow.focus();
  setTimeout(() => { 
    iframe.contentWindow.print(); 
    setTimeout(() => { document.body.removeChild(iframe); }, 500);
  }, 400);
}

// ─── Invoice Detail Modal ─────────────────────────────────────────────────────
function InvoiceModal({ inv, onClose, onOpenPayModal }) {
  if (!inv) return null;
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg border border-gray-200 shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <span className="text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded inline-block mb-1.5">Sales Invoice</span>
            <h2 className="text-base font-extrabold text-gray-900 font-mono">{inv.invoice_no}</h2>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[10px] text-gray-400 font-medium">{inv.date} · {inv.time}</span>
              <StatusBadge status={inv.payment_status} />
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition cursor-pointer"><X size={15} /></button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Customer info */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Customer',   value: inv.customer_name },
              { label: 'Type',       value: inv.customer_type },
              { label: 'Payment',    value: inv.payment_method },
              { label: 'Cashier',    value: inv.cashier_name },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                <span className="text-[9px] text-gray-400 font-bold uppercase block">{label}</span>
                <span className="text-xs font-bold text-gray-800 mt-0.5 block">{value || '—'}</span>
              </div>
            ))}
          </div>

          {/* Items table */}
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Items</p>
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              <table className="w-full text-xs border-collapse">
                <thead className="bg-gray-50">
                  <tr className="text-[9px] font-extrabold text-gray-500 uppercase">
                    <th className="py-2 px-3 text-left">Product</th>
                    <th className="py-2 px-3 text-left hidden sm:table-cell">Batch</th>
                    <th className="py-2 px-3 text-center">Qty</th>
                    <th className="py-2 px-3 text-right">Rate</th>
                    <th className="py-2 px-3 text-right">Discount</th>
                    <th className="py-2 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {inv.items.map((item, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="py-2 px-3 font-bold text-gray-800">{item.product_name}</td>
                      <td className="py-2 px-3 font-mono text-gray-500 text-[10px] hidden sm:table-cell">{item.batch_no || '—'}</td>
                      <td className="py-2 px-3 text-center font-bold text-gray-700">{item.quantity}</td>
                      <td className="py-2 px-3 text-right font-semibold text-gray-500">Rs. {item.price}</td>
                      <td className="py-2 px-3 text-right font-semibold text-red-600">
                        {item.discount > 0 ? `Rs. ${item.discount}` : '—'}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-gray-900">Rs. {item.line_total?.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="space-y-1.5 text-xs">
            {[
              ['Subtotal',  `Rs. ${inv.subtotal?.toLocaleString()}`,            'text-gray-600'],
              ['Discount',  `- Rs. ${(inv.discount_amount||0).toLocaleString()}`, 'text-red-600'],
              ['GST / Tax', `+ Rs. ${(inv.tax_amount||0).toLocaleString()}`,     'text-gray-600'],
              ['Freight',   `+ Rs. ${(inv.freight||0).toLocaleString()}`,        'text-gray-600'],
            ].map(([l, v, c]) => (
              <div key={l} className="flex justify-between font-semibold"><span className="text-gray-400">{l}</span><span className={c}>{v}</span></div>
            ))}
            <div className="flex justify-between font-extrabold text-green-800 text-sm border-t border-gray-200 pt-2 mt-2">
              <span>Grand Total</span><span className="font-mono">Rs. {inv.grand_total?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-bold text-gray-700">
              <span>Paid</span><span className="text-green-700">Rs. {inv.paid_amount?.toLocaleString()}</span>
            </div>
            {inv.remaining_amount > 0 && (
              <div className="flex justify-between font-bold text-red-600">
                <span>Balance Due</span><span>Rs. {inv.remaining_amount?.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition cursor-pointer">Close</button>
          {inv.remaining_amount > 0 && onOpenPayModal && (
            <button
              onClick={() => { onClose(); onOpenPayModal(inv); }}
              className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-sm transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <DollarSign size={13} /> Receive Payment
            </button>
          )}
          <button
            onClick={() => printInvoice(inv)}
            className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-xs shadow-sm transition cursor-pointer flex items-center justify-center gap-2"
          >
            <Printer size={13} /> Print Invoice
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Receive Balance Payment Modal ───────────────────────────────────────────
function PayBalanceModal({ inv, onClose, onSavePayment }) {
  const [payAmount, setPayAmount] = useState(inv.remaining_amount || 0);
  const [payMethod, setPayMethod] = useState('Cash');
  const [paymentDetails, setPaymentDetails] = useState({});
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  if (!inv) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    const amt = parseFloat(payAmount);
    if (!amt || amt <= 0) {
      setError('Please enter a valid payment amount (> 0).');
      return;
    }
    if (amt > inv.remaining_amount) {
      setError(`Payment amount (Rs. ${amt}) cannot exceed remaining balance due (Rs. ${inv.remaining_amount}).`);
      return;
    }
    
    // Validate Payment Details
    if (payMethod === 'Card') {
      if (!paymentDetails.card_type || !paymentDetails.card_number || !paymentDetails.card_name) {
        setError('Please fill in all required Card details.');
        return;
      }
    } else if (payMethod === 'Bank Transfer') {
      if (!paymentDetails.bank_name || !paymentDetails.account_no || !paymentDetails.transaction_id) {
        setError('Please fill in all required Bank Transfer details.');
        return;
      }
    } else if (payMethod === 'Mobile Wallet') {
      if (!paymentDetails.wallet_name || !paymentDetails.mobile_no || !paymentDetails.transaction_id) {
        setError('Please fill in all required Mobile Wallet details.');
        return;
      }
    }

    const newPaid = (inv.paid_amount || 0) + amt;
    const newRemaining = Math.max(0, inv.grand_total - newPaid);
    const newStatus = newRemaining === 0 ? 'Paid' : 'Credit';

    const updatedInv = {
      ...inv,
      paid_amount: newPaid,
      remaining_amount: newRemaining,
      payment_status: newStatus,
      payment_method: payMethod || inv.payment_method,
      payment_details: { ...inv.payment_details, [Date.now()]: { method: payMethod, amount: amt, details: paymentDetails } }
    };

    onSavePayment(updatedInv, amt);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl w-full max-w-md border border-gray-200 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 rounded-xl text-emerald-700"><DollarSign size={18} /></div>
            <div>
              <h2 className="text-sm font-black text-gray-800">Receive Balance Payment</h2>
              <p className="text-[10px] text-gray-500 font-mono">{inv.invoice_no} · {inv.customer_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 transition cursor-pointer"><X size={15} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 bg-gray-50 p-3 rounded-xl border border-gray-100 text-center">
            <div>
              <span className="text-[9px] font-extrabold text-gray-400 uppercase block">Grand Total</span>
              <span className="text-xs font-black text-gray-900">Rs. {inv.grand_total?.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-[9px] font-extrabold text-gray-400 uppercase block">Paid So Far</span>
              <span className="text-xs font-black text-green-700">Rs. {inv.paid_amount?.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-[9px] font-extrabold text-gray-400 uppercase block">Balance Due</span>
              <span className="text-xs font-black text-red-600">Rs. {inv.remaining_amount?.toLocaleString()}</span>
            </div>
          </div>

          <div className="space-y-1">
            <PaymentProcessor
              paymentMethod={payMethod}
              setPaymentMethod={setPayMethod}
              grandTotal={inv.remaining_amount}
              receivedAmount={payAmount}
              setReceivedAmount={setPayAmount}
              paymentDetails={paymentDetails}
              setPaymentDetails={setPaymentDetails}
              allowedMethods={['Cash', 'Card', 'Bank Transfer', 'Mobile Wallet']} // No 'Credit' here since they are paying it off
              layout="vertical"
              transactionType="in"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wide">
              Notes / Transaction Ref (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Received cash at store counter"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl font-semibold text-gray-800 bg-white focus:border-emerald-500 focus:outline-none transition"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-sm transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 size={14} /> Update Balance
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Helper to resolve customer city
const getCustomerCity = (custName) => {
  const cust = CUSTOMERS.find(c => c.name === custName);
  if (cust?.city) return cust.city;
  if (cust?.address?.includes('Bathinda')) return 'Bathinda';
  if (cust?.address?.includes('Karnal')) return 'Karnal';
  if (cust?.address?.includes('Sonipat')) return 'Sonipat';
  if (cust?.address?.includes('Anand')) return 'Anand';
  if (cust?.address?.includes('Ludhiana')) return 'Ludhiana';
  return '';
};

// ─── Main Sales Screen ─────────────────────────────────────────────────────────
export default function SalesScreen({ invoices = [], setInvoices, triggerNotificationToast, addAuditLog, dateFilter, setDateFilter, selectedCity, setSelectedCity, cities = [] }) {
  const { t } = useLanguage();
  const [searchQuery,  setSearchQuery]  = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter,   setTypeFilter]   = useState('');
  const [viewInvoice,  setViewInvoice]  = useState(null);

  const [payModalInvoice, setPayModalInvoice] = useState(null);

  const handleSavePayment = (updatedInv, paidAmt) => {
    if (setInvoices) {
      const updatedList = invoices.map(i => i.id === updatedInv.id ? updatedInv : i);
      setInvoices(updatedList);
      setStoredData('AGRO_ERP_INVOICES', updatedList);
    }

    if (triggerNotificationToast) {
      triggerNotificationToast('Payment Received', `Received Rs. ${paidAmt.toLocaleString()} for Invoice ${updatedInv.invoice_no}.`, 'success');
    }
    if (addAuditLog) {
      addAuditLog('Receive Payment', `Received Rs. ${paidAmt.toLocaleString()} for Invoice ${updatedInv.invoice_no} (${updatedInv.customer_name}). Remaining balance: Rs. ${updatedInv.remaining_amount.toLocaleString()}`);
    }
  };

  const dateFilteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchesDate = isItemInDateRange(inv.date, dateFilter.startDate, dateFilter.endDate);
      const matchesCity = selectedCity === 'All' || getCustomerCity(inv.customer_name) === selectedCity;
      return matchesDate && matchesCity;
    });
  }, [invoices, dateFilter, selectedCity]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return dateFilteredInvoices.filter(inv => {
      const matchQ      = !q || inv.invoice_no.toLowerCase().includes(q) || inv.customer_name.toLowerCase().includes(q) || getCustomerCity(inv.customer_name).toLowerCase().includes(q);
      // Match status against both payment_status and invoice status (for return/cancel states)
      const matchStatus = !statusFilter || inv.payment_status === statusFilter || inv.status === statusFilter ||
        (statusFilter === 'Fully Returned'  && (inv.return_status === 'Full'    || inv.status === 'Fully Returned')) ||
        (statusFilter === 'Partial Return'  && (inv.return_status === 'Partial' || inv.status === 'Partial Return')) ||
        (statusFilter === 'Cancelled'       && (inv.status === 'Cancelled'      || inv.payment_status === 'Cancelled'));
      const matchType   = !typeFilter   || inv.customer_type   === typeFilter;
      return matchQ && matchStatus && matchType;
    });
  }, [dateFilteredInvoices, searchQuery, statusFilter, typeFilter]);

  // Exclude cancelled and fully-returned from stats
  const activeSales = dateFilteredInvoices.filter(i =>
    i.status !== 'Cancelled' &&
    i.payment_status !== 'Cancelled' &&
    i.status !== 'Fully Returned' &&
    i.return_status !== 'Full'
  );

  // Stats
  const totalSales   = activeSales.reduce((s, i) => s + i.grand_total, 0);
  const paidTotal    = activeSales.filter(i => i.payment_status === 'Paid').reduce((s, i) => s + i.grand_total, 0);
  const creditTotal  = activeSales.filter(i => i.payment_status === 'Credit').reduce((s, i) => s + i.remaining_amount, 0);
  const invoiceCount = activeSales.length;

  const hasFilters = searchQuery || statusFilter || typeFilter;

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-black text-gray-900 tracking-tight">Sales</h1>
          <p className="text-xs text-gray-400 mt-0.5 font-medium">{dateFilteredInvoices.length} sales invoices in range</p>
        </div>
      </div>

      {/* Date Filter Bar */}
      <DateFilterBar 
        dateFilter={dateFilter} 
        setDateFilter={setDateFilter} 
        selectedCity={selectedCity} 
        setSelectedCity={setSelectedCity} 
        cities={cities} 
      />

      {/* Stats */}
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Invoices',   value: invoiceCount,                                color: 'text-gray-900',  bg: 'bg-gray-50',  border: 'border-gray-200', ring: 'ring-gray-200', icon: FileText, filterAction: '' },
          { label: 'Total Sales',      value: `Rs. ${totalSales.toLocaleString()}`,        color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200', ring: 'ring-green-500', icon: TrendingUp, filterAction: '' },
          { label: 'Cash Collected',   value: `Rs. ${paidTotal.toLocaleString()}`,         color: 'text-blue-700',  bg: 'bg-blue-50',  border: 'border-blue-200',  ring: 'ring-blue-500', icon: DollarSign, filterAction: 'Paid' },
          { label: 'Credit Pending',   value: `Rs. ${creditTotal.toLocaleString()}`,       color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', ring: 'ring-amber-500', icon: CreditCard, filterAction: 'Credit' },
        ].map(({ label, value, color, bg, border, ring, icon: Icon, filterAction }) => {
          // If the statusFilter matches the card's filterAction, mark as active. (For empty action, only mark Total Invoices as active if no filter)
          const isActive = (statusFilter === filterAction) && (filterAction !== '' ? true : (statusFilter === '' && label === 'Total Invoices'));
          return (
            <div 
              key={label} 
              onClick={() => setStatusFilter(isActive ? '' : filterAction)}
              className={`${bg} border ${border} ${isActive ? `ring-2 ring-opacity-20 ${ring} border-opacity-100` : ''} rounded-xl p-4 flex items-center justify-between cursor-pointer transition-all hover:shadow-sm hover:-translate-y-0.5`}
            >
              <div>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block">{label}</span>
                <span className={`text-lg font-black mt-0.5 block ${color}`}>{value}</span>
              </div>
              <Icon size={18} className={`${color} opacity-50 flex-shrink-0`} />
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text" placeholder="Search invoice # or customer name..."
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-800 focus:border-green-500 focus:ring-2 focus:ring-green-500/10 focus:outline-none transition"
          />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 focus:border-green-500 focus:outline-none transition">
          <option value="">All Status</option>
          <option value="Paid">Paid</option>
          <option value="Credit">Credit</option>
          <option value="Unpaid">Unpaid</option>
          <option value="Fully Returned">Fully Returned</option>
          <option value="Partial Return">Partial Return</option>
          <option value="Cancelled">Cancelled</option>
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 focus:border-green-500 focus:outline-none transition">
          <option value="">All Customer Types</option>
          {['Farmer','Dealer','Wholesaler','Retailer','Walk-in Customer'].map(t => <option key={t}>{t}</option>)}
        </select>
        {hasFilters && (
          <button onClick={() => { setSearchQuery(''); setStatusFilter(''); setTypeFilter(''); }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-500 hover:text-red-600 border border-gray-200 rounded-lg hover:border-red-200 hover:bg-red-50 transition cursor-pointer">
            <RefreshCcw size={12} /> Reset
          </button>
        )}
        <span className="text-xs text-gray-400 font-medium ml-auto">{filtered.length} results</span>
      </div>

      {/* Sales History Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Receipt size={15} className="text-green-600" />
          <span className="text-xs font-extrabold text-gray-700 uppercase tracking-wide">Sales History</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">
                <th className="py-3 px-4 text-left">Invoice #</th>
                <th className="py-3 px-4 text-left">Customer</th>
                <th className="py-3 px-4 text-left hidden sm:table-cell">Date / Time</th>
                <th className="py-3 px-4 text-center hidden md:table-cell">Items</th>
                <th className="py-3 px-4 text-right">Total (Rs.)</th>
                <th className="py-3 px-4 text-right hidden sm:table-cell">Discount</th>
                <th className="py-3 px-4 text-right hidden sm:table-cell">Paid</th>
                <th className="py-3 px-4 text-right hidden md:table-cell">Balance</th>
                <th className="py-3 px-4 text-center hidden lg:table-cell">Method</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={11} className="py-14 text-center text-gray-400 font-medium">
                  <Receipt size={28} className="mx-auto mb-2 text-gray-300" />
                  {hasFilters ? 'No invoices match the filters.' : 'No sales recorded yet.'}
                </td></tr>
              ) : filtered.map(inv => (
                <tr key={inv._id || inv.id} className="hover:bg-gray-50/60 transition group">
                  <td className="py-3.5 px-4 font-mono font-bold text-green-700">{inv.invoice_no}</td>
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-gray-900 block">{inv.customer_name}</span>
                    <span className="text-[10px] text-gray-400">{inv.customer_type}</span>
                  </td>
                  <td className="py-3.5 px-4 hidden sm:table-cell">
                    <span className="font-semibold text-gray-600 block">{inv.date}</span>
                    <span className="text-[10px] text-gray-400">{inv.time}</span>
                  </td>
                  <td className="py-3.5 px-4 text-center font-semibold text-gray-600 hidden md:table-cell">{inv.items?.length || 0}</td>
                  <td className="py-3.5 px-4 text-right font-black text-gray-900">Rs. {inv.grand_total?.toLocaleString()}</td>
                  <td className="py-3.5 px-4 text-right font-bold text-red-600 hidden sm:table-cell">
                    {inv.discount_amount > 0 ? `- Rs. ${inv.discount_amount?.toLocaleString()}` : '—'}
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-green-700 hidden sm:table-cell">Rs. {inv.paid_amount?.toLocaleString()}</td>
                  <td className={`py-3.5 px-4 text-right font-bold hidden md:table-cell ${inv.remaining_amount > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                    {inv.remaining_amount > 0 ? `Rs. ${inv.remaining_amount?.toLocaleString()}` : '—'}
                  </td>
                  <td className="py-3.5 px-4 text-center text-gray-500 font-medium text-[10px] hidden lg:table-cell">{inv.payment_method}</td>
                  <td className="py-3.5 px-4 text-center"><StatusBadge status={inv.payment_status} returnStatus={inv.return_status} /></td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center justify-center gap-1.5">
                      {inv.remaining_amount > 0 && inv.payment_status !== 'Cancelled' && inv.status !== 'Cancelled' && (
                        <button
                          onClick={() => setPayModalInvoice(inv)}
                          title="Update Balance / Receive Payment"
                          className="p-1.5 rounded-lg bg-amber-50 hover:bg-emerald-100 text-amber-700 hover:text-emerald-800 border border-amber-200 hover:border-emerald-300 transition cursor-pointer"
                        >
                          <DollarSign size={13} />
                        </button>
                      )}
                      <button
                        onClick={() => setViewInvoice(inv)}
                        title="View Invoice"
                        className="p-1.5 rounded-lg bg-gray-100 hover:bg-blue-100 text-gray-500 hover:text-blue-700 transition cursor-pointer"
                      ><Eye size={13} /></button>
                      <button
                        onClick={() => printInvoice(inv)}
                        title="Reprint Invoice"
                        className="p-1.5 rounded-lg bg-gray-100 hover:bg-green-100 text-gray-500 hover:text-green-700 transition cursor-pointer"
                      ><Printer size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex justify-between text-[10px] font-semibold text-gray-400">
          <span>Showing {filtered.length} of {invoices.length} invoices</span>
          <span>Total: Rs. {filtered.reduce((s, i) => s + i.grand_total, 0).toLocaleString()}</span>
        </div>
      </div>

      {/* Invoice Detail Modal */}
      {viewInvoice && <InvoiceModal inv={viewInvoice} onClose={() => setViewInvoice(null)} onOpenPayModal={setPayModalInvoice} />}

      {/* Pay Balance Modal */}
      {payModalInvoice && (
        <PayBalanceModal
          inv={payModalInvoice}
          onClose={() => setPayModalInvoice(null)}
          onSavePayment={handleSavePayment}
        />
      )}
    </div>
  );
}
