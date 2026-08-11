import React, { useState, useMemo, useEffect } from 'react';
import { BookOpen, Printer, Search, Download, DollarSign, Plus, X, CheckCircle2 } from 'lucide-react';
import { COMPANIES, getStoredData } from '../utils/mockData';
import { purchaseApi, vendorApi } from '../api';
import DateFilterBar from './DateFilterBar';
import { isItemInDateRange } from '../utils/dateUtils';
import PrintHeader from './PrintHeader';

// Helper to resolve supplier city
const getSupplierCity = (supplierName) => {
  const name = (supplierName || '').toLowerCase();
  if (name.includes('syngenta')) return 'Multan';
  if (name.includes('bayer')) return 'Lahore';
  if (name.includes('upl')) return 'Khanewal';
  if (name.includes('iffco')) return 'Rahim Yar Khan';
  if (name.includes('coromandel')) return 'Sahiwal';
  if (name.includes('crystal')) return 'Gujranwala';
  return '';
};

import { useLanguage } from '../context/LanguageContext';

export default function VendorLedgerScreen({ triggerNotificationToast, dateFilter, setDateFilter, selectedCity, setSelectedCity, cities = [] }) {
  const { t } = useLanguage();
  const [selectedVendor, setSelectedVendor] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [livePOs, setLivePOs] = useState([]);
  const [vendorsList, setVendorsList] = useState([]);
  const [paymentsList, setPaymentsList] = useState([]);
  const [returnRecords, setReturnRecords] = useState([]);

  // Disbursement Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [paymentNotes, setPaymentNotes] = useState('');

  useEffect(() => {
    const fetchVendorData = async () => {
      try {
        const [poRes, vdrRes] = await Promise.all([
          purchaseApi.getAll().catch(() => []),
          vendorApi.getAll().catch(() => [])
        ]);
        if (poRes && Array.isArray(poRes)) setLivePOs(poRes);
        if (vdrRes && Array.isArray(vdrRes)) setVendorsList(vdrRes);

        const localRets = getStoredData('AGRO_ERP_RETURN_RECORDS', []);
        setReturnRecords(localRets);
      } catch (e) {}
    };
    fetchVendorData();
  }, []);

  // Fetch actual POs
  const purchaseOrders = useMemo(() => {
    return livePOs.length > 0 ? livePOs : getStoredData('AGRO_ERP_PURCHASE_ORDERS', []);
  }, [livePOs]);

  // Options ONLY from user-created vendors and actual POs (NO fake mock companies)
  const allVendorsOptions = useMemo(() => {
    const map = new Map();
    (vendorsList || []).forEach(v => {
      const vName = (v.company_name || v.name || '').trim();
      if (vName) map.set(vName.toLowerCase(), { id: v._id || v.id || v.code, name: vName, city: v.city || '' });
    });
    (purchaseOrders || []).forEach(po => {
      const sName = (po.supplier || po.company_name || '').trim();
      if (sName && !map.has(sName.toLowerCase())) {
        map.set(sName.toLowerCase(), { id: po.vendor_id || sName, name: sName, city: '' });
      }
    });
    return Array.from(map.values());
  }, [vendorsList, purchaseOrders]);

  // Auto-select first real vendor if none selected
  useEffect(() => {
    if ((!selectedVendor || !allVendorsOptions.some(v => v.name.toLowerCase() === selectedVendor.toLowerCase())) && allVendorsOptions.length > 0) {
      setSelectedVendor(allVendorsOptions[0].name);
    }
  }, [allVendorsOptions]);

  // Clear selected vendor if city filter mismatches
  useEffect(() => {
    if (selectedVendor && selectedCity !== 'All') {
      const vendorObj = allVendorsOptions.find(v => v.name.toLowerCase() === selectedVendor.toLowerCase());
      if (vendorObj && vendorObj.city && vendorObj.city !== selectedCity) {
        setSelectedVendor('');
      }
    }
  }, [selectedCity, selectedVendor, allVendorsOptions]);

  const handleRecordPayment = async () => {
    if (!paymentAmount || Number(paymentAmount) <= 0) {
      alert('Please enter a valid disbursement amount.');
      return;
    }
    const numAmt = Number(paymentAmount);
    const matchedVendor = vendorsList.find(v => (v.company_name || v.name)?.toLowerCase() === selectedVendor.toLowerCase());
    const refNo = `VP-${Date.now()}`;
    const newPaymentObj = {
      id: refNo,
      ref_no: refNo,
      vendor_name: selectedVendor,
      amount: numAmt,
      payment_method: paymentMethod,
      type: 'Direct Disbursement',
      notes: paymentNotes || `Disbursement to Supplier ${selectedVendor}`,
      date: new Date().toISOString().split('T')[0]
    };

    if (matchedVendor && (matchedVendor._id || matchedVendor.id)) {
      try {
        await vendorApi.recordPayment(matchedVendor._id || matchedVendor.id, {
          amount: numAmt,
          payment_method: paymentMethod,
          notes: paymentNotes || `Disbursement to Supplier ${selectedVendor}`
        });
        if (triggerNotificationToast) {
          triggerNotificationToast('Disbursement Recorded', `Paid Rs. ${numAmt.toLocaleString()} to ${selectedVendor}`, 'success');
        }
      } catch (err) {
        alert(`Payment error: ${err.message}`);
        return;
      }
    } else {
      if (triggerNotificationToast) {
        triggerNotificationToast('Disbursement Logged', `Recorded Rs. ${numAmt.toLocaleString()} for ${selectedVendor}`, 'success');
      }
    }

    setPaymentsList(prev => [...prev, newPaymentObj]);

    const [poRes, vdrRes] = await Promise.all([
      purchaseApi.getAll().catch(() => []),
      vendorApi.getAll().catch(() => [])
    ]);
    if (poRes && Array.isArray(poRes)) setLivePOs(poRes);
    if (vdrRes && Array.isArray(vdrRes)) setVendorsList(vdrRes);

    setShowPaymentModal(false);
    setPaymentAmount('');
    setPaymentNotes('');
  };

  const ledgerData = useMemo(() => {
    if (!selectedVendor) return [];

    const selNameLower = selectedVendor.toLowerCase().trim();

    const vendorPOs = purchaseOrders.filter(p => {
      if (p.status === 'Cancelled') return false;
      const supplierName = (p.supplier || p.supplier_name || '').toLowerCase().trim();
      return supplierName === selNameLower || supplierName.includes(selNameLower) || selNameLower.includes(supplierName);
    });

    const vendorPayments = (paymentsList || []).filter(vp => {
      const vName = (vp.vendor_name || vp.supplier || '').toLowerCase().trim();
      return vName === selNameLower || vName.includes(selNameLower) || selNameLower.includes(vName);
    });

    const vendorReturns = (returnRecords || []).filter(r => {
      if (r.type !== 'Purchase Return') return false;
      const vName = (r.supplier || r.vendor_name || '').toLowerCase().trim();
      return vName === selNameLower || vName.includes(selNameLower) || selNameLower.includes(vName);
    });

    const events = [];

    vendorPOs.forEach(po => {
      events.push({
        id: `PO_${po.po_no || po.id || po._id}`,
        date: po.date || po.createdAt?.split('T')[0] || '2026-08-01',
        rawDate: new Date(po.date || po.createdAt || 0),
        ref_no: po.po_no || po.po_number || po.id || 'PO',
        type: 'PO Stock Inward',
        debit: 0,
        credit: Number(po.total) || 0,
        notes: `Purchase Order Stock Inward (${po.itemsCount || (po.items ? po.items.length : 0)} items)`
      });
    });

    vendorPayments.forEach(vp => {
      events.push({
        id: `PAY_${vp.ref_no || vp._id}`,
        date: vp.date || vp.createdAt?.split('T')[0] || '2026-08-01',
        rawDate: new Date(vp.date || vp.createdAt || 0),
        ref_no: vp.ref_no || vp.id || 'PAY',
        type: vp.type || 'Direct Disbursement',
        debit: Number(vp.amount) || 0,
        credit: 0,
        notes: vp.notes || `Disbursement Payment (${vp.payment_method || 'Cash'})`
      });
    });

    vendorReturns.forEach(ret => {
      events.push({
        id: `RET_${ret.id || ret.ref_no || ret._id}`,
        date: ret.date || ret.createdAt?.split('T')[0] || '2026-08-01',
        rawDate: new Date(ret.date || ret.createdAt || 0),
        ref_no: ret.id || ret.po_no || 'RET',
        type: 'Purchase Return',
        debit: Number(ret.refund_total || ret.total || ret.amount) || 0,
        credit: 0,
        notes: ret.notes || `Purchase Return Refund`
      });
    });

    events.sort((a, b) => a.rawDate - b.rawDate);

    let runningBalance = 0;
    return events.map(e => {
      runningBalance = runningBalance + e.credit - e.debit;
      return {
        ...e,
        balance: runningBalance
      };
    });
  }, [selectedVendor, purchaseOrders, paymentsList, returnRecords]);

  const dateFilteredLedger = useMemo(() => {
    return ledgerData.filter(row => isItemInDateRange(row.date, dateFilter.startDate, dateFilter.endDate));
  }, [ledgerData, dateFilter]);

  const filteredLedger = useMemo(() => {
    return dateFilteredLedger.filter(row => 
      row.ref_no?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      row.type.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [dateFilteredLedger, searchQuery]);

  const totalDebit = filteredLedger.reduce((sum, r) => sum + r.debit, 0);
  const totalCredit = filteredLedger.reduce((sum, r) => sum + r.credit, 0);

  const handlePrint = () => {
    if (!selectedVendor) {
      if (triggerNotificationToast) triggerNotificationToast('Select Vendor', 'Please select a vendor before printing.', 'error');
      return;
    }
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header (No Print) */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm no-print">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-purple-100 to-purple-200 p-3 rounded-xl text-purple-700 shadow-inner">
              <BookOpen size={24} />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-gray-800 uppercase tracking-wider">Vendor Ledger</h2>
              <p className="text-xs text-gray-500 font-medium">Financial history and automated balances from Purchases & Payments</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowPaymentModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <DollarSign size={16} /> Record Disbursement
            </button>
            <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl text-sm font-bold transition cursor-pointer">
              <Printer size={16} /> Print
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Select Vendor</label>
            <select
              value={selectedVendor}
              onChange={(e) => setSelectedVendor(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-2.5 font-bold text-gray-700 focus:outline-none focus:border-purple-500 transition shadow-sm cursor-pointer"
            >
              <option value="">-- Choose Vendor --</option>
              {allVendorsOptions
                .filter(s => selectedCity === 'All' || !s.city || s.city === selectedCity || getSupplierCity(s.name) === selectedCity)
                .map(s => (
                  <option key={s.id || s.name} value={s.name}>{s.name}</option>
                ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Search Reference</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search PO # or Type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-300 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none transition-all shadow-sm"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="no-print">
        <DateFilterBar 
          dateFilter={dateFilter} 
          setDateFilter={setDateFilter} 
          selectedCity={selectedCity} 
          setSelectedCity={setSelectedCity} 
          cities={cities} 
        />
      </div>

      {/* Ledger Body */}
      {selectedVendor ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm printable-area">
          {/* ── PRINT VIEW EXACT LAYOUT ── */}
          <div className="hidden print:block p-8 font-sans text-[11px] text-black">
            <PrintHeader title="Vendor Ledger Statement" subtitle="Store(s): Main Store" />

            <div className="flex justify-between items-end mb-2 font-bold text-xs">
              <div className="w-1/3 text-left">{selectedVendor}</div>
              <div className="w-1/3 text-center"></div>
              <div className="w-1/3 text-right">Opening balance: &nbsp;&nbsp;&nbsp;&nbsp; {Number(0).toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
            </div>

            <table className="w-full text-left border-collapse mb-1">
              <thead>
                <tr className="border-y border-black font-bold">
                  <th className="py-1.5 font-bold">Transaction date</th>
                  <th className="py-1.5 font-bold">Store</th>
                  <th className="py-1.5 font-bold">Type</th>
                  <th className="py-1.5 font-bold">Document no.</th>
                  <th className="py-1.5 font-bold">Currency</th>
                  <th className="py-1.5 font-bold text-right">Debit (Paid)</th>
                  <th className="py-1.5 font-bold text-right">Credit (Purchased)</th>
                  <th className="py-1.5 font-bold text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {filteredLedger.map((row, idx) => (
                  <tr key={idx}>
                    <td className="py-1">{row.date}</td>
                    <td className="py-1">Main Store</td>
                    <td className="py-1">{row.type}</td>
                    <td className="py-1">{row.ref_no}</td>
                    <td className="py-1">PKR</td>
                    <td className="py-1 text-right">{row.debit > 0 ? row.debit.toLocaleString('en-US', {minimumFractionDigits: 2}) : ''}</td>
                    <td className="py-1 text-right">{row.credit > 0 ? row.credit.toLocaleString('en-US', {minimumFractionDigits: 2}) : ''}</td>
                    <td className="py-1 text-right">{row.balance.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end pt-1 border-t border-black">
              <div className="w-1/2 flex justify-between pl-20 pr-1">
                <span>Total during period:</span>
                <span>{(totalCredit - totalDebit).toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
              </div>
            </div>
            <div className="flex justify-end mt-1 pt-1 border-b border-black font-bold mb-10 pb-1">
              <div className="w-1/2 flex justify-between pl-20 pr-1">
                <span>Closing balance:</span>
                <span>{(totalCredit - totalDebit).toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
              </div>
            </div>
          </div>

          <div className="p-6 overflow-y-auto no-print">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-green-50 p-4 rounded-xl border border-green-100 text-center">
                <span className="block text-[10px] text-green-500 uppercase font-bold mb-1">Total Paid (Debit)</span>
                <span className="text-xl font-black text-green-700">Rs. {totalDebit.toLocaleString()}</span>
              </div>
              <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-center">
                <span className="block text-[10px] text-red-500 uppercase font-bold mb-1">Total Purchases (Credit)</span>
                <span className="text-xl font-black text-red-700">Rs. {totalCredit.toLocaleString()}</span>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-center">
                <span className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Payable Balance</span>
                <span className="text-xl font-black text-gray-900">Rs. {(totalCredit - totalDebit).toLocaleString()}</span>
              </div>
            </div>

            {/* Table */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">
                    <th className="p-3 w-28">Date</th>
                    <th className="p-3 w-32">Purchase #</th>
                    <th className="p-3 w-32">Type</th>
                    <th className="p-3 text-right w-28">Debit (Paid)</th>
                    <th className="p-3 text-right w-28">Credit (Purchased)</th>
                    <th className="p-3 text-right w-32">Balance (Rs.)</th>
                    <th className="p-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredLedger.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-gray-400 font-bold">No transactions found for this vendor.</td>
                    </tr>
                  ) : (
                    filteredLedger.map((row, idx) => (
                      <tr key={row.id} className="hover:bg-gray-50 align-middle">
                        <td className="p-3 font-bold text-gray-600">{row.date}</td>
                        <td className="p-3 font-mono font-bold text-purple-600">{row.ref_no}</td>
                        <td className="p-3 font-bold text-gray-700">{row.type}</td>
                        <td className="p-3 text-right font-black text-green-600">
                          {row.debit > 0 ? row.debit.toLocaleString() : '-'}
                        </td>
                        <td className="p-3 text-right font-black text-red-600">
                          {row.credit > 0 ? row.credit.toLocaleString() : '-'}
                        </td>
                        <td className="p-3 text-right font-black text-gray-900 bg-gray-50/50">
                          {row.balance.toLocaleString()}
                        </td>
                        <td className="p-3 text-gray-500 text-[10px] italic truncate max-w-[200px]" title={row.notes}>
                          {row.notes}
                        </td>
                      </tr>
                    ))
                  )}
                  {filteredLedger.length > 0 && (
                    <tr className="bg-gray-100 border-t-2 border-gray-300">
                      <td colSpan="3" className="p-3 text-right font-black text-gray-800 uppercase tracking-wider text-[11px]">Closing Total</td>
                      <td className="p-3 text-right font-black text-green-700">{totalDebit.toLocaleString()}</td>
                      <td className="p-3 text-right font-black text-red-700">{totalCredit.toLocaleString()}</td>
                      <td className="p-3 text-right font-black text-gray-900">{(totalCredit - totalDebit).toLocaleString()}</td>
                      <td></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-400 no-print">
          <BookOpen size={48} className="mx-auto mb-4 opacity-20" />
          <h3 className="text-lg font-bold text-gray-600 mb-2">No Vendor Selected</h3>
          <p className="text-sm">Please select a vendor from the dropdown above to view their financial ledger.</p>
        </div>
      )}

      {/* ── RECORD DISBURSEMENT MODAL ── */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 no-print">
          <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-md shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center space-x-2">
                <DollarSign size={18} className="text-green-600" />
                <h3 className="font-extrabold text-sm text-gray-900">Record Vendor Disbursement</h3>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Vendor / Supplier</label>
                <input
                  type="text"
                  readOnly
                  value={selectedVendor || 'Select Vendor'}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-bold text-gray-700"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Disbursement Amount (Rs.) *</label>
                <input
                  type="number"
                  placeholder="e.g. 50000"
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                  autoFocus
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs font-bold text-gray-900 focus:border-green-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold focus:border-green-600 focus:outline-none cursor-pointer"
                >
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cash">Cash Payment</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Online">Online Banking / Raast</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Notes / Transaction Reference</label>
                <input
                  type="text"
                  placeholder="e.g. Cheque #10492 or Bank Ref 9940"
                  value={paymentNotes}
                  onChange={e => setPaymentNotes(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs font-semibold focus:border-green-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRecordPayment}
                className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-sm flex items-center justify-center gap-1"
              >
                <CheckCircle2 size={14} /> Submit Payment
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-wrapper { position: absolute; left: 0; top: 0; width: 100%; height: 100%; background: transparent; z-index: 9999; }
          .printable-area, .printable-area * { visibility: visible !important; }
          .printable-area { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none; border: none; max-width: 100%; max-height: none; overflow: visible; }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
}
