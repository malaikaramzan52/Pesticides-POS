import React, { useState, useMemo, useEffect } from 'react';
import {
  Boxes,
  Search,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  SlidersHorizontal,
  RefreshCcw,
  CheckCircle2,
  X,
  Save,
  TrendingDown,
  Package,
  DollarSign,
  History,
  PlusCircle,
} from 'lucide-react';
import { PRODUCTS, COMPANIES, CATEGORIES, UNITS, saveProductsToStorage, getStoredData, setStoredData, INITIAL_WAREHOUSE_STOCK } from '../utils/mockData';
import { productApi, warehouseApi } from '../api';
import DateFilterBar from './DateFilterBar';
import { useLanguage } from '../context/LanguageContext';
import { isItemInDateRange } from '../utils/dateUtils';

// ── Build inventory list from PRODUCTS ────────────────────────────────────────
const buildInventory = (products = []) =>
  (products || []).map(p => {
    const batches = Array.isArray(p.batches) ? p.batches : [];
    const batchStockSum = batches.reduce((s, b) => s + (Number(b?.stock_qty) || 0), 0);
    const finalStockQty = (batches.length > 0) ? batchStockSum : Number(p.stock_qty ?? p.total_stock ?? p.stock ?? 0);
    const brandName = typeof p.company_id === 'object' ? p.company_id?.name : (COMPANIES.find(c => (c._id || c.id) === p.company_id)?.name || '—');
    const catName   = typeof p.category_id === 'object' ? p.category_id?.name : (CATEGORIES.find(c => (c._id || c.id) === p.category_id)?.name || '—');
    const unitName  = typeof p.unit_id === 'object' ? p.unit_id?.name : (UNITS.find(u => (u._id || u.id) === p.unit_id)?.name || 'Unit');
    return {
      id:            p._id || p.id,
      _id:           p._id || p.id,
      name:          p.name,
      code:          p.code,
      brand:         brandName,
      category:      catName,
      unit:          unitName,
      stock_qty:     finalStockQty,
      purchase_rate: batches[0]?.purchase_rate || p.dealer_price || p.purchase_price || 0,
      selling_rate:  p.farmer_price || p.retail_price || 0,
      min_stock:     p.min_stock || 15,
      batches:       batches,
    };
  });

// ── Mock stock movement log ───────────────────────────────────────────────────
const INIT_MOVEMENTS = [];

const REASONS = ['Leakage / Damage', 'Physical Recount', 'Disposal / Scrap', 'Bonus Stock', 'Theft / Loss', 'Transfer Out'];

