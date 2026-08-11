import React, { useState, useMemo } from 'react';
import {
  BadgeDollarSign,
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
  Search,
  RefreshCcw,
  Globe,
  Phone,
  Mail,
  CheckCircle2,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

// ─── Initial mock brands ──────────────────────────────────────────────────────
const INITIAL_BRANDS = [];

const EMPTY_BRAND = { name: '', company: '', country: '', website: '', active: true };

// ─── Field ────────────────────────────────────────────────────────────────────
function Field({ label, required, ...props }) {
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

// ─── Form Modal ───────────────────────────────────────────────────────────────
function BrandFormModal({ brand, mode, onClose, onSave }) {
  const [form, setForm] = useState(brand || EMPTY_BRAND);
  const [errors, setErrors] = useState({});

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.name.trim())    e.name    = 'Brand name is required';
    if (!form.company.trim()) e.company = 'Company / manufacturer is required';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({ ...form, id: form.id || `BR_${Date.now()}`, products: form.products || 0 });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md border border-gray-200 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-xl">
              <BadgeDollarSign size={16} className="text-amber-700" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-gray-800">
                {mode === 'add' ? 'Add Brand' : 'Edit Brand'}
              </h2>
              <p className="text-[10px] text-gray-400 font-medium">Product brand / label information</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition cursor-pointer">
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div>
            <Field label="Brand Name" required placeholder="e.g. Confidor" value={form.name} onChange={e => set('name', e.target.value)} />
            {errors.name && <p className="text-[10px] text-red-500 font-semibold mt-0.5">{errors.name}</p>}
          </div>
          <div>
            <Field label="Manufacturer / Company" required placeholder="e.g. Bayer CropScience" value={form.company} onChange={e => set('company', e.target.value)} />
            {errors.company && <p className="text-[10px] text-red-500 font-semibold mt-0.5">{errors.company}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Country of Origin" placeholder="e.g. India" value={form.country || ''} onChange={e => set('country', e.target.value)} />
            <Field label="Website (optional)" placeholder="www.brand.com" value={form.website || ''} onChange={e => set('website', e.target.value)} />
          </div>
          {/* Active toggle */}
          <div className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
            <div>
              <span className="text-xs font-bold text-gray-700 block">Active Status</span>
              <span className="text-[10px] text-gray-400">Visible in product assignment</span>
            </div>
            <button
              type="button"
              onClick={() => set('active', !form.active)}
              className={`relative w-10 h-5 rounded-full transition-colors duration-200 cursor-pointer ${form.active ? 'bg-green-500' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${form.active ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl text-xs hover:bg-gray-100 transition cursor-pointer">Cancel</button>
          <button onClick={handleSave} className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-xs shadow-sm transition cursor-pointer flex items-center gap-2">
            <Save size={12} />
            {mode === 'add' ? 'Save Brand' : 'Update Brand'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Confirm ───────────────────────────────────────────────────────────
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
            <strong className="text-gray-800">"{item?.name}"</strong> will be permanently removed.
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
export default function BrandsScreen() {
  const { t } = useLanguage();
  const [brands, setBrands]       = useState(INITIAL_BRANDS);
  const [searchQuery, setSearchQuery] = useState('');
  const [modal, setModal]         = useState(null);
  const [selected, setSelected]   = useState(null);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return !q ? brands : brands.filter(b =>
      b.name.toLowerCase().includes(q) ||
      b.company.toLowerCase().includes(q) ||
      (b.country || '').toLowerCase().includes(q)
    );
  }, [brands, searchQuery]);

  const openAdd    = () => { setSelected(null); setModal('add'); };
  const openEdit   = (b) => { setSelected(b);    setModal('edit'); };
  const openDelete = (b) => { setSelected(b);    setModal('delete'); };
  const closeModal = () => { setModal(null); setSelected(null); };

  const handleSave = (saved) => {
    if (modal === 'add') setBrands(p => [...p, saved]);
    else setBrands(p => p.map(b => b.id === saved.id ? saved : b));
    closeModal();
  };
  const handleDelete = () => { setBrands(p => p.filter(b => b.id !== selected?.id)); closeModal(); };

  const activeCount = brands.filter(b => b.active).length;

  return (
    <div className="space-y-5">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-black text-gray-900 tracking-tight">Brands</h1>
          <p className="text-xs text-gray-400 mt-0.5 font-medium">{brands.length} brands · {activeCount} active</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer">
          <Plus size={14} /> Add Brand
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'Total Brands',  value: brands.length,               color: 'text-gray-900',   bg: 'bg-gray-50',   border: 'border-gray-200' },
          { label: 'Active Brands', value: activeCount,                 color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200' },
          { label: 'Inactive',      value: brands.length - activeCount, color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-200' },
        ].map(({ label, value, color, bg, border }) => (
          <div key={label} className={`${bg} border ${border} rounded-xl p-3.5`}>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block">{label}</span>
            <span className={`text-xl font-black mt-1 block ${color}`}>{value}</span>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search brands, companies, countries..."
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
        <span className="text-xs text-gray-400 font-medium hidden sm:block">{filtered.length} results</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Brand Name</th>
                <th className="py-3 px-4">Manufacturer</th>
                <th className="py-3 px-4 hidden sm:table-cell">Country</th>
                <th className="py-3 px-4 text-center hidden md:table-cell">Products</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-gray-400 font-medium">
                    <BadgeDollarSign size={28} className="mx-auto mb-2 text-gray-300" />
                    No brands found.
                  </td>
                </tr>
              ) : filtered.map((b, idx) => (
                <tr key={b.id} className="hover:bg-gray-50/60 transition">
                  <td className="py-3.5 px-4 text-gray-400 font-bold">{idx + 1}</td>
                  <td className="py-3.5 px-4">
                    <span className="font-extrabold text-gray-900 block">{b.name}</span>
                    {b.website && <span className="text-[10px] text-green-600 font-medium">{b.website}</span>}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-gray-600">{b.company}</td>
                  <td className="py-3.5 px-4 font-medium text-gray-500 hidden sm:table-cell">
                    {b.country ? (
                      <span className="flex items-center gap-1"><Globe size={11} className="text-gray-400" />{b.country}</span>
                    ) : '—'}
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold text-gray-700 hidden md:table-cell">{b.products || 0}</td>
                  <td className="py-3.5 px-4 text-center">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${b.active ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                      {b.active ? <><CheckCircle2 size={9} /> Active</> : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center justify-center gap-1.5">
                      <button onClick={() => openEdit(b)}   title="Edit"   className="p-1.5 rounded-lg bg-gray-100 hover:bg-green-100 text-gray-500 hover:text-green-700 transition cursor-pointer"><Pencil size={13} /></button>
                      <button onClick={() => openDelete(b)} title="Delete" className="p-1.5 rounded-lg bg-gray-100 hover:bg-red-100  text-gray-500 hover:text-red-600   transition cursor-pointer"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 text-[10px] font-semibold text-gray-400">
          Showing {filtered.length} of {brands.length} brands
        </div>
      </div>

      {/* Modals */}
      {(modal === 'add' || modal === 'edit') && (
        <BrandFormModal brand={selected} mode={modal} onClose={closeModal} onSave={handleSave} />
      )}
      {modal === 'delete' && (
        <DeleteModal item={selected} label="Brand" onClose={closeModal} onConfirm={handleDelete} />
      )}
    </div>
  );
}
