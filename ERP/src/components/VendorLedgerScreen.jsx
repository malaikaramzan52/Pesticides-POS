import React, { useState, useMemo, useEffect } from 'react';
import { BookOpen, Printer, Search, Download } from 'lucide-react';
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
  const [selectedVendor, setSelectedVendor] = useState(COMPANIES[0]?.name || 'Syngenta Pakistan');
  const [searchQuery, setSearchQuery] = useState('');
  const [livePOs, setLivePOs] = useState([]);

  useEffect(() => {
    const fetchVendorLedgerPOs = async () => {
      try {
        const poRes = await purchaseApi.getAll();
        if (poRes && Array.isArray(poRes) && poRes.length > 0) setLivePOs(poRes);
      } catch (e) {}
    };
    fetchVendorLedgerPOs();
  }, []);

  // Fetch actual POs
  const purchaseOrders = useMemo(() => {
    return livePOs.length > 0 ? livePOs : getStoredData('AGRO_ERP_PURCHASE_ORDERS', []);
  }, [livePOs]);

  // Clear selected vendor if city filter mismatches
  useEffect(() => {
    if (selectedVendor && selectedCity !== 'All') {
      const vendorCity = getSupplierCity(selectedVendor);
      if (vendorCity && vendorCity !== selectedCity) {
        setSelectedVendor('');
      }
    }
  }, [selectedCity, selectedVendor]);

  const ledgerData = useMemo(() => {
    if (!selectedVendor) return [];

    const vendorPOs = purchaseOrders
      .filter(p => p.supplier && p.supplier.toLowerCase().includes(selectedVendor.toLowerCase()) && p.status !== 'Cancelled')
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    let runningBalance = 0;
    const rows = [];

    vendorPOs.forEach(po => {
      // 1. Record the Purchase (Credit to Vendor)
      const purchaseAmount = po.total || 0;
      runningBalance += purchaseAmount;
      
      rows.push({
        id: `${po.id}-PUR`,
        date: po.date,
        ref_no: po.id,
        type: 'Purchase',
        debit: 0,
        credit: purchaseAmount,
        balance: runningBalance,
        notes: `PO Received`
      });

      // 2. Record the Payment Made (Debit to Vendor)
      const amountPaid = po.stock_inward_done ? po.total : 0; // if received assume fully paid in cashbook context or let's use po.total if complete
      if (amountPaid > 0) {
        runningBalance -= amountPaid;
        rows.push({
          id: `${po.id}-PAY`,
          date: po.date,
          ref_no: po.id,
          type: 'Payment Made',
          debit: amountPaid,
          credit: 0,
          balance: runningBalance,
          notes: `Payment for PO`
        });
      }
    });

    return rows;
  }, [selectedVendor]);

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
            <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl text-sm font-bold transition">
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
              className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-2.5 font-bold text-gray-700 focus:outline-none focus:border-purple-500 transition shadow-sm"
            >
              <option value="">-- Choose Vendor --</option>
              {COMPANIES.filter(s => selectedCity === 'All' || getSupplierCity(s.name) === selectedCity).map(s => (
                 <option key={s.id} value={s.name}>{s.name}</option>
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
