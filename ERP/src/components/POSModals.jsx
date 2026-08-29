import React, { useState } from 'react';
import { 
  X, 
  User, 
  MapPin, 
  DollarSign, 
  AlertOctagon, 
  CheckCircle, 
  Phone, 
  Layers, 
  FileText,
  RotateCcw,
  Printer,
  Barcode,
  Calendar,
  AlertTriangle,
  Lock,
  Download,
  CreditCard,
  Clock,
  Trash2,
  PauseCircle
} from 'lucide-react';
import { CUSTOMERS, PRODUCTS, UNITS } from '../utils/mockData';
import { useLanguage } from '../context/LanguageContext';

export default function POSModals({
  activeModal,
  setActiveModal,
  selectedCustomer,
  setSelectedCustomer,
  selectedProductForBatch,
  addBatchToCart,
  heldSales,
  setHeldSales,
  recallHeldInvoice,
  invoices,
  setInvoices,
  addAuditLog,
  triggerNotificationToast,
  approvalType,
  approvalMessage,
  pendingAction,
  resetPOSWorkspace,
  lastInvoice
}) {
  const { t } = useLanguage();
  if (!activeModal) return null;

  switch (activeModal) {
    case 'customer_add':
      return (
        <CustomerAddModal 
          onClose={() => setActiveModal(null)} 
          addAuditLog={addAuditLog} 
          triggerNotificationToast={triggerNotificationToast} 
          setSelectedCustomer={setSelectedCustomer}
        />
      );
    // batch_select case REMOVED
    case 'hold_recall':
      return (
        <HoldRecallModal 
          heldSales={heldSales || []} 
          setHeldSales={setHeldSales}
          onClose={() => setActiveModal(null)} 
          onRecall={recallHeldInvoice}
          triggerNotificationToast={triggerNotificationToast}
        />
      );
    case 'print_preview':
      return (
        <PrintPreviewModal 
          invoice={lastInvoice} 
          onClose={() => {
            setActiveModal(null);
            resetPOSWorkspace();
          }} 
          triggerNotificationToast={triggerNotificationToast}
        />
      );
    case 'returns':
      return (
        <ReturnsModal 
          invoices={invoices} 
          setInvoices={setInvoices}
          onClose={() => setActiveModal(null)} 
          addAuditLog={addAuditLog}
          triggerNotificationToast={triggerNotificationToast}
        />
      );
    case 'product_add':
      return (
        <ProductAddModal
          onClose={() => setActiveModal(null)}
          addAuditLog={addAuditLog}
          triggerNotificationToast={triggerNotificationToast}
        />
      );
    case 'clear_confirm':
      return (
        <ClearConfirmModal
          onClose={() => setActiveModal(null)}
          onConfirm={() => {
            setActiveModal(null);
            resetPOSWorkspace();
          }}
        />
      );
    default:
      return null;
  }
}

