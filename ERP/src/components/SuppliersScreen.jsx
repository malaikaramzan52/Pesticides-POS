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
  User,
  CheckCircle2,
  Eye,
  DollarSign,
  ShoppingBag,
  Calendar,
  FileText,
  MessageSquare,
  AlertCircle,
  Clock,
  RotateCcw,
  ShieldCheck,
  Tag,
  Package
} from 'lucide-react';
import { PRODUCTS, CATEGORIES } from '../utils/mockData';
import { vendorApi, companyApi } from '../api';
import DateFilterBar from './DateFilterBar';
import { isItemInDateRange } from '../utils/dateUtils';
import { useLanguage } from '../context/LanguageContext';

// ── Initial Mock Vendors Data ──────────────────────────────────────────────────
const INITIAL_VENDORS = [];

const EMPTY_VENDOR_FORM = {
  company_name: '',
  contact_person: '',
  phone: '',
  email: '',
  city: '',
  status: 'Active',
  supplied_items: []
};

// ── Main Vendor Management Panel ──────────────────────────────────────────────
export default function SuppliersScreen({ selectedCity, setSelectedCity, cities = [] }) {
  const { t } = useLanguage();
  const [vendors, setVendors] = useState(INITIAL_VENDORS);
  const [companies, setCompanies] = useState([]);

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const data = await vendorApi.getAll();
        if (data && Array.isArray(data) && data.length > 0) setVendors(data);
      } catch (e) {}
    };
    const fetchCompanies = async () => {
      try {
        const data = await companyApi.getAll();
        if (data && Array.isArray(data)) setCompanies(data);
      } catch (e) {}
    };
    fetchVendors();
    fetchCompanies();
  }, []);

  // Filters State
  const [companySearch, setCompanySearch] = useState('');
  const [personSearch, setPersonSearch] = useState('');
  const [phoneSearch, setPhoneSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals & Active Selections
  const [selectedVendorForView, setSelectedVendorForView] = useState(null);
  const [vendorFormModal, setVendorFormModal] = useState({ open: false, mode: 'add', vendor: null });
  const [deleteModalVendor, setDeleteModalVendor] = useState(null);
  const [purchaseInvoicePreview, setPurchaseInvoicePreview] = useState(null);

  // Local Date Filter State
  const [dateFilter, setDateFilter] = useState({ preset: 'All Time', startDate: '', endDate: '' });

  const filteredVendors = useMemo(() => {
    return vendors.filter(v => {
      if (!v) return false;
      const compName = (v.company_name || v.name || v.company || '');
      const matchComp = !companySearch || compName.toLowerCase().includes(companySearch.trim().toLowerCase()) || (v.city && v.city.toLowerCase().includes(companySearch.trim().toLowerCase()));
      const matchPerson = !personSearch || (v.contact_person || '').toLowerCase().includes(personSearch.trim().toLowerCase());
      const matchPhone = !phoneSearch || (v.phone || '').includes(phoneSearch.trim());
      const matchStatus = !statusFilter || v.status === statusFilter;
      const matchCity = !selectedCity || selectedCity === 'All' || (v.city || '').trim().toLowerCase() === selectedCity.trim().toLowerCase();
      
      const vendorDate = v.last_purchase_date || v.createdAt || v.date;
      const matchesDate = !dateFilter || dateFilter.preset === 'All Time' || !dateFilter.startDate || !vendorDate || isItemInDateRange(vendorDate, dateFilter.startDate, dateFilter.endDate);

      return matchComp && matchPerson && matchPhone && matchStatus && matchCity && matchesDate;
    });
  }, [vendors, companySearch, personSearch, phoneSearch, statusFilter, selectedCity, dateFilter]);

  // Overall Statistics
  const stats = useMemo(() => {
    const totalCount = filteredVendors.length;
    const activeCount = filteredVendors.filter(v => v.status === 'Active').length;
    const totalPurchases = filteredVendors.reduce((s, v) => s + (v.total_purchases || 0), 0);
    const totalOutstanding = filteredVendors.reduce((s, v) => s + (v.outstanding_balance || 0), 0);
    return { totalCount, activeCount, totalPurchases, totalOutstanding };
  }, [filteredVendors]);

  // Actions
  const handleOpenAddModal = () => {
    setVendorFormModal({ open: true, mode: 'add', vendor: null });
  };

  const handleOpenEditModal = (vendor) => {
    setVendorFormModal({ open: true, mode: 'edit', vendor });
  };

  const handleOpenViewModal = (vendor) => {
    setSelectedVendorForView(vendor);
  };

  const handleDeleteVendor = async (vendorId) => {
    try {
      await vendorApi.delete(vendorId);
      setVendors(prev => prev.filter(v => (v._id || v.id) !== vendorId));
    } catch (e) {
      try {
        await vendorApi.update(vendorId, { status: 'Inactive' });
        setVendors(prev => prev.filter(v => (v._id || v.id) !== vendorId));
      } catch (_) {}
    }
    if (selectedVendorForView && (selectedVendorForView._id === vendorId || selectedVendorForView.id === vendorId)) {
      setSelectedVendorForView(null);
    }
    setDeleteModalVendor(null);
  };

  const handleSaveVendor = async (savedVendorData) => {
    try {
      const payload = {
        ...savedVendorData,
        name: savedVendorData.company_name || savedVendorData.name,
        company_name: savedVendorData.company_name || savedVendorData.name
      };

      if (vendorFormModal.mode === 'add') {
        const created = await vendorApi.create(payload);
        setVendors(prev => [created || payload, ...prev]);
      } else {
        const targetId = savedVendorData._id || savedVendorData.id;
        const updated = await vendorApi.update(targetId, payload);
        setVendors(prev => prev.map(v => (v._id === targetId || v.id === targetId) ? (updated || payload) : v));
        if (selectedVendorForView && (selectedVendorForView._id === targetId || selectedVendorForView.id === targetId)) {
          setSelectedVendorForView(prev => ({ ...prev, ...payload }));
        }
      }
      setVendorFormModal({ open: false, mode: 'add', vendor: null });
    } catch (err) {
      alert(err.message || 'Error saving vendor');
    }
  };

  const resetFilters = () => {
    setCompanySearch('');
    setPersonSearch('');
    setPhoneSearch('');
    setStatusFilter('');
  };

  return (
    <div className="space-y-6 text-gray-800 font-sans">
      
      {/* ── Page Title & Summary Widgets ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Building2 size={24} className="text-green-600" />
            <h1 className="text-xl font-black text-gray-900 tracking-tight">{t('vendor_management_panel', 'Vendor Management Panel')}</h1>
          </div>
          <p className="text-xs text-gray-500 mt-0.5 font-medium">
            {t('vendor_catalogue_sub', 'Agro Chemicals & Pesticides Wholesaler Supplier Catalogue')}
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAddModal}
          className="px-4 py-2.5 bg-green-600 hover:bg-green-700 active:scale-[0.99] text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center space-x-2 cursor-pointer"
        >
          <Plus size={16} />
          <span>{t('add_new_vendor', 'Add New Vendor')}</span>
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

      {/* ── Searchable Vendor List with Filters ─────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
          <span className="text-xs font-extrabold text-gray-700 uppercase tracking-wider">{t('filter_vendor_catalogue', 'Filter Vendor Catalogue')}</span>
          {(companySearch || personSearch || phoneSearch || statusFilter) && (
            <button
              onClick={resetFilters}
              className="text-xs text-red-600 hover:text-red-700 font-bold flex items-center space-x-1 cursor-pointer"
            >
              <RotateCcw size={12} />
              <span>{t('reset', 'Reset Filters')}</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Company Name Filter */}
          <div className="relative">
            <Search size={14} className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder={t('filter_company_name', 'Filter Company Name...')}
              value={companySearch}
              onChange={(e) => setCompanySearch(e.target.value)}
              className="w-full pl-8 rtl:pl-3 rtl:pr-8 pr-3 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-800 focus:border-green-600 focus:outline-none placeholder-gray-400"
            />
          </div>

          {/* Contact Person Filter */}
          <div className="relative">
            <User size={14} className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder={t('filter_contact_person', 'Filter Contact Person...')}
              value={personSearch}
              onChange={(e) => setPersonSearch(e.target.value)}
              className="w-full pl-8 rtl:pl-3 rtl:pr-8 pr-3 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-800 focus:border-green-600 focus:outline-none placeholder-gray-400"
            />
          </div>

          {/* Phone Number Filter */}
          <div className="relative">
            <Phone size={14} className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder={t('filter_phone_number', 'Filter Phone Number...')}
              value={phoneSearch}
              onChange={(e) => setPhoneSearch(e.target.value)}
              className="w-full pl-8 rtl:pl-3 rtl:pr-8 pr-3 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-800 focus:border-green-600 focus:outline-none placeholder-gray-400"
            />
          </div>

          {/* Status Filter Dropdown */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 bg-white focus:border-green-600 focus:outline-none cursor-pointer"
            >
              <option value="">{t('all_status', 'All Status (Active / Inactive)')}</option>
              <option value="Active">{t('active', 'Active Vendors')}</option>
              <option value="Inactive">{t('inactive', 'Inactive Vendors')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Main Vendors Table ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left rtl:text-right text-xs border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200 text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">{t('vendor_id', 'VENDOR ID')}</th>
                <th className="py-3.5 px-4">{t('company_name', 'COMPANY NAME')}</th>
                <th className="py-3.5 px-4">{t('contact_person', 'CONTACT PERSON')}</th>
                <th className="py-3.5 px-4">{t('phone_number', 'PHONE NUMBER')}</th>
                <th className="py-3.5 px-4">{t('city', 'CITY')}</th>
                <th className="py-3.5 px-4">{t('supplied_products', 'SUPPLIED PRODUCTS & QTY')}</th>
                <th className="py-3.5 px-4 text-center">{t('status', 'STATUS')}</th>
                <th className="py-3.5 px-4 text-center">{t('action', 'ACTIONS')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {filteredVendors.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400 font-medium">
                    <Building2 size={32} className="mx-auto mb-2 text-gray-300" />
                    No vendors found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredVendors.map((vendor) => (
                  <tr 
                    key={vendor._id || vendor.id || vendor.code}
                    onClick={() => handleOpenViewModal(vendor)}
                    className="hover:bg-green-50/50 transition cursor-pointer group"
                  >
                    {/* Vendor ID */}
                    <td className="py-3.5 px-4 font-mono font-bold text-green-700">
                      {vendor.code || vendor.id || vendor._id}
                    </td>

                    {/* Company Name */}
                    <td className="py-3.5 px-4">
                      <span className="font-extrabold text-gray-900 block group-hover:text-green-700">
                        {vendor.company_name}
                      </span>
                    </td>

                    {/* Contact Person */}
                    <td className="py-3.5 px-4 font-bold text-gray-800">
                      {vendor.contact_person}
                    </td>

                    {/* Phone Number */}
                    <td className="py-3.5 px-4 font-mono text-gray-600">
                      {vendor.phone}
                    </td>

                    {/* City */}
                    <td className="py-3.5 px-4 text-gray-600 font-semibold">
                      {vendor.city}
                    </td>

                    {/* Supplied Products & Quantity */}
                    <td className="py-3.5 px-4">
                      {vendor.supplied_items && vendor.supplied_items.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {vendor.supplied_items.slice(0, 2).map((item, i) => (
                            <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-green-50 text-green-800 border border-green-200">
                              <Package size={10} />
                              <span className="truncate max-w-[110px]">{item.product}</span>
                              <span className="bg-green-200 text-green-900 px-1 rounded text-[9px] font-black">{item.qty} Qty</span>
                            </span>
                          ))}
                          {vendor.supplied_items.length > 2 && (
                            <span className="text-[10px] text-gray-400 font-bold self-center">
                              +{vendor.supplied_items.length - 2} more
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-[11px] font-semibold">— No products assigned —</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                        vendor.status === 'Active'
                          ? 'bg-green-100 text-green-800 border-green-200'
                          : 'bg-gray-100 text-gray-600 border-gray-200'
                      }`}>
                        {vendor.status}
                      </span>
                    </td>

                    {/* Actions (View, Edit, Delete) */}
                    <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center space-x-1">
                        {/* View Action */}
                        <button
                          type="button"
                          onClick={() => handleOpenViewModal(vendor)}
                          className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition cursor-pointer"
                          title="View Detailed Profile"
                        >
                          <Eye size={15} />
                        </button>

                        {/* Edit Action */}
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(vendor)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                          title="Edit Vendor Details"
                        >
                          <Pencil size={15} />
                        </button>

                        {/* Delete Action */}
                        <button
                          type="button"
                          onClick={() => setDeleteModalVendor(vendor)}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                          title="Delete Vendor"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── DETAILED VENDOR PROFILE VIEW MODAL ─────────────────────────────── */}
      {selectedVendorForView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="bg-green-600 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Building2 size={22} />
                <div>
                  <h3 className="font-extrabold text-sm tracking-tight">{selectedVendorForView.company_name || selectedVendorForView.name}</h3>
                  <span className="text-[10px] text-green-100 font-mono">ID: {selectedVendorForView.code || selectedVendorForView._id || selectedVendorForView.id}</span>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                  selectedVendorForView.status === 'Active' ? 'bg-white text-green-800 border-white' : 'bg-gray-200 text-gray-700 border-gray-300'
                }`}>
                  {selectedVendorForView.status}
                </span>
                <button onClick={() => setSelectedVendorForView(null)} className="hover:bg-green-700 p-1.5 rounded-full transition cursor-pointer text-white">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Content Scrollable */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
              
              {/* Profile Details Grid */}
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-4">
                <h4 className="text-[10px] font-extrabold text-green-700 uppercase tracking-wider flex items-center space-x-1.5">
                  <User size={14} />
                  <span>Vendor Contact & Business Info</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase block mb-0.5">Contact Person</span>
                    <span className="font-bold text-gray-800 text-sm block">{selectedVendorForView.contact_person}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase block mb-0.5">Phone Number</span>
                    <span className="font-mono font-bold text-gray-800 block">{selectedVendorForView.phone}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase block mb-0.5">Email Address</span>
                    <span className="font-medium text-gray-800 block">{selectedVendorForView.email || 'N/A'}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase block mb-0.5">City</span>
                    <span className="font-bold text-gray-800 block">{selectedVendorForView.city}</span>
                  </div>
                </div>
              </div>

              {/* Supplied Products & Quantities Section */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-extrabold text-green-700 uppercase tracking-wider flex items-center space-x-1.5">
                  <Package size={14} />
                  <span>Supplied Products & Quantities Catalogue</span>
                </h4>

                {(!selectedVendorForView.supplied_items || selectedVendorForView.supplied_items.length === 0) ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center text-gray-400 text-xs font-medium">
                    No product quantities assigned to this vendor yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedVendorForView.supplied_items.map((item, i) => (
                      <div key={i} className="bg-white border border-gray-200 p-3 rounded-xl flex items-center justify-between shadow-2xs">
                        <div>
                          <span className="font-bold text-gray-900 text-xs block">{item.product}</span>
                          <span className="text-[10px] text-gray-500 font-semibold">{item.category}</span>
                        </div>
                        <span className="px-2.5 py-1 bg-green-100 text-green-800 font-black rounded-lg border border-green-200 text-xs">
                          {item.qty} Qty
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Compact Purchase Summary Section */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-extrabold text-green-700 uppercase tracking-wider flex items-center space-x-1.5">
                  <ShoppingBag size={14} />
                  <span>Compact Purchase Summary</span>
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-green-50/60 border border-green-200 p-3 rounded-xl">
                    <span className="text-[10px] font-extrabold text-gray-500 uppercase block">Total Purchases</span>
                    <span className="text-sm font-black font-mono text-green-800 block mt-0.5">
                      Rs. {(selectedVendorForView.total_purchases || 0).toLocaleString()}
                    </span>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 p-3 rounded-xl">
                    <span className="text-[10px] font-extrabold text-gray-500 uppercase block">Last Purchase Date</span>
                    <span className="text-xs font-bold text-gray-800 block mt-1">
                      {selectedVendorForView.last_purchase_date || 'N/A'}
                    </span>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 p-3 rounded-xl">
                    <span className="text-[10px] font-extrabold text-gray-500 uppercase block">Last Invoice No.</span>
                    <span className="text-xs font-mono font-bold text-green-700 block mt-1">
                      {selectedVendorForView.last_invoice_no || 'N/A'}
                    </span>
                  </div>

                  <div className="bg-amber-50/70 border border-amber-200 p-3 rounded-xl">
                    <span className="text-[10px] font-extrabold text-amber-800 uppercase block">Outstanding Balance</span>
                    <span className="text-sm font-black font-mono text-amber-700 block mt-0.5">
                      Rs. {(selectedVendorForView.outstanding_balance || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Purchase History Table */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-extrabold text-green-700 uppercase tracking-wider flex items-center space-x-1.5">
                  <FileText size={14} />
                  <span>Purchase History</span>
                </h4>

                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-gray-50 text-[10px] font-extrabold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                      <tr>
                        <th className="py-2.5 px-3">Invoice Number</th>
                        <th className="py-2.5 px-3">Purchase Date</th>
                        <th className="py-2.5 px-3 text-center">Total Items</th>
                        <th className="py-2.5 px-3 text-right">Total Amount</th>
                        <th className="py-2.5 px-3 text-center">Payment Status</th>
                        <th className="py-2.5 px-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium">
                      {(!selectedVendorForView.purchase_history || selectedVendorForView.purchase_history.length === 0) ? (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-gray-400">
                            No purchase history records found for this vendor.
                          </td>
                        </tr>
                      ) : (
                        selectedVendorForView.purchase_history.map((ph, idx) => (
                          <tr key={idx} className="hover:bg-gray-50 transition">
                            <td className="py-2.5 px-3 font-mono font-bold text-green-700">
                              {ph.invoice_no}
                            </td>
                            <td className="py-2.5 px-3 text-gray-600">
                              {ph.date}
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold">
                              {ph.items_count} items
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-black text-gray-900">
                              Rs. {ph.total_amount.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${
                                ph.payment_status === 'Paid'
                                  ? 'bg-green-100 text-green-800 border-green-200'
                                  : ph.payment_status === 'Partial'
                                  ? 'bg-amber-100 text-amber-800 border-amber-200'
                                  : 'bg-red-100 text-red-800 border-red-200'
                              }`}>
                                {ph.payment_status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => setPurchaseInvoicePreview(ph)}
                                className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-[10px] font-bold transition cursor-pointer"
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const v = selectedVendorForView;
                  setSelectedVendorForView(null);
                  handleOpenEditModal(v);
                }}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-100 transition cursor-pointer flex items-center space-x-1.5"
              >
                <Pencil size={14} />
                <span>Edit Vendor Details</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedVendorForView(null)}
                className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Close Profile
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── ADD / EDIT VENDOR MODAL ─────────────────────────────────────────── */}
      {vendorFormModal.open && (
        <VendorFormModal
          mode={vendorFormModal.mode}
          vendor={vendorFormModal.vendor}
          companies={companies}
          onClose={() => setVendorFormModal({ open: false, mode: 'add', vendor: null })}
          onSave={handleSaveVendor}
        />
      )}

      {/* ── DELETE CONFIRMATION MODAL ───────────────────────────────────────── */}
      {deleteModalVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-gray-200 max-w-sm w-full p-6 text-center space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto border border-red-200">
              <Trash2 size={22} />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-extrabold text-gray-900">Delete Vendor Record?</h3>
              <p className="text-xs text-gray-500">
                Are you sure you want to delete <strong className="text-gray-800">{deleteModalVendor.company_name}</strong>? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalVendor(null)}
                className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteVendor(deleteModalVendor._id || deleteModalVendor.id)}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-sm"
              >
                Delete Vendor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PURCHASE INVOICE PREVIEW MODAL ──────────────────────────────────── */}
      {purchaseInvoicePreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-gray-200 max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center space-x-2">
                <FileText size={18} className="text-green-600" />
                <h3 className="font-extrabold text-sm text-gray-900">Invoice: {purchaseInvoicePreview.invoice_no}</h3>
              </div>
              <button onClick={() => setPurchaseInvoicePreview(null)} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">Purchase Date:</span>
                <span className="font-bold text-gray-800">{purchaseInvoicePreview.date}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">Total Items Count:</span>
                <span className="font-bold text-gray-800">{purchaseInvoicePreview.items_count} items</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">Payment Status:</span>
                <span className="font-extrabold text-green-700">{purchaseInvoicePreview.payment_status}</span>
              </div>
              <div className="flex justify-between py-2 bg-green-50 px-3 rounded-xl border border-green-200">
                <span className="font-bold text-gray-800">Total Invoice Amount:</span>
                <span className="font-black text-green-700 font-mono">Rs. {purchaseInvoicePreview.total_amount.toLocaleString()}</span>
              </div>
            </div>

            <button
              onClick={() => setPurchaseInvoicePreview(null)}
              className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Close Invoice Preview
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

// ── ADD / EDIT VENDOR FORM MODAL ──────────────────────────────────────────────
function VendorFormModal({ mode, vendor, companies = [], onClose, onSave }) {
  const [isCustomCompany, setIsCustomCompany] = useState(() => {
    if (!vendor || !vendor.company_name) return false;
    if (companies && companies.length > 0) {
      return !companies.some(c => c.name === vendor.company_name);
    }
    return true;
  });

  const [formData, setFormData] = useState(() => {
    if (mode === 'edit' && vendor) {
      return {
        id: vendor.id,
        company_name: vendor.company_name || '',
        contact_person: vendor.contact_person || '',
        phone: vendor.phone || '',
        email: vendor.email || '',
        city: vendor.city || '',
        status: vendor.status || 'Active',
        supplied_items: vendor.supplied_items ? [...vendor.supplied_items] : []
      };
    }
    return { ...EMPTY_VENDOR_FORM, supplied_items: [] };
  });

  const [errors, setErrors] = useState({});

  // Item Addition Form State
  const [itemCat, setItemCat] = useState('');
  const [itemProd, setItemProd] = useState('');
  const [itemQty, setItemQty] = useState('');

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleClear = () => {
    setFormData({ ...EMPTY_VENDOR_FORM, supplied_items: [] });
    setErrors({});
    setItemCat('');
    setItemProd('');
    setItemQty('');
  };

  // Products filtered by selected category
  const filteredProductsForCat = useMemo(() => {
    if (!itemCat) return PRODUCTS;
    const catObj = CATEGORIES.find(c => c.name === itemCat);
    if (!catObj) return PRODUCTS;
    return PRODUCTS.filter(p => p.category_id === catObj.id);
  }, [itemCat]);

  // Handle Add Item to Vendor Supply List
  const handleAddItem = () => {
    if (!itemCat) {
      alert('Please select a Product Category.');
      return;
    }
    if (!itemProd) {
      alert('Please select a Product.');
      return;
    }
    const q = parseInt(itemQty);
    if (!q || q <= 0) {
      alert('Please enter a valid Quantity (> 0).');
      return;
    }

    const newItem = {
      id: `ITEM_${Date.now()}`,
      category: itemCat,
      product: itemProd,
      qty: q
    };

    setFormData(prev => ({
      ...prev,
      supplied_items: [...(prev.supplied_items || []), newItem]
    }));

    // Reset item inputs
    setItemQty('');
  };

  // Handle Remove Item
  const handleRemoveItem = (index) => {
    setFormData(prev => ({
      ...prev,
      supplied_items: prev.supplied_items.filter((_, i) => i !== index)
    }));
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.company_name.trim()) errs.company_name = 'Company Name is required';
    if (!formData.contact_person.trim()) errs.contact_person = 'Contact Person is required';
    if (!formData.phone.trim()) errs.phone = 'Phone Number is required';
    if (!formData.city.trim()) errs.city = 'City is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-green-600 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Building2 size={20} />
            <h3 className="font-extrabold text-sm">
              {mode === 'add' ? 'Add New Vendor' : 'Edit Vendor Details'}
            </h3>
          </div>
          <button onClick={onClose} className="hover:bg-green-700 p-1 rounded-full transition cursor-pointer text-white">
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="p-6 space-y-4 overflow-y-auto text-xs flex-1">
            
            {/* Company Name & Contact Person */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  {companies && companies.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomCompany(!isCustomCompany);
                        updateField('company_name', '');
                      }}
                      className="text-[9px] font-bold text-green-600 hover:text-green-700 cursor-pointer"
                    >
                      {isCustomCompany ? 'Select from List' : 'Type Manually'}
                    </button>
                  )}
                </div>

                {!isCustomCompany && companies && companies.length > 0 ? (
                  <select
                    value={formData.company_name}
                    onChange={(e) => {
                      const selectedVal = e.target.value;
                      updateField('company_name', selectedVal);
                      const matched = companies.find(c => c.name === selectedVal);
                      if (matched) {
                        updateField('contact_person', matched.contact_person || '');
                        updateField('phone', matched.phone || '');
                        updateField('email', matched.email || '');
                        updateField('city', matched.city || '');
                      }
                    }}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold focus:border-green-600 focus:outline-none cursor-pointer"
                  >
                    <option value="">Select Company</option>
                    {companies.map(c => (
                      <option key={c._id || c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="e.g. Syngenta Crop Protection"
                    value={formData.company_name}
                    onChange={(e) => updateField('company_name', e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs font-semibold focus:border-green-600 focus:outline-none"
                  />
                )}
                {errors.company_name && <span className="text-[10px] text-red-500 font-bold">{errors.company_name}</span>}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                  Contact Person <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Haris Munir"
                  value={formData.contact_person}
                  onChange={(e) => updateField('contact_person', e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs font-semibold focus:border-green-600 focus:outline-none"
                />
                {errors.contact_person && <span className="text-[10px] text-red-500 font-bold">{errors.contact_person}</span>}
              </div>
            </div>

            {/* Phone & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 0300-8451234"
                  value={formData.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs font-semibold focus:border-green-600 focus:outline-none"
                />
                {errors.phone && <span className="text-[10px] text-red-500 font-bold">{errors.phone}</span>}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="e.g. vendor@company.com"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs font-semibold focus:border-green-600 focus:outline-none"
                />
              </div>
            </div>

            {/* City & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Multan, Lahore"
                  value={formData.city}
                  onChange={(e) => updateField('city', e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs font-semibold focus:border-green-600 focus:outline-none"
                />
                {errors.city && <span className="text-[10px] text-red-500 font-bold">{errors.city}</span>}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                  Vendor Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => updateField('status', e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-bold focus:border-green-600 focus:outline-none cursor-pointer"
                >
                  <option value="Active">Active Vendor</option>
                  <option value="Inactive">Inactive Vendor</option>
                </select>
              </div>
            </div>

            {/* ── Supplied Products, Categories & Quantities Section ── */}
            <div className="border-t border-gray-200 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-green-700 uppercase tracking-wide flex items-center gap-1.5">
                  <Package size={14} /> Supplied Products & Quantities
                </span>
                <span className="text-[10px] text-gray-400 font-bold">
                  {formData.supplied_items?.length || 0} items added
                </span>
              </div>

              {/* Add Item Controls */}
              <div className="bg-gray-50 border border-gray-200 p-3 rounded-xl space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Category</label>
                    <select
                      value={itemCat}
                      onChange={e => {
                        setItemCat(e.target.value);
                        const firstProd = PRODUCTS.find(p => CATEGORIES.find(c => c.id === p.category_id)?.name === e.target.value);
                        setItemProd(firstProd ? firstProd.name : '');
                      }}
                      className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-800 focus:border-green-600 focus:outline-none"
                    >
                      <option value="">Select Category</option>
                      {CATEGORIES.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Product</label>
                    <select
                      value={itemProd}
                      onChange={e => setItemProd(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-800 focus:border-green-600 focus:outline-none"
                    >
                      <option value="">Select Product</option>
                      {filteredProductsForCat.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 50"
                      value={itemQty}
                      onChange={e => setItemQty(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-bold text-gray-800 focus:border-green-600 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddItem}
                  className="w-full py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                >
                  <Plus size={13} /> Add Product to Vendor List
                </button>
              </div>

              {/* Items List */}
              {formData.supplied_items && formData.supplied_items.length > 0 && (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {formData.supplied_items.map((item, idx) => (
                    <div key={item.id || idx} className="flex items-center justify-between bg-white border border-gray-200 p-2 rounded-xl text-xs">
                      <div>
                        <span className="font-bold text-gray-900 block">{item.product}</span>
                        <span className="text-[10px] text-gray-500 font-semibold">{item.category}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-green-50 text-green-700 font-black rounded-lg border border-green-200 text-xs">
                          {item.qty} Qty
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-gray-400 hover:text-red-600 transition p-1 cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Form Action Buttons (Save, Clear, Cancel) */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <button
              type="button"
              onClick={handleClear}
              className="px-4 py-2 border border-gray-300 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-100 transition cursor-pointer flex items-center space-x-1"
            >
              <RotateCcw size={13} />
              <span>Clear</span>
            </button>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-sm flex items-center space-x-1.5"
              >
                <Save size={14} />
                <span>Save Vendor</span>
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
}
