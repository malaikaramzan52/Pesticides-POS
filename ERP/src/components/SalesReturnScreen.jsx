import React, { useState, useMemo } from 'react';
import {
  RotateCcw,
  Search,
  X,
  Save,
  CheckCircle2,
  AlertTriangle,
  RefreshCcw,
  Package,
  ShoppingBag,
  History,
  Minus,
  Plus,
  FileText,
  Trash2,
  ChevronDown,
  Check,
  Printer
} from 'lucide-react';
import PrintHeader from './PrintHeader';
import { PRODUCTS, COMPANIES, getStoredData, setStoredData, saveProductsToStorage, getWarehouseStock } from '../utils/mockData';
import { salesApi, purchaseApi, customerApi, vendorApi } from '../api';
import PaymentProcessor from './PaymentProcessor';
import DateFilterBar from './DateFilterBar';
import { useLanguage } from '../context/LanguageContext';
import { isItemInDateRange } from '../utils/dateUtils';

// ─── Mock Purchase Returns ────────────────────────────────────────────────────
const INIT_PURCHASE_RETURNS = [];

const REASONS_SALE   = ['Farmer Return', 'Wrong Product', 'Damaged / Leaking', 'Quality Issue', 'Excess Ordered', 'Other'];
const REASONS_PURCH  = ['Damaged Packaging', 'Near Expiry', 'Wrong Product Delivered', 'Quality Issue', 'Excess Delivery', 'Other'];

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, color, title }) {
  return (
    <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
      <div className={`p-1.5 rounded-lg ${color}`}><Icon size={14} className="text-white" /></div>
      <span className="text-xs font-extrabold text-gray-800 uppercase tracking-wide">{title}</span>
    </div>
  );
}

