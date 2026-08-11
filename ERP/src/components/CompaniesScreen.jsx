import React, { useState, useMemo, useEffect } from 'react';
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
  Search,
  RefreshCcw,
  Phone,
  Mail,
  MapPin,
  Globe,
  CheckCircle2,
  Eye,
  Package,
  Layers,
  Tag,
  BoxIcon,
  BookOpen
} from 'lucide-react';
import { COMPANIES as INITIAL_COMPANIES, PRODUCTS, CATEGORIES, UNITS, saveCompaniesToStorage } from '../utils/mockData';
import { companyApi } from '../api';
import CompanyLedgerModal from './CompanyLedgerModal';
import DateFilterBar from './DateFilterBar';
import { useLanguage } from '../context/LanguageContext';
import { isItemInDateRange } from '../utils/dateUtils';

const COMPANY_TYPES = [
  'Manufacturer',
  'Distributor',
  'Wholesaler',
  'Retailer',
  'Importer',
  'Exporter',
  'Dealer',
  'Other'
];

const PAKISTAN_CITIES = [
  "Karachi", "Lahore", "Faisalabad", "Rawalpindi", "Gujranwala", "Peshawar", "Multan", 
  "Hyderabad", "Islamabad", "Quetta", "Sargodha", "Sialkot", "Bahawalpur", "Sukkur", 
  "Jhang", "Sheikhupura", "Mardan", "Gujrat", "Larkana", "Kasur", "Rahim Yar Khan", 
  "Sahiwal", "Okara", "Wah Cantonment", "Dera Ghazi Khan", "Mirpur Khas", "Chiniot", 
  "Nawabshah", "Kamoke", "Burewala", "Jhelum", "Sadiqabad", "Khanewal", "Hafizabad", 
  "Kohat", "Jacobabad", "Shikarpur", "Muzaffargarh", "Khanpur", "Gojra", "Bahawalnagar", 
  "Muridke", "Pakpattan", "Abbottabad", "Tando Adam", "Khairpur", "Chishtian", "Daska", 
  "Mandi Bahauddin", "Kamalia", "Tando Allahyar", "Vehari", "Dera Ismail Khan", "Khuzdar", 
  "Wazirabad", "Nowshera", "Khushab", "Charsadda", "Jaranwala", "Mianwali", "Ghotki", 
  "Haripur", "Muzaffarabad", "Rawalakot", "Mirpur", "Gilgit", "Skardu", "Gwadar", "Turbat"
];

const INITIAL_DATA = INITIAL_COMPANIES.map((c, i) => ({
  contact_person: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  country: 'Pakistan',
  active: true,
  company_type: 'Manufacturer',
  ...c,
}));

const EMPTY_COMPANY = {
  name: '', company_type: '', contact_person: '', phone: '', email: '',
  address: '', city: '', country: 'Pakistan', active: true,
};

// ─── Field ────────────────────────────────────────────────────────────────────
function Field({ label, required, textarea, ...props }) {
  const cls = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-800 focus:border-green-500 focus:ring-2 focus:ring-green-500/10 focus:outline-none placeholder-gray-400 transition';
  return (
    <div className="space-y-1">
      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {textarea
        ? <textarea rows={2} className={cls} autoComplete="one-time-code" {...props} />
        : <input className={cls} autoComplete="one-time-code" {...props} />}
    </div>
  );
}

function SelectField({ label, required, children, ...props }) {
  const cls = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-800 focus:border-green-500 focus:ring-2 focus:ring-green-500/10 focus:outline-none transition bg-white';
  return (
    <div className="space-y-1">
      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <select className={cls} {...props}>
        {children}
      </select>
    </div>
  );
}

