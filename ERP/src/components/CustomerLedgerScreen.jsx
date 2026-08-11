import React, { useState, useMemo, useEffect, useRef } from 'react';
import { BookOpen, Printer, Search, Download } from 'lucide-react';
import { CUSTOMERS } from '../utils/mockData';
import DateFilterBar from './DateFilterBar';
import { isItemInDateRange } from '../utils/dateUtils';
import PrintHeader from './PrintHeader';

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

import { useLanguage } from '../context/LanguageContext';

export default function CustomerLedgerScreen({ invoices = [], triggerNotificationToast, dateFilter, setDateFilter, selectedCity, setSelectedCity, cities = [] }) {
  const { t } = useLanguage();
  const [selectedCust, setSelectedCust] = useState('');
  const [activeCard, setActiveCard] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Dropdown states for searchable customer select
  const [custSearch, setCustSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);

  // Reset selected customer if their city doesn't match the new city selection
  useEffect(() => {
    if (selectedCust && selectedCity !== 'All') {
      const cust = CUSTOMERS.find(c => c.name === selectedCust);
      if (cust && getCustomerCity(cust) !== selectedCity) {
        setSelectedCust('');
        setCustSearch('');
      }
    }
  }, [selectedCity, selectedCust]);

  // Helper matching query condition
  const matchesQuery = (c, q) => {
    if (!q) return true;
    const normalizedQ = q.toLowerCase().trim();
    const nameMatch = c.name.toLowerCase().includes(normalizedQ);
    const codeMatch = (c.code || '').toLowerCase().includes(normalizedQ);
    const phoneMatch = (c.phone || '').includes(normalizedQ);
    const lastDigitsMatch = c.phone && c.phone.slice(-4).includes(normalizedQ);
    return nameMatch || codeMatch || phoneMatch || lastDigitsMatch;
  };

  // Matching customer search list
  const matchingCustomers = useMemo(() => {
    return CUSTOMERS.filter(c => {
      const cityMatches = selectedCity === 'All' || getCustomerCity(c) === selectedCity;
      if (!cityMatches) return false;
      return matchesQuery(c, custSearch);
    });
  }, [custSearch, selectedCity]);

  const activeCustomerObj = useMemo(() => {
    return CUSTOMERS.find(c => c.name === selectedCust) || {
      name: selectedCust,
      phone: 'N/A',
      outstanding_balance: 0,
      credit_limit: 0
    };
  }, [selectedCust]);

  // Auto-generate Ledger Data from Invoices (Sales, Returns, Payments)
  const ledgerData = useMemo(() => {
    if (!selectedCust) return [];

    const customerInvoices = invoices
      .filter(i => i.customer_name === selectedCust)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    let runningBalance = 0;
    const rows = [];

    customerInvoices.forEach(inv => {
      // 1. Record the Sale
      const saleAmount = inv.grand_total || 0;
      runningBalance += saleAmount;
      
      rows.push({
        id: `${inv.invoice_no}-SALE`,
        date: inv.date,
        invoice_no: inv.invoice_no,
        type: 'Sale',
        debit: saleAmount,
        credit: 0,
        balance: runningBalance,
        notes: `Products: ${(inv.cart || inv.items || []).map(p => p.name || p.product_name).join(', ')}`
      });

      // 2. Record the Payment (if any)
      const amountPaid = inv.amount_paid !== undefined ? Number(inv.amount_paid) : (inv.payment_method === 'Cash' ? saleAmount : 0);
      if (amountPaid > 0) {
        runningBalance -= amountPaid;
        rows.push({
          id: `${inv.invoice_no}-PAY`,
          date: inv.date,
          invoice_no: inv.invoice_no,
          type: 'Payment Received',
          debit: 0,
          credit: amountPaid,
          balance: runningBalance,
          notes: `Payment Mode: ${inv.payment_method || 'Cash'}`
        });
      }

      // 3. Handle Cancellations
      if (inv.status === 'Cancelled') {
        // Reverse the original sale (Credit the customer's account)
        runningBalance -= saleAmount;
        rows.push({
          id: `${inv.invoice_no}-CANC`,
          date: inv.cancellation_details?.on || inv.date,
          invoice_no: inv.invoice_no,
          type: 'Sale Cancellation',
          debit: 0,
          credit: saleAmount,
          balance: runningBalance,
          notes: `Reason: ${inv.cancellation_details?.reason || 'Cancelled'}`
        });

        // If refunded, it's money leaving the business to the customer (Debit the customer's account)
        if (inv.refund_status === 'Refunded') {
          // Assume the full amountPaid was refunded
          runningBalance += amountPaid;
          rows.push({
            id: `${inv.invoice_no}-REF`,
            date: inv.cancellation_details?.on || inv.date,
            invoice_no: inv.invoice_no,
            type: 'Refund Issued',
            debit: amountPaid,
            credit: 0,
            balance: runningBalance,
            notes: `Refund Mode: ${inv.refund_method || 'Cash'}`
          });
        }
      }
    });

    return rows;
  }, [selectedCust, invoices]);

  const dateFilteredLedger = useMemo(() => {
    return ledgerData.filter(row => isItemInDateRange(row.date, dateFilter.startDate, dateFilter.endDate));
  }, [ledgerData, dateFilter]);

  const filteredLedger = useMemo(() => {
    return dateFilteredLedger.filter(row => 
      row.invoice_no?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      row.type.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [dateFilteredLedger, searchQuery]);

  const totalDebit = filteredLedger.reduce((sum, r) => sum + r.debit, 0);
  const totalCredit = filteredLedger.reduce((sum, r) => sum + r.credit, 0);

  const totalPurchasesCount = useMemo(() => {
    return filteredLedger.filter(r => r.type === 'Sale').length;
  }, [filteredLedger]);

  const lastTransactionDate = useMemo(() => {
    if (filteredLedger.length === 0) return '—';
    return filteredLedger[0].date;
  }, [filteredLedger]);

  const handlePrint = () => {
    if (!selectedCust) {
      if (triggerNotificationToast) triggerNotificationToast('Select Customer', 'Please select a customer before printing.', 'error');
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
            <div className="bg-gradient-to-br from-blue-100 to-blue-200 p-3 rounded-xl text-blue-700 shadow-inner">
              <BookOpen size={24} />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-gray-800 uppercase tracking-wider">Customer Ledger</h2>
              <p className="text-xs text-gray-500 font-medium">Financial history and automated balances from Sales & Returns</p>
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
          <div className="relative" ref={dropdownRef}>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Search Customer (Name, ID, Phone)</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Type name, ID, phone or last 4 digits..."
                value={custSearch}
                onFocus={() => setIsDropdownOpen(true)}
                onChange={(e) => {
                  setCustSearch(e.target.value);
                  setIsDropdownOpen(true);
                  if (selectedCust) setSelectedCust('');
                }}
                className="w-full rounded-xl border border-gray-300 bg-gray-50 pl-4 pr-10 py-2.5 font-bold text-gray-750 focus:outline-none focus:border-blue-500 transition shadow-sm placeholder-gray-400 text-xs"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Search size={14} />
              </span>
            </div>
            
            {isDropdownOpen && (
              <div className="absolute left-0 mt-1 w-full bg-white border border-gray-200 shadow-lg rounded-xl py-1 max-h-48 overflow-y-auto z-50 animate-in fade-in slide-in-from-top-1 duration-100 scrollbar-thin">
                {matchingCustomers.length === 0 ? (
                  <div className="px-4 py-3 text-xs text-gray-400 font-semibold text-center">No customers found</div>
                ) : (
                  matchingCustomers.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedCust(c.name);
                        setCustSearch(c.name);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-xs font-semibold hover:bg-gray-50 transition border-b border-gray-50 last:border-b-0 flex justify-between items-center cursor-pointer ${selectedCust === c.name ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-700'}`}
                    >
                      <div>
                        <span className="block font-bold">{c.name}</span>
                        <span className="block text-[9px] text-gray-400 font-mono">{c.code} • {c.phone}</span>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 uppercase">{c.customer_type}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Search Reference</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search Invoice # or Type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all shadow-sm text-xs font-bold text-gray-700 placeholder-gray-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Date Filter Bar */}
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
      {selectedCust ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm printable-area">
          {/* ── PRINT VIEW EXACT LAYOUT ── */}
          <div className="hidden print:block p-8 font-sans text-[11px] text-black w-full">
            <PrintHeader title="Customer Ledger Statement" subtitle="Store(s): Main Store" />

            <div className="flex justify-between items-end mb-4 border-b border-black pb-2 font-mono">
              <div>
                <div className="text-sm font-bold">{activeCustomerObj.name}</div>
                <div>ID: {activeCustomerObj.code} • Phone: {activeCustomerObj.phone}</div>
                <div>Location: {getCustomerCity(activeCustomerObj) || 'N/A'}</div>
              </div>
              <div className="text-right">
                <div>Credit limit: Rs. {Number(activeCustomerObj.credit_limit || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
                <div>Last Transaction: {lastTransactionDate}</div>
              </div>
            </div>

            <table className="w-full text-left border-collapse mb-1 font-mono">
              <thead>
                <tr className="border-y border-black font-bold">
                  <th className="py-1.5 font-bold">Transaction date</th>
                  <th className="py-1.5 font-bold">Store</th>
                  <th className="py-1.5 font-bold">Type</th>
                  <th className="py-1.5 font-bold">Document no.</th>
                  <th className="py-1.5 font-bold text-right">Debit</th>
                  <th className="py-1.5 font-bold text-right">Credit</th>
                  <th className="py-1.5 font-bold text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {filteredLedger.map((row, idx) => (
                  <tr key={idx} className="border-b border-gray-100 last:border-b-0">
                    <td className="py-1">{row.date}</td>
                    <td className="py-1">Main Store</td>
                    <td className="py-1">{row.type}</td>
                    <td className="py-1 font-mono">{row.invoice_no}</td>
                    <td className="py-1 text-right">{row.debit > 0 ? row.debit.toLocaleString('en-US', {minimumFractionDigits: 2}) : '-'}</td>
                    <td className="py-1 text-right">{row.credit > 0 ? row.credit.toLocaleString('en-US', {minimumFractionDigits: 2}) : '-'}</td>
                    <td className="py-1 text-right font-bold">{row.balance.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end pt-1 border-t border-black font-mono mt-4">
              <div className="w-1/2 flex flex-col gap-0.5 pl-20 pr-1">
                <div className="flex justify-between">
                  <span>Total Debit (Sales):</span>
                  <span>Rs. {totalDebit.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Credit (Paid):</span>
                  <span>Rs. {totalCredit.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Purchases:</span>
                  <span>{totalPurchasesCount} Orders</span>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end mt-1 pt-1 border-y border-black font-bold mb-10 pb-1 font-mono">
              <div className="w-1/2 flex justify-between pl-20 pr-1 text-xs">
                <span>Closing balance:</span>
                <span>Rs. {(totalDebit - totalCredit).toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
              </div>
            </div>
          </div>

          <div className="p-6 overflow-y-auto no-print">
            {/* Customer Profile & summary cards */}
            <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/30 rounded-2xl border border-blue-100 p-5 mb-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 shadow-sm animate-in fade-in duration-200">
              <div className="space-y-1">
                <span className="block text-[9px] text-blue-600 font-extrabold uppercase tracking-wider">Customer Details</span>
                <h3 className="text-sm font-black text-gray-900 leading-tight">{activeCustomerObj.name}</h3>
                <span className="block text-[10px] text-gray-500 font-bold">ID: {activeCustomerObj.code || 'N/A'}</span>
                <span className="block text-[10px] text-gray-500 font-semibold">Phone: {activeCustomerObj.phone || 'N/A'}</span>
              </div>
              
              <div className="bg-white rounded-xl border border-gray-150 p-3 shadow-xs">
                <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">Total Sales (Debit)</span>
                <h4 className="text-base font-extrabold text-red-600 mt-0.5">Rs. {totalDebit.toLocaleString()}</h4>
                <span className="text-[9px] text-gray-400 font-semibold">{totalPurchasesCount} orders recorded</span>
              </div>

              <div className="bg-white rounded-xl border border-gray-150 p-3 shadow-xs">
                <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">Paid Amount (Credit)</span>
                <h4 className="text-base font-extrabold text-green-600 mt-0.5">Rs. {totalCredit.toLocaleString()}</h4>
                <span className="text-[9px] text-gray-400 font-semibold">Payments synchronized</span>
              </div>

              <div className="bg-white rounded-xl border border-blue-200 p-3 shadow-xs bg-blue-50/20">
                <span className="block text-[9px] text-blue-600 font-bold uppercase tracking-wider">Remaining Balance</span>
                <h4 className="text-base font-black text-indigo-900 mt-0.5">Rs. {(totalDebit - totalCredit).toLocaleString()}</h4>
                <span className="text-[9px] text-indigo-500 font-semibold">Last trans: {lastTransactionDate}</span>
              </div>
            </div>

            {/* Table */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">
                    <th className="p-3 w-28">Date</th>
                    <th className="p-3 w-32">Invoice #</th>
                    <th className="p-3 w-32">Type</th>
                    <th className="p-3 text-right w-28">Debit (Rs.)</th>
                    <th className="p-3 text-right w-28">Credit (Rs.)</th>
                    <th className="p-3 text-right w-32">Balance (Rs.)</th>
                    <th className="p-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredLedger.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-gray-400 font-bold">No transactions found for this customer.</td>
                    </tr>
                  ) : (
                    filteredLedger.map((row, idx) => (
                      <tr key={row.id} className="hover:bg-gray-50 align-middle">
                        <td className="p-3 font-bold text-gray-600">{row.date}</td>
                        <td className="p-3 font-mono font-bold text-blue-600">{row.invoice_no}</td>
                        <td className="p-3 font-bold text-gray-700">{row.type}</td>
                        <td className="p-3 text-right font-black text-red-600">
                          {row.debit > 0 ? row.debit.toLocaleString() : '-'}
                        </td>
                        <td className="p-3 text-right font-black text-green-600">
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
                      <td className="p-3 text-right font-black text-red-700">{totalDebit.toLocaleString()}</td>
                      <td className="p-3 text-right font-black text-green-700">{totalCredit.toLocaleString()}</td>
                      <td className="p-3 text-right font-black text-gray-900">{(totalDebit - totalCredit).toLocaleString()}</td>
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
          <h3 className="text-lg font-bold text-gray-600 mb-2">No Customer Selected</h3>
          <p className="text-sm">Please select a customer from the dropdown above to view their financial ledger.</p>
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
