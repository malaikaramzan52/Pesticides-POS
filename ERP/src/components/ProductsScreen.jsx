import React, { useState, useMemo, useEffect } from 'react';
import {
  Package,
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  Eye,
  Filter,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  Save,
  RefreshCcw,
  BookOpen,
} from 'lucide-react';
import { PRODUCTS as INITIAL_PRODUCTS, CATEGORIES as MOCK_CATEGORIES, COMPANIES as MOCK_COMPANIES, UNITS } from '../utils/mockData';
import { productApi, categoryApi, companyApi } from '../api';
import ProductLedgerModal from './ProductLedgerModal';
import { useLanguage } from '../context/LanguageContext';

// ── helpers ──────────────────────────────────────────────────────────────────
const EMPTY_PRODUCT = {
  name: '',
  code: '',
  barcode: '',
  category_id: '',
  company_id: '',
  unit_id: '',
  tax_rate: 18,
  tax_type: 'Exclusive',
  dealer_price: '',
  wholesale_price: '',
  retail_price: '',
  farmer_price: '',
  initial_stock: '',
  batch_no: '',
  expiry_date: '',
};

function InputField({ label, required, ...props }) {
  return (
    <div className="space-y-1">
      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-800 focus:border-green-500 focus:ring-2 focus:ring-green-500/10 focus:outline-none placeholder-gray-400 transition"
        {...props}
      />
    </div>
  );
}

function SelectField({ label, required, children, ...props }) {
  return (
    <div className="space-y-1">
      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <select
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 bg-white focus:border-green-500 focus:ring-2 focus:ring-green-500/10 focus:outline-none transition"
        {...props}
      >
        {children}
      </select>
    </div>
  );
}