// ─── Form Modal ───────────────────────────────────────────────────────────────
function CompanyFormModal({ company, mode, onClose, onSave }) {
  const [form, setForm] = useState(company || EMPTY_COMPANY);
  const [errors, setErrors] = useState({});
  const [citySearch, setCitySearch] = useState(form.city || '');
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    const handleOutsideClick = (e) => {
      const container = document.getElementById('city-select-container');
      if (container && !container.contains(e.target)) {
        setShowCityDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const filteredCities = useMemo(() => {
    const query = citySearch.toLowerCase().trim();
    if (!query) return PAKISTAN_CITIES;
    return PAKISTAN_CITIES.filter(city => city.toLowerCase().includes(query));
  }, [citySearch]);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Company name is required';
    if (!form.company_type) e.company_type = 'Company type is required';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({ ...form, id: form.id || `CO_${Date.now()}` });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg border border-gray-200 shadow-2xl flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-xl">
              <Building2 size={16} className="text-blue-700" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-gray-800">
                {mode === 'add' ? 'Add Company' : 'Edit Company'}
              </h2>
              <p className="text-[10px] text-gray-400 font-medium">Manufacturing / supplier company</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition cursor-pointer">
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Basic */}
          <div>
            <p className="text-[10px] font-black text-blue-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <span className="inline-block w-4 h-0.5 bg-blue-500 rounded"></span>
              Company Info
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Field label="Company Name" required placeholder="e.g. Bayer CropScience Ltd." value={form.name} onChange={e => set('name', e.target.value)} />
                {errors.name && <p className="text-[10px] text-red-500 font-semibold mt-0.5">{errors.name}</p>}
              </div>
              <div className="sm:col-span-2">
                <SelectField label="Company Type" required value={form.company_type || ''} onChange={e => set('company_type', e.target.value)}>
                  <option value="">Select Company Type</option>
                  {COMPANY_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </SelectField>
                {errors.company_type && <p className="text-[10px] text-red-500 font-semibold mt-0.5">{errors.company_type}</p>}
              </div>
              <Field label="Contact Person" placeholder="e.g. Rajesh Kumar" value={form.contact_person || ''} onChange={e => set('contact_person', e.target.value)} />
            </div>
          </div>

          {/* Contact */}
          <div>
            <p className="text-[10px] font-black text-blue-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <span className="inline-block w-4 h-0.5 bg-blue-500 rounded"></span>
              Contact Details
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Phone" type="tel" placeholder="+92 300 1234567" value={form.phone || ''} onChange={e => set('phone', e.target.value)} />
              <Field label="Email" type="email" placeholder="info@company.com" value={form.email || ''} onChange={e => set('email', e.target.value)} />
              
              <div className="space-y-1 relative" id="city-select-container">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                  City
                </label>
                <div className="relative">
                  <input 
                    type="text"
                    placeholder="Select or type city..." 
                    value={citySearch} 
                    onChange={e => {
                      setCitySearch(e.target.value);
                      set('city', e.target.value);
                    }}
                    onFocus={() => setShowCityDropdown(true)}
                    autoComplete="one-time-code"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-800 focus:border-green-500 focus:ring-2 focus:ring-green-500/10 focus:outline-none placeholder-gray-400 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCityDropdown(p => !p)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    <svg className={`w-4 h-4 transform transition-transform ${showCityDropdown ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                {/* Dropdown Menu */}
                {showCityDropdown && (
                  <div className="absolute left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 text-xs">
                    {filteredCities.length === 0 ? (
                      <div className="px-3 py-2 text-gray-400 italic">Press enter or type to use "{citySearch}"</div>
                    ) : (
                      filteredCities.map(city => (
                        <button
                          key={city}
                          type="button"
                          onClick={() => {
                            setCitySearch(city);
                            set('city', city);
                            setShowCityDropdown(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-green-50 hover:text-green-700 font-semibold text-gray-700 transition"
                        >
                          {city}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <Field label="Country" placeholder="e.g. Pakistan" value={form.country || ''} onChange={e => set('country', e.target.value)} />
              
              <div className="sm:col-span-2">
                <Field label="Address" textarea placeholder="Full registered address..." value={form.address || ''} onChange={e => set('address', e.target.value)} />
              </div>
            </div>
          </div>


        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl text-xs hover:bg-gray-100 transition cursor-pointer">Cancel</button>
          <button onClick={handleSave} className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-xs shadow-sm transition cursor-pointer flex items-center gap-2">
            <Save size={12} />
            {mode === 'add' ? 'Save Company' : 'Update Company'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── View Modal ───────────────────────────────────────────────────────────────
function ViewModal({ company, onClose }) {
  if (!company) return null;
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md border border-gray-200 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <span className="text-[10px] uppercase font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded inline-block mb-1">Company Details</span>
            <h3 className="text-sm font-extrabold text-gray-900">{company.name}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition cursor-pointer"><X size={15} /></button>
        </div>
        <div className="px-6 py-5 space-y-3 overflow-y-auto flex-1">
          {[
            { icon: Building2, label: 'Contact Person', value: company.contact_person || '—' },
            { icon: Tag,       label: 'Company Type',   value: company.company_type || '—' },
            { icon: Phone,     label: 'Phone',          value: company.phone || '—' },
            { icon: Mail,      label: 'Email',          value: company.email || '—' },
            { icon: MapPin,    label: 'City',           value: company.city || '—' },
            { icon: Globe,     label: 'Country',        value: company.country || '—' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
              <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
                <Icon size={12} className="text-blue-600" />
              </div>
              <div>
                <span className="text-[9px] text-gray-400 font-bold uppercase block">{label}</span>
                <span className="text-xs font-semibold text-gray-800">{value}</span>
              </div>
            </div>
          ))}
          {company.address && (
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
              <span className="text-[9px] text-gray-400 font-bold uppercase block mb-0.5">Address</span>
              <span className="text-xs font-medium text-gray-700">{company.address}</span>
            </div>
          )}
        </div>
        <div className="flex justify-end px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <button onClick={onClose} className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition cursor-pointer">Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── Company Products Popup ───────────────────────────────────────────────────
function CompanyProductsPopup({ company, onClose }) {
  const products = useMemo(() =>
    PRODUCTS.filter(p => p.company_id === company.id),
    [company.id]
  );

  const getCatName = (id) => CATEGORIES.find(c => c.id === id)?.name || '—';
  const getUnit    = (id) => UNITS.find(u => u.id === id)?.name || '—';
  const totalStock = (p) => p.batches.reduce((s, b) => s + b.stock_qty, 0);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl border border-gray-200 shadow-2xl flex flex-col" style={{ maxHeight: '90vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 border border-blue-200 flex items-center justify-center">
              <span className="text-sm font-black text-blue-700">{company.name.charAt(0)}</span>
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-gray-900">{company.name}</h3>
              <p className="text-[10px] text-gray-400 font-medium">{products.length} product{products.length !== 1 ? 's' : ''} available</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition cursor-pointer"><X size={15} /></button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto scrollbar-none flex-1 p-5">
          {products.length === 0 ? (
            <div className="py-16 text-center">
              <Package size={32} className="mx-auto mb-3 text-gray-300" />
              <p className="text-xs font-medium text-gray-400">No products linked to this company.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {products.map((p) => {
                const stock = totalStock(p);
                const stockColor = stock === 0 ? 'text-red-600 bg-red-50 border-red-200' : stock < 15 ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-green-700 bg-green-50 border-green-200';
                return (
                  <div key={p.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-start gap-3">
                    {/* Icon */}
                    <div className="w-9 h-9 rounded-lg bg-blue-100 border border-blue-200 flex items-center justify-center flex-shrink-0">
                      <Package size={16} className="text-blue-600" />
                    </div>
                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-xs font-extrabold text-gray-900 truncate">{p.name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${stockColor}`}>
                          {stock === 0 ? 'Out of Stock' : `${stock} ${getUnit(p.unit_id)}`}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-3 text-[11px] text-gray-500">
                        <span className="flex items-center gap-1"><Tag size={10} className="text-gray-400" />{getCatName(p.category_id)}</span>
                        <span className="flex items-center gap-1"><BoxIcon size={10} className="text-gray-400" />Code: <strong className="text-gray-700">{p.code}</strong></span>
                        <span className="flex items-center gap-1">GST: <strong className="text-gray-700">{p.tax_rate}%</strong></span>
                        <span className="flex items-center gap-1">Retail: <strong className="text-green-700">Rs. {p.retail_price}</strong></span>
                      </div>
                      {/* Batches */}
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
          <span className="text-[11px] text-gray-400 font-medium">{products.length} total products for {company.name}</span>
          <button onClick={onClose} className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition cursor-pointer">Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Confirm ───────────────────────────────────────────────────────────
function DeleteModal({ item, onClose, onConfirm }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm border border-gray-200 shadow-2xl p-6 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto">
          <Trash2 size={22} className="text-red-500" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-extrabold text-gray-800">Delete Company?</h3>
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
export default function CompaniesScreen({ triggerNotificationToast, invoices = [], selectedCity, setSelectedCity, cities = [] }) {
  const { t } = useLanguage();
  const [companies, setCompanies] = useState(INITIAL_COMPANIES);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [modal, setModal]   = useState(null);
  const [selected, setSelected] = useState(null);
  const [productsFor, setProductsFor] = useState(null); // company for products popup
  const [ledgerCompany, setLedgerCompany] = useState(null); // company for ledger popup

  useEffect(() => {
    const fetchComps = async () => {
      try {
        const data = await companyApi.getAll();
        if (data && Array.isArray(data) && data.length > 0) setCompanies(data);
      } catch (e) {}
    };
    fetchComps();
  }, []);

  // Local Date Filter State
  const [dateFilter, setDateFilter] = useState({ preset: 'All Time', startDate: '', endDate: '' });

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return companies.filter(c => {
      const matchesSearch = !q ||
        c.name.toLowerCase().includes(q) ||
        (c.city || '').toLowerCase().includes(q) ||
        (c.country || '').toLowerCase().includes(q) ||
        (c.contact_person || '').toLowerCase().includes(q) ||
        (c.company_type || '').toLowerCase().includes(q);
      
      const matchesType = !typeFilter || c.company_type === typeFilter;
      const matchesCity = selectedCity === 'All' || (c.city && c.city.toLowerCase() === selectedCity.toLowerCase());
      
      return matchesSearch && matchesType && matchesCity;
    });
  }, [companies, searchQuery, typeFilter, selectedCity]);

  const openAdd      = () => { setSelected(null);  setModal('add'); };

  const openEdit     = (c) => { setSelected(c);     setModal('edit'); };
  const openDelete   = (c) => { setSelected(c);     setModal('delete'); };
  const openView     = (c) => { setSelected(c);     setModal('view'); };
  const openProducts = (c) => { setProductsFor(c); };
  const closeModal   = () => { setModal(null); setSelected(null); };

  const handleSave = async (saved) => {
    try {
      if (modal === 'add') {
        const created = await companyApi.create(saved);
        setCompanies(prev => [...prev, created || saved]);
        if (triggerNotificationToast) triggerNotificationToast('Company Created', `${saved.name} added successfully.`, 'success');
      } else {
        const targetId = selected._id || selected.id;
        const updated = await companyApi.update(targetId, saved);
        setCompanies(prev => prev.map(c => (c._id === targetId || c.id === targetId) ? (updated || saved) : c));
        if (triggerNotificationToast) triggerNotificationToast('Company Updated', `${saved.name} updated successfully.`, 'success');
      }
      closeModal();
    } catch (err) {
      if (triggerNotificationToast) triggerNotificationToast('Error', err.message, 'error');
    }
  };

  const handleDelete = async () => { 
    if (selected) {
      try {
        const targetId = selected._id || selected.id;
        await companyApi.delete(targetId);
        setCompanies(prev => prev.filter(c => (c._id || c.id) !== targetId)); 
        if (triggerNotificationToast) triggerNotificationToast('Company Deleted', `${selected.name} removed successfully.`, 'info');
      } catch (err) {
        if (triggerNotificationToast) triggerNotificationToast('Error', err.message, 'error');
      }
    }
    closeModal(); 
  };

  const activeCount = companies.filter(c => c.active).length;

  return (
    <div className="space-y-5">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-black text-gray-900 tracking-tight">Companies</h1>
          <p className="text-xs text-gray-400 mt-0.5 font-medium">{companies.length} manufacturing / supplier companies</p>
        </div>
          <div className="flex items-center gap-2">
            <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer">
              <Plus size={14} /> Add Company
            </button>
          </div>
      </div>

      {/* Date & Location Filters */}
      <DateFilterBar 
        dateFilter={dateFilter} 
        setDateFilter={setDateFilter} 
        selectedCity={selectedCity} 
        setSelectedCity={setSelectedCity} 
        cities={cities} 
      />



      {/* Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search company name, type, city, country..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-800 focus:border-green-500 focus:ring-2 focus:ring-green-500/10 focus:outline-none placeholder-gray-400 transition"
          />
        </div>

        {/* Company Type Filter Dropdown */}
        <div className="w-full md:w-48">
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-800 focus:border-green-500 focus:ring-2 focus:ring-green-500/10 focus:outline-none transition bg-white"
          >
            <option value="">All Company Types</option>
            {COMPANY_TYPES.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {(searchQuery || typeFilter) && (
          <button 
            onClick={() => { setSearchQuery(''); setTypeFilter(''); }} 
            className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 border border-gray-200 transition cursor-pointer flex-shrink-0"
            title="Reset Filters"
          >
            <RefreshCcw size={13} />
          </button>
        )}
        <span className="text-xs text-gray-400 font-medium hidden sm:block whitespace-nowrap">{filtered.length} results</span>
      </div>

      {/* Card Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 py-16 text-center">
          <Building2 size={32} className="mx-auto mb-3 text-gray-300" />
          <p className="text-xs font-medium text-gray-400">No companies found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((co, idx) => (
            <div
              key={co.id}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 hover:shadow-md hover:border-blue-200 transition-all duration-200 space-y-4"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 border border-blue-200 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-black text-blue-700">{co.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="font-extrabold text-gray-900 text-xs block truncate" title={co.name}>{co.name}</span>
                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                      {co.company_type && (
                        <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[8px] font-black uppercase tracking-wider">
                          {co.company_type}
                        </span>
                      )}
                      {co.city && (
                        <span className="text-[10px] text-gray-400 font-medium flex items-center gap-0.5 truncate">
                          <MapPin size={9} className="flex-shrink-0" /> {co.city}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border flex-shrink-0 ${co.active ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                  {co.active ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Info Rows */}
              <div className="space-y-1.5 text-[11px]">
                {co.contact_person && (
                  <div className="flex items-center gap-2 text-gray-500">
                    <Building2 size={10} className="text-gray-400 flex-shrink-0" />
                    <span className="font-semibold truncate">{co.contact_person}</span>
                  </div>
                )}
                {co.phone && (
                  <div className="flex items-center gap-2 text-gray-500">
                    <Phone size={10} className="text-gray-400 flex-shrink-0" />
                    <span className="font-semibold">{co.phone}</span>
                  </div>
                )}
                {co.email && (
                  <div className="flex items-center gap-2 text-gray-500">
                    <Mail size={10} className="text-gray-400 flex-shrink-0" />
                    <span className="font-semibold truncate">{co.email}</span>
                  </div>
                )}
                {!co.phone && !co.email && !co.contact_person && (
                  <span className="text-[10px] text-gray-300 italic">No contact details added</span>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 pt-2 border-t border-gray-100">
                <button onClick={() => openProducts(co)} className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 font-bold rounded-lg text-[10px] transition cursor-pointer">
                  <Package size={10} /> Products
                </button>
                <button onClick={() => setLedgerCompany(co)} className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 hover:text-indigo-700 font-bold rounded-lg text-[10px] transition cursor-pointer">
                  <BookOpen size={10} /> Ledger
                </button>
                <button onClick={() => openView(co)} className="flex items-center justify-center gap-1 p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-lg text-[10px] transition cursor-pointer" title="View Details">
                  <Eye size={10} />
                </button>
                <button onClick={() => openEdit(co)} className="flex items-center justify-center gap-1 p-1.5 bg-gray-100 hover:bg-green-100 text-gray-600 hover:text-green-700 font-bold rounded-lg text-[10px] transition cursor-pointer" title="Edit Company">
                  <Pencil size={10} />
                </button>
                <button onClick={() => openDelete(co)} className="flex items-center justify-center gap-1 p-1.5 bg-gray-100 hover:bg-red-100 text-gray-600 hover:text-red-600 font-bold rounded-lg text-[10px] transition cursor-pointer" title="Delete Company">
                  <Trash2 size={10} />
                </button>
              </div>
            </div>
          ))}

          {/* Add New Card */}
          <button
            onClick={openAdd}
            className="bg-gray-50 border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50/20 rounded-2xl p-5 flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-blue-600 transition-all duration-200 cursor-pointer min-h-[180px]"
          >
            <div className="w-10 h-10 rounded-xl border-2 border-dashed border-current flex items-center justify-center">
              <Plus size={18} />
            </div>
            <span className="text-xs font-bold">Add Company</span>
          </button>
        </div>
      )}

      {/* Summary */}
      <div className="bg-white rounded-xl border border-gray-200 px-5 py-3 flex items-center justify-between text-[11px] font-semibold text-gray-400">
        <span className="flex items-center gap-2">
          <CheckCircle2 size={13} className="text-green-500" />
          {companies.length} companies registered
        </span>
        <span>{filtered.length} shown</span>
      </div>

      {/* Modals */}
      {(modal === 'add' || modal === 'edit') && (
        <CompanyFormModal company={selected} mode={modal} onClose={closeModal} onSave={handleSave} />
      )}
      {modal === 'view' && <ViewModal company={selected} onClose={closeModal} />}
      {modal === 'delete' && <DeleteModal item={selected} onClose={closeModal} onConfirm={handleDelete} />}
      {productsFor && <CompanyProductsPopup company={productsFor} onClose={() => setProductsFor(null)} />}
      {ledgerCompany && (
        <CompanyLedgerModal 
          company={ledgerCompany} 
          invoices={invoices} 
          onClose={() => setLedgerCompany(null)} 
          selectedCity={selectedCity} 
          setSelectedCity={setSelectedCity} 
          cities={cities}
        />
      )}
    </div>
  );
}