// ----------------------------------------------------
// 1. CREATE CUSTOMER MODAL
// ----------------------------------------------------
function CustomerAddModal({ onClose, addAuditLog, triggerNotificationToast, setSelectedCustomer }) {
  const [customerId] = useState(() => `CUST-${Math.floor(10000 + Math.random() * 90000)}`);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [custType, setCustType] = useState('Dealer');
  const [creditLimit, setCreditLimit] = useState(100000);
  const [activeTab, setActiveTab] = useState('general');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !phone) {
      triggerNotificationToast('Validation Failed', 'Customer Name and Phone are required.', 'error');
      return;
    }

    const newCustomer = {
      id: customerId,
      code: customerId,
      name,
      phone,
      address: address || 'No address provided',
      customer_type: custType,
      credit_limit: parseFloat(creditLimit) || 0,
      outstanding_balance: 0,
      available_credit: parseFloat(creditLimit) || 0,
      last_purchase_date: 'Never',
    };

    // Prepend to static data list for this browser instance session
    CUSTOMERS.push(newCustomer);
    setSelectedCustomer(newCustomer);

    addAuditLog('Customer Created', `Created customer ${name} (${customerId}) as ${custType}`);
    triggerNotificationToast('Customer Created', `${name} (${customerId}) set as active customer.`, 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-green-600 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center space-x-2">
            <User size={18} />
            <h3 className="font-bold text-sm">Add New Customer Card</h3>
          </div>
          <button onClick={onClose} className="hover:bg-green-700 p-1 rounded-full transition">
            <X size={18} />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-500">
          <button 
            onClick={() => setActiveTab('general')}
            className={`flex-1 py-3 text-center border-b-2 transition ${
              activeTab === 'general' ? 'border-green-600 text-green-700 bg-white' : 'border-transparent hover:text-gray-700'
            }`}
          >
            General Profile
          </button>
          <button 
            onClick={() => setActiveTab('credit')}
            className={`flex-1 py-3 text-center border-b-2 transition ${
              activeTab === 'credit' ? 'border-green-600 text-green-700 bg-white' : 'border-transparent hover:text-gray-700'
            }`}
          >
            Credit & Limits
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 max-h-[380px] overflow-y-auto">
            {activeTab === 'general' ? (
              <div className="space-y-4">
                
                {/* Auto Generated Customer ID */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Auto-Generated Customer ID</label>
                  <input
                    type="text"
                    readOnly
                    value={customerId}
                    className="w-full rounded-lg border border-gray-300 bg-green-50/50 px-3 py-2 text-xs font-extrabold text-green-700 font-mono cursor-not-allowed select-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Customer Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter customer business/personal name..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold focus:border-green-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Phone Number *</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <Phone size={14} />
                      </span>
                      <input
                        type="tel"
                        required
                        placeholder="10-digit number"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="pl-9 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold focus:border-green-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Customer Category</label>
                    <select
                      value={custType}
                      onChange={(e) => setCustType(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-none"
                    >
                      <option value="Dealer">Dealer (Wholesale Price)</option>
                      <option value="Retailer">Retailer (Retail Price)</option>
                      <option value="Farmer">Farmer (Farmer Price)</option>
                      <option value="Walk-in Customer">Walk-in Cash Customer</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Full Shipping & Billing Address</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-400">
                      <MapPin size={14} />
                    </span>
                    <textarea
                      placeholder="Shop details, street address, region..."
                      rows="3"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="pl-9 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold focus:border-green-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            ) : (
              // Credit tab
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-xs text-green-800 flex items-start space-x-2">
                  <DollarSign size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-bold">Credit Limit Rule</span>
                    <p className="text-[10px] text-green-700 mt-0.5 leading-relaxed">
                      Dealers and Wholesalers enjoy ledger balance terms. Setting limit enforces hard checks during POS save unless approved by a Manager passcode.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Approved Credit Limit (Rs.)</label>
                  <input
                    type="number"
                    disabled={custType === 'Walk-in Customer'}
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold focus:border-green-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
                    placeholder="Enter limit e.g. 100000"
                  />
                  {custType === 'Walk-in Customer' && (
                    <span className="text-[9px] text-red-500 mt-1 block font-semibold">Walk-in Cash customer has no ledger limit accounts.</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer Action buttons */}
          <div className="bg-gray-50 px-6 py-4 flex items-center justify-end space-x-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition"
            >
              Save Customer & Set Active
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}

// ----------------------------------------------------
// 2. CUSTOMER DETAILS & LEDGER VIEW MODAL
// ----------------------------------------------------
function CustomerDetailsModal({ customer, onClose, invoices }) {
  // Find invoices of this customer
  const customerInvoices = invoices.filter(inv => inv.customer_id === customer.id);
  const ledgerLimitPercent = customer.credit_limit > 0 ? (customer.outstanding_balance / customer.credit_limit) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-green-600 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center space-x-2">
            <FileText size={18} />
            <h3 className="font-bold text-sm">Customer Profile & Outstanding Ledger</h3>
          </div>
          <button onClick={onClose} className="hover:bg-green-700 p-1 rounded-full transition">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Top Quick Profile Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-50 p-4 border border-gray-200 rounded-xl text-xs">
            <div>
              <span className="text-gray-400 block font-semibold uppercase text-[9px] tracking-wide">Customer Account</span>
              <span className="font-bold text-gray-900 block mt-0.5">{customer.name}</span>
              <span className="text-green-700 font-bold block mt-1">{customer.customer_type}</span>
            </div>
            <div>
              <span className="text-gray-400 block font-semibold uppercase text-[9px] tracking-wide">Contact Details</span>
              <span className="font-medium text-gray-800 block mt-0.5">Phone: {customer.phone}</span>
            </div>
            <div>
              <span className="text-gray-400 block font-semibold uppercase text-[9px] tracking-wide">Outstanding Balance Profile</span>
              <div className="flex items-center justify-between mt-1">
                <span className="font-bold text-red-600">Rs. {customer.outstanding_balance.toLocaleString()}</span>
                <span className="text-[10px] text-gray-500 font-semibold">Limit: Rs. {customer.credit_limit.toLocaleString()}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2 overflow-hidden">
                <div 
                  className={`h-full rounded-full ${ledgerLimitPercent > 80 ? 'bg-red-500' : 'bg-green-500'}`}
                  style={{ width: `${Math.min(100, ledgerLimitPercent)}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Historical Ledger Invoices Table */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wide block">Recent Sales Invoices ({customerInvoices.length})</span>
            <div className="border border-gray-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-gray-50 sticky top-0 border-b border-gray-200">
                  <tr className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    <th className="py-2.5 px-4">Invoice No</th>
                    <th className="py-2.5 px-4">Date / Time</th>
                    <th className="py-2.5 px-4">Payment Method</th>
                    <th className="py-2.5 px-4 text-right">Grand Total</th>
                    <th className="py-2.5 px-4 text-right">Settled Amount</th>
                    <th className="py-2.5 px-4 text-right">Due Balance</th>
                    <th className="py-2.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {customerInvoices.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-8 text-center text-gray-400 font-medium bg-gray-50/30">
                        No previous purchase invoice logs found for this customer.
                      </td>
                    </tr>
                  ) : (
                    customerInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4 font-mono font-bold text-green-700">{inv.invoice_no}</td>
                        <td className="py-3 px-4 text-gray-500 font-medium">{inv.date} {inv.time}</td>
                        <td className="py-3 px-4 font-semibold text-gray-600">{inv.payment_method}</td>
                        <td className="py-3 px-4 text-right font-bold text-gray-800">Rs. {inv.grand_total.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right font-semibold text-green-600">Rs. {inv.paid_amount.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right font-bold text-red-600">Rs. {inv.remaining_amount.toLocaleString()}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            inv.payment_status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {inv.payment_status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition"
          >
            Close Profile
          </button>
        </div>

      </div>
    </div>
  );
}

// ----------------------------------------------------
// 3. BATCH SELECTION MODAL
// ----------------------------------------------------
function BatchSelectModal({ product, onClose, addBatchToCart }) {
  if (!product) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-green-600 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center space-x-2">
            <Layers size={18} />
            <h3 className="font-bold text-sm">Select Batch & View Inventory</h3>
          </div>
          <button onClick={onClose} className="hover:bg-green-700 p-1 rounded-full transition">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="text-xs">
            <span className="text-gray-400 uppercase font-bold text-[9px] block">Product Selected</span>
            <span className="font-bold text-gray-800 text-sm block mt-0.5">{product.name}</span>
            <span className="text-gray-500 font-semibold block mt-1">{product.code}</span>
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-2.5 px-4">Batch Number</th>
                  <th className="py-2.5 px-4">MFG Date</th>
                  <th className="py-2.5 px-4">Expiry Date</th>
                  <th className="py-2.5 px-4 text-right">Available Stock</th>
                  <th className="py-2.5 px-4 text-right">Purchase Rate (Rs.)</th>
                  <th className="py-2.5 px-4 text-right">Selling Rate (Rs.)</th>
                  <th className="py-2.5 px-4 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {product.batches.map((batch) => {
                  const isExpired = new Date(batch.expiry_date) < new Date();
                  const isNearExpiry = (new Date(batch.expiry_date) - new Date()) / (1000 * 60 * 60 * 24) <= 30;
                  
                  return (
                    <tr 
                      key={batch.id} 
                      className={`hover:bg-green-50/30 transition ${batch.stock_qty <= 0 ? 'opacity-60 bg-gray-50' : ''}`}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-gray-700">{batch.batch_no}</td>
                      <td className="py-3 px-4 text-gray-500">{batch.mfg_date}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isExpired 
                            ? 'bg-red-100 text-red-700' 
                            : 'text-gray-600 bg-gray-100'
                        }`}>
                          {batch.expiry_date}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-gray-800">
                        {batch.stock_qty <= 0 ? (
                          <span className="text-red-500 font-bold uppercase text-[9px] bg-red-50 px-2 py-0.5 rounded border border-red-200">Low Stock</span>
                        ) : (
                          `${batch.stock_qty} Litre/Kg`
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-gray-500">Rs. {batch.purchase_rate}</td>
                      <td className="py-3 px-4 text-right font-bold text-green-700">Rs. {batch.selling_rate}</td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          disabled={batch.stock_qty <= 0}
                          onClick={() => {
                            addBatchToCart(product, batch);
                            onClose();
                          }}
                          className="px-3.5 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg text-[10px] font-bold transition shadow-sm"
                        >
                          Select Batch
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 transition"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}

// ----------------------------------------------------
// 4. HOLD & RECALL SALES MODAL
// ----------------------------------------------------
function HoldRecallModal({ heldSales, setHeldSales, onClose, onRecall, triggerNotificationToast }) {
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const handleDelete = (held) => {
    if (setHeldSales) {
      setHeldSales(prev => (prev || []).filter(h => h.id !== held.id));
    }
    setDeleteConfirmId(null);
    if (triggerNotificationToast) {
      triggerNotificationToast('Bill Deleted', `Held bill ${held.hold_no || held.id} removed.`, 'info');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto select-none">
      <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-xs">
              <Clock size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm tracking-wide">Held Bills Counter</h3>
              <p className="text-[10px] text-green-100 font-medium">
                {heldSales.length} bill{heldSales.length !== 1 ? 's' : ''} currently on hold
              </p>
            </div>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-1.5 rounded-full transition cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          {heldSales.length === 0 ? (
            <div className="py-16 text-center space-y-3 bg-gray-50/60 rounded-2xl border-2 border-dashed border-gray-200">
              <Clock size={42} className="mx-auto text-gray-300" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide">No Held Bills Found</h4>
                <p className="text-xs text-gray-400">Bills paused by cashiers will appear here for quick resuming.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {heldSales.map((held) => {
                const itemList = Array.isArray(held.items) ? held.items : (Array.isArray(held.cart) ? held.cart : []);
                const itemsCount = held.itemCount || itemList.reduce((sum, i) => sum + (i.quantity || 1), 0) || itemList.length;
                const grandTotal = held.grandTotal || held.totalAmount || itemList.reduce((s, i) => s + (i.total || 0), 0);
                const custName = held.customer_name || (held.customer && held.customer.name) || held.walkInName || 'Walk-in Customer';
                const custType = (held.customer && held.customer.customer_type) || 'Retail';
                const isDeleting = deleteConfirmId === held.id;

                return (
                  <div
                    key={held.id}
                    className="bg-white border border-gray-200 rounded-xl p-4 hover:border-green-300 transition shadow-2xs space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-extrabold text-green-700 bg-green-50 px-2.5 py-1 rounded-lg border border-green-200 text-xs">
                          {held.hold_no || held.id}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-extrabold text-xs text-gray-900">{custName}</h4>
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                              {custType}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-gray-400 font-medium mt-0.5">
                            <span className="flex items-center gap-1"><Calendar size={11} /> {held.date} {held.time}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-right">
                        <div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase block">Items</span>
                          <span className="text-xs font-extrabold text-gray-800">{itemsCount} item{itemsCount !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="border-l border-gray-200 pl-4">
                          <span className="text-[10px] font-bold text-gray-400 uppercase block">Total Amount</span>
                          <span className="text-sm font-black text-green-700 font-mono">Rs. {grandTotal.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Items List Preview Pills */}
                    {itemList.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 bg-gray-50 p-2 rounded-lg border border-gray-100 text-[11px] text-gray-600">
                        {itemList.slice(0, 4).map((it, idx) => (
                          <span key={idx} className="bg-white px-2 py-0.5 rounded border border-gray-200 font-semibold text-[10px] text-gray-700">
                            {it.product?.name || it.product_name || 'Product'} ({it.quantity} {it.unitLabel || it.unit || ''})
                          </span>
                        ))}
                        {itemList.length > 4 && (
                          <span className="text-[10px] font-bold text-gray-400 self-center pl-1">
                            +{itemList.length - 4} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Action Bar / Delete Confirmation */}
                    <div className="flex items-center justify-between pt-1">
                      {isDeleting ? (
                        <div className="w-full bg-red-50 border border-red-200 rounded-lg p-2.5 flex items-center justify-between animate-in fade-in duration-150">
                          <div className="flex items-center gap-2 text-xs font-bold text-red-700">
                            <AlertTriangle size={15} />
                            <span>Permanently delete held bill {held.hold_no || held.id}?</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-3 py-1 bg-white border border-gray-300 hover:bg-gray-100 rounded text-xs font-bold text-gray-700 cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(held)}
                              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-extrabold cursor-pointer"
                            >
                              Confirm Delete
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(held.id)}
                            className="px-3 py-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <Trash2 size={14} />
                            <span>Remove</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              onRecall(held);
                              onClose();
                            }}
                            className="px-4 py-1.5 bg-green-600 hover:bg-green-700 active:scale-95 text-white rounded-lg text-xs font-extrabold transition shadow-sm flex items-center gap-1.5 cursor-pointer"
                          >
                            <RotateCcw size={14} />
                            <span>Resume Bill</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-100 shrink-0">
          <span className="text-xs text-gray-500 font-medium">
            Resuming a bill restores all cart products, discounts, and customer details.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-700 bg-white hover:bg-gray-100 transition cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}

// ----------------------------------------------------
// 5. PRINT PREVIEW MODAL (Thermal Receipt & A4)
// ----------------------------------------------------
function PrintPreviewModal({ invoice, onClose, triggerNotificationToast }) {
  const [printSize, setPrintSize] = useState('A4'); // 'Thermal' or 'A4'

  if (!invoice) return null;

  const customer = CUSTOMERS.find(c => c.id === invoice.customer_id) || {};

  const handlePrintAction = () => {
    triggerNotificationToast('Printing', `Opening print window for ${invoice.invoice_no}...`, 'success');
    setTimeout(() => {
      window.print();
    }, 200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            #printable-receipt, #printable-receipt * {
              visibility: visible !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            #printable-receipt {
              position: fixed !important;
              left: 0 !important;
              top: 0 !important;
              margin: 0 !important;
              padding: 16px !important;
              width: 100% !important;
              max-width: 100% !important;
              border: none !important;
              box-shadow: none !important;
              background: #fff !important;
              z-index: 999999 !important;
              page-break-after: avoid !important;
              page-break-inside: avoid !important;
            }
            @page { margin: 0; }
          }
        `}
      </style>
      <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-3xl shadow-2xl my-8 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-green-600 px-6 py-4 flex items-center justify-between text-white flex-shrink-0">
          <div className="flex items-center space-x-2">
            <Printer size={18} />
            <h3 className="font-bold text-sm">Print Invoice Preview</h3>
          </div>
          <div className="flex items-center space-x-2 mr-6 text-xs font-semibold">
            <span>Size:</span>
            <div className="bg-green-700/60 p-0.5 rounded-lg flex">
              <button 
                onClick={() => setPrintSize('Thermal')}
                className={`px-3 py-1 rounded-md transition ${printSize === 'Thermal' ? 'bg-white text-green-800' : 'text-white hover:text-green-100'}`}
              >
                Thermal (3")
              </button>
              <button 
                onClick={() => setPrintSize('A4')}
                className={`px-3 py-1 rounded-md transition ${printSize === 'A4' ? 'bg-white text-green-800' : 'text-white hover:text-green-100'}`}
              >
                Wholesale A4
              </button>
            </div>
          </div>
          <button onClick={onClose} className="hover:bg-green-700 p-1 rounded-full transition">
            <X size={18} />
          </button>
        </div>

        {/* Invoice Area */}
        <div className="p-6 bg-gray-100 overflow-y-auto flex-1 flex justify-center">
          
          {printSize === 'Thermal' ? (
            /* Thermal Layout */
            <div id="printable-receipt" className="bg-white w-[300px] border border-gray-300 p-4 shadow-sm text-[10px] font-mono text-gray-800 space-y-3">
              <div className="text-center">
                <h4 className="font-bold text-sm tracking-wide">PAK AGRO-CHEMICALS H.O.</h4>
                <p>Grain Market Road, Multan, Punjab, Pakistan</p>
                <p>Phone: +92 300 1234567</p>
                <div className="border-t border-dashed border-gray-400 my-2"></div>
                <p className="text-[9px]">INVOICE: {invoice.invoice_no}</p>
                <p className="text-[9px]">DATE: {invoice.date} {invoice.time}</p>
                <p className="text-[9px]">CASHIER: {invoice.cashier_name}</p>
                <p className="text-[9px]">CUSTOMER: {invoice.customer_name}</p>
              </div>
              <div className="border-t border-dashed border-gray-400"></div>
              
              <table className="w-full text-[9px] text-left">
                <thead>
                  <tr className="border-b border-dashed border-gray-400 font-bold">
                    <th className="py-1">ITEM</th>
                    <th className="py-1 text-center">QTY</th>
                    <th className="py-1 text-right">TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item, idx) => {
                    const hasFree = item.offer_type === 'BuyXGetY' && item.free_qty > 0;
                    return (
                      <React.Fragment key={idx}>
                        <tr className="border-b border-dashed border-gray-200">
                          <td className="py-1 max-w-[150px] truncate">
                            {item.product_name}
                            {item.offer_applied && item.offer_type !== 'BuyXGetY' && (
                              <span className="ml-1 text-[7px] font-bold text-green-600">[OFFER]</span>
                            )}
                          </td>
                          <td className="py-1 text-center">{item.quantity}</td>
                          <td className="py-1 text-right">Rs. {item.line_total}</td>
                        </tr>
                        {hasFree && (
                          <tr className="border-b border-dashed border-gray-200 bg-green-50">
                            <td className="py-1 max-w-[150px] truncate text-green-700">
                              {item.product_name}
                              <span className="ml-1 text-[7px] font-black bg-green-600 text-white px-1 rounded">FREE</span>
                            </td>
                            <td className="py-1 text-center text-green-700">{item.free_qty}</td>
                            <td className="py-1 text-right text-green-700 line-through">Rs. {(item.original_price * item.free_qty).toFixed(2)}</td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>

              <div className="border-t border-dashed border-gray-400 pt-2 space-y-1 text-right">
                <div className="flex justify-between"><span>SUBTOTAL:</span><span>Rs. {invoice.subtotal}</span></div>
                {(() => {
                  const offerSavings = (invoice.items || []).reduce((s, it) => {
                    if (it.offer_type === 'BuyXGetY' && it.free_qty > 0) return s + (it.original_price * it.free_qty);
                    if (it.discount > 0) return s + (it.discount * it.quantity);
                    return s;
                  }, 0);
                  return offerSavings > 0 ? (
                    <div className="flex justify-between text-[8px] text-green-600">
                      <span>OFFER SAVINGS:</span>
                      <span>-Rs. {offerSavings.toFixed(2)}</span>
                    </div>
                  ) : null;
                })()}
                {(invoice.discount_amount > 0 && (!invoice.bill_discount || invoice.discount_amount > invoice.bill_discount)) && (
                  <div className="flex justify-between text-[8px] text-green-600"><span>(ITEM SAVINGS):</span><span>Rs. {invoice.discount_amount - (invoice.bill_discount || 0)}</span></div>
                )}
                <div className="flex justify-between"><span>TAX:</span><span>+Rs. {invoice.tax_amount}</span></div>
                {invoice.bill_discount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>BILL DISCOUNT {invoice.bill_discount_type === 'Percentage' ? `(${invoice.bill_discount_value}%)` : ''}:</span>
                    <span>-Rs. {invoice.bill_discount}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-xs border-t border-dashed border-gray-400 pt-1">
                  <span>GRAND TOTAL:</span>
                  <span>Rs. {invoice.grand_total}</span>
                </div>
                <div className="flex justify-between text-[8px] text-gray-500"><span>PAID AMOUNT:</span><span>Rs. {invoice.paid_amount}</span></div>
                <div className="flex justify-between text-[8px] text-red-500"><span>BALANCE DUE:</span><span>Rs. {invoice.remaining_amount}</span></div>
              </div>

              <div className="border-t border-dashed border-gray-400 pt-3 text-center space-y-2">
                <p className="font-bold">THANK YOU FOR YOUR BUSINESS!</p>
                {/* Simulated barcode */}
                <div className="flex flex-col items-center justify-center pt-1">
                  <div className="h-6 w-32 bg-gray-900 flex items-center justify-center text-white text-[8px]">
                    ||||| | || ||||| |
                  </div>
                  <span className="text-[8px] text-gray-400 block mt-0.5">{invoice.invoice_no}</span>
                </div>
              </div>
            </div>
          ) : (
            /* A4 Layout */
            <div id="printable-receipt" className="bg-white w-[595px] min-h-[842px] border border-gray-300 p-8 shadow-sm text-xs font-sans text-gray-800 space-y-6">
              
              {/* Top Banner A4 Header */}
              <div className="flex justify-between items-start border-b-2 border-green-600 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-green-700 tracking-wider">AGRO CHEMICALS WHOLESALE ERP</h2>
                  <p className="text-gray-500 font-medium">Distributor & Seed Wholesaler</p>
                  <p className="text-[10px] mt-1">Shop 14, Grain Market Road, Multan, Punjab, Pakistan</p>
                  <p className="text-[10px]">Email: info@pakagroerp.pk | Phone: +92 300 1234567</p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-gray-800 uppercase block tracking-wider">INVOICE</span>
                  <span className="font-mono text-green-600 font-bold block mt-1">{invoice.invoice_no}</span>
                  <p className="text-[10px] text-gray-500 mt-0.5">Date: {invoice.date} | Time: {invoice.time}</p>
                </div>
              </div>

              {/* Billed To vs Delivered From */}
              <div className="grid grid-cols-2 gap-8 text-[11px]">
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <span className="text-gray-400 block font-bold uppercase text-[9px] tracking-wide mb-1">Customer / Billed To</span>
                  <h4 className="font-bold text-gray-900 text-xs">{invoice.customer_name}</h4>
                  <span className="text-[10px] text-green-600 font-semibold mt-0.5 block">{invoice.customer_type} Account</span>
                  <p className="text-[10px] text-gray-500 mt-2">Mobile: {customer.phone ? (customer.phone.startsWith('+') ? customer.phone : `+92 ${customer.phone}`) : 'N/A'}</p>
                  <p className="text-[10px] text-gray-500 leading-normal mt-0.5">{customer.address || 'N/A'}</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <span className="text-gray-400 block font-bold uppercase text-[9px] tracking-wide mb-1">Counter Session Details</span>
                  <p className="font-medium text-gray-800">Branch Depot: Multan Main H.O.</p>
                  <p className="font-medium text-gray-800 mt-1">Active Cashier: {invoice.cashier_name}</p>
                  <p className="font-medium text-gray-800 mt-1">Settlement Method: {invoice.payment_method}</p>
                  <p className="font-medium text-gray-800 mt-1">Status: <span className="font-bold text-green-600 uppercase">{invoice.payment_status}</span></p>
                </div>
              </div>

              {/* A4 Items Table */}
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-green-600 text-white font-bold">
                    <th className="py-2.5 px-4 rounded-l-lg">#</th>
                    <th className="py-2.5 px-4">Agro Product Description</th>
                    <th className="py-2.5 px-4 text-center">Unit</th>
                    <th className="py-2.5 px-4 text-right">Qty Sold</th>
                    <th className="py-2.5 px-4 text-right">Unit Rate (Rs.)</th>
                    <th className="py-2.5 px-4 text-right rounded-r-lg">Line Total (Rs.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {invoice.items.map((item, index) => {
                    const hasFree = item.offer_type === 'BuyXGetY' && item.free_qty > 0;
                    const paidQty = hasFree ? item.quantity - item.free_qty : item.quantity;
                    return (
                      <React.Fragment key={index}>
                        <tr className="hover:bg-gray-50">
                          <td className="py-3 px-4 font-semibold text-gray-400">{index + 1}</td>
                          <td className="py-3 px-4 font-bold text-gray-800">
                            {item.product_name}
                            {item.offer_applied && (
                              <span className="ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200">
                                🏷️ {item.offer_applied}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center text-gray-500 font-semibold">{item.unit || 'Litre/Kg'}</td>
                          <td className="py-3 px-4 text-right font-bold text-gray-800">
                            {hasFree ? paidQty : item.quantity}
                            {hasFree && <span className="text-[9px] text-gray-400 block">({item.quantity} total)</span>}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-gray-500">Rs. {item.price}</td>
                          <td className="py-3 px-4 text-right font-bold text-green-700">Rs. {item.line_total}</td>
                        </tr>
                        {hasFree && (
                          <tr className="bg-green-50 border-l-2 border-green-400">
                            <td className="py-2 px-4 text-green-500 font-semibold text-[10px]">↳</td>
                            <td className="py-2 px-4">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-green-700 text-[11px]">{item.product_name}</span>
                                <span className="text-[9px] font-black px-2 py-0.5 bg-green-600 text-white rounded-full">FREE</span>
                              </div>
                              <p className="text-[9px] text-green-600 font-semibold mt-0.5">Complimentary — {item.offer_applied}</p>
                            </td>
                            <td className="py-2 px-4 text-center text-green-600 font-semibold text-[11px]">{item.unit || 'Litre/Kg'}</td>
                            <td className="py-2 px-4 text-right font-bold text-green-700">{item.free_qty}</td>
                            <td className="py-2 px-4 text-right font-semibold text-gray-400 line-through">Rs. {item.original_price}</td>
                            <td className="py-2 px-4 text-right font-bold text-green-700">Rs. 0.00</td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>

              {/* A4 Totals Summary */}
              <div className="grid grid-cols-12 gap-6 pt-4 border-t border-gray-200">
                
                {/* Notes and Terms left */}
                <div className="col-span-7 text-[10px] text-gray-500 space-y-1.5 leading-normal">
                  <span className="font-bold text-gray-700 block text-xs">Terms & Pesticide Declarations:</span>
                  <p>1. Returns must be accompanied with original batch label and invoice document.</p>
                  <p>2. Products once sold cannot be refunded if seal/bottle container is broken.</p>
                  <p>3. Store in a cool dry place, strictly away from foodstuff or cattle feed.</p>
                </div>

                {/* Subtotals right */}
                <div className="col-span-5 text-right space-y-2 font-medium">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Subtotal:</span>
                    <span className="text-gray-800 font-bold">Rs. {invoice.subtotal.toLocaleString()}</span>
                  </div>
                  {/* Offer Savings line */}
                  {(() => {
                    const offerSavings = (invoice.items || []).reduce((s, it) => {
                      if (it.offer_type === 'BuyXGetY' && it.free_qty > 0) return s + (it.original_price * it.free_qty);
                      if (it.discount > 0) return s + (it.discount * it.quantity);
                      return s;
                    }, 0);
                    return offerSavings > 0 ? (
                      <div className="flex justify-between text-[10px] text-amber-600 font-bold">
                        <span>🏷️ Offer Savings:</span>
                        <span>-Rs. {offerSavings.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      </div>
                    ) : null;
                  })()}
                  {(invoice.discount_amount > 0 && (!invoice.bill_discount || invoice.discount_amount > invoice.bill_discount)) && (
                    <div className="flex justify-between text-[10px] text-green-600">
                      <span>(Item Savings):</span>
                      <span>Rs. {(invoice.discount_amount - (invoice.bill_discount || 0)).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-400">VAT/GST Calculated:</span>
                    <span className="text-gray-800 font-bold">+Rs. {invoice.tax_amount.toLocaleString()}</span>
                  </div>
                  {invoice.bill_discount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span className="text-gray-400">Bill Discount {invoice.bill_discount_type === 'Percentage' ? `(${invoice.bill_discount_value}%)` : ''}:</span>
                      <span>-Rs. {invoice.bill_discount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-400">Freight Logistics:</span>
                    <span className="text-gray-800 font-bold">+Rs. {invoice.freight}</span>
                  </div>
                  <div className="flex justify-between border-t-2 border-green-600 pt-2 text-xs font-bold text-green-800">
                    <span>Invoice Grand Total:</span>
                    <span className="text-base">Rs. {invoice.grand_total.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-gray-500 pt-1 border-t border-gray-100">
                    <span>Settle Received:</span>
                    <span>Rs. {invoice.paid_amount.toLocaleString()}</span>
                  </div>
                  {invoice.remaining_amount > 0 && (
                    <div className="flex justify-between text-[11px] font-bold text-red-600">
                      <span>Ledger Balance Due:</span>
                      <span>Rs. {invoice.remaining_amount.toLocaleString()}</span>
                    </div>
                  )}
                </div>

              </div>



            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="bg-gray-50 px-6 py-4 flex justify-between border-t border-gray-100 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 transition"
          >
            Clear Screen & New Sale
          </button>
          
          <div className="flex space-x-3">
            <button
              onClick={() => {
                triggerNotificationToast('Export PDF', 'Opening print window to save as PDF...', 'info');
                setTimeout(() => {
                  window.print();
                }, 200);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 transition flex items-center space-x-1.5 cursor-pointer"
            >
              <Download size={14} className="text-green-600" />
              <span>Export PDF</span>
            </button>
            <button
              onClick={handlePrintAction}
              className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer shadow-sm active:scale-95"
            >
              <Printer size={14} />
              <span>Direct Print Receipt</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

// ----------------------------------------------------
// 6. SALES RETURN INVOICE MODAL
// ----------------------------------------------------
function ReturnsModal({ invoices, setInvoices, onClose, addAuditLog, triggerNotificationToast }) {
  const [returnInvoiceNo, setReturnInvoiceNo] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [returnQtys, setReturnQtys] = useState({}); // item_index -> qty
  const [returnReason, setReturnReason] = useState('Product Damaged');

  const handleSearchInvoice = (e) => {
    e.preventDefault();
    const found = invoices.find(inv => inv.invoice_no.toLowerCase() === returnInvoiceNo.trim().toLowerCase());
    if (found) {
      setSelectedInvoice(found);
      // Initialize return quantities with zeros
      const initialQtys = {};
      found.items.forEach((item, idx) => {
        initialQtys[idx] = 0;
      });
      setReturnQtys(initialQtys);
      triggerNotificationToast('Invoice Loaded', `Found ${found.invoice_no}`, 'success');
    } else {
      triggerNotificationToast('Not Found', 'Invoice number does not exist.', 'error');
    }
  };

  const handleReturnQtyChange = (idx, maxVal, value) => {
    const val = parseInt(value) || 0;
    if (val < 0) return;
    if (val > maxVal) {
      triggerNotificationToast('Limit Exceeded', `Cannot return more than purchased (${maxVal})`, 'warning');
      return;
    }
    setReturnQtys({
      ...returnQtys,
      [idx]: val
    });
  };

  const submitReturnInvoice = () => {
    // Check if at least one item returned
    const hasItems = Object.values(returnQtys).some(q => q > 0);
    if (!hasItems) {
      triggerNotificationToast('No Items', 'Please enter a return quantity for at least one product.', 'error');
      return;
    }

    // Reconstruct return values
    let returnSubtotal = 0;
    selectedInvoice.items.forEach((item, idx) => {
      const q = returnQtys[idx] || 0;
      if (q > 0) {
        const itemUnitPrice = item.line_total / item.quantity;
        returnSubtotal += itemUnitPrice * q;
      }
    });

    const refundAmt = Math.round(returnSubtotal);
    const returnNo = `RET-2026-000${Math.floor(100 + Math.random()*900)}`;
    
    // Log audit
    addAuditLog('Sales Return', `Processed sales return ${returnNo} for Invoice ${selectedInvoice.invoice_no}. Refunded/Credited: $${refundAmt}`);
    triggerNotificationToast('Return Success', `Created return receipt ${returnNo}`, 'success');
    
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-green-600 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center space-x-2">
            <RotateCcw size={18} />
            <h3 className="font-bold text-sm">Offline Sales Return Terminal</h3>
          </div>
          <button onClick={onClose} className="hover:bg-green-700 p-1 rounded-full transition">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          
          {/* Search box */}
          {!selectedInvoice ? (
            <form onSubmit={handleSearchInvoice} className="space-y-3">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Enter Sold Invoice Number</label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  required
                  placeholder="e.g. INV-2026-0001..."
                  value={returnInvoiceNo}
                  onChange={(e) => setReturnInvoiceNo(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold focus:border-green-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-5 py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition"
                >
                  Locate
                </button>
              </div>
              <div className="text-[10px] text-gray-500 font-semibold bg-gray-50 p-2.5 rounded border">
                Quick Demo tip: Try searching <strong>INV-2026-0001</strong> or <strong>INV-2026-0002</strong>.
              </div>
            </form>
          ) : (
            // Return selection form
            <div className="space-y-4 text-xs">
              <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-200">
                <div>
                  <span className="text-gray-400 block font-semibold text-[9px] uppercase">Invoice Found</span>
                  <span className="font-bold text-green-700 text-sm block">{selectedInvoice.invoice_no}</span>
                  <span className="text-gray-500 font-semibold block">{selectedInvoice.customer_name}</span>
                </div>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="text-xs font-bold text-green-600 hover:text-green-800 transition"
                >
                  Change Invoice
                </button>
              </div>

              {/* Items List */}
              <div className="border border-gray-200 rounded-xl overflow-hidden max-h-52 overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50">
                    <tr className="text-[10px] font-bold text-gray-500 uppercase">
                      <th className="py-2.5 px-4">Item Name</th>
                      <th className="py-2.5 px-4 text-right">Sold Rate</th>
                      <th className="py-2.5 px-4 text-center">Purchased Qty</th>
                      <th className="py-2.5 px-4 text-center w-24">Return Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {selectedInvoice.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-3 px-4 font-bold text-gray-800">
                          {item.product_name}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-gray-600">Rs. {item.price}</td>
                        <td className="py-3 px-4 text-center font-semibold text-gray-700">{item.quantity}</td>
                        <td className="py-3 px-4 text-center">
                          <input
                            type="number"
                            value={returnQtys[idx] || 0}
                            onChange={(e) => handleReturnQtyChange(idx, item.quantity, e.target.value)}
                            className="w-16 rounded border border-gray-300 px-1.5 py-0.5 text-center font-bold text-xs focus:border-green-500 focus:outline-none"
                            min="0"
                            max={item.quantity}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Refund Summary Reason */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Reason for Return</label>
                  <select
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-none"
                  >
                    <option value="Product Damaged">Product Damaged / Leakage</option>
                    <option value="Expired Product">Sold Near Expiry / Expired</option>
                    <option value="Incorrect Batch">Incorrect Batch Delivered</option>
                    <option value="Customer Rejected">Customer Returned / Excess Stock</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Estimated Credit Refund (Rs.)</label>
                  <div className="bg-green-50 border border-green-200 p-2 rounded-lg text-right font-bold text-green-700 text-sm">
                    ${Object.keys(returnQtys).reduce((sum, idx) => {
                      const q = returnQtys[idx] || 0;
                      const item = selectedInvoice.items[idx];
                      const itemPrice = item.line_total / item.quantity;
                      return sum + (itemPrice * q);
                    }, 0).toLocaleString()}
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          {selectedInvoice && (
            <button
              onClick={submitReturnInvoice}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1.5"
            >
              <RotateCcw size={14} />
              <span>Process Sales Return</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

// ----------------------------------------------------
// 7. MANAGER PASSCODE APPROVAL OVERLAY
// ----------------------------------------------------
function ApprovalModal({ message, type, onClose, onApprove, triggerNotificationToast, addAuditLog }) {
  const [passcode, setPasscode] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Simulate check: passcode is '1234' for Manager, '0000' for Admin
    if (passcode === '1234' || passcode === '0000') {
      addAuditLog('Manager Approved', `Security passcode override accepted for ${type}.`);
      triggerNotificationToast('Passcode Approved', 'Security override allowed successfully.', 'success');
      onApprove();
    } else {
      triggerNotificationToast('Passcode Refused', 'Incorrect supervisor passcode.', 'error');
      setPasscode('');
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Warning Banner */}
        <div className="bg-amber-500 px-6 py-4 flex items-center space-x-2.5 text-white">
          <Lock size={20} className="animate-bounce" />
          <h3 className="font-bold text-sm">Supervisor Approval Required</h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-center">
          
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-800 text-left flex items-start space-x-2">
            <AlertTriangle size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="leading-relaxed font-semibold">{message}</p>
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1 text-left">Enter Manager Passcode</label>
            <input
              type="password"
              required
              autoFocus
              placeholder="••••"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="w-full text-center text-lg tracking-widest font-mono rounded-lg border border-gray-300 px-3 py-2 focus:border-amber-500 focus:outline-none"
              maxLength="6"
            />
            <span className="text-[9px] text-gray-400 mt-1 block">Quick Demo Code: <strong>1234</strong></span>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 py-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 transition"
            >
              Deny / Cancel
            </button>
            <button
              type="submit"
              className="w-1/2 py-2 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-600 transition"
            >
              Verify Passcode
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}

// ----------------------------------------------------
// 8. QUICK ADD PRODUCT MODAL
// ----------------------------------------------------
function ProductAddModal({ onClose, addAuditLog, triggerNotificationToast }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState('CAT1');
  const [company, setCompany] = useState('C1');
  const [unit, setUnit] = useState('U1');
  const [retailPrice, setRetailPrice] = useState('');
  const [dealerPrice, setDealerPrice] = useState('');
  const [farmerPrice, setFarmerPrice] = useState('');
  const [wholesalePrice, setWholesalePrice] = useState('');
  const [batchNo, setBatchNo] = useState('');
  const [stockQty, setStockQty] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !code || !barcode || !retailPrice) {
      triggerNotificationToast('Validation Failed', 'Please complete required fields.', 'error');
      return;
    }

    const newProd = {
      id: `P_${Date.now()}`,
      code,
      barcode,
      name,
      category_id: category,
      company_id: company,
      unit_id: unit,
      tax_rate: 18,
      tax_type: 'Exclusive',
      dealer_price: parseFloat(dealerPrice) || parseFloat(retailPrice),
      retail_price: parseFloat(retailPrice),
      farmer_price: parseFloat(farmerPrice) || parseFloat(retailPrice),
      wholesale_price: parseFloat(wholesalePrice) || parseFloat(retailPrice),
      batches: [
        {
          id: `B_${Date.now()}`,
          batch_no: batchNo,
          mfg_date: new Date().toISOString().split('T')[0],
          expiry_date: expiryDate,
          purchase_rate: Math.round(parseFloat(retailPrice) * 0.7),
          selling_rate: parseFloat(retailPrice),
          stock_qty: parseInt(stockQty) || 0
        }
      ]
    };

    PRODUCTS.push(newProd);
    addAuditLog('Product Created', `Added product ${name} (${code}) with batch ${batchNo}`);
    triggerNotificationToast('Product Created', `${name} successfully added to catalogue.`, 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-green-600 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center space-x-2">
            <Layers size={18} />
            <h3 className="font-bold text-sm">Add New Product to Depot Catalog</h3>
          </div>
          <button onClick={onClose} className="hover:bg-green-700 p-1 rounded-full transition">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 max-h-[400px] overflow-y-auto text-xs">
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Product Brand Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Glyphosate Plus 500ml"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold focus:outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Product ERP Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. P-GLY-PLUS"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold focus:outline-none focus:border-green-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Barcode (EAN-13) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 8901234567..."
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold focus:outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-white rounded-lg border border-gray-300 px-2 py-2 text-xs font-semibold focus:outline-none"
                >
                  <option value="CAT1">Pesticides</option>
                  <option value="CAT2">Fungicides</option>
                  <option value="CAT3">Fertilizers</option>
                  <option value="CAT4">Seeds</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Brand Manufacturer</label>
                <select
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full bg-white rounded-lg border border-gray-300 px-2 py-2 text-xs font-semibold focus:outline-none"
                >
                  <option value="C1">Bayer CropScience</option>
                  <option value="C2">Syngenta India</option>
                  <option value="C3">UPL Limited</option>
                  <option value="C4">IFFCO</option>
                </select>
              </div>
            </div>

            {/* Pricing Tiers */}
            <div className="bg-green-50/50 p-4 border border-green-100 rounded-xl space-y-3">
              <span className="font-bold text-green-800 block text-[9px] uppercase tracking-wide">Multi-Tier Pricing Configuration</span>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-[9px] font-bold text-gray-400 uppercase mb-0.5">Retail (Rs.) *</label>
                  <input
                    type="number"
                    required
                    value={retailPrice}
                    onChange={(e) => setRetailPrice(e.target.value)}
                    className="w-full rounded bg-white border border-gray-300 px-2 py-1 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-gray-400 uppercase mb-0.5">Dealer (Rs.)</label>
                  <input
                    type="number"
                    value={dealerPrice}
                    onChange={(e) => setDealerPrice(e.target.value)}
                    className="w-full rounded bg-white border border-gray-300 px-2 py-1 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-gray-400 uppercase mb-0.5">Farmer (Rs.)</label>
                  <input
                    type="number"
                    value={farmerPrice}
                    onChange={(e) => setFarmerPrice(e.target.value)}
                    className="w-full rounded bg-white border border-gray-300 px-2 py-1 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-gray-400 uppercase mb-0.5">Wholesale (Rs.)</label>
                  <input
                    type="number"
                    value={wholesalePrice}
                    onChange={(e) => setWholesalePrice(e.target.value)}
                    className="w-full rounded bg-white border border-gray-300 px-2 py-1 text-xs focus:outline-none"
                  />
                </div>
              </div>
            </div>

          </div>

          <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition"
            >
              Save Product & Add Batch
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}

// ----------------------------------------------------
// 9. CLEAR TRANSACTION CONFIRMATION
// ----------------------------------------------------
function ClearConfirmModal({ onClose, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <div className="bg-red-500 px-6 py-4 text-white flex items-center space-x-2">
          <AlertOctagon size={20} />
          <h3 className="font-bold text-sm">Clear Active Grid?</h3>
        </div>

        <div className="p-6 space-y-4 text-center">
          <p className="text-xs text-gray-500 leading-relaxed font-semibold">
            Are you sure you want to empty the POS products table? All currently scanned items and modifications will be cleared from cache memory.
          </p>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="w-1/2 py-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="w-1/2 py-2 bg-red-500 text-white rounded-lg text-xs font-bold hover:bg-red-600 transition"
            >
              Yes, Clear Grid
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
