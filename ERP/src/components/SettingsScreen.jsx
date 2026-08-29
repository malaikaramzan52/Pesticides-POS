import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  Store, 
  Printer, 
  Percent, 
  Save,
  CheckCircle2, 
  RefreshCcw, 
  FileText, 
  Volume2, 
  ShieldCheck, 
  Building,
  Phone,
  Mail,
  MapPin,
  Award
} from 'lucide-react';

import { useLanguage } from '../context/LanguageContext';
import { getStoredData, setStoredData } from '../utils/mockData';

export default function SettingsScreen({ triggerNotificationToast }) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('shop'); // 'shop', 'receipt', 'tax'

  // Shop Information State
  const [shopInfo, setShopInfo] = useState(() => getStoredData('AGRO_ERP_SHOP_INFO', {
    name: 'Pak Agro Pesticides & Seeds Wholesale Depot',
    owner: 'Tariq Mahmood & Sons',
    licenseNo: 'FERT-PK-2024-9981 / PEST-8812',
    gstin: 'NTN-9876543-1',
    phone: '+92 300 1234567',
    email: 'info@pakagroerp.pk',
    address: 'Shop No. 45, Grain Market Road, Multan, Punjab, Pakistan',
    website: 'www.pakagroerp.pk'
  }));

  // Receipt Settings State
  const [receiptSettings, setReceiptSettings] = useState({
    printerType: 'USB Thermal Receipt Printer (80mm)',
    printCopyCount: 1,
    headerText: 'PAK AGRO PESTICIDES & SEEDS WHOLESALE DEPOT',
    footerText: 'Thank you for buying genuine pesticides. Chemicals once sold are subject to store return policies.',
    autoPrintOnSave: true,
    enableSound: true,
    showBatchInReceipt: true
  });

  // Tax & Discount State
  const [taxSettings, setTaxSettings] = useState({
    defaultTaxRate: 18,
    taxType: 'Exclusive', // Exclusive or Inclusive
    maxDiscountPercent: 15,
    enableRoundOff: true,
    hsnCodeDefault: '3808'
  });

  const handleSaveShopInfo = (e) => {
    e.preventDefault();
    setStoredData('AGRO_ERP_SHOP_INFO', shopInfo);
    if (triggerNotificationToast) {
      triggerNotificationToast('Shop Details Saved', 'Updated store information & license details.', 'success');
    }
  };

  const handleSaveReceiptSettings = (e) => {
    e.preventDefault();
    if (triggerNotificationToast) {
      triggerNotificationToast('Receipt Config Saved', 'Hardware printer & thermal invoice layout updated.', 'success');
    }
  };

  const handleSaveTaxSettings = (e) => {
    e.preventDefault();
    if (triggerNotificationToast) {
      triggerNotificationToast('Tax Rules Saved', 'Default GST taxation & discount limits applied.', 'success');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6 max-w-4xl animate-in fade-in duration-200">
      
      {/* Title */}
      <div className="flex items-center space-x-3 border-b border-gray-100 pb-4">
        <div className="bg-green-100 p-2.5 rounded-xl text-green-700">
          <SettingsIcon size={24} />
        </div>
        <div>
          <h2 className="text-base font-extrabold text-gray-900 tracking-tight">System & Store Settings</h2>
          <p className="text-xs text-gray-500 font-medium">Configure shop information, thermal receipt printing & taxation rules</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-gray-200 bg-gray-100 p-1 rounded-xl text-xs font-bold text-gray-500">
        <button
          onClick={() => setActiveTab('shop')}
          className={`flex items-center space-x-1.5 py-2 px-3.5 rounded-lg transition cursor-pointer ${
            activeTab === 'shop' ? 'bg-white text-green-700 font-bold shadow-xs' : 'hover:text-gray-700'
          }`}
        >
          <Store size={14} />
          <span>Shop Information</span>
        </button>

        <button
          onClick={() => setActiveTab('receipt')}
          className={`flex items-center space-x-1.5 py-2 px-3.5 rounded-lg transition cursor-pointer ${
            activeTab === 'receipt' ? 'bg-white text-blue-700 font-bold shadow-xs' : 'hover:text-gray-700'
          }`}
        >
          <Printer size={14} />
          <span>Receipt Settings</span>
        </button>

        <button
          onClick={() => setActiveTab('tax')}
          className={`flex items-center space-x-1.5 py-2 px-3.5 rounded-lg transition cursor-pointer ${
            activeTab === 'tax' ? 'bg-white text-amber-700 font-bold shadow-xs' : 'hover:text-gray-700'
          }`}
        >
          <Percent size={14} />
          <span>Tax & Discount</span>
        </button>
      </div>

      {/* 1. SHOP INFORMATION TAB */}
      {activeTab === 'shop' && (
        <form onSubmit={handleSaveShopInfo} className="space-y-5 text-xs animate-in fade-in duration-150">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-4">
            <span className="font-extrabold text-gray-800 uppercase tracking-wide text-[10px] block flex items-center space-x-1">
              <Building size={14} className="text-green-600" />
              <span>Depot & Merchant Credentials</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-extrabold text-gray-500 uppercase">Shop / Depot Business Name *</label>
                <input
                  type="text"
                  value={shopInfo.name}
                  onChange={e => setShopInfo({ ...shopInfo, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl font-bold text-gray-900 focus:border-green-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-extrabold text-gray-500 uppercase">Owner / Proprietor Name</label>
                <input
                  type="text"
                  value={shopInfo.owner}
                  onChange={e => setShopInfo({ ...shopInfo, owner: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl font-semibold text-gray-800 focus:border-green-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-extrabold text-gray-500 uppercase">Pesticide / Fertilizer License No *</label>
                <input
                  type="text"
                  value={shopInfo.licenseNo}
                  onChange={e => setShopInfo({ ...shopInfo, licenseNo: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl font-mono font-bold text-green-700 focus:border-green-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-extrabold text-gray-500 uppercase">GSTIN / Tax ID</label>
                <input
                  type="text"
                  value={shopInfo.gstin}
                  onChange={e => setShopInfo({ ...shopInfo, gstin: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl font-mono font-bold text-gray-800 focus:border-green-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-extrabold text-gray-500 uppercase">Contact Phone Number</label>
                <input
                  type="text"
                  value={shopInfo.phone}
                  onChange={e => setShopInfo({ ...shopInfo, phone: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl font-semibold text-gray-800 focus:border-green-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-extrabold text-gray-500 uppercase">Business Email</label>
                <input
                  type="email"
                  value={shopInfo.email}
                  onChange={e => setShopInfo({ ...shopInfo, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl font-semibold text-gray-800 focus:border-green-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-extrabold text-gray-500 uppercase">Shop Address (Printed on Invoices)</label>
              <textarea
                rows={2}
                value={shopInfo.address}
                onChange={e => setShopInfo({ ...shopInfo, address: e.target.value })}
                className="w-full px-3 py-2 border rounded-xl font-medium text-gray-800 focus:border-green-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-sm cursor-pointer"
          >
            <Save size={15} />
            <span>Save Shop Details</span>
          </button>
        </form>
      )}

      {/* 2. RECEIPT SETTINGS TAB */}
      {activeTab === 'receipt' && (
        <form onSubmit={handleSaveReceiptSettings} className="space-y-5 text-xs animate-in fade-in duration-150">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-4">
            <span className="font-extrabold text-gray-800 uppercase tracking-wide text-[10px] block flex items-center space-x-1">
              <Printer size={14} className="text-blue-600" />
              <span>Hardware Printer & Invoice Printing</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-extrabold text-gray-500 uppercase">Preferred Printer Model</label>
                <select
                  value={receiptSettings.printerType}
                  onChange={e => setReceiptSettings({ ...receiptSettings, printerType: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl font-semibold text-gray-800 bg-white focus:outline-none"
                >
                  <option>USB Thermal Receipt Printer (80mm)</option>
                  <option>A4 Laser Network Printer</option>
                  <option>Wireless Bluetooth ESC/POS Printer</option>
                  <option>Dot Matrix Continuous Invoice Printer</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-extrabold text-gray-500 uppercase">Default Receipt Copies</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={receiptSettings.printCopyCount}
                  onChange={e => setReceiptSettings({ ...receiptSettings, printCopyCount: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border rounded-xl font-bold text-gray-800 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-extrabold text-gray-500 uppercase">Receipt Header Title</label>
              <input
                type="text"
                value={receiptSettings.headerText}
                onChange={e => setReceiptSettings({ ...receiptSettings, headerText: e.target.value })}
                className="w-full px-3 py-2 border rounded-xl font-bold text-gray-800 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-extrabold text-gray-500 uppercase">Receipt Footer Disclaimer / Return Policy</label>
              <textarea
                rows={2}
                value={receiptSettings.footerText}
                onChange={e => setReceiptSettings({ ...receiptSettings, footerText: e.target.value })}
                className="w-full px-3 py-2 border rounded-xl font-medium text-gray-800 focus:outline-none"
              />
            </div>

          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-sm cursor-pointer"
          >
            <Save size={15} />
            <span>Save Receipt Preferences</span>
          </button>
        </form>
      )}

      {/* 3. TAX & DISCOUNT TAB */}
      {activeTab === 'tax' && (
        <form onSubmit={handleSaveTaxSettings} className="space-y-5 text-xs animate-in fade-in duration-150">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-4">
            <span className="font-extrabold text-gray-800 uppercase tracking-wide text-[10px] block flex items-center space-x-1">
              <Percent size={14} className="text-amber-600" />
              <span>Taxation & Cashier Discount Thresholds</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-extrabold text-gray-500 uppercase">Default GST Tax Rate (%)</label>
                <select
                  value={taxSettings.defaultTaxRate}
                  onChange={e => setTaxSettings({ ...taxSettings, defaultTaxRate: parseInt(e.target.value) || 18 })}
                  className="w-full px-3 py-2 border rounded-xl font-bold text-gray-800 bg-white focus:outline-none"
                >
                  <option value={0}>0% (Tax Exempted Seeds/Fertilizer)</option>
                  <option value={5}>5% (Fertilizer GST)</option>
                  <option value={12}>12% (Agro Equipment)</option>
                  <option value={18}>18% (Standard Chemical Pesticides GST)</option>
                  <option value={28}>28% (Specialized Solvents)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-extrabold text-gray-500 uppercase">Tax Calculation Mode</label>
                <select
                  value={taxSettings.taxType}
                  onChange={e => setTaxSettings({ ...taxSettings, taxType: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl font-semibold text-gray-800 bg-white focus:outline-none"
                >
                  <option value="Exclusive">Tax Exclusive (GST added on top of item price)</option>
                  <option value="Inclusive">Tax Inclusive (GST included inside item price)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-extrabold text-gray-500 uppercase">Maximum Cashier Discount (%)</label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={taxSettings.maxDiscountPercent}
                  onChange={e => setTaxSettings({ ...taxSettings, maxDiscountPercent: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-xl font-bold text-gray-800 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-extrabold text-gray-500 uppercase">Default HSN / SAC Code</label>
                <input
                  type="text"
                  value={taxSettings.hsnCodeDefault}
                  onChange={e => setTaxSettings({ ...taxSettings, hsnCodeDefault: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl font-mono font-bold text-gray-800 focus:outline-none"
                />
              </div>
            </div>

          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-sm cursor-pointer"
          >
            <Save size={15} />
            <span>Save Tax & Discount Rules</span>
          </button>
        </form>
      )}

    </div>
  );
}
