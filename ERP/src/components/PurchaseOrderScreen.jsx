import React, { useState, useMemo, useEffect } from 'react';
import {
  ShoppingBag,
  Plus,
  Trash2,
  Send,
  CheckCircle2,
  Search,
  Eye,
  X,
  Printer,
  Clock,
  FileText,
  RefreshCcw,
  Package,
  DollarSign,
  Save,
  Truck,
} from 'lucide-react';
import { PRODUCTS, getStoredData, setStoredData, saveProductsToStorage, getWarehouseStock } from '../utils/mockData';
import { purchaseApi, companyApi } from '../api';
import DateFilterBar from './DateFilterBar';
import { isItemInDateRange } from '../utils/dateUtils';
import { useLanguage } from '../context/LanguageContext';

// ── Mock PO list ──────────────────────────────────────────────────────────────
const INIT_PO_LIST = [
  {
    id: 'PO-2026-001',
    po_no: 'PO-2026-001',
    date: '2026-08-01',
    supplier: 'Syngenta Pakistan Ltd',
    items: [{ id: '1', name: 'Glyphosate 41% SL', qty: 50, cost: 350, total: 17500 }],
    subtotal: 17500,
    freight: 500,
    total: 18000,
    status: 'Received',
    stock_inward_done: true
  },
  {
    id: 'PO-2026-002',
    po_no: 'PO-2026-002',
    date: '2026-08-05',
    supplier: 'Bayer CropScience',
    items: [{ id: '2', name: 'Imidacloprid 200 SL', qty: 30, cost: 600, total: 18000 }],
    subtotal: 18000,
    freight: 400,
    total: 18400,
    status: 'Issued',
    stock_inward_done: false
  }
];

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CFG = {
  Draft:      { cls: 'bg-gray-100 text-gray-600 border-gray-200',     pulse: false },
  Issued:     { cls: 'bg-blue-100 text-blue-700 border-blue-200',     pulse: false },
  Received:   { cls: 'bg-green-100 text-green-700 border-green-200',  pulse: false },
  Cancelled:  { cls: 'bg-red-100 text-red-700 border-red-200', pulse: false },
  Returned:   { cls: 'bg-orange-100 text-orange-700 border-orange-200', pulse: false },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG['Draft'];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${cfg.cls} ${cfg.pulse ? 'animate-pulse' : ''}`}>
      {status}
    </span>
  );
}

// ── PO Invoice / Detail Modal ─────────────────────────────────────────────────
function PODetailModal({ po, onClose, onMarkReceived, onIssuePO }) {
  const timeline = ['Draft', 'Issued', 'Received'];
  const step     = timeline.indexOf(po.status);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div id="printable-po-invoice" className="bg-white rounded-2xl w-full max-w-xl border border-gray-200 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">

        {/* Invoice Header Bar */}
        <div className="bg-green-600 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-xl text-white">
              <FileText size={18} />
            </div>
            <div>
              <span className="text-[10px] font-black text-green-100 uppercase tracking-widest block">Official Purchase Invoice</span>
              <h2 className="text-base font-extrabold font-mono tracking-tight">{po.po_no || po.po_number || po.id || 'PO-2026'}</h2>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-white text-green-800 border border-white uppercase">
              {po.status}
            </span>
            <button onClick={onClose} className="p-1.5 text-white/80 hover:text-white rounded-full hover:bg-green-700 transition cursor-pointer no-print">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Invoice Body Printable Area */}
        <div className="overflow-y-auto flex-1 p-6 space-y-5 text-xs">

          {/* Supplier & Meta Details */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase block mb-0.5">Supplier / Vendor</span>
              <span className="font-extrabold text-gray-900 text-sm block">{po.supplier}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase block mb-0.5">Invoice Date</span>
              <span className="font-semibold text-gray-800 block">{po.date}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase block mb-0.5">Total Line Items</span>
              <span className="font-bold text-gray-800 block">{po.itemsCount || po.items.length} Lines</span>
            </div>
          </div>

          {/* Progress Timeline */}
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2.5">Order Lifecycle Status</p>
            <div className="flex items-center">
              {timeline.map((s, i) => (
                <React.Fragment key={s}>
                  <div className="flex flex-col items-center">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black border-2 transition ${
                      i <= step ? 'bg-green-600 border-green-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-400'
                    }`}>
                      {i <= step ? <CheckCircle2 size={13} /> : i + 1}
                    </div>
                    <span className={`mt-1 text-[9px] font-bold ${i <= step ? 'text-gray-700' : 'text-gray-400'}`}>{s}</span>
                  </div>
                  {i < timeline.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1 mb-4 transition ${i < step ? 'bg-green-500' : 'bg-gray-200'}`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Transportation Details (If available) */}
          {po.transport && (po.transport.company || po.transport.vehicle) && (
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Transportation Details</p>
              <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-4">
                <div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5">Transport Company</span>
                  <span className="font-extrabold text-gray-800 text-xs block">{po.transport.company || '—'}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5">Vehicle Number</span>
                  <span className="font-bold text-gray-800 text-xs block">{po.transport.vehicle || '—'}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5">Driver & Phone</span>
                  <span className="font-semibold text-gray-800 text-xs block">{po.transport.driver || '—'} {po.transport.phone ? `(${po.transport.phone})` : ''}</span>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5">Route</span>
                  <span className="font-medium text-gray-800 text-xs block truncate">{po.transport.route || '—'}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5">Transport Charges</span>
                  <span className="font-mono font-extrabold text-blue-700 text-xs block">Rs. {(po.transport.charges || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* Invoice Items Table */}
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Purchase Item Details</p>
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-xs border-collapse">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr className="text-[9px] font-extrabold text-gray-500 uppercase">
                    <th className="py-2.5 px-3 text-left">Item Description</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Unit Rate</th>
                    <th className="py-2.5 px-3 text-right">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {po.items.map((item, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="py-2.5 px-3 font-bold text-gray-800">{item.name}</td>
                      <td className="py-2.5 px-3 text-center font-semibold text-gray-700">{item.qty}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-gray-600">Rs. {item.cost.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-green-700">Rs. {item.total.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Invoice Summary Box */}
          <div className="bg-green-50/70 border border-green-200 rounded-xl p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black text-gray-800 uppercase tracking-wide">Purchase Invoice Grand Total</span>
              <span className="text-xl font-black text-green-800 font-mono">Rs. {po.total.toLocaleString()}</span>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap gap-2.5 px-6 py-3.5 border-t border-gray-200 bg-gray-50/80 rounded-b-2xl no-print">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl text-xs hover:bg-gray-100 transition cursor-pointer"
          >
            <Printer size={14} /> Print Invoice
          </button>

          {po.status === 'Issued' && (
            <button
              onClick={() => { onMarkReceived(po._id || po.id || po.po_no); onClose(); }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-xs shadow-sm transition cursor-pointer"
            >
              <CheckCircle2 size={14} /> Mark Received
            </button>
          )}

          {po.status === 'Draft' && (
            <button
              onClick={() => { if(onIssuePO) { onIssuePO(po._id || po.id || po.po_no); onClose(); } }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-sm transition cursor-pointer"
            >
              <Send size={14} /> Issue PO
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Cities List ───────────────────────────────────────────────────────────────
const CITIES = [
  'Karachi', 'Lahore', 'Islamabad', 'Faisalabad', 'Rawalpindi', 
  'Multan', 'Gujranwala', 'Hyderabad', 'Peshawar', 'Quetta', 
  'Sargodha', 'Sialkot', 'Bahawalpur', 'Sukkur', 'Other'
];

function CityDropdown({ value, onChange, placeholder, options }) {
  const [open, setOpen] = useState(false);
  
  return (
    <div className="relative w-full text-left">
      <div 
        onClick={() => setOpen(!open)}
        className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold focus:border-green-500 focus:outline-none transition bg-white cursor-pointer flex justify-between items-center select-none ${value ? 'text-gray-800' : 'text-gray-400'}`}
      >
        <span className="truncate">{value || placeholder}</span>
        <span className="text-[9px] text-gray-500">▼</span>
      </div>
      
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)}></div>
          <div className="absolute top-full mt-1 left-0 w-full bg-white border border-gray-200 shadow-xl rounded-lg z-50 max-h-48 overflow-y-auto py-1">
            {options.map(opt => (
              <div 
                key={opt} 
                onClick={() => { onChange(opt); setOpen(false); }}
                className="px-3 py-2.5 text-xs text-gray-800 hover:bg-green-50 cursor-pointer font-medium border-b border-gray-50 last:border-0"
              >
                {opt}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── New Purchase Form ─────────────────────────────────────────────────────────
function NewPurchasePanel({ onSave, onCancel, triggerNotificationToast, companies = [] }) {
  const defaultSupplier = companies[0]?.name || 'Syngenta Pakistan Ltd';
  const defaultProd = PRODUCTS[0] || { id: 'PRD-001', name: 'Glyphosate 41% SL', batches: [{ purchase_rate: 350 }] };

  const [supplier, setSupplier]          = useState(defaultSupplier);
  
  useEffect(() => {
    if (companies && companies.length > 0 && (supplier === 'Syngenta Pakistan Ltd' || !supplier)) {
      const hasSyngenta = companies.some(c => c.name === 'Syngenta Pakistan Ltd');
      if (!hasSyngenta) {
        setSupplier(companies[0].name);
      }
    }
  }, [companies]);

  const [cart,     setCart]              = useState([]);
  const [prodId,   setProdId]            = useState(defaultProd?.id || 'PRD-001');
  const [customName, setCustomName]      = useState('');
  const [isCustomMode, setIsCustomMode]  = useState(false);
  const [qty,      setQty]               = useState('');
  const [cost,     setCost]              = useState(defaultProd?.batches?.[0]?.purchase_rate || 350);

  // Transport state
  const [transCompany, setTransCompany] = useState('');
  const [transVehicle, setTransVehicle] = useState('');
  const [transDriver,  setTransDriver]  = useState('');
  const [transPhone,   setTransPhone]   = useState('');
  const [transFrom,    setTransFrom]    = useState('');
  const [transTo,      setTransTo]      = useState('');
  const [transCharges, setTransCharges] = useState('');

  const handleProdChange = (val) => {
    if (val === 'CUSTOM') {
      setIsCustomMode(true);
      setProdId('CUSTOM');
      setCost('');
      return;
    }
    setIsCustomMode(false);
    setProdId(val);
    const p = PRODUCTS.find(p => p.id === val);
    if (p) setCost(p.batches[0]?.purchase_rate || '');
  };

  const addLine = () => {
    let itemName = '';
    let itemProdId = '';

    if (isCustomMode) {
      if (!customName.trim()) {
        if (triggerNotificationToast) triggerNotificationToast('Validation Failed', 'Please enter a custom product name.', 'warning');
        return;
      }
      itemName = customName.trim();
      itemProdId = `CUSTOM_${Date.now()}`;
    } else {
      const p = PRODUCTS.find(p => p.id === prodId);
      if (!p) {
        if (triggerNotificationToast) triggerNotificationToast('Validation Failed', 'Please select a valid product.', 'warning');
        return;
      }
      itemName = p.name;
      itemProdId = p.id;
    }

    const unitCost = parseFloat(cost) || 0;
    if (unitCost <= 0) {
      if (triggerNotificationToast) triggerNotificationToast('Validation Failed', 'Purchase Rate must be greater than zero.', 'warning');
      return;
    }

    const orderQty = parseInt(qty);
    if (!orderQty || orderQty <= 0) {
      if (triggerNotificationToast) triggerNotificationToast('Validation Failed', 'Order Qty must be a valid number greater than zero.', 'warning');
      return;
    }

    const lineTotal = orderQty * unitCost;

    setCart(prev => [...prev, { 
      productId: itemProdId, 
      name: itemName, 
      qty: orderQty, 
      cost: unitCost, 
      total: lineTotal 
    }]);

    setQty('');
    if (isCustomMode) {
      setCustomName('');
    }
  };

  const subtotal   = cart.reduce((s, i) => s + i.total, 0);
  const freight    = parseFloat(transCharges) || 0;
  const grandTotal = subtotal + freight;

  const save = (status) => {
    if (!cart.length) return;
    const poNum = `PO-2026-${String(Math.floor(1000 + Math.random() * 9000))}`;
    onSave({
      id: poNum,
      po_no: poNum,
      po_number: poNum,
      supplier, date: new Date().toISOString().split('T')[0],
      total: grandTotal, status,
      itemsCount: cart.length, items: cart,
      transport: {
        company: transCompany,
        vehicle: transVehicle,
        driver: transDriver,
        phone: transPhone,
        route: (transFrom || transTo) ? `${transFrom || 'Unknown'} → ${transTo || 'Unknown'}` : '',
        charges: freight
      }
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-xl"><ShoppingBag size={18} className="text-green-700" /></div>
          <div>
            <h3 className="text-sm font-extrabold text-gray-800">New Purchase Order</h3>
            <p className="text-[10px] text-gray-400">Add products and submit to supplier</p>
          </div>
        </div>
        <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition cursor-pointer"><X size={15} /></button>
      </div>

      {/* Supplier */}
      <div className="space-y-1">
        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide">Supplier <span className="text-red-500">*</span></label>
        <select
          value={supplier} onChange={e => setSupplier(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-800 bg-white focus:border-green-500 focus:ring-2 focus:ring-green-500/10 focus:outline-none transition"
        >
          {companies && companies.length > 0 ? (
            companies.map(c => <option key={c._id || c.id} value={c.name}>{c.name}</option>)
          ) : (
            <option value="Syngenta Pakistan Ltd">Syngenta Pakistan Ltd</option>
          )}
        </select>
      </div>

      {/* Add Product Row */}
      <div className="bg-white border border-green-100 shadow-sm rounded-xl p-5 space-y-4">
        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
          <span className="text-xs font-black text-gray-800 uppercase tracking-wider block">Add Product to Order</span>
          <button
            type="button"
            onClick={() => {
              const nextMode = !isCustomMode;
              setIsCustomMode(nextMode);
              if (nextMode) {
                setProdId('CUSTOM');
                setCost('');
              } else {
                const firstP = PRODUCTS[0] || { id: 'PRD-001', batches: [{ purchase_rate: 350 }] };
                setProdId(firstP.id || 'PRD-001');
                setCost(firstP.batches?.[0]?.purchase_rate || 350);
              }
            }}
            className="text-[10px] font-bold px-2 py-1 bg-green-50 text-green-700 rounded-md hover:bg-green-100 transition cursor-pointer flex items-center gap-1"
          >
            {isCustomMode ? "← Back to Catalog" : "✍️ Type Custom Product"}
          </button>
        </div>

        {isCustomMode ? (
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase block">Product Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              placeholder="Enter custom product name..."
              value={customName}
              onChange={e => setCustomName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-800 bg-white focus:border-green-500 focus:ring-2 focus:ring-green-500/10 focus:outline-none transition"
              autoFocus
            />
          </div>
        ) : (
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase block">Select Product <span className="text-red-500">*</span></label>
            <select
              value={prodId} 
              onChange={e => handleProdChange(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 bg-white focus:border-green-500 focus:outline-none transition"
            >
              {PRODUCTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              <option value="CUSTOM">✍️ + Type Custom Product Name...</option>
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase block">Purchase Rate (Rs.) <span className="text-red-500">*</span></label>
            <div className="relative">
              <DollarSign size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="number" min="0" placeholder="e.g. 350" value={cost} onChange={e => setCost(e.target.value)}
                className="w-full rounded-lg border border-gray-300 pl-7 pr-3 py-2 text-xs font-semibold text-gray-800 focus:border-green-500 focus:outline-none transition bg-white" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase block">Order Qty <span className="text-red-500">*</span></label>
            <div className="relative">
              <Package size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="number" min="1" placeholder="e.g. 50" value={qty} onChange={e => setQty(e.target.value)}
                className="w-full rounded-lg border border-gray-300 pl-7 pr-3 py-2 text-xs font-semibold text-gray-800 focus:border-green-500 focus:outline-none transition bg-white" />
            </div>
          </div>
        </div>
        <button
          onClick={addLine}
          className="w-full py-2.5 bg-green-600 text-white font-bold rounded-xl text-xs hover:bg-green-700 transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
        >
          <Plus size={14} /> Add Product to Order
        </button>
      </div>

      {/* Transportation Section */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Truck size={14} className="text-gray-500" />
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider block">Transportation Details (Optional)</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input type="text" placeholder="Transport Company" value={transCompany} onChange={e => setTransCompany(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-800 focus:border-green-500 focus:outline-none transition bg-white" />
          <input type="text" placeholder="Vehicle Number" value={transVehicle} onChange={e => setTransVehicle(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-800 focus:border-green-500 focus:outline-none transition bg-white" />
          <input type="text" placeholder="Driver Name" value={transDriver} onChange={e => setTransDriver(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-800 focus:border-green-500 focus:outline-none transition bg-white" />
          <input type="text" placeholder="Driver Phone" value={transPhone} onChange={e => setTransPhone(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-800 focus:border-green-500 focus:outline-none transition bg-white" />
          <div className="grid grid-cols-2 gap-2">
            <CityDropdown value={transFrom} onChange={setTransFrom} placeholder="From City..." options={CITIES} />
            <CityDropdown value={transTo} onChange={setTransTo} placeholder="To City..." options={CITIES} />
          </div>
          <input type="number" min="0" placeholder="Transport Charges (Rs.)" value={transCharges} onChange={e => setTransCharges(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-800 focus:border-green-500 focus:outline-none transition bg-white" />
        </div>
      </div>

      {/* Cart */}
      {cart.length > 0 ? (
        <div className="space-y-3">
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {cart.map((item, i) => (
              <div key={i} className="bg-white border border-gray-100 rounded-xl px-3 py-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-bold text-gray-900 text-xs block truncate">{item.name}</span>
                  <span className="text-[10px] text-gray-400">{item.qty} × Rs. {item.cost.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="font-black text-gray-700 text-xs font-mono">Rs. {item.total.toLocaleString()}</span>
                  <button onClick={() => setCart(prev => prev.filter((_, idx) => idx !== i))} className="text-red-500 hover:text-red-700 cursor-pointer"><Trash2 size={13} /></button>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 space-y-1.5 text-xs">
            {[['Subtotal', `Rs. ${subtotal.toLocaleString()}`], ['Freight', `Rs. ${freight.toLocaleString()}`]].map(([l, v]) => (
              <div key={l} className="flex justify-between text-gray-500 font-semibold"><span>{l}</span><span>{v}</span></div>
            ))}
            <div className="flex justify-between font-extrabold text-green-800 text-sm border-t border-gray-200 pt-1.5">
              <span>Grand Total</span><span className="font-mono">Rs. {grandTotal.toLocaleString()}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => save('Draft')} className="py-2.5 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl text-xs hover:bg-gray-100 transition cursor-pointer flex items-center justify-center gap-1.5">
              <Save size={12} /> Save Draft
            </button>
            <button onClick={() => save('Issued')} className="py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-xs shadow-sm transition cursor-pointer flex items-center justify-center gap-1.5">
              <Send size={12} /> Issue PO
            </button>
          </div>
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-200 rounded-xl py-10 text-center text-gray-400">
          <Package size={24} className="mx-auto mb-2 text-gray-300" />
          <p className="text-xs font-medium">No items added yet</p>
        </div>
      )}
    </div>
  );
}

// Helper to add purchased items to Warehouse Stock (AGRO_ERP_WAREHOUSE_STOCK) and Master Products catalog
const addPOItemsToWarehouse = (po) => {
  if (!po || !po.items || !Array.isArray(po.items)) return;

  const currentWarehouseStock = getWarehouseStock();
  let updatedWarehouseStock = JSON.parse(JSON.stringify(currentWarehouseStock));

  po.items.forEach(poItem => {
    const qty = parseInt(poItem.qty) || 0;
    if (qty <= 0) return;

    const productName = poItem.name || poItem.product_name;
    const unitCost = parseFloat(poItem.cost || poItem.rate || 0);
    const prodId = poItem.productId || poItem.product_id;

    // 1. Update/Add in warehouse stock
    const existingIdx = updatedWarehouseStock.findIndex(w => 
      (prodId && w.product_id === prodId) ||
      (w.product_name && w.product_name.toLowerCase() === productName.toLowerCase())
    );

    if (existingIdx !== -1) {
      updatedWarehouseStock[existingIdx] = {
        ...updatedWarehouseStock[existingIdx],
        warehouse_qty: (updatedWarehouseStock[existingIdx].warehouse_qty || 0) + qty,
        purchase_rate: unitCost > 0 ? unitCost : updatedWarehouseStock[existingIdx].purchase_rate
      };
    } else {
      const newItem = {
        id: `WH_${prodId || Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        product_id: prodId || `P_${Date.now()}`,
        product_name: productName,
        code: `P-${productName.substring(0, 4).toUpperCase()}`,
        category: 'Pesticides',
        company: po.supplier || 'Agro Chemicals',
        batch_no: `B_${new Date().getFullYear()}_${Math.floor(100 + Math.random() * 900)}`,
        mfg_date: new Date().toISOString().split('T')[0],
        expiry_date: '2028-12-31',
        rack_no: 'Rack-A1 (Godown)',
        warehouse_qty: qty,
        pos_counter_qty: 0,
        unit: 'Litre',
        purchase_rate: unitCost,
        selling_rate: Math.round(unitCost * 1.25) || 500
      };
      updatedWarehouseStock.push(newItem);
    }

    // 2. Also ensure product exists in master PRODUCTS catalog (starts at 0 counter stock, exists in warehouse only)
    let masterProd = PRODUCTS.find(p => (prodId && (p._id === prodId || p.id === prodId)) || p.name?.toLowerCase() === productName?.toLowerCase());
    if (masterProd) {
      if (!masterProd.batches || masterProd.batches.length === 0) {
        masterProd.batches = [{ id: `B_${Date.now()}`, batch_no: `B_${new Date().getFullYear()}_1`, stock_qty: 0, purchase_rate: unitCost }];
      } else {
        if (unitCost > 0) masterProd.batches[0].purchase_rate = unitCost;
      }
    } else {
      masterProd = {
        id: prodId || `P_${Date.now()}`,
        code: `P-${productName.substring(0, 4).toUpperCase()}`,
        name: productName,
        category_id: 'CAT1',
        company_id: 'C1',
        unit_id: 'U1',
        tax_rate: 18,
        tax_type: 'Exclusive',
        dealer_price: unitCost,
        retail_price: Math.round(unitCost * 1.25) || 500,
        farmer_price: Math.round(unitCost * 1.20) || 480,
        wholesale_price: unitCost,
        batches: [
          {
            id: `B_${Date.now()}`,
            batch_no: `B_${new Date().getFullYear()}_${Math.floor(100 + Math.random() * 900)}`,
            mfg_date: new Date().toISOString().split('T')[0],
            expiry_date: '2028-12-31',
            purchase_rate: unitCost,
            selling_rate: Math.round(unitCost * 1.25) || 500,
            stock_qty: 0
          }
        ]
      };
      PRODUCTS.push(masterProd);
    }
  });

  setStoredData('AGRO_ERP_WAREHOUSE_STOCK', updatedWarehouseStock);
  saveProductsToStorage();

  // 3. Also log to Warehouse History (AGRO_ERP_WAREHOUSE_TRANSFERS)
  const currentTransfers = getStoredData('AGRO_ERP_WAREHOUSE_TRANSFERS', []);
  let updatedTransfers = [...currentTransfers];
  po.items.forEach(poItem => {
    const qty = parseInt(poItem.qty) || 0;
    if (qty <= 0) return;
    const productName = poItem.name || poItem.product_name;
    const newRecord = {
      id: `TRF-2026-${String(updatedTransfers.length + 1).padStart(3, '0')}`,
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      type: 'Purchase Inward',
      product_name: productName,
      batch_no: `B_${new Date().getFullYear()}_${Math.floor(100 + Math.random() * 900)}`,
      source: `${po.supplier || 'Supplier'} (${po.id})`,
      destination: 'Main Warehouse (Godown)',
      qty: qty,
      unit: 'Litre',
      handled_by: 'Admin Store Keeper',
      notes: `Purchase shipment received via PO ${po.id}`,
      status: 'Completed'
    };
    updatedTransfers.unshift(newRecord);
  });
  setStoredData('AGRO_ERP_WAREHOUSE_TRANSFERS', updatedTransfers);
};

// Helper to resolve vendor city dynamically
const getSupplierCity = (supplierName, companiesList = []) => {
  if (!supplierName) return '';
  const comp = (companiesList || []).find(c => c.name.toLowerCase() === supplierName.toLowerCase() || supplierName.toLowerCase().includes(c.name.toLowerCase()));
  return comp?.city || '';
};

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function PurchasesScreen({ triggerNotificationToast, addAuditLog, dateFilter, setDateFilter, selectedCity, setSelectedCity, cities = [] }) {
  const { t } = useLanguage();
  const [poList, setPoList] = useState(INIT_PO_LIST);
  const [companies, setCompanies] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewPO, setViewPO] = useState(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const fetchPOs = async () => {
      try {
        const data = await purchaseApi.getAll();
        if (data && Array.isArray(data) && data.length > 0) {
          const normalized = data.map(po => {
            const resolvedPoNo = po.po_no || po.po_number || po.id || (po._id ? `PO-2026-${String(po._id).slice(-4).toUpperCase()}` : 'PO-2026');
            return {
              ...po,
              id: resolvedPoNo,
              po_no: resolvedPoNo,
              po_number: resolvedPoNo
            };
          });
          setPoList(normalized);
        }
      } catch (e) {}
    };
    const fetchCompanies = async () => {
      try {
        const data = await companyApi.getAll();
        if (data && Array.isArray(data)) setCompanies(data);
      } catch (e) {}
    };
    fetchPOs();
    fetchCompanies();
  }, []);

  const dateFilteredPOs = useMemo(() => {
    return (poList || []).filter(po => {
      if (!po) return false;
      const poDate = po.date || po.createdAt || '2026-08-01';
      const supplierName = po.supplier || po.supplier_name || po.vendor_id?.company_name || '—';
      const matchesDate = isItemInDateRange(poDate, dateFilter.startDate, dateFilter.endDate);
      const matchesCity = selectedCity === 'All' || getSupplierCity(supplierName, companies) === selectedCity;
      return matchesDate && matchesCity;
    });
  }, [poList, dateFilter, selectedCity, companies]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return dateFilteredPOs.filter(po => {
      if (!po) return false;
      const poId = po.po_no || po.po_number || po.id || '';
      const supplierName = po.supplier || po.supplier_name || po.vendor_id?.company_name || '—';
      return (
        po.status !== 'Cancelled' && 
        (!q || poId.toLowerCase().includes(q) || supplierName.toLowerCase().includes(q) || getSupplierCity(supplierName, companies).toLowerCase().includes(q)) &&
        (!statusFilter || po.status === statusFilter)
      );
    });
  }, [dateFilteredPOs, searchQuery, statusFilter, companies]);

  // Stats
  const totalCost    = dateFilteredPOs.reduce((s, p) => s + (p.total || p.grand_total || 0), 0);
  const pendingCount = dateFilteredPOs.filter(p => p.status !== 'Received').length;
  const receivedCount= dateFilteredPOs.filter(p => p.status === 'Received').length;

  const savePOState = (updatedList) => {
    setPoList(updatedList);
    setStoredData('AGRO_ERP_PURCHASE_ORDERS', updatedList);
  };

  const handleSavePO = async (newPO) => {
    let poToAdd = { 
      ...newPO, 
      po_no: newPO.po_no || newPO.id,
      po_number: newPO.po_no || newPO.id,
      status: 'Received', 
      stock_inward_done: true 
    };
    addPOItemsToWarehouse(poToAdd);

    try {
      const created = await purchaseApi.create(poToAdd).catch(() => null);
      if (created && (created.po_no || created._id)) {
        const resolvedNo = created.po_no || newPO.po_no;
        poToAdd = {
          ...created,
          po_no: resolvedNo,
          po_number: resolvedNo,
          id: resolvedNo,
          status: 'Received',
          stock_inward_done: true
        };
      }
    } catch(e) {}

    if (triggerNotificationToast) {
      triggerNotificationToast('Purchase Inward Completed', `Stock added to Warehouse & Product catalog!`, 'success');
    }

    const newList = [poToAdd, ...poList];
    savePOState(newList);
    setShowForm(false);
    if (addAuditLog) {
      addAuditLog('Create PO', `Created PO ${poToAdd.po_no || poToAdd.id} (${poToAdd.supplier}) total Rs. ${poToAdd.total}`);
    }
  };

  const markReceived = async (id) => {
    const targetPO = poList.find(p => (p._id || p.id || p.po_no) === id);
    if (targetPO) {
      addPOItemsToWarehouse(targetPO);
      try {
        await purchaseApi.updateStatus(targetPO._id || targetPO.id, 'Received').catch(() => {});
      } catch(e) {}
    }
    const newList = poList.map(p => (p._id || p.id || p.po_no) === id ? { ...p, status: 'Received', stock_inward_done: true } : p);
    savePOState(newList);

    if (triggerNotificationToast) {
      triggerNotificationToast('PO Received', `Stock added to Warehouse table list!`, 'success');
    }
    if (addAuditLog) {
      addAuditLog('Receive PO', `Marked PO ${id} as Received. Inward stock added to Warehouse.`);
    }
  };

  const deletePO = (id) => {
    if (window.confirm('Are you sure you want to delete this Draft PO?')) {
      const newList = poList.filter(p => (p._id || p.id || p.po_no) !== id);
      savePOState(newList);
      if (triggerNotificationToast) triggerNotificationToast('PO Deleted', `PO ${id} deleted.`, 'info');
    }
  };

  const issuePO = (id) => {
    const newList = poList.map(p => (p._id || p.id || p.po_no) === id ? { ...p, status: 'Issued' } : p);
    savePOState(newList);
    if (triggerNotificationToast) triggerNotificationToast('PO Issued', `PO ${id} has been issued to supplier.`, 'success');
  };

  const cancelPO = (id) => {
    const reason = window.prompt('Enter cancellation reason:');
    if (reason !== null) {
      const newList = poList.map(p => (p._id || p.id || p.po_no) === id ? { ...p, status: 'Cancelled', cancelReason: reason } : p);
      savePOState(newList);
      if (triggerNotificationToast) triggerNotificationToast('PO Cancelled', `PO ${id} cancelled.`, 'info');
    }
  };

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-black text-gray-900 tracking-tight">Purchases</h1>
          <p className="text-xs text-gray-400 mt-0.5 font-medium">{dateFilteredPOs.length} purchase orders · Rs. {totalCost.toLocaleString()} total in range</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer"
        >
          <Plus size={14} /> {showForm ? 'Hide Form' : 'New Purchase'}
        </button>
      </div>

      {/* Date & Location Filters */}
      <DateFilterBar 
        dateFilter={dateFilter} 
        setDateFilter={setDateFilter} 
        selectedCity={selectedCity} 
        setSelectedCity={setSelectedCity} 
        cities={cities} 
      />



      {/* New Purchase Form */}
      {showForm && <NewPurchasePanel onSave={handleSavePO} onCancel={() => setShowForm(false)} triggerNotificationToast={triggerNotificationToast} companies={companies} />}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text" placeholder="Search PO number or supplier..."
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-800 focus:border-green-500 focus:ring-2 focus:ring-green-500/10 focus:outline-none transition"
          />
        </div>
        <select
          value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 focus:border-green-500 focus:outline-none transition"
        >
          <option value="">All Status</option>
          {Object.keys(STATUS_CFG).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {(searchQuery || statusFilter) && (
          <button onClick={() => { setSearchQuery(''); setStatusFilter(''); }} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-500 hover:text-red-600 border border-gray-200 rounded-lg hover:border-red-200 hover:bg-red-50 transition cursor-pointer">
            <RefreshCcw size={12} /> Reset
          </button>
        )}
        <span className="text-xs text-gray-400 font-medium hidden sm:block">{filtered.length} results</span>
      </div>

      {/* Purchase History Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <FileText size={15} className="text-green-600" />
          <span className="text-xs font-extrabold text-gray-700 uppercase tracking-wide">Purchase History</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">
                <th className="py-3 px-4 text-left">PO Number</th>
                <th className="py-3 px-4 text-left">Supplier</th>
                <th className="py-3 px-4 text-left">Purchased Products & Qty</th>
                <th className="py-3 px-4 text-left hidden sm:table-cell">Date</th>
                <th className="py-3 px-4 text-right">Total (Rs.)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-14 text-center text-gray-400 font-medium">
                  <ShoppingBag size={28} className="mx-auto mb-2 text-gray-300" />No purchase orders found.
                </td></tr>
              ) : filtered.map((po, idx) => (
                <tr key={po._id || po.id || po.po_no || `po_${idx}`} className="hover:bg-gray-50/60 transition group">
                  <td className="py-3.5 px-4 font-mono font-bold text-green-700 whitespace-nowrap">{po.po_no || po.po_number || po.id || 'PO-2026'}</td>
                  <td className="py-3.5 px-4 font-bold text-gray-800 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span>{po.supplier}</span>
                      {po.transport && (po.transport.company || po.transport.vehicle) && (
                        <div className="flex items-center gap-1 text-[9px] text-blue-600 mt-0.5" title="Transport Details Attached">
                          <Truck size={10} />
                          <span>{po.transport.company || po.transport.vehicle}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-left font-medium text-gray-800">
                    <div className="space-y-1">
                      {po.items.map((it, idx) => (
                        <div key={idx} className="flex items-center space-x-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                          <span className="font-bold text-gray-800 text-[11px]">{it.name}</span>
                          <span className="text-[10px] text-gray-500 font-mono font-semibold bg-gray-100 px-1.5 py-0.2 rounded">
                            {it.qty} qty
                          </span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-gray-500 font-semibold whitespace-nowrap hidden sm:table-cell">{po.date}</td>
                  <td className="py-3.5 px-4 text-right font-black text-gray-900 whitespace-nowrap">Rs. {po.total.toLocaleString()}</td>
                  <td className="py-3.5 px-4 text-center whitespace-nowrap"><StatusBadge status={po.status} /></td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center justify-center gap-1.5">
                      <button 
                        type="button"
                        onClick={() => setViewPO(po)} 
                        title="View Details" 
                        className="px-2.5 py-1 bg-green-50 border border-green-200 text-green-700 hover:bg-green-600 hover:text-white rounded-lg text-xs font-bold transition cursor-pointer flex items-center space-x-1 shadow-2xs"
                      >
                        <Eye size={13} />
                        <span>View</span>
                      </button>

                      {po.status === 'Draft' && (
                        <>
                          <button onClick={() => alert('Edit functionality to be implemented')} title="Edit Draft" className="p-1.5 rounded-lg bg-gray-100 hover:bg-blue-100 text-gray-500 hover:text-blue-700 transition cursor-pointer"><FileText size={13} /></button>
                          <button onClick={() => issuePO(po._id || po.id || po.po_no)} title="Issue PO" className="p-1.5 rounded-lg bg-gray-100 hover:bg-green-100 text-gray-500 hover:text-green-700 transition cursor-pointer"><Send size={13} /></button>
                          <button onClick={() => deletePO(po._id || po.id || po.po_no)} title="Delete Draft" className="p-1.5 rounded-lg bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-700 transition cursor-pointer"><Trash2 size={13} /></button>
                        </>
                      )}

                      {po.status === 'Issued' && (
                        <>
                          <button onClick={() => markReceived(po._id || po.id || po.po_no)} title="Receive Stock" className="p-1.5 rounded-lg bg-gray-100 hover:bg-green-100 text-gray-500 hover:text-green-700 transition cursor-pointer"><CheckCircle2 size={13} /></button>
                          <button onClick={() => window.print()} title="Print PO" className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition cursor-pointer"><Printer size={13} /></button>
                          <button onClick={() => cancelPO(po._id || po.id || po.po_no)} title="Cancel PO" className="p-1.5 rounded-lg bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-700 transition cursor-pointer"><X size={13} /></button>
                        </>
                      )}

                      {po.status === 'Received' && (
                        <>
                          <button onClick={() => window.print()} title="Print PO" className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition cursor-pointer"><Printer size={13} /></button>
                          <button onClick={() => alert('Purchase Return form not implemented')} title="Purchase Return" className="p-1.5 rounded-lg bg-gray-100 hover:bg-orange-100 text-gray-500 hover:text-orange-700 transition cursor-pointer"><RefreshCcw size={13} /></button>
                        </>
                      )}

                      {po.status === 'Cancelled' && (
                        <>
                          <button onClick={() => alert(`Cancellation Reason: ${po.cancelReason || 'No reason provided'}`)} title="View Reason" className="p-1.5 rounded-lg bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-700 transition cursor-pointer"><X size={13} /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 text-[10px] font-semibold text-gray-400">
          Showing {filtered.length} of {dateFilteredPOs.length} purchase orders
        </div>
      </div>

      {/* PO Detail Modal */}
      {viewPO && (
        <PODetailModal
          po={viewPO}
          onClose={() => setViewPO(null)}
          onMarkReceived={(id) => { markReceived(id); setViewPO(prev => prev ? { ...prev, status: 'Received' } : prev); }}
          onIssuePO={(id) => { issuePO(id); setViewPO(prev => prev ? { ...prev, status: 'Issued' } : prev); }}
        />
      )}
    </div>
  );
}
