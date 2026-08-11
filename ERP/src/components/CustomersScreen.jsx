import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
  Search,
  RefreshCcw,
  Phone,
  MapPin,
  CreditCard,
  Eye,
  CheckCircle2,
  AlertCircle,
  User,
  TrendingUp,
  FileText,
} from 'lucide-react';
import { CUSTOMERS as INIT_CUSTOMERS } from '../utils/mockData';
import { customerApi } from '../api';
import DateFilterBar from './DateFilterBar';
import { isItemInDateRange } from '../utils/dateUtils';
import { useLanguage } from '../context/LanguageContext';

// ─── Customer types & colors ───────────────────────────────────────────────────
const TYPE_CFG = {
  Farmer:           { cls: 'bg-green-100  text-green-700  border-green-200'  },
  Dealer:           { cls: 'bg-blue-100   text-blue-700   border-blue-200'   },
  Wholesaler:       { cls: 'bg-purple-100 text-purple-700 border-purple-200' },
  Retailer:         { cls: 'bg-orange-100 text-orange-700 border-orange-200' },
  'Walk-in Customer':{ cls: 'bg-gray-100  text-gray-600   border-gray-200'   },
};

const CUSTOMER_TYPES = Object.keys(TYPE_CFG);

const EMPTY_CUSTOMER = {
  name: '', code: '', phone: '', address: '',
  customer_type: 'Farmer',
  last_purchase_date: '—',
};