// ─── Sales Return Form ────────────────────────────────────────────────────────
function SalesReturnForm({ invoices, onReturnSaved, addAuditLog, triggerNotificationToast, setPrintRecord }) {
  const [invoiceQuery, setInvoiceQuery]   = useState('');
  const [loadedInvoice, setLoadedInvoice] = useState(null);
  const [returnItems,  setReturnItems]    = useState([]);
  const [refundMethod, setRefundMethod]   = useState('Cash');
  const [paymentDetails, setPaymentDetails] = useState({});
  const [refundAmount, setRefundAmount]   = useState('');
  const [error, setError]                 = useState('');
  const [success, setSuccess]             = useState('');

  const handleSearch = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError(''); setSuccess('');
    const query = invoiceQuery.toLowerCase().trim();
    if (!query) {
      setError('Please enter an invoice number to search.');
      setLoadedInvoice(null);
      return;
    }

    const inv = invoices.find(i =>
      i.invoice_no?.toLowerCase() === query ||
      i.id?.toLowerCase() === query ||
      i._id?.toLowerCase() === query ||
      i.invoice_no?.toLowerCase().endsWith(query) ||
      i.id?.toLowerCase().endsWith(query)
    );

    if (!inv) {
      setError(`Invoice "${invoiceQuery}" not found.`);
      setLoadedInvoice(null);
      return;
    }

    // Block cancelled invoices immediately
    if (inv.status === 'Cancelled' || inv.payment_status === 'Cancelled') {
      setError(`Invoice "${inv.invoice_no}" is cancelled. Returns are not allowed.`);
      setLoadedInvoice(null);
      return;
    }

    // Check if all items in the invoice are already fully returned
    const allItemsReturned = inv.items && inv.items.length > 0 && inv.items.every(item => {
      const returned = Number(item.returned_qty || 0);
      const original = Number(item.quantity || 0);
      return returned >= original;
    });

    // Block fully-returned invoices immediately
    if (inv.return_status === 'Full' || inv.status === 'Fully Returned' || allItemsReturned) {
      setError(`Invoice "${inv.invoice_no}" has already been fully returned. No further returns allowed.`);
      setLoadedInvoice(null);
      return;
    }

    // Filter to returnable items only
    const returnableItems = (inv.items || []).map(item => {
      const returned = Number(item.returned_qty || 0);
      const original = Number(item.quantity || 0);
      const available = Math.max(0, original - returned);
      return {
        ...item,
        returnQty: available,
        maxReturnQty: available,
        reason: REASONS_SALE[0]
      };
    }).filter(item => item.maxReturnQty > 0);

    if (returnableItems.length === 0) {
      setError(`Invoice "${inv.invoice_no}" has already been fully returned. No further returns allowed.`);
      setLoadedInvoice(null);
      return;
    }

    setLoadedInvoice(inv);
    setReturnItems(returnableItems);
  };

  const setQty = (idx, val) => {
    const maxQ = returnItems[idx]?.maxReturnQty ?? (loadedInvoice?.items[idx]?.quantity || 999);
    const q = Math.max(0, Math.min(maxQ, parseInt(val) || 0));
    setReturnItems(p => p.map((item, i) => i === idx ? { ...item, returnQty: q } : item));
  };

  const setReason = (idx, val) => {
    setReturnItems(p => p.map((item, i) => i === idx ? { ...item, reason: val } : item));
  };

  const refundTotal = returnItems.reduce((s, item) => s + item.returnQty * item.price, 0);
  const hasReturn   = refundTotal > 0;

  React.useEffect(() => {
    if (refundTotal > 0 && refundAmount === '') {
      setRefundAmount(refundTotal);
    }
  }, [refundTotal, refundAmount]);

  const handleConfirm = async () => {
    if (!hasReturn) { setError('Please enter return quantity for at least one item.'); return; }
    
    const returnedItems = returnItems.filter(i => i.returnQty > 0);

    // Validate Payment Details
    if (refundMethod === 'Card') {
      if (!paymentDetails.card_type || !paymentDetails.card_number || !paymentDetails.card_name) {
        setError('Please fill in all required Card details.');
        return;
      }
    } else if (refundMethod === 'Bank Transfer') {
      if (!paymentDetails.bank_name || !paymentDetails.account_no || !paymentDetails.transaction_id) {
        setError('Please fill in all required Bank Transfer details.');
        return;
      }
    } else if (refundMethod === 'Mobile Wallet') {
      if (!paymentDetails.wallet_name || !paymentDetails.mobile_no || !paymentDetails.transaction_id) {
        setError('Please fill in all required Mobile Wallet details.');
        return;
      }
    }

    if (refundMethod !== 'Credit' && parseFloat(refundAmount) < refundTotal) {
      setError(`Refund amount (Rs. ${refundAmount}) cannot be less than Total Refund (Rs. ${refundTotal}).`);
      return;
    }

    // Update local PRODUCTS and WarehouseStock mock data for consistency
    const currentWarehouseStock = typeof getWarehouseStock === 'function' ? getWarehouseStock() : [];
    let updatedWarehouseStock = JSON.parse(JSON.stringify(currentWarehouseStock));

    returnedItems.forEach(item => {
      const p = PRODUCTS.find(prod => prod.id === (item.product_id || item.product?.id || item.product?._id) || prod.name === item.product_name);
      if (p) {
        if (!p.batches || p.batches.length === 0) {
          p.batches = [{ id: `B_${Date.now()}`, batch_no: item.batch_no || 'DEFAULT', stock_qty: item.returnQty }];
        } else {
          const targetBatch = p.batches.find(b => b.batch_no === item.batch_no) || p.batches[0];
          targetBatch.stock_qty = (targetBatch.stock_qty || 0) + item.returnQty;
        }
        
        // Sync WarehouseStock pos_counter_qty
        const totalStock = p.batches.reduce((sum, b) => sum + (b.stock_qty || 0), 0);
        const whIdx = updatedWarehouseStock.findIndex(w => w.product_id === p.id);
        if (whIdx >= 0) {
          updatedWarehouseStock[whIdx].pos_counter_qty = totalStock;
        }
      }
    });

    setStoredData('AGRO_ERP_WAREHOUSE_STOCK', updatedWarehouseStock);
    saveProductsToStorage();

    const rec = {
      id: `SR${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      type: 'Sales Return',
      invoice_no: loadedInvoice.invoice_no,
      customer: loadedInvoice.customer_name,
      items: returnedItems.map(i => ({ name: i.product_name, qty: i.returnQty, rate: i.price })),
      refund_total: refundTotal,
      refund_method: refundMethod,
      refund_details: paymentDetails,
      status: 'Processed',
    };

    try {
      await salesApi.salesReturn({
        invoice_no: loadedInvoice.invoice_no,
        customer: loadedInvoice.customer_name || loadedInvoice.customer || 'Walk-in Customer',
        items: returnedItems.map(i => ({
          name: i.product_name || i.name || 'Unknown Product',
          qty: i.returnQty,
          rate: i.price || i.rate || 0,
          reason: i.reason || 'Farmer Return'
        })),
        refund_total: refundTotal,
        refund_method: refundMethod
      });

      if (triggerNotificationToast) {
        triggerNotificationToast('Sales Refund Processed', `Refund of Rs. ${refundTotal.toLocaleString()} issued successfully.`, 'success');
      }

      // Refresh invoice list from DB so return_status is immediately updated
      if (onReturnSaved) await onReturnSaved(rec);

    } catch(err) {
      console.error("Sales return backend error:", err);
      if (triggerNotificationToast) {
        triggerNotificationToast('Return Failed', `Database error: ${err.message || 'Please try again.'}`, 'error');
      }
      setError(`Return failed: ${err.message || 'Server error. Please try again.'}`);
      return; // Don't clear form on failure
    }

    if (addAuditLog) {
      addAuditLog('Sales Return Processed', `Processed refund for Invoice ${loadedInvoice.invoice_no}. Refunded Rs. ${refundTotal.toLocaleString()}. Stock successfully updated.`);
    }

    setSuccess(rec);
    setLoadedInvoice(null); setReturnItems([]); setInvoiceQuery(''); setError('');
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-5">
      <SectionHeader icon={Package} color="bg-red-500" title="Sales Return (Customer → Store)" />

      {/* Search Invoice */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text" placeholder="Enter Invoice No. e.g. INV-2026-0001"
            value={invoiceQuery} onChange={e => {
              setInvoiceQuery(e.target.value);
              if (error) setError('');
              if (success) setSuccess('');
            }}
            className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-800 focus:border-green-500 focus:ring-2 focus:ring-green-500/10 focus:outline-none transition"
          />
        </div>
        <button type="submit" className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-xs shadow-sm transition cursor-pointer">
          Load
        </button>
      </form>

      {error   && <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold px-4 py-2.5 rounded-xl"><AlertTriangle size={13} /> {error}</div>}
      {success && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-green-50 border border-green-200 text-green-700 text-xs font-semibold px-4 py-3 rounded-xl">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} /> 
            <span>✅ Return processed! Refund of Rs. {success.refund_total.toLocaleString()} issued via {success.refund_method}. Stock successfully updated.</span>
          </div>
          <button 
            onClick={() => {
              setPrintRecord(success);
              setTimeout(() => window.print(), 100);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-green-300 rounded-lg text-green-700 hover:bg-green-100 transition cursor-pointer font-bold shadow-sm"
          >
            <Printer size={13} /> Print Receipt
          </button>
        </div>
      )}

      {/* Loaded Invoice */}
      {loadedInvoice && (
        <div className="space-y-4">
          {/* Invoice summary */}
          <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 flex items-center justify-between">
            <div>
              <span className="text-xs font-extrabold text-green-700 font-mono">{loadedInvoice.invoice_no}</span>
              <span className="text-[10px] text-gray-400 ml-2">{loadedInvoice.date}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-gray-400 block">Customer</span>
              <span className="text-xs font-bold text-gray-800">{loadedInvoice.customer_name}</span>
            </div>
          </div>

          {/* Items */}
          <div className="space-y-2.5">
            {returnItems.map((item, idx) => (
              <div key={idx} className="bg-white border border-gray-200 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-bold text-gray-900 text-xs block truncate">{item.product_name}</span>
                    <span className="text-[10px] text-gray-400">Sold: {item.quantity} × Rs. {item.price}</span>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <span className="text-[10px] text-gray-400 block">Return Amt</span>
                    <span className="font-black text-green-700 text-sm">Rs. {(item.returnQty * item.price).toLocaleString()}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {/* Fixed Qty */}
                  <div>
                    <label className="text-[9px] text-gray-400 font-bold uppercase block mb-1">Return Qty</label>
                    <div className="flex items-center px-3 py-1.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 text-xs font-black">
                      {item.returnQty}
                    </div>
                  </div>
                  {/* Reason */}
                  <div>
                    <label className="text-[9px] text-gray-400 font-bold uppercase block mb-1">Reason</label>
                    <select value={item.reason} onChange={e => setReason(idx, e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-[11px] font-semibold text-gray-700 bg-white focus:border-green-500 focus:outline-none transition">
                      {REASONS_SALE.map(r => <option key={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Refund summary & confirm */}
          {hasReturn && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-extrabold text-gray-700">Total Refund</span>
                <span className="text-lg font-black text-green-700 font-mono">Rs. {refundTotal.toLocaleString()}</span>
              </div>
              <div className="space-y-1 mt-2">
                <PaymentProcessor
                  paymentMethod={refundMethod}
                  setPaymentMethod={setRefundMethod}
                  grandTotal={refundTotal}
                  receivedAmount={refundAmount}
                  setReceivedAmount={setRefundAmount}
                  paymentDetails={paymentDetails}
                  setPaymentDetails={setPaymentDetails}
                  layout="vertical"
                  transactionType="out"
                />
              </div>
              <button onClick={handleConfirm} className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-xs shadow-sm transition cursor-pointer flex items-center justify-center gap-2">
                <CheckCircle2 size={13} /> Process Sales Return
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Shared Components ────────────────────────────────────────────────────────

function SearchableDropdown({ options, value, onChange, placeholder, onAddNew, addNewLabel }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapperRef = React.useRef(null);

  React.useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = options.filter(o => {
    const text = (o.name + ' ' + (o.subText || '')).toLowerCase();
    return text.includes(query.toLowerCase());
  });

  const selectedOption = options.find(o => String(o.id) === String(value));

  return (
    <div className="relative" ref={wrapperRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 bg-white flex justify-between items-center cursor-pointer hover:border-green-500 transition"
      >
        <span className={selectedOption ? 'text-gray-800 truncate' : 'text-gray-400 truncate'}>
          {selectedOption ? selectedOption.name : placeholder}
        </span>
        <ChevronDown size={14} className="text-gray-400 flex-shrink-0 ml-2" />
      </div>
      
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden flex flex-col">
          <div className="p-2 border-b border-gray-100">
            <input 
              autoFocus
              type="text" 
              placeholder="Search..." 
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs focus:border-green-500 focus:outline-none"
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-xs text-gray-400 text-center">No results found</div>
            ) : (
              filtered.map(o => (
                <div 
                  key={o.id}
                  onClick={() => { onChange(o.id); setIsOpen(false); setQuery(''); }}
                  className="px-3 py-2 hover:bg-green-50 cursor-pointer flex justify-between items-center border-b border-gray-50 last:border-0"
                >
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-bold text-gray-800 truncate">{o.name}</div>
                    {o.subText && <div className="text-[10px] text-gray-400 truncate">{o.subText}</div>}
                  </div>
                  {String(value) === String(o.id) && <Check size={12} className="text-green-600 flex-shrink-0" />}
                </div>
              ))
            )}
          </div>
          {onAddNew && (
            <div 
              onClick={() => { setIsOpen(false); onAddNew(); }}
              className="p-2 bg-gray-50 border-t border-gray-200 text-green-700 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer hover:bg-green-100 transition"
            >
              <Plus size={12} /> {addNewLabel || 'Add New'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AddSupplierModal({ isOpen, onClose, onAdd }) {
  const [name, setName] = useState('');
  const [companyType, setCompanyType] = useState('Distributor');
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="font-bold text-gray-800 text-sm">Add New Supplier</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition"><X size={16} /></button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Supplier Name *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} autoFocus className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-green-500 focus:outline-none" placeholder="e.g. Acme Corp" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Company Type *</label>
            <select value={companyType} onChange={e => setCompanyType(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-green-500 focus:outline-none bg-white">
              <option value="Manufacturer">Manufacturer</option>
              <option value="Distributor">Distributor</option>
              <option value="Wholesaler">Wholesaler</option>
              <option value="Retailer">Retailer</option>
              <option value="Importer">Importer</option>
              <option value="Exporter">Exporter</option>
              <option value="Dealer">Dealer</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <button 
            onClick={() => { if(name.trim() && companyType) onAdd({ id: 'C' + Date.now(), name: name.trim(), company_type: companyType }); }}
            className="w-full py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg text-xs transition cursor-pointer"
          >Save Supplier</button>
        </div>
      </div>
    </div>
  );
}

function AddProductModal({ isOpen, onClose, onAdd, supplierId }) {
  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [sku, setSku] = useState('');
  const [rate, setRate] = useState('');
  
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="font-bold text-gray-800 text-sm">Add New Product</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition cursor-pointer"><X size={16} /></button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Product Name *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} autoFocus className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-green-500 focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Barcode</label>
              <input type="text" value={barcode} onChange={e => setBarcode(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-green-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">SKU</label>
              <input type="text" value={sku} onChange={e => setSku(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-green-500 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Purchase Rate (Rs.) *</label>
            <input type="number" value={rate} onChange={e => setRate(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-green-500 focus:outline-none" />
          </div>
          <button 
            onClick={() => {
              if (name.trim() && rate) {
                const newProduct = {
                  id: 'P' + Date.now(),
                  name: name.trim(),
                  barcode: barcode.trim(),
                  code: sku.trim(),
                  company_id: supplierId,
                  batches: [{ purchase_rate: parseFloat(rate) }]
                };
                onAdd(newProduct);
              }
            }}
            className="w-full py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg text-xs transition cursor-pointer"
          >Save Product</button>
        </div>
      </div>
    </div>
  );
}

// ─── Purchase Return Form ─────────────────────────────────────────────────────
function PurchaseReturnForm({ onReturnSaved, addAuditLog, triggerNotificationToast, onCancel }) {
  const [supplierId, setSupplierId] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [dbPurchaseOrders, setDbPurchaseOrders] = useState([]);
  const [dbCompanies, setDbCompanies] = useState([]);
  
  const getEmptyRow = () => ({ id: Date.now() + Math.random(), productId: '', qty: '', rate: '', reason: REASONS_PURCH[0], maxQty: null });
  const [rows, setRows] = useState([getEmptyRow()]);
  
  const [success,  setSuccess]  = useState('');
  const [error,    setError]    = useState('');
  
  const [isSupplierModalOpen, setSupplierModalOpen] = useState(false);
  const [isProductModalOpen, setProductModalOpen] = useState(false);
  
  React.useEffect(() => {
    const fetchDBData = async () => {
      try {
        const [pos, comps] = await Promise.all([
          purchaseApi.getAll().catch(() => []),
          companyApi.getAll().catch(() => [])
        ]);
        if (pos && Array.isArray(pos)) setDbPurchaseOrders(pos);
        if (comps && Array.isArray(comps)) setDbCompanies(comps);
      } catch (_) {}
    };
    fetchDBData();

    const draft = getStoredData('AGRO_ERP_DRAFT_PURCHASE_RETURNS', null);
    if (draft) {
      setSupplierId(draft.supplierId || '');
      setInvoiceId(draft.invoiceId || '');
      setRows(draft.rows && draft.rows.length ? draft.rows : [getEmptyRow()]);
    }
  }, []);

  const saveDraft = () => {
    setStoredData('AGRO_ERP_DRAFT_PURCHASE_RETURNS', { supplierId, invoiceId, rows });
    setSuccess('Draft saved successfully!');
    setTimeout(() => setSuccess(''), 3000);
  };
  
  const handleAddSupplier = (newSupplier) => {
    COMPANIES.push(newSupplier);
    setStoredData('AGRO_ERP_COMPANIES', COMPANIES);
    setSupplierId(newSupplier.id);
    setSupplierModalOpen(false);
  };
  
  const handleAddProduct = (newProduct) => {
    PRODUCTS.push(newProduct);
    if (typeof saveProductsToStorage === 'function') saveProductsToStorage(PRODUCTS);
    setProductModalOpen(false);
    
    let lastRow = rows[rows.length - 1];
    if (lastRow && lastRow.productId) {
      setRows([...rows, { ...getEmptyRow(), productId: newProduct.id, rate: newProduct.batches[0].purchase_rate }]);
    } else if (lastRow) {
      const newRows = [...rows];
      newRows[newRows.length - 1] = { ...lastRow, productId: newProduct.id, rate: newProduct.batches[0].purchase_rate };
      setRows(newRows);
    } else {
      setRows([{ ...getEmptyRow(), productId: newProduct.id, rate: newProduct.batches[0].purchase_rate }]);
    }
  };

  const allCompaniesList = dbCompanies && dbCompanies.length > 0 ? dbCompanies : COMPANIES;

  const handleInvoiceChange = (invId) => {
    setInvoiceId(invId);
    setError('');
    if (!invId) return;

    const po = dbPurchaseOrders.find(p => (p._id || p.id || p.po_no) === invId || p.po_no === invId);
    if (po) {
      if (po.status === 'Cancelled') {
        setError(`Purchase Order "${po.po_no || po.id}" is cancelled. Returns are not allowed.`);
        return;
      }
      if (po.return_status === 'Full' || po.status === 'Returned') {
        setError(`Purchase Order "${po.po_no || po.id}" has already been fully returned.`);
        return;
      }

      const sup = allCompaniesList.find(c => c.name?.toLowerCase() === (po.supplier || po.supplier_name || '').toLowerCase());
      if (sup) setSupplierId((sup._id || sup.id || sup.name)?.toString());
      
      const newRows = (po.items || []).map(item => {
        const returned = Number(item.returned_qty || 0);
        const original = Number(item.qty || item.quantity || 0);
        const remaining = Math.max(0, original - returned);
        const prod = PRODUCTS.find(p => p.name?.toLowerCase() === item.name?.toLowerCase());
        return {
          id: Date.now() + Math.random(),
          productId: prod ? prod.id : item.name,
          productName: item.name,
          qty: remaining > 0 ? remaining : '',
          maxQty: remaining,
          rate: item.cost || item.rate || (prod ? prod.batches?.[0]?.purchase_rate : 0),
          reason: REASONS_PURCH[0]
        };
      }).filter(r => r.maxQty > 0);

      if (newRows.length === 0) {
        setError(`All items in Purchase Order "${po.po_no || po.id}" have already been returned.`);
        return;
      }

      setRows(newRows);
    }
  };
  
  const handleRowChange = (id, field, value) => {
    setRows(rows.map(r => {
      if (r.id !== id) return r;
      const newRow = { ...r, [field]: value };
      if (field === 'productId') {
        const p = PRODUCTS.find(prod => prod.id === value);
        if (p) newRow.rate = p.batches[0]?.purchase_rate || '';
      }
      return newRow;
    }));
  };

  const removeRow = (id) => {
    if (rows.length === 1) {
      setRows([getEmptyRow()]);
    } else {
      setRows(rows.filter(r => r.id !== id));
    }
  };

  const handleSubmit = async () => {
    setError(''); setSuccess('');
    
    if (!supplierId) { setError('Please select a supplier.'); return; }
    
    const validRows = rows.filter(r => (r.productId || r.productName) && r.qty);
    if (validRows.length === 0) { setError('Please add at least one product with a return quantity.'); return; }
    
    const duplicateCheck = new Set();
    
    for (let r of validRows) {
      const itemKey = r.productId || r.productName;
      if (duplicateCheck.has(itemKey)) {
        setError('Duplicate products found. Please merge them into a single row.');
        return;
      }
      duplicateCheck.add(itemKey);
      
      const q = parseInt(r.qty);
      if (isNaN(q) || q <= 0) {
        setError('Return quantities must be greater than zero.');
        return;
      }
      if (r.maxQty !== null && q > r.maxQty) {
        const pName = r.productName || PRODUCTS.find(prod => prod.id === r.productId)?.name || 'Item';
        setError(`Return quantity for ${pName} exceeds purchased quantity (${r.maxQty}).`);
        return;
      }
    }

    const selectedComp = allCompaniesList.find(c => (c._id || c.id || c.name)?.toString() === supplierId);
    const supplierName = selectedComp ? selectedComp.name : (supplierId || 'Unknown Supplier');
    let totalRefund = 0;
    const returnedItems = [];

    const currentWarehouseStock = typeof getWarehouseStock === 'function' ? getWarehouseStock() : [];
    let updatedWarehouseStock = JSON.parse(JSON.stringify(currentWarehouseStock));
    const currentTransfers = getStoredData('AGRO_ERP_WAREHOUSE_TRANSFERS', []);
    let newTransfers = [];

    validRows.forEach((r, idx) => {
      const q = parseInt(r.qty);
      const rate = parseFloat(r.rate) || 0;
      const lineTotal = q * rate;
      totalRefund += lineTotal;
      
      const p = PRODUCTS.find(prod => prod.id === r.productId);
      const pName = r.productName || p?.name || 'Unknown Product';
      
      returnedItems.push({ name: pName, qty: q, rate, total: lineTotal, reason: r.reason });

      const existingIndex = updatedWarehouseStock.findIndex(w => w.product_name && w.product_name.toLowerCase() === pName.toLowerCase());
      if (existingIndex >= 0) {
        const currentQty = parseInt(updatedWarehouseStock[existingIndex].warehouse_qty) || 0;
        updatedWarehouseStock[existingIndex].warehouse_qty = Math.max(0, currentQty - q);
      }

      newTransfers.push({
        id: `TRF-2026-${String(currentTransfers.length + newTransfers.length + 1).padStart(3, '0')}`,
        date: new Date().toISOString().replace('T', ' ').substring(0, 16),
        type: 'Purchase Return',
        product_name: pName,
        batch_no: 'RETURN',
        source: 'Main Warehouse (Godown)',
        destination: `Supplier: ${supplierName}`,
        qty: q,
        unit: p?.unit_id || 'Unit',
        handled_by: 'Admin Store Keeper',
        notes: `Purchase Return to ${supplierName} - Reason: ${r.reason}`,
        status: 'Completed'
      });
    });

    setStoredData('AGRO_ERP_WAREHOUSE_STOCK', updatedWarehouseStock);
    setStoredData('AGRO_ERP_WAREHOUSE_TRANSFERS', [...newTransfers, ...currentTransfers]);

    const poObj = dbPurchaseOrders.find(p => (p._id || p.id || p.po_no) === invoiceId || p.po_no === invoiceId);
    const poNo = poObj ? (poObj.po_no || poObj.po_number || poObj.id) : (invoiceId || 'N/A');

    const rec = {
      id: `PR${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      type: 'Purchase Return',
      supplier: supplierName,
      invoice_no: poNo,
      items: returnedItems,
      refund_total: totalRefund,
      status: 'Approved',
    };

    try {
      await purchaseApi.purchaseReturn({
        po_no: poNo,
        supplier: supplierName,
        items: returnedItems.map(i => ({
          name: i.name,
          qty: i.qty,
          rate: i.rate,
          reason: i.reason
        })),
        refund_total: totalRefund,
        refund_method: 'Bank Transfer'
      });

      if (triggerNotificationToast) {
        triggerNotificationToast('Purchase Return Processed', `Return of Rs. ${totalRefund.toLocaleString()} saved to database.`, 'success');
      }
    } catch(err) {
      console.error("Purchase return backend error:", err);
      if (triggerNotificationToast) {
        triggerNotificationToast('Return Failed', `Database error: ${err.message || 'Please try again.'}`, 'error');
      }
      setError(`Return failed: ${err.message || 'Server error. Please try again.'}`);
      return;
    }

    if (onReturnSaved) onReturnSaved(rec);

    if (addAuditLog) {
      addAuditLog('Purchase Return Processed', `Processed return of ${validRows.length} items to ${supplierName}. Total Refund: Rs. ${totalRefund.toLocaleString()}.`);
    }

    setStoredData('AGRO_ERP_DRAFT_PURCHASE_RETURNS', null);

    setSuccess(`✅ Purchase return processed! Deducted ${validRows.length} item(s) from Warehouse Stock. Refund/Credit of Rs. ${totalRefund.toLocaleString()} saved to database for ${supplierName}.`);
    setRows([getEmptyRow()]);
    setSupplierId('');
    setInvoiceId('');
  };

  const handleCancel = () => {
    setSupplierId('');
    setInvoiceId('');
    setRows([getEmptyRow()]);
    setError('');
    setSuccess('');
    if (onCancel) onCancel();
  };

  const supplierOptions = allCompaniesList.map(c => ({
    id: (c._id || c.id || c.name)?.toString(),
    name: c.name
  }));
  const productOptions = PRODUCTS.map(p => ({ 
    id: p.id, 
    name: p.name, 
    subText: `SKU: ${p.code || 'N/A'} | Barcode: ${p.barcode || 'N/A'}` 
  }));
  const invoiceOptions = dbPurchaseOrders
    .filter(p => p.status !== 'Cancelled' && p.status !== 'Returned' && p.return_status !== 'Full')
    .map(p => ({ 
      id: p._id || p.id || p.po_no, 
      name: p.po_no || p.po_number || p.id, 
      subText: `Date: ${p.date} | Supplier: ${p.supplier}` 
    }));

  const totalQty = rows.reduce((s, r) => s + (parseInt(r.qty) || 0), 0);
  const grandTotal = rows.reduce((s, r) => s + ((parseInt(r.qty)||0) * (parseFloat(r.rate)||0)), 0);
  const filledProducts = rows.filter(r => r.productId).length;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-6">
      <SectionHeader icon={ShoppingBag} color="bg-green-600" title="Purchase Return (Store → Supplier)" />

      {error   && <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold px-4 py-2.5 rounded-xl animate-in fade-in"><AlertTriangle size={13} /> {error}</div>}
      {success && <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-xs font-semibold px-4 py-2.5 rounded-xl animate-in fade-in"><CheckCircle2 size={13} /> {success}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide">Supplier *</label>
          <SearchableDropdown 
            options={supplierOptions} 
            value={supplierId} 
            onChange={setSupplierId} 
            placeholder="Select Supplier..." 
            onAddNew={() => setSupplierModalOpen(true)}
            addNewLabel="Add Supplier"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide">Purchase Invoice (Optional)</label>
          <SearchableDropdown 
            options={invoiceOptions} 
            value={invoiceId} 
            onChange={handleInvoiceChange} 
            placeholder="Select Invoice to auto-load..." 
          />
        </div>
      </div>

      <div className="space-y-3">
        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide">Return Items</label>
        
        {/* Headers */}
        <div className="hidden lg:grid grid-cols-12 gap-3 px-3 pb-2 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider border-b border-gray-100">
          <div className="col-span-4">Product *</div>
          <div className="col-span-2 text-center">Return Qty *</div>
          <div className="col-span-2 text-center">Rate (Rs.)</div>
          <div className="col-span-2">Reason</div>
          <div className="col-span-1 text-right">Total</div>
          <div className="col-span-1 text-center">Act</div>
        </div>

        {/* Rows */}
        <div className="space-y-3">
          {rows.map((row, index) => (
            <div key={row.id} className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end lg:items-center bg-gray-50 lg:bg-transparent p-3 lg:p-0 rounded-xl lg:rounded-none border lg:border-0 border-gray-100 relative group transition">
              <div className="col-span-1 lg:col-span-4 space-y-1">
                <span className="lg:hidden block text-[9px] font-bold text-gray-400 uppercase">Product</span>
                <SearchableDropdown 
                  options={productOptions} 
                  value={row.productId} 
                  onChange={v => handleRowChange(row.id, 'productId', v)} 
                  placeholder="Select Product..."
                  onAddNew={() => setProductModalOpen(true)}
                  addNewLabel="Add Product"
                />
              </div>
              <div className="col-span-1 lg:col-span-2 space-y-1">
                <span className="lg:hidden block text-[9px] font-bold text-gray-400 uppercase">Qty</span>
                <div className="relative">
                  <input type="number" min="1" max={row.maxQty || undefined} value={row.qty} onChange={e => handleRowChange(row.id, 'qty', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-center text-gray-800 focus:border-green-500 focus:outline-none transition" placeholder="Qty" />
                  {row.maxQty !== null && <span className="absolute -top-4 right-0 text-[8px] text-gray-400 font-bold">Max: {row.maxQty}</span>}
                </div>
              </div>
              <div className="col-span-1 lg:col-span-2 space-y-1">
                <span className="lg:hidden block text-[9px] font-bold text-gray-400 uppercase">Rate</span>
                <input type="number" min="0" value={row.rate} onChange={e => handleRowChange(row.id, 'rate', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-center text-gray-800 focus:border-green-500 focus:outline-none transition" placeholder="Rate" />
              </div>
              <div className="col-span-1 lg:col-span-2 space-y-1">
                <span className="lg:hidden block text-[9px] font-bold text-gray-400 uppercase">Reason</span>
                <select value={row.reason} onChange={e => handleRowChange(row.id, 'reason', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-2 py-2 text-xs font-semibold text-gray-700 bg-white focus:border-green-500 focus:outline-none transition">
                  {REASONS_PURCH.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div className="col-span-1 lg:col-span-1 space-y-1 text-right">
                <span className="lg:hidden block text-[9px] font-bold text-gray-400 uppercase text-right">Total</span>
                <div className="font-mono text-sm font-bold text-gray-900 truncate flex flex-col justify-center h-8">
                  {( (parseInt(row.qty)||0) * (parseFloat(row.rate)||0) ).toLocaleString()}
                </div>
              </div>
              <div className="col-span-1 lg:col-span-1 flex justify-end lg:justify-center mt-2 lg:mt-0">
                <button type="button" onClick={() => removeRow(row.id)} title="Remove Row"
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
        
        <button type="button" onClick={() => setRows([...rows, getEmptyRow()])} 
          className="mt-3 flex items-center gap-1.5 text-xs font-bold text-green-700 hover:text-green-800 hover:bg-green-50 px-3 py-2 rounded-lg transition cursor-pointer">
          <Plus size={14} /> Add Another Product
        </button>
      </div>

      {/* Summary Box */}
      <div className="bg-green-50/50 border border-green-100 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex gap-6">
          <div>
            <span className="block text-[10px] text-gray-500 font-bold uppercase">Total Products</span>
            <span className="text-sm font-black text-gray-800">{filledProducts}</span>
          </div>
          <div>
            <span className="block text-[10px] text-gray-500 font-bold uppercase">Total Return Qty</span>
            <span className="text-sm font-black text-gray-800">{totalQty}</span>
          </div>
        </div>
        <div className="text-right">
          <span className="block text-[10px] text-gray-500 font-bold uppercase">Total Refund Amount</span>
          <span className="text-xl font-black text-green-700 font-mono">Rs. {grandTotal.toLocaleString()}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button type="button" onClick={handleCancel} className="sm:w-1/4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs shadow-sm transition cursor-pointer flex items-center justify-center gap-2">
          <X size={14} /> Cancel
        </button>
        <button type="button" onClick={saveDraft} className="sm:w-1/4 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold rounded-xl text-xs shadow-sm transition cursor-pointer flex items-center justify-center gap-2">
          <Save size={14} /> Save Draft
        </button>
        <button type="button" onClick={handleSubmit} className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-xs shadow-sm transition cursor-pointer flex items-center justify-center gap-2">
          <RotateCcw size={14} /> Submit Purchase Return
        </button>
      </div>
      
      <AddSupplierModal isOpen={isSupplierModalOpen} onClose={() => setSupplierModalOpen(false)} onAdd={handleAddSupplier} />
      <AddProductModal isOpen={isProductModalOpen} onClose={() => setProductModalOpen(false)} onAdd={handleAddProduct} supplierId={supplierId} />
    </div>
  );
}

function ReturnHistory({ records, setPrintRecord }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter,  setTypeFilter]  = useState('');

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return records.filter(r =>
      (!q || (r.invoice_no || '').toLowerCase().includes(q) || (r.customer || '').toLowerCase().includes(q) || (r.supplier || '').toLowerCase().includes(q) || (r.product || '').toLowerCase().includes(q)) &&
      (!typeFilter || r.type === typeFilter)
    );
  }, [records, searchQuery, typeFilter]);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden no-print">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
        <History size={15} className="text-green-600" />
        <span className="text-xs font-extrabold text-gray-700 uppercase tracking-wide">Return History</span>
        <span className="ml-auto text-[10px] text-gray-400 font-semibold">{records.length} entries</span>
      </div>

      {/* Filters */}
      <div className="px-5 py-3 border-b border-gray-100 flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text" placeholder="Search customer, supplier, product..."
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold text-gray-800 focus:border-green-500 focus:ring-2 focus:ring-green-500/10 focus:outline-none transition"
          />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 focus:border-green-500 focus:outline-none transition">
          <option value="">All Types</option>
          <option>Sales Return</option>
          <option>Purchase Return</option>
        </select>
        {(searchQuery || typeFilter) && (
          <button onClick={() => { setSearchQuery(''); setTypeFilter(''); }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-gray-500 hover:text-red-600 border border-gray-200 rounded-lg hover:border-red-200 hover:bg-red-50 transition cursor-pointer">
            <RefreshCcw size={11} /> Reset
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">
              <th className="py-3 px-4 text-left">Date</th>
              <th className="py-3 px-4 text-left">Type</th>
              <th className="py-3 px-4 text-left">Reference</th>
              <th className="py-3 px-4 text-left hidden md:table-cell">Customer / Supplier</th>
              <th className="py-3 px-4 text-right">Refund Amt</th>
              <th className="py-3 px-4 text-center hidden sm:table-cell">Method</th>
              <th className="py-3 px-4 text-center hidden lg:table-cell">Reason</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="py-12 text-center text-gray-400 font-medium">
                <RotateCcw size={24} className="mx-auto mb-2 text-gray-300" />No return records found.
              </td></tr>
            ) : filtered.map(r => {
              const isSales = r.type === 'Sales Return';
              return (
                <tr key={r.id} className="hover:bg-gray-50/60 transition">
                  <td className="py-3 px-4 text-gray-500 font-medium">{r.date}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                      isSales ? 'bg-red-100 text-red-700 border-red-200' : 'bg-amber-100 text-amber-700 border-amber-200'
                    }`}>
                      {isSales ? <Package size={9} /> : <ShoppingBag size={9} />}
                      {r.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-green-700 text-[11px]">{r.invoice_no || r.id}</td>
                  <td className="py-3 px-4 font-semibold text-gray-700 hidden md:table-cell">{r.customer || r.supplier}</td>
                  <td className="py-3 px-4 text-right font-black text-gray-900">Rs. {(r.refund_total || r.total || 0).toLocaleString()}</td>
                  <td className="py-3 px-4 text-center font-bold text-gray-700 hidden sm:table-cell text-[10px]">
                    {r.refund_method || '—'}
                  </td>
                  <td className="py-3 px-4 text-center text-gray-500 font-medium hidden lg:table-cell text-[10px]">{r.reason || (r.items?.[0]?.reason) || '—'}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                      r.status === 'Processed' ? 'bg-green-100 text-green-700 border-green-200' :
                      r.status === 'Approved'  ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                                 'bg-amber-100 text-amber-700 border-amber-200'
                    }`}>{r.status}</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => {
                        setPrintRecord(r);
                        setTimeout(() => window.print(), 100);
                      }}
                      title="Print Return Receipt"
                      className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition inline-flex items-center justify-center"
                    >
                      <Printer size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 text-[10px] font-semibold text-gray-400 no-print">
        {filtered.length} of {records.length} entries shown
      </div>
    </div>
  );
}

// ─── Main Returns Screen ──────────────────────────────────────────────────────
export default function ReturnsScreen({ invoices = [], addAuditLog, triggerNotificationToast, defaultTab = 'sales', dateFilter, setDateFilter }) {
  const { t } = useLanguage();
  const [returnRecords, setReturnRecords] = useState(() => getStoredData('AGRO_ERP_RETURN_RECORDS', []));

  const [activeTab, setActiveTab] = useState(defaultTab);
  const [printRecord, setPrintRecord] = useState(null);


  React.useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  const handleReturnSaved = (rec) => {
    const updated = [rec, ...returnRecords];
    setReturnRecords(updated);
    setStoredData('AGRO_ERP_RETURN_RECORDS', updated);
    if (triggerNotificationToast) {
      triggerNotificationToast('Return Processed', `${rec.type} recorded successfully.`);
    }
  };

  

  const dateFilteredRecords = useMemo(() => {
    return returnRecords.filter(r => isItemInDateRange(r.date, dateFilter.startDate, dateFilter.endDate));
  }, [returnRecords, dateFilter]);

  const totalRefunded = dateFilteredRecords.reduce((s, r) => s + (r.refund_total || r.total || 0), 0);
  const salesReturns  = dateFilteredRecords.filter(r => r.type === 'Sales Return').length;
  const purchReturns  = dateFilteredRecords.filter(r => r.type === 'Purchase Return').length;

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-black text-gray-900 tracking-tight">
            {activeTab === 'sales' ? 'Sales Return' : activeTab === 'purchase' ? 'Purchase Return' : 'Return History'}
          </h1>
          <p className="text-xs text-gray-400 mt-0.5 font-medium">{dateFilteredRecords.length} return records · Rs. {totalRefunded.toLocaleString()} total refunded in range</p>
        </div>

      </div>

      {/* Date Filter Bar */}
      <DateFilterBar dateFilter={dateFilter} setDateFilter={setDateFilter} />

      {/* Tab Content */}
      {activeTab === 'sales'    && (
        <SalesReturnForm 
          invoices={invoices} 
          onReturnSaved={handleReturnSaved} 
          addAuditLog={addAuditLog}
          triggerNotificationToast={triggerNotificationToast}
          onCancel={() => setActiveTab('history')}
          setPrintRecord={setPrintRecord}
        />
      )}
      {activeTab === 'purchase' && (
        <PurchaseReturnForm 
          onReturnSaved={handleReturnSaved} 
          addAuditLog={addAuditLog}
          triggerNotificationToast={triggerNotificationToast}
          onCancel={() => setActiveTab('history')}
          setPrintRecord={setPrintRecord}
        />
      )}
      {activeTab === 'history'  && <ReturnHistory records={dateFilteredRecords} setPrintRecord={setPrintRecord} />}

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print\\:block, .print\\:block * { visibility: visible !important; }
          .print\\:block { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* ── PRINTABLE RETURN RECEIPT (HIDDEN ON SCREEN) ── */}
      {printRecord && (
        <div className="hidden print:block w-full bg-white text-black p-8">
          <PrintHeader title="Return Receipt" />
          
          <div className="mt-8 border border-gray-300 rounded-lg p-6 max-w-3xl mx-auto">
            <div className="text-center mb-6 border-b border-gray-200 pb-4">
              <h2 className="text-2xl font-bold uppercase tracking-widest text-gray-800">{printRecord.type} Receipt</h2>
              <p className="text-gray-500 mt-1">Generated on {new Date().toLocaleDateString('en-PK')} {new Date().toLocaleTimeString('en-PK')}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
              <div>
                <p className="text-gray-500 font-semibold mb-1">Return Receipt No.</p>
                <p className="font-bold text-gray-900">{printRecord.id}</p>
              </div>
              <div className="text-right">
                <p className="text-gray-500 font-semibold mb-1">Return Date</p>
                <p className="font-bold text-gray-900">{printRecord.date}</p>
              </div>
              <div>
                <p className="text-gray-500 font-semibold mb-1">Original Invoice / PO No.</p>
                <p className="font-bold text-gray-900">{printRecord.invoice_no || 'N/A'}</p>
              </div>
              <div className="text-right">
                <p className="text-gray-500 font-semibold mb-1">Customer / Supplier</p>
                <p className="font-bold text-gray-900">{printRecord.customer || printRecord.supplier || 'Walk-in'}</p>
              </div>
            </div>

            <div className="mb-6">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-gray-100 text-gray-700">
                  <tr>
                    <th className="py-2 px-3 text-left border-b border-gray-300">Product</th>
                    <th className="py-2 px-3 text-right border-b border-gray-300">Return Qty</th>
                    <th className="py-2 px-3 text-right border-b border-gray-300">Unit Price</th>
                    <th className="py-2 px-3 text-right border-b border-gray-300">Total Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {printRecord.items && printRecord.items.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-100">
                      <td className="py-2 px-3">
                        <div className="font-bold text-gray-900">{item.name || item.product}</div>
                        {item.reason && <div className="text-xs text-gray-500">Reason: {item.reason}</div>}
                      </td>
                      <td className="py-2 px-3 text-right">{item.qty}</td>
                      <td className="py-2 px-3 text-right">Rs. {(parseFloat(item.rate) || 0).toLocaleString()}</td>
                      <td className="py-2 px-3 text-right font-bold">Rs. {((parseInt(item.qty) || 0) * (parseFloat(item.rate) || 0)).toLocaleString()}</td>
                    </tr>
                  ))}
                  {(!printRecord.items || printRecord.items.length === 0) && (
                    <tr className="border-b border-gray-100">
                      <td className="py-2 px-3 font-bold text-gray-900">{printRecord.product || 'Multiple Items'}</td>
                      <td className="py-2 px-3 text-right">{printRecord.qty || '-'}</td>
                      <td className="py-2 px-3 text-right">Rs. {(parseFloat(printRecord.rate) || 0).toLocaleString()}</td>
                      <td className="py-2 px-3 text-right font-bold">Rs. {(printRecord.refund_total || printRecord.total || 0).toLocaleString()}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-200">
              <div className="w-1/2">
                <div className="flex justify-between py-1 text-sm">
                  <span className="text-gray-600 font-semibold">Payment / Refund Method:</span>
                  <span className="font-bold text-gray-900">{printRecord.refund_method || '—'}</span>
                </div>
                <div className="flex justify-between py-2 text-lg border-t border-gray-300 mt-2">
                  <span className="text-gray-800 font-black">Total Return Amount:</span>
                  <span className="font-black text-rose-700">Rs. {(printRecord.refund_total || printRecord.total || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
