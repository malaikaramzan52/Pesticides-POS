import React, { useState, useMemo, useEffect } from 'react';
import { 
  Tag, 
  Plus, 
  Trash2, 
  X, 
  Save, 
  AlertTriangle, 
  Layers,
  ShoppingBag,
  Package,
  RefreshCcw,
  Edit2,
  Search
} from 'lucide-react';

import { offerApi, productApi, categoryApi, companyApi } from '../api';
import { useLanguage } from '../context/LanguageContext';

export default function OffersScreen({ triggerNotificationToast, addAuditLog }) {
  const { t } = useLanguage();
  const [offers, setOffers] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [companiesList, setCompaniesList] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [modal, setModal] = useState(null); // 'add' | 'edit' | 'delete'
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [scopeFilter, setScopeFilter] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [offRes, prodRes, catRes, compRes] = await Promise.all([
          offerApi.getAll().catch(() => []),
          productApi.getAll().catch(() => []),
          categoryApi.getAll().catch(() => []),
          companyApi.getAll().catch(() => [])
        ]);
        if (offRes && Array.isArray(offRes)) setOffers(offRes);
        if (prodRes && Array.isArray(prodRes) && prodRes.length > 0) setProductsList(prodRes);
        if (catRes && Array.isArray(catRes) && catRes.length > 0) setCategoriesList(catRes);
        if (compRes && Array.isArray(compRes) && compRes.length > 0) setCompaniesList(compRes);
      } catch (e) {}
    };
    fetchData();
  }, []);

  // Form States
  const [formName, setFormName] = useState('');
  const [formScope, setFormScope] = useState('Product'); // 'Product' | 'Company' | 'Category'
  const [formTargetId, setFormTargetId] = useState('');
  const [formType, setFormType] = useState('Percentage'); // 'Percentage' | 'Fixed' | 'BuyXGetY'
  const [formDiscountValue, setFormDiscountValue] = useState('');
  const [formBuyQty, setFormBuyQty] = useState('');
  const [formGetQty, setFormGetQty] = useState('');
  const [formStartDate, setFormStartDate] = useState('2026-08-07');
  const [formEndDate, setFormEndDate] = useState('2026-08-31');
  const [formStatus, setFormStatus] = useState('Active');
  const [formError, setFormError] = useState('');

  const systemDate = new Date().toISOString().split('T')[0];

  // Compute status helpers
  const getOfferStatus = (off) => {
    if (off.status === 'Inactive') return 'Disabled';
    const start = new Date(off.startDate || off.start_date || systemDate);
    const end = new Date(off.endDate || off.end_date || systemDate);
    const current = new Date(systemDate);
    if (current > end) return 'Expired';
    if (current < start) return 'Scheduled';
    return 'Active';
  };

  const getTargetName = (scope, targetId) => {
    const tid = targetId?.toString();
    if (scope === 'Product') {
      const p = productsList.find(p => (p._id || p.id)?.toString() === tid);
      return p ? p.name : 'Unknown Product';
    } else if (scope === 'Company') {
      const c = companiesList.find(c => (c._id || c.id)?.toString() === tid);
      return c ? c.name : 'Unknown Brand';
    } else if (scope === 'Category') {
      const cat = categoriesList.find(c => (c._id || c.id)?.toString() === tid);
      return cat ? cat.name : 'Unknown Category';
    }
    return 'All Targets';
  };

  // Actions
  const handleOpenAdd = () => {
    setFormName('');
    setFormScope('Product');
    setFormTargetId((productsList[0]?._id || productsList[0]?.id) || '');
    setFormType('Percentage');
    setFormDiscountValue('');
    setFormBuyQty('');
    setFormGetQty('');
    setFormStartDate(new Date().toISOString().split('T')[0]);
    setFormEndDate(new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0]);
    setFormStatus('Active');
    setFormError('');
    setModal('add');
  };



  const handleOpenEdit = (off) => {
    setSelectedOffer(off);
    setFormName(off.name);
    setFormScope(off.scope);
    // Support both DB field (target_id) and legacy field (targetId)
    setFormTargetId((off.target_id?._id || off.target_id || off.targetId || '')?.toString());
    setFormType(off.type);
    setFormDiscountValue(off.discountValue || '');
    setFormBuyQty(off.buyQty || '');
    setFormGetQty(off.getQty || '');
    setFormStartDate(off.startDate);
    setFormEndDate(off.endDate);
    setFormStatus(off.status);
    setFormError('');
    setModal('edit');
  };

  const handleSave = async () => {
    if (!formName.trim()) { setFormError('Offer name is required.'); return; }
    if (!formTargetId) { setFormError('Please select a target.'); return; }
    
    if (formType !== 'BuyXGetY') {
      const val = parseFloat(formDiscountValue);
      if (isNaN(val) || val <= 0) { setFormError('Discount value must be a valid positive number.'); return; }
      if (formType === 'Percentage' && val > 100) { setFormError('Percentage discount cannot exceed 100%.'); return; }
    } else {
      const buy = parseInt(formBuyQty);
      const get = parseInt(formGetQty);
      if (isNaN(buy) || buy <= 0 || isNaN(get) || get <= 0) {
        setFormError('Buy and Get quantities must be valid positive integers.');
        return;
      }
    }

    if (!formStartDate || !formEndDate) { setFormError('Start and End dates are required.'); return; }
    if (new Date(formStartDate) > new Date(formEndDate)) { setFormError('Start date cannot be after end date.'); return; }

    const isEdit = modal === 'edit';
    // Find the target name for the DB record
    const targetName = getTargetName(formScope, formTargetId);
    const offerPayload = {
      name: formName.trim(),
      scope: formScope,
      target_id: formTargetId,     // DB field name
      target_name: targetName,
      type: formType,
      discountValue: formType !== 'BuyXGetY' ? parseFloat(formDiscountValue) : 0,
      buyQty: formType === 'BuyXGetY' ? parseInt(formBuyQty) : 0,
      getQty: formType === 'BuyXGetY' ? parseInt(formGetQty) : 0,
      startDate: formStartDate,
      endDate: formEndDate,
      status: formStatus
    };

    try {
      let savedOffer;
      if (isEdit) {
        const targetId = selectedOffer._id || selectedOffer.id;
        savedOffer = await offerApi.update(targetId, offerPayload).catch(() => ({ ...selectedOffer, ...offerPayload }));
        const updatedList = offers.map(o => (o._id || o.id) === targetId ? savedOffer : o);
        setOffers(updatedList);
        if (triggerNotificationToast) triggerNotificationToast('Offer Updated', `Promo "${offerPayload.name}" saved successfully.`, 'success');
        if (addAuditLog) addAuditLog('Offer Updated', `Updated offer ${offerPayload.name}`);
      } else {
        savedOffer = await offerApi.create(offerPayload).catch(() => ({ id: `OFF-${Date.now()}`, ...offerPayload }));
        const updatedList = [savedOffer, ...offers];
        setOffers(updatedList);
        if (triggerNotificationToast) triggerNotificationToast('Offer Created', `Promo "${offerPayload.name}" added successfully.`, 'success');
        if (addAuditLog) addAuditLog('Offer Created', `Created offer ${offerPayload.name}`);
      }
    } catch (e) {
      if (triggerNotificationToast) triggerNotificationToast('Save Error', e.message || 'Failed to save offer', 'error');
    }

    setModal(null);
  };

  const handleDelete = async () => {
    if (selectedOffer) {
      const targetId = selectedOffer._id || selectedOffer.id;
      try {
        await offerApi.delete(targetId).catch(() => {});
        const updatedList = offers.filter(o => (o._id || o.id) !== targetId);
        setOffers(updatedList);
        if (triggerNotificationToast) triggerNotificationToast('Offer Deleted', `Promo "${selectedOffer.name}" removed successfully.`, 'info');
        if (addAuditLog) addAuditLog('Offer Deleted', `Deleted promotional offer ${selectedOffer.name}`);
      } catch (e) {}
    }
    setModal(null);
  };

  // Filtered List
  const filteredOffers = useMemo(() => {
    return offers.filter(off => {
      const tid = (off.target_id?._id || off.target_id || off.targetId || '')?.toString();
      const matchesSearch = searchQuery === '' || 
        off.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        getTargetName(off.scope, tid).toLowerCase().includes(searchQuery.toLowerCase());
      const matchesScope = scopeFilter === '' || off.scope === scopeFilter;
      return matchesSearch && matchesScope;
    });
  }, [offers, searchQuery, scopeFilter, productsList, companiesList, categoriesList]);

  // Statistics
  const stats = useMemo(() => {
    const total = offers.length;
    const active = offers.filter(o => getOfferStatus(o) === 'Active').length;
    const expired = offers.filter(o => getOfferStatus(o) === 'Expired').length;
    const disabled = offers.filter(o => getOfferStatus(o) === 'Disabled').length;
    return { total, active, expired, disabled };
  }, [offers]);

  // Dynamically resolve target lists inside select form — use live DB lists
  const formTargets = useMemo(() => {
    if (formScope === 'Product') return productsList.map(p => ({ id: (p._id || p.id)?.toString(), name: p.name }));
    if (formScope === 'Company') return companiesList.map(c => ({ id: (c._id || c.id)?.toString(), name: c.name }));
    if (formScope === 'Category') return categoriesList.map(c => ({ id: (c._id || c.id)?.toString(), name: c.name }));
    return [];
  }, [formScope, productsList, companiesList, categoriesList]);

  // Set default target item when scope switches
  const handleScopeChange = (newScope) => {
    setFormScope(newScope);
    if (newScope === 'Product')   setFormTargetId((productsList[0]?._id  || productsList[0]?.id  || '')?.toString());
    else if (newScope === 'Company')  setFormTargetId((companiesList[0]?._id || companiesList[0]?.id || '')?.toString());
    else if (newScope === 'Category') setFormTargetId((categoriesList[0]?._id || categoriesList[0]?.id || '')?.toString());
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-black text-gray-900 tracking-tight">Offers & Schemes</h1>
          <p className="text-xs text-gray-400 mt-0.5 font-medium">
            Manage promotional price structures, brands discounts, and buy-one-get-one offers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer"
          >
            <Plus size={14} /> Add Promotional Offer
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Offers', val: stats.total, color: 'text-gray-900', bg: 'bg-white' },
          { label: 'Active Promotions', val: stats.active, color: 'text-green-700', bg: 'bg-green-50/30' },
          { label: 'Expired Schemes', val: stats.expired, color: 'text-red-600', bg: 'bg-red-50/20' },
          { label: 'Disabled Rules', val: stats.disabled, color: 'text-gray-500', bg: 'bg-gray-50' }
        ].map((item, idx) => (
          <div key={idx} className={`p-4 border border-gray-150 rounded-2xl ${item.bg}`}>
            <span className="block text-[8px] font-black text-gray-400 uppercase tracking-wider">{item.label}</span>
            <span className={`block text-xl font-black mt-1 ${item.color}`}>{item.val}</span>
          </div>
        ))}
      </div>

      {/* Filter Row */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by offer name or target entity..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-800 focus:border-green-500 focus:ring-2 focus:ring-green-500/10 focus:outline-none placeholder-gray-400 transition"
          />
        </div>
        <select
          value={scopeFilter}
          onChange={e => setScopeFilter(e.target.value)}
          className="w-full sm:w-44 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 focus:border-green-500 focus:outline-none transition cursor-pointer"
        >
          <option value="">All Scopes</option>
          <option value="Product">Product Specific</option>
          <option value="Company">Brand Specific</option>
          <option value="Category">Category Specific</option>
        </select>
        {(searchQuery || scopeFilter) && (
          <button
            onClick={() => { setSearchQuery(''); setScopeFilter(''); }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-500 hover:text-red-600 border border-gray-200 rounded-lg hover:border-red-200 hover:bg-red-50 transition cursor-pointer"
          >
            <RefreshCcw size={12} /> Reset
          </button>
        )}
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200 text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Offer Name</th>
                <th className="py-3 px-4">Scope</th>
                <th className="py-3 px-4">Target Entity</th>
                <th className="py-3 px-4">Offer Type</th>
                <th className="py-3 px-4 text-center">Benefits / Deal</th>
                <th className="py-3 px-4">Timeline</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {filteredOffers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400 font-bold">
                    <Tag size={32} className="mx-auto mb-3 opacity-20" />
                    No promotional offers found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredOffers.map(off => {
                  const status = getOfferStatus(off);
                  let statusCls = '';
                  if (status === 'Active') statusCls = 'bg-green-100 text-green-700 border-green-200';
                  else if (status === 'Expired') statusCls = 'bg-red-100 text-red-700 border-red-200';
                  else if (status === 'Scheduled') statusCls = 'bg-blue-100 text-blue-700 border-blue-200';
                  else statusCls = 'bg-gray-100 text-gray-500 border-gray-200';

                  let benefitText = '';
                  if (off.type === 'Percentage') benefitText = `${off.discountValue}% Discount`;
                  else if (off.type === 'Fixed') benefitText = `Rs. ${off.discountValue} Flat Off`;
                  else if (off.type === 'BuyXGetY') benefitText = `Buy ${off.buyQty} Get ${off.getQty} Free`;

                  return (
                    <tr key={off.id} className="hover:bg-gray-50/50 transition">
                      <td className="py-3.5 px-4 font-bold text-gray-900">{off.name}</td>
                      <td className="py-3.5 px-4 font-semibold text-gray-500">
                        <span className={`inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded border ${
                          off.scope === 'Product' ? 'bg-purple-50 border-purple-150 text-purple-700' :
                          off.scope === 'Company' ? 'bg-blue-50 border-blue-150 text-blue-700' :
                                                    'bg-amber-50 border-amber-150 text-amber-700'
                        }`}>
                          {off.scope === 'Product' ? <Package size={10} /> : off.scope === 'Company' ? <ShoppingBag size={10} /> : <Layers size={10} />}
                          {off.scope}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-gray-700">
                        {getTargetName(off.scope, (off.target_id?._id || off.target_id || off.targetId || '')?.toString())}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-gray-600">{off.type === 'BuyXGetY' ? 'Buy X Get Y' : `${off.type} Discount`}</td>
                      <td className="py-3.5 px-4 text-center font-black text-indigo-700 font-mono">{benefitText}</td>
                      <td className="py-3.5 px-4 font-mono text-[10px] text-gray-500">
                        {off.startDate} to {off.endDate}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold border ${statusCls}`}>
                          {status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            title="Edit Offer"
                            onClick={() => handleOpenEdit(off)}
                            className="p-1.5 rounded-lg bg-gray-150 hover:bg-green-100 text-gray-600 hover:text-green-700 transition cursor-pointer"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            title="Delete"
                            onClick={() => { setSelectedOffer(off); setModal('delete'); }}
                            className="p-1.5 rounded-lg bg-gray-150 hover:bg-red-100 text-gray-600 hover:text-red-600 transition cursor-pointer"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add / Edit Form Modal ────────────────────────────────────────────────── */}
      {(modal === 'add' || modal === 'edit') && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md border border-gray-200 shadow-2xl flex flex-col max-h-[90vh]">
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Tag className="text-green-600" size={16} />
                <h3 className="text-sm font-extrabold text-gray-900">
                  {modal === 'add' ? 'Create Promotional Scheme' : 'Edit Scheme details'}
                </h3>
              </div>
              <button onClick={() => setModal(null)} className="p-1 rounded hover:bg-gray-100 text-gray-500 cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="overflow-y-auto p-6 space-y-4 text-xs font-semibold text-gray-700 flex-1">
              
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-xl flex items-center gap-2 mb-2 font-bold animate-shake">
                  <AlertTriangle size={14} className="flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Name */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide">Scheme Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Bayer Monsoon Rebate"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 transition shadow-sm font-bold text-gray-800"
                />
              </div>

              {/* Scope Selection */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'Product', label: 'Product' },
                  { id: 'Company', label: 'Brand/Company' },
                  { id: 'Category', label: 'Category' }
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleScopeChange(item.id)}
                    className={`py-2 rounded-xl border text-center font-bold text-[10px] uppercase transition cursor-pointer ${
                      formScope === item.id 
                        ? 'bg-green-50 border-green-500 text-green-700 shadow-inner' 
                        : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Target Dropdown */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide">Select target Entity *</label>
                <select
                  value={formTargetId}
                  onChange={e => setFormTargetId(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-2.5 font-bold text-gray-800 focus:outline-none focus:border-green-500 transition shadow-sm cursor-pointer"
                >
                  {formTargets.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              {/* Offer Type */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide">Offer Type *</label>
                <select
                  value={formType}
                  onChange={e => setFormType(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-2.5 font-bold text-gray-800 focus:outline-none focus:border-green-500 transition shadow-sm cursor-pointer"
                >
                  <option value="Percentage">Percentage Discount (%)</option>
                  <option value="Fixed">Fixed Amount Off (Rs.)</option>
                  <option value="BuyXGetY">Buy X Get Y Free</option>
                </select>
              </div>

              {/* Benefit Details inputs */}
              {formType !== 'BuyXGetY' ? (
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                    {formType === 'Percentage' ? 'Discount Percentage (%) *' : 'Discount Amount (Rs.) *'}
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    step="any"
                    placeholder={formType === 'Percentage' ? '10' : '150'}
                    value={formDiscountValue}
                    onChange={e => setFormDiscountValue(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:border-green-500 focus:outline-none transition shadow-sm font-bold text-gray-800"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide">Buy Quantity (X) *</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="10"
                      value={formBuyQty}
                      onChange={e => setFormBuyQty(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:border-green-500 focus:outline-none transition shadow-sm font-bold text-gray-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide">Get Free Qty (Y) *</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="1"
                      value={formGetQty}
                      onChange={e => setFormGetQty(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:border-green-500 focus:outline-none transition shadow-sm font-bold text-gray-800"
                    />
                  </div>
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide">Start Date *</label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={e => setFormStartDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2.5 focus:border-green-500 focus:outline-none transition shadow-sm font-bold text-gray-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide">End Date *</label>
                  <input
                    type="date"
                    value={formEndDate}
                    onChange={e => setFormEndDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2.5 focus:border-green-500 focus:outline-none transition shadow-sm font-bold text-gray-800"
                  />
                </div>
              </div>

              {/* Status */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide">Rules Status</label>
                <select
                  value={formStatus}
                  onChange={e => setFormStatus(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-2.5 font-bold text-gray-850 focus:outline-none focus:border-green-500 transition shadow-sm cursor-pointer"
                >
                  <option value="Active">Enabled (Active if range matches)</option>
                  <option value="Inactive">Disabled (Manually Inactive)</option>
                </select>
              </div>

            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl flex-shrink-0">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="flex-1 py-2.5 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-sm transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Save size={13} /> Save Offer
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {modal === 'delete' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm border border-gray-200 shadow-2xl p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto">
              <Trash2 size={24} className="text-red-500" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-sm font-extrabold text-gray-800 font-sans">Delete Promotion Scheme?</h3>
              <p className="text-xs text-gray-500 leading-relaxed font-sans">
                You are about to delete <strong className="text-gray-800">{selectedOffer?.name}</strong>. This promotional offer will immediately stop applying in POS checkouts.
              </p>
            </div>
            <div className="flex gap-3 font-semibold text-xs">
              <button
                onClick={() => setModal(null)}
                className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-sm transition cursor-pointer"
              >
                Delete Offer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
