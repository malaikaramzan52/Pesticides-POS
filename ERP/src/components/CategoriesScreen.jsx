import React, { useState, useMemo, useEffect } from 'react';
import {
  Tag,
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
  Search,
  RefreshCcw,
  CheckCircle2,
  Package,
  Building2,
  BoxIcon,
} from 'lucide-react';
import { CATEGORIES as INITIAL_CATEGORIES, PRODUCTS, COMPANIES, UNITS } from '../utils/mockData';
import { categoryApi } from '../api';
import { useLanguage } from '../context/LanguageContext';

// ─── Soft color palette for categories ───────────────────────────────────────
const COLOR_OPTIONS = [
  { label: 'Green',   value: 'bg-green-100 text-green-700 border-green-200' },
  { label: 'Blue',    value: 'bg-blue-100 text-blue-700 border-blue-200' },
  { label: 'Purple',  value: 'bg-purple-100 text-purple-700 border-purple-200' },
  { label: 'Amber',   value: 'bg-amber-100 text-amber-700 border-amber-200' },
  { label: 'Red',     value: 'bg-red-100 text-red-700 border-red-200' },
  { label: 'Cyan',    value: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
  { label: 'Pink',    value: 'bg-pink-100 text-pink-700 border-pink-200' },
  { label: 'Gray',    value: 'bg-gray-100 text-gray-700 border-gray-200' },
];

const EMPTY_CAT = { name: '', description: '', color: COLOR_OPTIONS[0].value };

// ─── Shared Input ─────────────────────────────────────────────────────────────
function Field({ label, required, textarea, ...props }) {
  const cls = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-800 focus:border-green-500 focus:ring-2 focus:ring-green-500/10 focus:outline-none placeholder-gray-400 transition';
  return (
    <div className="space-y-1">
      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {textarea
        ? <textarea rows={2} className={cls} {...props} />
        : <input className={cls} {...props} />}
    </div>
  );
}

// ─── Category Products Popup ────────────────────────────────────────────────
function CategoryProductsPopup({ category, onClose }) {
  const products = useMemo(() =>
    PRODUCTS.filter(p => p.category_id === category.id),
    [category.id]
  );

  const getCompany = (id) => COMPANIES.find(c => c.id === id)?.name || '—';
  const getUnit    = (id) => UNITS.find(u => u.id === id)?.name || '—';
  const totalStock = (p) => p.batches.reduce((s, b) => s + b.stock_qty, 0);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl border border-gray-200 shadow-2xl flex flex-col" style={{ maxHeight: '90vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${category.color}`}>
              {category.name}
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-gray-900">Products in this Category</h3>
              <p className="text-[10px] text-gray-400 font-medium">{products.length} product{products.length !== 1 ? 's' : ''} found</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition cursor-pointer"><X size={15} /></button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto scrollbar-none flex-1 p-5">
          {products.length === 0 ? (
            <div className="py-16 text-center">
              <Package size={32} className="mx-auto mb-3 text-gray-300" />
              <p className="text-xs font-medium text-gray-400">No products in this category.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {products.map((p) => {
                const stock = totalStock(p);
                const stockColor = stock === 0 ? 'text-red-600 bg-red-50 border-red-200' : stock < 15 ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-green-700 bg-green-50 border-green-200';
                return (
                  <div key={p.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-green-100 border border-green-200 flex items-center justify-center flex-shrink-0">
                      <Package size={16} className="text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-xs font-extrabold text-gray-900">{p.name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${stockColor}`}>
                          {stock === 0 ? 'Out of Stock' : `${stock} ${getUnit(p.unit_id)}`}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-3 text-[11px] text-gray-500">
                        <span className="flex items-center gap-1"><Building2 size={10} className="text-gray-400" />{getCompany(p.company_id)}</span>
                        <span className="flex items-center gap-1"><BoxIcon size={10} className="text-gray-400" />Code: <strong className="text-gray-700">{p.code}</strong></span>
                        <span>GST: <strong className="text-gray-700">{p.tax_rate}%</strong></span>
                        <span>Retail: <strong className="text-green-700">Rs. {p.retail_price}</strong></span>
                        <span>Purchase: <strong className="text-gray-700">Rs. {p.batches[0]?.purchase_rate ?? '—'}</strong></span>
                      </div>
                      {p.batches.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {p.batches.map(b => (
                            <span key={b.id} className="text-[10px] font-semibold bg-white border border-gray-200 px-2 py-0.5 rounded-full text-gray-600">
                              {b.batch_no} · Qty {b.stock_qty}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <span className="text-[11px] text-gray-400 font-medium">{products.length} products in "{category.name}"</span>
          <button onClick={onClose} className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition cursor-pointer">Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────
function CategoryFormModal({ category, mode, onClose, onSave }) {
  const [form, setForm] = useState(category || EMPTY_CAT);
  const [errors, setErrors] = useState({});

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Category name is required';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({ ...form, id: form.id || `CAT_${Date.now()}` });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md border border-gray-200 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-xl">
              <Tag size={16} className="text-green-700" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-gray-800">
                {mode === 'add' ? 'Add Category' : 'Edit Category'}
              </h2>
              <p className="text-[10px] text-gray-400 font-medium">Product classification group</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition cursor-pointer">
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div>
            <Field
              label="Category Name"
              required
              placeholder="e.g. Pesticides"
              value={form.name}
              onChange={e => set('name', e.target.value)}
            />
            {errors.name && <p className="text-[10px] text-red-500 font-semibold mt-0.5">{errors.name}</p>}
          </div>

          <Field
            label="Description"
            textarea
            placeholder="Short description (optional)..."
            value={form.description || ''}
            onChange={e => set('description', e.target.value)}
          />

          {/* Color picker */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide">Badge Color</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => set('color', c.value)}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold border transition cursor-pointer ${c.value} ${form.color === c.value ? 'ring-2 ring-offset-1 ring-green-500 scale-105' : 'opacity-70 hover:opacity-100'}`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 flex items-center gap-3">
            <span className="text-[10px] text-gray-400 font-semibold">Preview:</span>
            <span className={`px-3 py-1 rounded-full text-[11px] font-bold border ${form.color || COLOR_OPTIONS[0].value}`}>
              {form.name || 'Category Name'}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl text-xs hover:bg-gray-100 transition cursor-pointer">
            Cancel
          </button>
          <button onClick={handleSave} className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-xs shadow-sm transition cursor-pointer flex items-center gap-2">
            <Save size={12} />
            {mode === 'add' ? 'Save Category' : 'Update Category'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────
function DeleteModal({ item, label, onClose, onConfirm }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm border border-gray-200 shadow-2xl p-6 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto">
          <Trash2 size={22} className="text-red-500" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-extrabold text-gray-800">Delete {label}?</h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            <strong className="text-gray-800">"{item?.name}"</strong> will be permanently removed. This cannot be undone.
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition cursor-pointer">Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow-sm transition cursor-pointer">Delete</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function CategoriesScreen({ triggerNotificationToast }) {
  const { t } = useLanguage();
  const DEFAULT_CATS = INITIAL_CATEGORIES.map((c, i) => ({ ...c, description: '', color: COLOR_OPTIONS[i % COLOR_OPTIONS.length].value }));
  const [categories, setCategories] = useState(DEFAULT_CATS);
  const [searchQuery, setSearchQuery] = useState('');
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [productsFor, setProductsFor] = useState(null);

  useEffect(() => {
    const fetchCats = async () => {
      try {
        const data = await categoryApi.getAll();
        if (data && Array.isArray(data) && data.length > 0) {
          setCategories(data.map((c, i) => ({
            ...c,
            color: c.color || COLOR_OPTIONS[i % COLOR_OPTIONS.length].value
          })));
        }
      } catch (e) {}
    };
    fetchCats();
  }, []);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return !q ? categories : categories.filter(c => c.name.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q));
  }, [categories, searchQuery]);

  const openAdd    = () => { setSelected(null); setModal('add'); };
  const openEdit   = (c) => { setSelected(c);    setModal('edit'); };
  const openDelete = (c) => { setSelected(c);    setModal('delete'); };
  const openProducts = (c) => { setProductsFor(c); };
  const closeModal = () => { setModal(null); setSelected(null); };

  const handleSave = async (saved) => {
    try {
      if (modal === 'add') {
        const created = await categoryApi.create(saved);
        setCategories(p => [...p, created || saved]);
        if (triggerNotificationToast) triggerNotificationToast('Category Created', `${saved.name} added successfully.`, 'success');
      } else {
        const targetId = selected._id || selected.id;
        const updated = await categoryApi.update(targetId, saved);
        setCategories(p => p.map(c => (c._id === targetId || c.id === targetId) ? (updated || saved) : c));
        if (triggerNotificationToast) triggerNotificationToast('Category Updated', `${saved.name} updated successfully.`, 'success');
      }
      closeModal();
    } catch (err) {
      if (triggerNotificationToast) triggerNotificationToast('Error', err.message || 'Failed to save category', 'error');
    }
  };

  const handleDelete = async () => {
    if (selected) {
      try {
        const targetId = selected._id || selected.id;
        await categoryApi.delete(targetId);
        setCategories(p => p.filter(c => (c._id || c.id) !== targetId));
        if (triggerNotificationToast) triggerNotificationToast('Category Deleted', `${selected.name} removed successfully.`, 'info');
      } catch (err) {
        if (triggerNotificationToast) triggerNotificationToast('Error', err.message || 'Failed to delete category', 'error');
      }
    }
    closeModal();
  };

  return (
    <div className="space-y-5">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-black text-gray-900 tracking-tight">Categories</h1>
          <p className="text-xs text-gray-400 mt-0.5 font-medium">{categories.length} product classification groups</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer"
        >
          <Plus size={14} /> Add Category
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search categories..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-800 focus:border-green-500 focus:ring-2 focus:ring-green-500/10 focus:outline-none placeholder-gray-400 transition"
          />
        </div>
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 border border-gray-200 transition cursor-pointer">
            <RefreshCcw size={13} />
          </button>
        )}
        <span className="text-xs text-gray-400 font-medium hidden sm:block">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Cards Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 py-16 text-center">
          <Tag size={32} className="mx-auto mb-3 text-gray-300" />
          <p className="text-xs font-medium text-gray-400">No categories found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((cat, idx) => (
            <div
              key={cat.id}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col justify-between gap-4 hover:shadow-md hover:border-green-200 transition-all duration-200 group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className={`px-3 py-1 rounded-full text-[11px] font-bold border ${cat.color}`}>
                    {cat.name}
                  </span>
                  <span className="text-[10px] font-bold text-gray-300">#{idx + 1}</span>
                </div>
                <p className="text-[11px] text-gray-500 font-medium leading-relaxed min-h-[28px]">
                  {cat.description || <span className="italic text-gray-300">No description</span>}
                </p>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                <button
                  onClick={() => openProducts(cat)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 font-bold rounded-lg text-[11px] transition cursor-pointer"
                >
                  <Package size={11} /> Products
                </button>
                <button
                  onClick={() => openEdit(cat)}
                  className="flex items-center justify-center gap-1.5 px-2 py-1.5 bg-gray-100 hover:bg-green-100 text-gray-600 hover:text-green-700 font-bold rounded-lg text-[11px] transition cursor-pointer"
                >
                  <Pencil size={11} />
                </button>
                <button
                  onClick={() => openDelete(cat)}
                  className="flex items-center justify-center gap-1.5 px-2 py-1.5 bg-gray-100 hover:bg-red-100 text-gray-600 hover:text-red-600 font-bold rounded-lg text-[11px] transition cursor-pointer"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          ))}

          {/* Add New Card */}
          <button
            onClick={openAdd}
            className="bg-gray-50 border-2 border-dashed border-gray-300 hover:border-green-400 hover:bg-green-50/30 rounded-2xl p-5 flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-green-600 transition-all duration-200 cursor-pointer min-h-[140px]"
          >
            <div className="w-10 h-10 rounded-xl border-2 border-dashed border-current flex items-center justify-center">
              <Plus size={18} />
            </div>
            <span className="text-xs font-bold">Add Category</span>
          </button>
        </div>
      )}

      {/* Summary Bar */}
      <div className="bg-white rounded-xl border border-gray-200 px-5 py-3 flex items-center justify-between text-[11px] font-semibold text-gray-400">
        <span className="flex items-center gap-2">
          <CheckCircle2 size={13} className="text-green-500" />
          {categories.length} total categories configured
        </span>
        <span>{filtered.length} shown</span>
      </div>

      {/* Modals */}
      {(modal === 'add' || modal === 'edit') && (
        <CategoryFormModal category={selected} mode={modal} onClose={closeModal} onSave={handleSave} />
      )}
      {modal === 'delete' && (
        <DeleteModal item={selected} label="Category" onClose={closeModal} onConfirm={handleDelete} />
      )}
      {productsFor && (
        <CategoryProductsPopup category={productsFor} onClose={() => setProductsFor(null)} />
      )}
    </div>
  );
}