// ─── Shared field ─────────────────────────────────────────────────────────────
function Field({ label, required, textarea, ...props }) {
  const cls = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-800 focus:border-green-500 focus:ring-2 focus:ring-green-500/10 focus:outline-none placeholder-gray-400 transition';
  return (
    <div className="space-y-1">
      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {textarea ? <textarea rows={2} className={cls} {...props} /> : <input className={cls} {...props} />}
    </div>
  );
}

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────
function CustomerFormModal({ customer, mode, onClose, onSave }) {
  const [form, setForm] = useState(customer || EMPTY_CUSTOMER);
  const [errors, setErrors] = useState({});
  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim())  e.name  = 'Customer name is required';
    if (!form.phone.trim()) e.phone = 'Phone number is required';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSave = () => {
    if (!validate()) return;
    const code = form.code || `CUST-${form.name.slice(0, 3).toUpperCase()}${Date.now().toString().slice(-4)}`;
    onSave({ ...form, id: form.id || `CUST${Date.now()}`, code });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg border border-gray-200 shadow-2xl flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-xl"><Users size={16} className="text-green-700" /></div>
            <div>
              <h2 className="text-sm font-extrabold text-gray-800">{mode === 'add' ? 'Add Customer' : 'Edit Customer'}</h2>
              <p className="text-[10px] text-gray-400 font-medium">Farmer / Dealer / Wholesaler profile</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition cursor-pointer"><X size={15} /></button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Basic Info */}
          <div>
            <p className="text-[10px] font-black text-green-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <span className="w-4 h-0.5 bg-green-600 rounded inline-block" /> Basic Information
            </p>
            <div className="space-y-3">
              <div>
                <Field label="Full Name / Company" required placeholder="e.g. Ramesh Kumar" value={form.name} onChange={e => set('name', e.target.value)} />
                {errors.name && <p className="text-[10px] text-red-500 font-semibold mt-0.5">{errors.name}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Customer Code (auto)" placeholder="e.g. CUST-RAM01" value={form.code || ''} onChange={e => set('code', e.target.value)} />
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide">Customer Type <span className="text-red-500">*</span></label>
                  <select
                    value={form.customer_type}
                    onChange={e => set('customer_type', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 bg-white focus:border-green-500 focus:outline-none transition"
                  >
                    {CUSTOMER_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <Field label="Phone" required type="tel" placeholder="e.g. 03001234567" maxLength={11} value={form.phone} onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 11))} />
                {errors.phone && <p className="text-[10px] text-red-500 font-semibold mt-0.5">{errors.phone}</p>}
              </div>
              <Field label="Address" textarea placeholder="Full address..." value={form.address} onChange={e => set('address', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl text-xs hover:bg-gray-100 transition cursor-pointer">Cancel</button>
          <button onClick={handleSave} className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-xs shadow-sm transition cursor-pointer flex items-center justify-center gap-2">
            <Save size={12} /> {mode === 'add' ? 'Save Customer' : 'Update Customer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── View Details Modal ───────────────────────────────────────────────────────
function ViewModal({ customer, invoices, onClose, onEdit }) {
  if (!customer) return null;
  const custInvoices = invoices?.filter(i => i.customer_id === customer.id) || [];
  const totalPurchased = custInvoices.reduce((s, i) => s + i.grand_total, 0);
  const typeCfg = TYPE_CFG[customer.customer_type] || TYPE_CFG['Walk-in Customer'];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg border border-gray-200 shadow-2xl flex flex-col max-h-[88vh]">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-100 to-emerald-100 border border-green-200 flex items-center justify-center flex-shrink-0">
              <span className="text-lg font-black text-green-700">{customer.name.charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-gray-900">{customer.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono text-[10px] text-gray-400">{customer.code}</span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${typeCfg.cls}`}>{customer.customer_type}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition cursor-pointer"><X size={15} /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {/* Contact */}
          <div className="space-y-2">
            {[
              { icon: Phone,  label: 'Phone',   value: customer.phone },
              { icon: MapPin, label: 'Address', value: customer.address },
            ].filter(r => r.value).map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-green-50 border border-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon size={11} className="text-green-600" />
                </div>
                <div>
                  <span className="text-[9px] text-gray-400 font-bold uppercase block">{label}</span>
                  <span className="text-xs font-semibold text-gray-800">{value}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Purchase history */}
          {custInvoices.length > 0 && (
            <div>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-2">Recent Purchases ({custInvoices.length})</p>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {custInvoices.map(inv => (
                  <div key={inv.id} className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
                    <div>
                      <span className="text-xs font-bold text-green-700 font-mono">{inv.invoice_no}</span>
                      <span className="text-[10px] text-gray-400 ml-2">{inv.date}</span>
                    </div>
                    <span className="text-xs font-black text-gray-800">Rs. {inv.grand_total.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition cursor-pointer">Close</button>
          <button onClick={onEdit} className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-xs shadow-sm transition cursor-pointer flex items-center justify-center gap-1.5">
            <Pencil size={12} /> Edit Customer
          </button>
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
        <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto"><Trash2 size={22} className="text-red-500" /></div>
        <div className="space-y-1">
          <h3 className="text-sm font-extrabold text-gray-800">Delete Customer?</h3>
          <p className="text-xs text-gray-500"><strong className="text-gray-800">"{item?.name}"</strong> will be removed permanently.</p>
          {item?.outstanding_balance > 0 && <p className="text-[11px] text-red-600 font-bold flex items-center justify-center gap-1"><AlertCircle size={11} /> Outstanding balance of Rs. {item.outstanding_balance.toLocaleString()} exists!</p>}
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition cursor-pointer">Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow-sm transition cursor-pointer">Delete</button>
        </div>
      </div>
    </div>
  );
}

// Helper to resolve customer city
const getCustomerCity = (c) => {
  if (c.city) return c.city;
  const addr = c.address || '';
  if (addr.includes('Bathinda')) return 'Bathinda';
  if (addr.includes('Multan')) return 'Multan';
  if (addr.includes('Karnal')) return 'Karnal';
  if (addr.includes('Sonipat')) return 'Sonipat';
  if (addr.includes('Anand')) return 'Anand';
  if (addr.includes('Ludhiana')) return 'Ludhiana';
  return '';
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function CustomersScreen({ invoices = [], addAuditLog, triggerNotificationToast, selectedCity, setSelectedCity, cities = [] }) {
  const { t } = useLanguage();
  const [customers,   setCustomers]   = useState(INIT_CUSTOMERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter,  setTypeFilter]  = useState('');
  const [modal,       setModal]       = useState(null);
  const [selected,    setSelected]    = useState(null);

  // Local Date Filter State
  const [dateFilter, setDateFilter] = useState({ preset: 'All Time', startDate: '', endDate: '' });

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const data = await customerApi.getAll();
        if (data && Array.isArray(data)) {
          const merged = [...data];
          INIT_CUSTOMERS.forEach(ic => {
            if (!merged.some(c => c.code === ic.code || c.name === ic.name)) {
              merged.push(ic);
            }
          });
          setCustomers(merged);
        }
      } catch (e) {}
    };
    fetchCustomers();
  }, []);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return customers.filter(c => {
      if (!c) return false;
      const matchesSearch = !q || (c.name || '').toLowerCase().includes(q) || (c.code || '').toLowerCase().includes(q) || (c.phone || '').includes(q) || getCustomerCity(c).toLowerCase().includes(q);
      const matchesType = !typeFilter || c.customer_type === typeFilter;
      const matchesCity = selectedCity === 'All' || getCustomerCity(c) === selectedCity;
      const matchesDate = dateFilter.preset === 'All Time' || (c.last_purchase_date !== '—' && isItemInDateRange(c.last_purchase_date, dateFilter.startDate, dateFilter.endDate));
      return matchesSearch && matchesType && matchesCity && matchesDate;
    });
  }, [customers, searchQuery, typeFilter, selectedCity, dateFilter]);

  const openAdd    = () => { setSelected(null); setModal('add'); };
  const openEdit   = (c) => { setSelected(c);    setModal('edit'); };
  const openDelete = (c) => { setSelected(c);    setModal('delete'); };
  const openView   = (c) => { setSelected(c);    setModal('view'); };
  const closeModal = () => { setModal(null); setSelected(null); };

  const handleSave = async (saved) => {
    try {
      if (modal === 'add') {
        const created = await customerApi.create(saved);
        setCustomers(p => [...p, created || saved]);
        if (triggerNotificationToast) triggerNotificationToast('Customer Created', `${saved.name} added successfully.`, 'success');
        if (addAuditLog) addAuditLog('Customer Created', `Added customer ${saved.name} (${saved.code})`);
      } else {
        const targetId = selected._id || selected.id;
        const updated = await customerApi.update(targetId, saved);
        setCustomers(p => p.map(c => (c._id === targetId || c.id === targetId) ? (updated || saved) : c));
        if (triggerNotificationToast) triggerNotificationToast('Customer Updated', `${saved.name} updated successfully.`, 'success');
        if (addAuditLog) addAuditLog('Customer Updated', `Updated customer ${saved.name} (${saved.code})`);
      }
      closeModal();
    } catch (err) {
      if (triggerNotificationToast) triggerNotificationToast('Error', err.message, 'error');
    }
  };
  const handleDelete = () => { 
    if (selected) {
      setCustomers(p => p.filter(c => (c._id || c.id) !== (selected._id || selected.id))); 
      if (triggerNotificationToast) triggerNotificationToast('Customer Deleted', `${selected.name} removed successfully.`, 'info');
      if (addAuditLog) addAuditLog('Customer Deleted', `Deleted customer ${selected.name} (${selected.code})`);
    }
    closeModal(); 
  };

  // Stats
  const totalOutstanding = filtered.reduce((s, c) => s + (c.outstanding_balance || 0), 0);
  const creditExceeded   = filtered.filter(c => c.outstanding_balance >= c.credit_limit && c.credit_limit > 0).length;

  return (
    <div className="space-y-5 font-sans">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-black text-gray-900 tracking-tight">Customers</h1>
          <p className="text-xs text-gray-400 mt-0.5 font-medium">{filtered.length} customers registered</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer">
          <Plus size={14} /> Add Customer
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

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text" placeholder="Search name, code, phone..."
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-800 focus:border-green-500 focus:ring-2 focus:ring-green-500/10 focus:outline-none transition"
          />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 focus:border-green-500 focus:outline-none transition"
        >
          <option value="">All Types</option>
          {CUSTOMER_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        {(searchQuery || typeFilter) && (
          <button onClick={() => { setSearchQuery(''); setTypeFilter(''); }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-500 hover:text-red-600 border border-gray-200 rounded-lg hover:border-red-200 hover:bg-red-50 transition cursor-pointer">
            <RefreshCcw size={12} /> Reset
          </button>
        )}
        <span className="text-xs text-gray-400 font-medium hidden sm:block">{filtered.length} results</span>
      </div>

      {/* Customer Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">
                <th className="py-3 px-4 text-left">#</th>
                <th className="py-3 px-4 text-left">Customer</th>
                <th className="py-3 px-4 text-left hidden sm:table-cell">Phone</th>
                <th className="py-3 px-4 text-center">Type</th>
                <th className="py-3 px-4 text-left hidden md:table-cell">Last Purchase</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="py-14 text-center text-gray-400 font-medium">
                  <Users size={28} className="mx-auto mb-2 text-gray-300" />No customers found.
                </td></tr>
              ) : filtered.map((c, idx) => {
                const typeCfg = TYPE_CFG[c.customer_type] || TYPE_CFG['Walk-in Customer'];
                return (
                  <tr key={c.id} className="hover:bg-gray-50/60 transition">
                    <td className="py-3.5 px-4 text-gray-400 font-bold">{idx + 1}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-100 to-emerald-50 border border-green-200 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-black text-green-700">{c.name.charAt(0)}</span>
                        </div>
                        <div>
                          <span className="font-extrabold text-gray-900 block">{c.name}</span>
                          <span className="text-[10px] text-gray-400 font-mono">{c.code}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-gray-600 hidden sm:table-cell">{c.phone}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold border ${typeCfg.cls}`}>{c.customer_type}</span>
                    </td>
                    <td className="py-3.5 px-4 text-gray-400 font-medium hidden md:table-cell">{c.last_purchase_date || '—'}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openView(c)}   title="View"   className="p-1.5 rounded-lg bg-gray-100 hover:bg-blue-100   text-gray-500 hover:text-blue-700  transition cursor-pointer"><Eye    size={12} /></button>
                        <button onClick={() => openEdit(c)}   title="Edit"   className="p-1.5 rounded-lg bg-gray-100 hover:bg-green-100  text-gray-500 hover:text-green-700 transition cursor-pointer"><Pencil size={12} /></button>
                        <button onClick={() => openDelete(c)} title="Delete" className="p-1.5 rounded-lg bg-gray-100 hover:bg-red-100    text-gray-500 hover:text-red-600   transition cursor-pointer"><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex justify-between text-[10px] font-semibold text-gray-400">
          <span>Showing {filtered.length} of {customers.length} customers</span>
          {creditExceeded > 0 && <span className="text-red-500 flex items-center gap-1"><AlertCircle size={10} /> {creditExceeded} over credit limit</span>}
        </div>
      </div>

      {/* Modals */}
      {(modal === 'add' || modal === 'edit') && <CustomerFormModal customer={selected} mode={modal} onClose={closeModal} onSave={handleSave} />}
      {modal === 'view' && <ViewModal customer={selected} invoices={invoices} onClose={closeModal} onEdit={() => { setModal('edit'); }} />}
      {modal === 'delete' && <DeleteModal item={selected} onClose={closeModal} onConfirm={handleDelete} />}
    </div>
  );
}