// ── Stock Movement Modal ──────────────────────────────────────────────────────
function MovementModal({ item, type, onClose, onSave }) {
  const [qty,    setQty]    = useState('');
  const [note,   setNote]   = useState('');
  const [reason, setReason] = useState(REASONS[0]);
  const [rate,   setRate]   = useState(item?.purchase_rate || '');

  const isAdj = type === 'Adjustment';
  const isIn  = type === 'Stock In';

  const handleSave = () => {
    const q = parseInt(qty);
    if (!q || q <= 0) return;
    onSave({ type, qty: isAdj && note === 'Deduct' ? -q : q, note: isAdj ? reason : note, rate });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md border border-gray-200 shadow-2xl">

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isIn ? 'bg-green-100' : isAdj ? 'bg-amber-100' : 'bg-red-100'}`}>
              {isIn  ? <ArrowDown size={16} className="text-green-700" /> :
               isAdj ? <SlidersHorizontal size={16} className="text-amber-700" /> :
                       <ArrowUp size={16} className="text-red-700" />}
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-gray-800">{type}</h2>
              <p className="text-[10px] text-gray-400 font-medium truncate max-w-[200px]">{item?.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition cursor-pointer">
            <X size={15} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Current stock */}
          <div className="flex justify-between items-center bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
            <span className="text-xs font-bold text-gray-500">Current Stock</span>
            <span className="text-lg font-black text-gray-800">{item?.stock_qty} <span className="text-xs font-semibold text-gray-400">{item?.unit}</span></span>
          </div>

          {/* Qty */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide">
              {isAdj ? 'Adjustment Quantity' : `${type} Quantity`} <span className="text-red-500">*</span>
            </label>
            <input
              type="number" min="1"
              placeholder="Enter quantity..."
              value={qty}
              onChange={e => setQty(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-800 focus:border-green-500 focus:ring-2 focus:ring-green-500/10 focus:outline-none transition"
            />
          </div>

          {/* Rate (for Stock In) */}
          {isIn && (
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide">Purchase Rate (Rs.)</label>
              <input
                type="number" min="0"
                value={rate}
                onChange={e => setRate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-800 focus:border-green-500 focus:ring-2 focus:ring-green-500/10 focus:outline-none transition"
              />
            </div>
          )}

          {/* Adjustment direction */}
          {isAdj && (
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide">Direction</label>
              <div className="grid grid-cols-2 gap-3">
                {['Add', 'Deduct'].map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setNote(d)}
                    className={`py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${note === d
                      ? d === 'Add' ? 'bg-green-600 text-white border-green-600' : 'bg-red-600 text-white border-red-600'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}
                  >
                    {d === 'Add' ? '+ Add Stock' : '− Deduct Stock'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Reason (Adjustment) */}
          {isAdj && (
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide">Reason</label>
              <select
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 bg-white focus:border-green-500 focus:outline-none transition"
              >
                {REASONS.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
          )}

          {/* Note (Stock In/Out) */}
          {!isAdj && (
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide">Reference / Note</label>
              <input
                placeholder="e.g. PO-2026-005 or reason..."
                value={note}
                onChange={e => setNote(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-800 focus:border-green-500 focus:ring-2 focus:ring-green-500/10 focus:outline-none transition"
              />
            </div>
          )}
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
          <button onClick={onClose} className="flex-1 py-2 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl text-xs hover:bg-gray-100 transition cursor-pointer">Cancel</button>
          <button onClick={handleSave} className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-xs shadow-sm transition cursor-pointer flex items-center justify-center gap-2">
            <Save size={12} /> Save {type}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Global Add Inventory Modal ────────────────────────────────────────────────
function GlobalAddModal({ onClose, onSave }) {
  const [prodId, setProdId] = useState('');
  const [warehouse, setWarehouse] = useState('Main Godown (Warehouse A)');
  const [qty, setQty] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [error, setError] = useState('');

  const handleSave = () => {
    if (!prodId || !warehouse || !qty || !unitCost) {
      setError('All fields are required.');
      return;
    }
    const q = parseInt(qty, 10);
    const c = parseFloat(unitCost);
    if (isNaN(q) || q <= 0 || isNaN(c) || c < 0) {
      setError('Invalid quantity or cost.');
      return;
    }
    const product = PRODUCTS.find(p => p.id === prodId);
    onSave({ product, warehouse, qty: q, unitCost: c });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm border border-gray-200 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
              <Package size={16} className="text-green-700" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-gray-900">Add Inventory</h3>
              <p className="text-[10px] text-gray-500 font-medium">Add stock for existing products</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition cursor-pointer"><X size={15} /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && <div className="p-2 bg-red-50 text-red-700 text-[10px] font-bold rounded-lg border border-red-200 flex items-center gap-1.5"><AlertTriangle size={12} /> {error}</div>}
          
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide">Product <span className="text-red-500">*</span></label>
            <select value={prodId} onChange={e => setProdId(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-800 focus:border-green-500 focus:outline-none">
              <option value="">Select Product...</option>
              {PRODUCTS.map(p => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide">Warehouse <span className="text-red-500">*</span></label>
            <select value={warehouse} onChange={e => setWarehouse(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-800 focus:border-green-500 focus:outline-none">
              <option value="Main Godown (Warehouse A)">Main Godown (Warehouse A)</option>
              <option value="Main Godown (Warehouse B)">Main Godown (Warehouse B)</option>
              <option value="POS Counter">POS Counter</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide">Quantity <span className="text-red-500">*</span></label>
              <input type="number" min="1" placeholder="Qty" value={qty} onChange={e => setQty(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-800 focus:border-green-500 focus:outline-none" />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide">Unit Cost <span className="text-red-500">*</span></label>
              <input type="number" min="0" step="0.01" placeholder="Rs." value={unitCost} onChange={e => setUnitCost(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-800 focus:border-green-500 focus:outline-none" />
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
          <button onClick={onClose} className="flex-1 py-2 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl text-xs hover:bg-gray-100 transition cursor-pointer">Cancel</button>
          <button onClick={handleSave} className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-xs shadow-sm transition cursor-pointer flex items-center justify-center gap-2">
            <CheckCircle2 size={12} /> Add Stock
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Inventory Screen ─────────────────────────────────────────────────────
export default function InventoryScreen({ triggerNotificationToast, dateFilter, setDateFilter }) {
  const { t } = useLanguage();
  const [inventory,  setInventory]  = useState(buildInventory(PRODUCTS));
  const [movements,  setMovements]  = useState(() => getStoredData('AGRO_ERP_STOCK_MOVEMENTS', INIT_MOVEMENTS));
  const [searchQuery, setSearchQuery] = useState('');
  const [catFilter,  setCatFilter]  = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [activeTab,  setActiveTab]  = useState('stock');  // 'stock' | 'movements' | 'alerts'
  const [modal,      setModal]      = useState(null);   // { item, type }
  const [activeCard, setActiveCard] = useState('');

  useEffect(() => {
    const fetchLiveInventory = async () => {
      try {
        const prods = await productApi.getAll();
        if (prods && Array.isArray(prods) && prods.length > 0) {
          setInventory(buildInventory(prods));
        }
      } catch (e) {}
    };
    fetchLiveInventory();
  }, []);

  const dateFilteredMovements = useMemo(() => {
    return movements.filter(m => isItemInDateRange(m.date, dateFilter.startDate, dateFilter.endDate));
  }, [movements, dateFilter]);

  // ── Filtered stock ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return inventory.filter(item => {
      const matchQ    = !q || item.name.toLowerCase().includes(q) || item.code.toLowerCase().includes(q) || item.brand.toLowerCase().includes(q);
      const matchCat  = !catFilter   || item.category === catFilter;
      const matchBrand= !brandFilter || item.brand    === brandFilter;
      const matchCard = activeCard === 'Low Stock Items' ? item.stock_qty <= item.min_stock : true;
      return matchQ && matchCat && matchBrand && matchCard;
    });
  }, [inventory, searchQuery, catFilter, brandFilter, activeCard]);

  const lowStockItems = inventory.filter(i => i.stock_qty <= i.min_stock);

  // ── Stats ───────────────────────────────────────────────────────────────────
  const totalUnits   = inventory.reduce((s, i) => s + i.stock_qty,                          0);
  const costVal      = inventory.reduce((s, i) => s + i.stock_qty * i.purchase_rate,         0);
  const retailVal    = inventory.reduce((s, i) => s + i.stock_qty * i.selling_rate,          0);
  const lowCount     = lowStockItems.length;

  // ── Movement handler ────────────────────────────────────────────────────────
  const handleMovement = async ({ type, qty, note, rate }) => {
    const item = modal.item;
    const absQty = Math.abs(qty);
    const targetId = item._id || item.id;
    let newStock = item.stock_qty;

    if (type === 'Stock In') {
      newStock += absQty;
    } else if (type === 'Stock Out') {
      newStock = Math.max(0, newStock - absQty);
    } else if (type === 'Adjustment') {
      newStock = note === 'Deduct' ? Math.max(0, newStock - absQty) : newStock + absQty;
    }

    // 1. Update in local inventory state
    setInventory(prev => prev.map(inv => {
      if ((inv._id || inv.id) === targetId) {
        const updatedBatches = [...(inv.batches || [])];
        if (updatedBatches.length > 0) {
          updatedBatches[0] = { ...updatedBatches[0], stock_qty: newStock };
        } else {
          updatedBatches.push({ id: `B_${Date.now()}`, batch_no: 'DEFAULT', stock_qty: newStock });
        }
        return { ...inv, stock_qty: newStock, batches: updatedBatches };
      }
      return inv;
    }));

    // 2. Sync to global PRODUCTS array
    const targetProd = PRODUCTS.find(p => (p._id || p.id) === targetId);
    if (targetProd) {
      if (!targetProd.batches || targetProd.batches.length === 0) {
        targetProd.batches = [{ id: `B_${Date.now()}`, batch_no: 'DEFAULT', stock_qty: newStock }];
      } else {
        targetProd.batches[0].stock_qty = newStock;
      }
      saveProductsToStorage();
    }

    // 3. Persist to MongoDB via productApi
    try {
      const payloadBatches = (targetProd?.batches || item.batches || []).map(b => ({
        ...b,
        stock_qty: b === (targetProd?.batches?.[0] || item.batches?.[0]) ? newStock : (b.stock_qty || 0)
      }));
      if (payloadBatches.length === 0) {
        payloadBatches.push({ batch_no: 'BATCH-001', stock_qty: newStock });
      }
      await productApi.update(targetId, { batches: payloadBatches, stock_qty: newStock }).catch(() => {});
    } catch(e) {}

    const updatedMovs = [{
      id: `M${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      type,
      product: item.name,
      qty: type === 'Stock Out' || (type === 'Adjustment' && note === 'Deduct') ? -absQty : absQty,
      ref: note || '—',
      note: '',
    }, ...movements];
    setMovements(updatedMovs);
    setStoredData('AGRO_ERP_STOCK_MOVEMENTS', updatedMovs);

    if (triggerNotificationToast) triggerNotificationToast('Inventory Updated', `${type} of ${absQty} units for ${item.name} recorded.`, 'success');

    setModal(null);
  };

  const handleGlobalAdd = (data) => {
    const { product, warehouse, qty, unitCost } = data;

    // 1. Update PRODUCTS (Inventory/Product Stock)
    const targetProd = PRODUCTS.find(p => p.id === product.id);
    if (targetProd) {
      if (!targetProd.batches || targetProd.batches.length === 0) {
        targetProd.batches = [{ id: `B_${Date.now()}`, batch_no: 'DEFAULT', stock_qty: 0, purchase_rate: unitCost }];
      }
      targetProd.batches[0].stock_qty += qty;
      targetProd.batches[0].purchase_rate = unitCost;
      saveProductsToStorage();
    }

    // 2. Update WAREHOUSE STOCK
    let wStock = getStoredData('AGRO_ERP_WAREHOUSE_STOCK', INITIAL_WAREHOUSE_STOCK);
    let targetWhItem = wStock.find(w => w.product_id === product.id && w.rack_no === warehouse);
    
    if (targetWhItem) {
      targetWhItem.warehouse_qty = (targetWhItem.warehouse_qty || 0) + qty;
      targetWhItem.purchase_rate = unitCost;
    } else {
      // Create new warehouse entry if doesn't exist for that location
      wStock.push({
        id: `WH_${product.id}_${Date.now()}`,
        product_id: product.id,
        product_name: product.name,
        code: product.code,
        category: CATEGORIES.find(c => c.id === product.category_id)?.name || 'Misc',
        company: (() => {
          const co = COMPANIES.find(c => c.id === product.company_id);
          return co ? `${co.name} (${co.company_type || 'Manufacturer'})` : 'Unknown';
        })(),
        batch_no: targetProd?.batches?.[0]?.batch_no || 'DEFAULT',
        rack_no: warehouse,
        warehouse_qty: qty,
        pos_counter_qty: 0,
        unit: UNITS.find(u => u.id === product.unit_id)?.name || 'Unit',
        purchase_rate: unitCost,
        selling_rate: product.retail_price || 0
      });
    }
    setStoredData('AGRO_ERP_WAREHOUSE_STOCK', wStock);

    // 3. Create Movement Entry
    const updatedMovs = [{
      id: `M${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      type: 'Stock In',
      product: product.name,
      qty: qty,
      ref: warehouse,
      note: 'Direct Inventory Addition',
    }, ...movements];
    setMovements(updatedMovs);
    setStoredData('AGRO_ERP_STOCK_MOVEMENTS', updatedMovs);

    setInventory(buildInventory(PRODUCTS));
    if (triggerNotificationToast) triggerNotificationToast('Inventory Added', `${qty} units of ${product.name} added to ${warehouse}.`, 'success');
    setModal(null);
  };

  const tabs = [
    { id: 'stock',     label: 'Current Stock',   icon: Boxes },
    { id: 'movements', label: 'Stock Movements',  icon: ArrowUpDown },
    { id: 'alerts',    label: `Low Stock Alerts (${lowCount})`, icon: AlertTriangle },
  ];

  return (
    <div className="space-y-5">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-black text-gray-900 tracking-tight">Inventory</h1>
          <p className="text-xs text-gray-400 mt-0.5 font-medium">{inventory.length} products · {totalUnits.toLocaleString()} total units</p>
        </div>
        <div className="flex items-center gap-3">
          {lowCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl">
              <AlertTriangle size={13} /> {lowCount} items low on stock
            </span>
          )}
          <button onClick={() => setModal({ type: 'Global Add' })} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer">
            <PlusCircle size={14} /> Add Inventory
          </button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <DateFilterBar dateFilter={dateFilter} setDateFilter={setDateFilter} />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Units',     value: totalUnits.toLocaleString(),              icon: Package,    color: 'text-gray-900',  bg: 'bg-gray-50',   border: 'border-gray-200', ring: 'ring-gray-200', icolor: 'text-gray-500' },
          { label: 'Cost Valuation',  value: `Rs. ${costVal.toLocaleString()}`,        icon: DollarSign, color: 'text-blue-700',  bg: 'bg-blue-50',   border: 'border-blue-200', ring: 'ring-blue-500', icolor: 'text-blue-500' },
          { label: 'Retail Value',    value: `Rs. ${retailVal.toLocaleString()}`,      icon: TrendingDown, color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200', ring: 'ring-green-500', icolor: 'text-green-600' },
          { label: 'Low Stock Items', value: lowCount,                                 icon: AlertTriangle, color: 'text-red-700', bg: 'bg-red-50',  border: 'border-red-200',  ring: 'ring-red-500', icolor: 'text-red-500' },
        ].map(({ label, value, icon: Icon, color, bg, border, ring, icolor }) => {
          const isActive = activeCard === label || (activeCard === '' && label === 'Total Units');
          return (
            <div 
              key={label}
              onClick={() => setActiveCard(isActive ? '' : (label === 'Low Stock Items' ? label : ''))}
              className={`${bg} border ${border} ${isActive ? `ring-2 ring-opacity-20 ${ring} border-opacity-100` : ''} rounded-xl p-4 flex items-center justify-between gap-3 cursor-pointer transition-all hover:shadow-sm hover:-translate-y-0.5`}
            >
              <div>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block">{label}</span>
                <span className={`text-lg font-black mt-0.5 block ${color}`}>{value}</span>
              </div>
              <Icon size={20} className={`${icolor} flex-shrink-0 opacity-60`} />
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon size={13} className={activeTab === id && id === 'alerts' ? 'text-red-500' : ''} />
            {label}
          </button>
        ))}
      </div>

      {/* ── TAB: Current Stock ────────────────────────────────────────────── */}
      {activeTab === 'stock' && (
        <>
          {/* Filters */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search product name, code, brand..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-800 focus:border-green-500 focus:ring-2 focus:ring-green-500/10 focus:outline-none transition"
              />
            </div>
            <select
              value={catFilter}
              onChange={e => setCatFilter(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 focus:border-green-500 focus:outline-none transition"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
            <select
              value={brandFilter}
              onChange={e => setBrandFilter(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 focus:border-green-500 focus:outline-none transition"
            >
              <option value="">All Brands</option>
              {COMPANIES.map(c => {
                const val = `${c.name} (${c.company_type || 'Manufacturer'})`;
                return <option key={c.id} value={val}>{val}</option>;
              })}
            </select>
            {(searchQuery || catFilter || brandFilter) && (
              <button
                onClick={() => { setSearchQuery(''); setCatFilter(''); setBrandFilter(''); }}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-500 hover:text-red-600 border border-gray-200 rounded-lg hover:border-red-200 hover:bg-red-50 transition cursor-pointer"
              >
                <RefreshCcw size={12} /> Reset
              </button>
            )}
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-4 hidden md:table-cell">Brand / Category</th>
                    <th className="py-3 px-4 text-center">Unit</th>
                    <th className="py-3 px-4 text-right">Stock Qty</th>
                    <th className="py-3 px-4 text-right hidden sm:table-cell">Cost Rate</th>
                    <th className="py-3 px-4 text-right hidden sm:table-cell">Retail Rate</th>
                    <th className="py-3 px-4 text-right hidden lg:table-cell">Cost Value</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={9} className="py-14 text-center text-gray-400 font-medium">
                      <Boxes size={28} className="mx-auto mb-2 text-gray-300" />No stock records found.
                    </td></tr>
                  ) : filtered.map(item => {
                    const isLow = item.stock_qty <= item.min_stock;
                    const isOut = item.stock_qty === 0;
                    const costV = item.stock_qty * item.purchase_rate;
                    const statusCls = isOut ? 'bg-red-100 text-red-700 border-red-200' :
                                      isLow ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                              'bg-green-100 text-green-700 border-green-200';
                    const statusTxt = isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock';
                    return (
                      <tr key={item.id} className="hover:bg-gray-50/60 transition">
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-gray-900 block">{item.name}</span>
                          <span className="text-[10px] text-gray-400 font-mono">{item.code}</span>
                        </td>
                        <td className="py-3.5 px-4 hidden md:table-cell">
                          <span className="font-semibold text-gray-700 block">{item.brand}</span>
                          <span className="text-[10px] text-gray-400">{item.category}</span>
                        </td>
                        <td className="py-3.5 px-4 text-center text-gray-500 font-medium">{item.unit}</td>
                        <td className={`py-3.5 px-4 text-right font-bold text-xs ${isOut ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-gray-900'}`}>
                          {item.stock_qty}
                        </td>
                        <td className="py-3.5 px-4 text-right font-semibold text-gray-500 hidden sm:table-cell">Rs. {item.purchase_rate}</td>
                        <td className="py-3.5 px-4 text-right font-bold text-green-700 hidden sm:table-cell">Rs. {item.selling_rate}</td>
                        <td className="py-3.5 px-4 text-right font-semibold text-gray-600 hidden lg:table-cell">Rs. {costV.toLocaleString()}</td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold border ${statusCls}`}>{statusTxt}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => setModal({ item, type: 'Stock In' })}   title="Stock In"   className="p-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 transition cursor-pointer"><ArrowDown size={12} /></button>
                            <button onClick={() => setModal({ item, type: 'Stock Out' })}  title="Stock Out"  className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition cursor-pointer"><ArrowUp size={12} /></button>
                            <button onClick={() => setModal({ item, type: 'Adjustment' })} title="Adjust"     className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 transition cursor-pointer"><SlidersHorizontal size={12} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 text-[10px] font-semibold text-gray-400">
              Showing {filtered.length} of {inventory.length} products
            </div>
          </div>
        </>
      )}

      {/* ── TAB: Stock Movements ──────────────────────────────────────────── */}
      {activeTab === 'movements' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <History size={15} className="text-green-600" />
            <span className="text-xs font-extrabold text-gray-700 uppercase tracking-wide">Stock Movement Log</span>
            <span className="ml-auto text-[10px] text-gray-400 font-semibold">{movements.length} entries</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4 text-left">Date</th>
                  <th className="py-3 px-4 text-left">Type</th>
                  <th className="py-3 px-4 text-left">Product</th>
                  <th className="py-3 px-4 text-center">Qty Change</th>
                  <th className="py-3 px-4 text-left hidden sm:table-cell">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {dateFilteredMovements.map(m => {
                  const isIn  = m.type === 'Stock In';
                  const isOut = m.type === 'Stock Out';
                  const typeCls = isIn ? 'bg-green-100 text-green-700 border-green-200' :
                                  isOut ? 'bg-red-100 text-red-700 border-red-200' :
                                          'bg-amber-100 text-amber-700 border-amber-200';
                  return (
                    <tr key={m.id} className="hover:bg-gray-50/60 transition">
                      <td className="py-3 px-4 text-gray-500 font-medium">{m.date}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${typeCls}`}>
                          {isIn  ? <ArrowDown size={9} /> : isOut ? <ArrowUp size={9} /> : <SlidersHorizontal size={9} />}
                          {m.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-gray-800">{m.product}</td>
                      <td className={`py-3 px-4 text-center font-black text-sm ${m.qty > 0 ? 'text-green-700' : 'text-red-600'}`}>
                        {m.qty > 0 ? '+' : ''}{m.qty}
                      </td>
                      <td className="py-3 px-4 text-gray-400 font-medium hidden sm:table-cell">{m.ref}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB: Low Stock Alerts ─────────────────────────────────────────── */}
      {activeTab === 'alerts' && (
        <div className="space-y-3">
          {lowStockItems.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 py-16 text-center">
              <CheckCircle2 size={32} className="mx-auto mb-3 text-green-400" />
              <p className="text-sm font-bold text-gray-600">All stock levels are healthy!</p>
              <p className="text-xs text-gray-400 mt-1">No items below minimum threshold.</p>
            </div>
          ) : lowStockItems.map(item => {
            const pct = Math.min(100, Math.round((item.stock_qty / item.min_stock) * 100));
            const isOut = item.stock_qty === 0;
            return (
              <div key={item.id} className={`bg-white rounded-2xl border shadow-sm p-5 ${isOut ? 'border-red-200' : 'border-amber-200'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`p-2 rounded-xl flex-shrink-0 ${isOut ? 'bg-red-100' : 'bg-amber-100'}`}>
                      <AlertTriangle size={16} className={isOut ? 'text-red-600' : 'text-amber-600'} />
                    </div>
                    <div className="min-w-0">
                      <span className="font-extrabold text-gray-900 block text-sm truncate">{item.name}</span>
                      <span className="text-[10px] text-gray-400 font-medium">{item.brand} · {item.category} · {item.unit}</span>
                      <div className="flex items-center gap-4 mt-2">
                        <div>
                          <span className="text-[9px] text-gray-400 uppercase font-bold block">Current Stock</span>
                          <span className={`text-lg font-black ${isOut ? 'text-red-600' : 'text-amber-600'}`}>{item.stock_qty}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-gray-400 uppercase font-bold block">Min. Level</span>
                          <span className="text-lg font-black text-gray-500">{item.min_stock}</span>
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className="mt-3 w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all ${isOut ? 'bg-red-500' : 'bg-amber-400'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-gray-400 mt-0.5 block">{pct}% of minimum level</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setModal({ item, type: 'Stock In' })}
                    className="flex-shrink-0 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer flex items-center gap-1.5"
                  >
                    <ArrowDown size={12} /> Restock
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {modal && modal.type !== 'Global Add' && (
        <MovementModal 
          item={modal.item} 
          type={modal.type} 
          onClose={() => setModal(null)} 
          onSave={handleMovement} 
        />
      )}
      {modal && modal.type === 'Global Add' && (
        <GlobalAddModal 
          onClose={() => setModal(null)} 
          onSave={handleGlobalAdd} 
        />
      )}
    </div>
  );
}