// ── Add / Edit Modal ──────────────────────────────────────────────────────────
function ProductFormModal({ product, onClose, onSave, mode, categoriesList = [], companiesList = [] }) {
  const [form, setForm] = useState(() => {
    if (product) {
      const activeBatch = product.batches?.find(b => b.stock_qty > 0) || product.batches?.[0];
      const totalCurrentStock = product.batches?.reduce((sum, b) => sum + b.stock_qty, 0) ?? 0;
      return {
        ...product,
        category_id: product.category_id?._id || product.category_id || '',
        company_id: product.company_id?._id || product.company_id || '',
        unit_id: product.unit_id?._id || product.unit_id || '',
        initial_stock: String(totalCurrentStock),
        batch_no: activeBatch ? activeBatch.batch_no : '',
        expiry_date: activeBatch ? activeBatch.expiry_date : ''
      };
    }
    return EMPTY_PRODUCT;
  });
  const [errors, setErrors] = useState({});

  const set = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  const validate = () => {
    const e = {};
    if (!form.name.trim())         e.name         = 'Name is required';
    if (!form.code.trim())         e.code         = 'Code is required';
    if (!form.category_id)         e.category_id  = 'Select a category';
    if (!form.company_id)          e.company_id   = 'Select a company';
    if (!form.unit_id)             e.unit_id      = 'Select a unit';
    if (!form.farmer_price)        e.farmer_price = 'Farmer price required';
    if (!form.dealer_price)        e.dealer_price = 'Dealer price required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSave(form);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl border border-gray-200 shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gray-50/50 rounded-t-2xl">
          <div>
            <span className="text-[10px] uppercase font-bold text-green-700 bg-green-50 border border-green-200 px-2.5 py-0.5 rounded inline-block mb-1">
              {mode === 'add' ? 'New Entry' : 'Edit Entry'}
            </span>
            <h3 className="text-sm font-extrabold text-gray-900">
              {mode === 'add' ? 'Add New Product' : `Edit: ${product?.name}`}
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition cursor-pointer">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">

          {/* Basic Info */}
          <div>
            <p className="text-[10px] font-black text-green-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <span className="inline-block w-4 h-0.5 bg-green-600 rounded"></span>
              Basic Information
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-1">
                <InputField
                  label="Product Code"
                  required
                  placeholder="e.g. PRD-001"
                  value={form.code}
                  onChange={e => set('code', e.target.value)}
                />
                {errors.code && <span className="text-[10px] text-red-500 font-semibold">{errors.code}</span>}
              </div>
              <div className="sm:col-span-2">
                <InputField
                  label="Product Name"
                  required
                  placeholder="e.g. Glyphosate 41% SL"
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                />
                {errors.name && <span className="text-[10px] text-red-500 font-semibold">{errors.name}</span>}
              </div>
            </div>
            <div className="mt-4">
              <InputField
                label="Barcode (Optional)"
                placeholder="Scan or type barcode string"
                value={form.barcode}
                onChange={e => set('barcode', e.target.value)}
              />
            </div>
          </div>

          {/* Classification */}
          <div>
            <p className="text-[10px] font-black text-green-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <span className="inline-block w-4 h-0.5 bg-green-600 rounded"></span>
              Classification
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <SelectField
                  label="Category"
                  required
                  value={form.category_id}
                  onChange={e => set('category_id', e.target.value)}
                >
                  <option value="">Select category</option>
                  {categoriesList.map(c => <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>)}
                </SelectField>
                {errors.category_id && <span className="text-[10px] text-red-500 font-semibold">{errors.category_id}</span>}
              </div>
              <div>
                <SelectField
                  label="Brand / Company"
                  required
                  value={form.company_id}
                  onChange={e => set('company_id', e.target.value)}
                >
                  <option value="">Select company</option>
                  {companiesList.map(c => <option key={c._id || c.id} value={c._id || c.id}>{c.name}{c.company_type ? ` (${c.company_type})` : ''}</option>)}
                </SelectField>
                {errors.company_id && <span className="text-[10px] text-red-500 font-semibold">{errors.company_id}</span>}
              </div>
              <div>
                <SelectField
                  label="Unit"
                  required
                  value={form.unit_id}
                  onChange={e => set('unit_id', e.target.value)}
                >
                  <option value="">Select unit</option>
                  {UNITS.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </SelectField>
                {errors.unit_id && <span className="text-[10px] text-red-500 font-semibold">{errors.unit_id}</span>}
              </div>
            </div>
          </div>

          {/* Tax */}
          <div>
            <p className="text-[10px] font-black text-green-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <span className="inline-block w-4 h-0.5 bg-green-600 rounded"></span>
              Tax Configuration
            </p>
            <div className="grid grid-cols-2 gap-4">
              <InputField
                label="GST Rate (%)"
                type="number"
                min="0"
                max="100"
                placeholder="e.g. 18"
                value={form.tax_rate}
                onChange={e => set('tax_rate', e.target.value)}
              />
              <SelectField
                label="Tax Type"
                value={form.tax_type}
                onChange={e => set('tax_type', e.target.value)}
              >
                <option value="Exclusive">Exclusive (added on top)</option>
                <option value="Inclusive">Inclusive (included in price)</option>
              </SelectField>
            </div>
          </div>

          {/* Inventory & Tracking */}
          <div>
            <p className="text-[10px] font-black text-green-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <span className="inline-block w-4 h-0.5 bg-green-600 rounded"></span>
              Inventory & Tracking
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <InputField
                  label="Initial Stock"
                  type="number"
                  min="0"
                  required
                  placeholder="e.g. 100"
                  value={form.initial_stock}
                  onChange={e => set('initial_stock', e.target.value)}
                />
              </div>
              <div>
                <InputField
                  label="Batch Number"
                  placeholder="Auto-generated if empty"
                  value={form.batch_no}
                  onChange={e => set('batch_no', e.target.value)}
                />
              </div>
              <div>
                <InputField
                  label="Expiry Date"
                  type="date"
                  value={form.expiry_date}
                  onChange={e => set('expiry_date', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div>
            <p className="text-[10px] font-black text-green-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <span className="inline-block w-4 h-0.5 bg-green-600 rounded"></span>
              Pricing Tiers (Rs.)
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <InputField
                  label="Dealer Price"
                  required
                  type="number"
                  min="0"
                  placeholder="0.00"
                  value={form.dealer_price}
                  onChange={e => set('dealer_price', e.target.value)}
                />
                {errors.dealer_price && <span className="text-[10px] text-red-500 font-semibold">{errors.dealer_price}</span>}
              </div>
              <InputField
                label="Wholesale Price"
                type="number"
                min="0"
                placeholder="0.00"
                value={form.wholesale_price}
                onChange={e => set('wholesale_price', e.target.value)}
              />
              <InputField
                label="Retail Price"
                type="number"
                min="0"
                placeholder="0.00"
                value={form.retail_price}
                onChange={e => set('retail_price', e.target.value)}
              />
              <div>
                <InputField
                  label="Farmer Price"
                  required
                  type="number"
                  min="0"
                  placeholder="0.00"
                  value={form.farmer_price}
                  onChange={e => set('farmer_price', e.target.value)}
                />
                {errors.farmer_price && <span className="text-[10px] text-red-500 font-semibold">{errors.farmer_price}</span>}
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl text-xs hover:bg-gray-100 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-xs shadow-sm transition cursor-pointer flex items-center gap-2"
          >
            <Save size={13} />
            {mode === 'add' ? 'Save Product' : 'Update Product'}
          </button>
        </div>

      </div>
    </div>
  );
}

// ── Delete Confirm Modal ──────────────────────────────────────────────────────
function DeleteConfirmModal({ product, onClose, onConfirm }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm border border-gray-200 shadow-2xl p-6 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto">
          <Trash2 size={24} className="text-red-500" />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-sm font-extrabold text-gray-800">Delete Product?</h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            You are about to delete <strong className="text-gray-800">{product?.name}</strong>. This action cannot be undone.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow-sm transition cursor-pointer"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── View Details Modal ────────────────────────────────────────────────────────
function ViewDetailsModal({ product, onClose, categoriesList = [], companiesList = [] }) {
  if (!product) return null;
  const company  = typeof product.company_id  === 'object' ? product.company_id  : companiesList.find(c => (c._id || c.id) === product.company_id);
  const category = typeof product.category_id === 'object' ? product.category_id : categoriesList.find(c => (c._id || c.id) === product.category_id);
  const unit     = typeof product.unit_id     === 'object' ? product.unit_id     : UNITS.find(u => (u._id || u.id) === product.unit_id);
  const totalStock = (Array.isArray(product.batches) ? product.batches : []).reduce((s, b) => s + (b?.stock_qty || 0), 0);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-xl border border-gray-200 shadow-2xl flex flex-col max-h-[88vh]">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <span className="text-[10px] uppercase font-bold text-green-700 bg-green-50 border border-green-200 px-2.5 py-0.5 rounded inline-block mb-2">
              Product Details
            </span>
            <h3 className="text-sm font-extrabold text-gray-900 leading-snug">{product.name}</h3>
            <p className="text-[10px] text-gray-400 font-mono mt-1">Code: {product.code} · Barcode: {product.barcode || 'N/A'}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition cursor-pointer mt-0.5">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Info chips */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Category',  value: category?.name || '—' },
              { label: 'Brand',     value: company ? `${company.name} (${company.company_type || 'Manufacturer'})` : '—' },
              { label: 'Unit',      value: unit?.name     || '—' },
              { label: 'GST',       value: `${product.tax_rate}% (${product.tax_type})` },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                <span className="text-[9px] font-bold uppercase text-gray-400 block">{label}</span>
                <span className="text-xs font-bold text-gray-800 block mt-0.5">{value}</span>
              </div>
            ))}
          </div>

          {/* Pricing */}
          <div>
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-2">Pricing Tiers</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Dealer',     value: product.dealer_price,     color: 'text-blue-700' },
                { label: 'Wholesale',  value: product.wholesale_price,  color: 'text-purple-700' },
                { label: 'Retail',     value: product.retail_price,     color: 'text-gray-800' },
                { label: 'Farmer',     value: product.farmer_price,     color: 'text-green-700' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-white border border-gray-200 rounded-xl p-3 text-center">
                  <span className="text-[9px] text-gray-400 font-bold uppercase block">{label}</span>
                  <span className={`text-sm font-black font-mono block mt-0.5 ${color}`}>Rs. {value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Batches */}
          {product.batches?.length > 0 && (
            <div>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-2">
                Batches ({product.batches.length}) · Total Stock: <strong className="text-green-700">{totalStock}</strong>
              </p>
              <div className="rounded-xl border border-gray-100 overflow-hidden">
                <table className="w-full text-xs border-collapse">
                  <thead className="bg-gray-50">
                    <tr className="text-[9px] font-extrabold text-gray-500 uppercase">
                      <th className="py-2 px-3 text-left">Batch No</th>
                      <th className="py-2 px-3 text-center">Expiry</th>
                      <th className="py-2 px-3 text-right">Stock</th>
                      <th className="py-2 px-3 text-right">Purchase Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {product.batches.map(b => {
                      const isExpired = new Date(b.expiry_date) < new Date();
                      return (
                        <tr key={b.id} className="hover:bg-gray-50">
                          <td className="py-2 px-3 font-mono font-bold text-gray-700">{b.batch_no}</td>
                          <td className={`py-2 px-3 text-center font-semibold ${isExpired ? 'text-red-600' : 'text-gray-600'}`}>
                            {b.expiry_date}
                            {isExpired && <span className="ml-1 text-[8px] font-black text-red-600 bg-red-50 px-1 rounded">EXPIRED</span>}
                          </td>
                          <td className={`py-2 px-3 text-right font-bold ${b.stock_qty <= 15 ? 'text-amber-600' : 'text-gray-800'}`}>{b.stock_qty}</td>
                          <td className="py-2 px-3 text-right font-semibold text-gray-500">Rs. {b.purchase_rate}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}

// ── Main Products Screen ──────────────────────────────────────────────────────
export default function ProductsScreen({ triggerNotificationToast, addAuditLog }) {
  const { t } = useLanguage();
  const [products, setProducts]           = useState([]);
  const [categoriesList, setCategoriesList] = useState(MOCK_CATEGORIES);
  const [companiesList, setCompaniesList]   = useState(MOCK_COMPANIES);
  const [searchQuery, setSearchQuery]     = useState('');
  const [catFilter, setCatFilter]         = useState('');
  const [compFilter, setCompFilter]       = useState('');
  const [modal, setModal]                 = useState(null); // 'add' | 'edit' | 'delete' | 'view'
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    const fetchCatalogData = async () => {
      try {
        const prods = await productApi.getAll();
        if (prods && Array.isArray(prods)) setProducts(prods);
        const cats = await categoryApi.getAll();
        if (cats && Array.isArray(cats) && cats.length > 0) setCategoriesList(cats);
        const comps = await companyApi.getAll();
        if (comps && Array.isArray(comps) && comps.length > 0) setCompaniesList(comps);
      } catch (e) {}
    };
    fetchCatalogData();
  }, [modal]);

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return products.filter(p => {
      const matchSearch  = !q || p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || (p.barcode || '').includes(q);
      const matchCat     = !catFilter  || p.category_id  === catFilter || p.category_id?._id === catFilter;
      const matchComp    = !compFilter || p.company_id   === compFilter  || p.company_id?._id === compFilter;
      return matchSearch && matchCat && matchComp;
    });
  }, [products, searchQuery, catFilter, compFilter]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const openAdd    = ()  => { setSelectedProduct(null);    setModal('add'); };
  const openEdit   = (p) => { setSelectedProduct(p);       setModal('edit'); };
  const openDelete = (p) => { setSelectedProduct(p);       setModal('delete'); };
  const openView   = (p) => { setSelectedProduct(p);       setModal('view'); };
  const openLedger = (p) => { setSelectedProduct(p);       setModal('ledger'); };
  const closeModal = ()  => { setModal(null); setSelectedProduct(null); };

  const handleSave = async (saved) => {
    try {
      if (modal === 'add') {
        const created = await productApi.create(saved);
        setProducts(prev => [created || saved, ...prev]);
        if (triggerNotificationToast) triggerNotificationToast('Product Created', `${saved.name} added successfully.`, 'success');
        if (addAuditLog) addAuditLog('Product Created', `Added product ${saved.name} (${saved.code})`);
      } else {
        const targetId = selectedProduct._id || selectedProduct.id;
        const updated = await productApi.update(targetId, saved);
        setProducts(prev => prev.map(p => (p._id === targetId || p.id === targetId) ? (updated || saved) : p));
        if (triggerNotificationToast) triggerNotificationToast('Product Updated', `${saved.name} updated successfully.`, 'success');
        if (addAuditLog) addAuditLog('Product Updated', `Updated product ${saved.name} (${saved.code})`);
      }
      closeModal();
    } catch (err) {
      if (triggerNotificationToast) triggerNotificationToast('Error', err.message, 'error');
    }
  };

  const handleDelete = async () => {
    if (selectedProduct) {
      try {
        const targetId = selectedProduct._id || selectedProduct.id;
        await productApi.delete(targetId);
        setProducts(prev => prev.filter(p => p._id !== targetId && p.id !== targetId));
        if (triggerNotificationToast) triggerNotificationToast('Product Deleted', `${selectedProduct.name} deleted successfully.`, 'warning');
        if (addAuditLog) addAuditLog('Product Deleted', `Deleted product ${selectedProduct.name}`);
        closeModal();
      } catch (err) {
        if (triggerNotificationToast) triggerNotificationToast('Error', err.message, 'error');
      }
    }
  };

  // ── Summary stats ─────────────────────────────────────────────────────────
  const totalStock   = products.reduce((s, p) => s + (Array.isArray(p.batches) ? p.batches.reduce((a, b) => a + (b?.stock_qty || 0), 0) : 0), 0);
  const lowStockCount = products.filter(p => (Array.isArray(p.batches) ? p.batches.reduce((s, b) => s + (b?.stock_qty || 0), 0) : 0) <= (p.min_stock || 15)).length;

  return (
    <div className="space-y-5">

      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-black text-gray-900 tracking-tight">Products</h1>
          <p className="text-xs text-gray-400 mt-0.5 font-medium">
            {products.length} products · {totalStock.toLocaleString()} units in stock
          </p>
        </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer"
            >
              <Plus size={14} />
              Add Product
            </button>

          </div>
      </div>



      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, code or barcode..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-800 focus:border-green-500 focus:ring-2 focus:ring-green-500/10 focus:outline-none placeholder-gray-400 transition"
          />
        </div>

        <select
          value={catFilter}
          onChange={e => setCatFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 focus:border-green-500 focus:outline-none transition"
        >
          <option value="">All Categories</option>
          {categoriesList.map(c => <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>)}
        </select>

        <select
          value={compFilter}
          onChange={e => setCompFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 focus:border-green-500 focus:outline-none transition"
        >
          <option value="">All Brands</option>
          {companiesList.map(c => <option key={c._id || c.id} value={c._id || c.id}>{c.name}{c.company_type ? ` (${c.company_type})` : ''}</option>)}
        </select>

        {(searchQuery || catFilter || compFilter) && (
          <button
            onClick={() => { setSearchQuery(''); setCatFilter(''); setCompFilter(''); }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-500 hover:text-red-600 border border-gray-200 rounded-lg hover:border-red-200 hover:bg-red-50 transition cursor-pointer"
          >
            <RefreshCcw size={12} /> Reset
          </button>
        )}

        <span className="text-xs text-gray-400 font-medium ml-auto hidden sm:block">
          {filteredProducts.length} result{filteredProducts.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4 text-right hidden md:table-cell">Retail Price (Rs.)</th>
                <th className="py-3 px-4 hidden lg:table-cell">Category</th>
                <th className="py-3 px-4 text-center hidden sm:table-cell">Unit</th>
                <th className="py-3 px-4 text-right">Stock</th>
                <th className="py-3 px-4 text-center">Expiry Date</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-16 text-center text-gray-400 font-medium">
                    <Package size={32} className="mx-auto mb-3 text-gray-300" />
                    No products match the current filters.
                  </td>
                </tr>
              ) : filteredProducts.map((p, idx) => {
                const company    = typeof p.company_id  === 'object' ? p.company_id  : companiesList.find(c => (c._id || c.id) === p.company_id);
                const category   = typeof p.category_id === 'object' ? p.category_id : categoriesList.find(c => (c._id || c.id) === p.category_id);
                const unit       = typeof p.unit_id     === 'object' ? p.unit_id     : UNITS.find(u => (u._id || u.id) === p.unit_id);
                const totalStock = (Array.isArray(p.batches) ? p.batches : []).reduce((s, b) => s + (b?.stock_qty || 0), 0);
                const isLow      = totalStock <= 15;
                const isOut      = totalStock === 0;

                let statusCls  = 'bg-green-100 text-green-700 border-green-200';
                let statusText = 'In Stock';
                if (isOut)     { statusCls = 'bg-red-100   text-red-700   border-red-200';   statusText = 'Out of Stock'; }
                else if (isLow){ statusCls = 'bg-amber-100 text-amber-700 border-amber-200'; statusText = 'Low Stock'; }

                return (
                  <tr key={p.id} className="hover:bg-gray-50/60 transition group">
                    <td className="py-3.5 px-4 text-gray-400 font-bold">{idx + 1}</td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-gray-900 block">{p.name}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-gray-500 text-[11px]">{p.code}</td>
                    <td className="py-3.5 px-4 text-right font-black text-green-700 font-mono hidden md:table-cell">
                      Rs. {(p.retail_price || p.farmer_price || 0).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-gray-600 hidden lg:table-cell">{category?.name || '—'}</td>
                    <td className="py-3.5 px-4 text-center text-gray-500 font-medium hidden sm:table-cell">{unit?.name || '—'}</td>
                    <td className={`py-3.5 px-4 text-right font-bold text-xs ${isOut ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-gray-900'}`}>
                      {totalStock}
                    </td>
                    <td className="py-3.5 px-4 text-center font-medium text-gray-600">
                      {p.batches?.[0]?.expiry_date || 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold border ${statusCls}`}>
                        {statusText}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          title="View Details"
                          onClick={() => openView(p)}
                          className="p-1.5 rounded-lg bg-gray-100 hover:bg-blue-100 text-gray-500 hover:text-blue-700 transition cursor-pointer"
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          title="Product Ledger"
                          onClick={() => openLedger(p)}
                          className="p-1.5 rounded-lg bg-gray-100 hover:bg-purple-100 text-gray-500 hover:text-purple-700 transition cursor-pointer"
                        >
                          <BookOpen size={13} />
                        </button>
                        <button
                          title="Edit"
                          onClick={() => openEdit(p)}
                          className="p-1.5 rounded-lg bg-gray-100 hover:bg-green-100 text-gray-500 hover:text-green-700 transition cursor-pointer"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          title="Delete"
                          onClick={() => openDelete(p)}
                          className="p-1.5 rounded-lg bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-600 transition cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer count */}
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between text-[10px] font-semibold text-gray-400">
          <span>Showing {filteredProducts.length} of {products.length} products</span>
          <span>{lowStockCount > 0 && <span className="text-amber-600">⚠ {lowStockCount} low stock</span>}</span>
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {(modal === 'add' || modal === 'edit') && (
        <ProductFormModal
          product={selectedProduct}
          mode={modal}
          onClose={closeModal}
          onSave={handleSave}
          categoriesList={categoriesList}
          companiesList={companiesList}
        />
      )}
      {modal === 'delete' && (
        <DeleteConfirmModal
          product={selectedProduct}
          onClose={closeModal}
          onConfirm={handleDelete}
        />
      )}
      {modal === 'view' && (
        <ViewDetailsModal
          product={selectedProduct}
          onClose={closeModal}
          categoriesList={categoriesList}
          companiesList={companiesList}
        />
      )}
      {modal === 'ledger' && (
        <ProductLedgerModal
          product={selectedProduct}
          onClose={closeModal}
          triggerNotificationToast={triggerNotificationToast}
        />
      )}

    </div>
  );
}
