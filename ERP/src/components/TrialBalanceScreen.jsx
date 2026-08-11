import React, { useState, useMemo } from 'react';
import { 
  Scale, 
  Printer, 
  Search, 
  Eye, 
  Wallet,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Calculator,
  CalendarDays,
  FileSpreadsheet
} from 'lucide-react';
import DateFilterBar from './DateFilterBar';
import PrintHeader from './PrintHeader';
import { isItemInDateRange } from '../utils/dateUtils';
import { useLanguage } from '../context/LanguageContext';

export default function TrialBalanceScreen({ invoices = [], expenses = [], dateFilter, setDateFilter }) {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [activeType, setActiveType] = useState(null);

  // Helper to check date filter
  const isDateInRange = (dateStr) => {
    return isItemInDateRange(dateStr, dateFilter.startDate, dateFilter.endDate);
  };

  // Generate double-entry journal records
  const journalEntries = useMemo(() => {
    const entries = [];
    
    const addEntry = (date, account, type, code, debit, credit, ref, module, desc) => {
      if (debit === 0 && credit === 0) return;
      if (!isDateInRange(date)) return;
      
      entries.push({
        date, account, type, code, 
        debit: debit || 0, 
        credit: credit || 0, 
        ref, module, desc
      });
    };

    // 1. Sales
    invoices.forEach(inv => {
      const isCancelled = inv.status === 'Cancelled';
      const date = isCancelled && inv.cancellation_details ? inv.cancellation_details.on : inv.date;
      const ref = isCancelled ? `${inv.invoice_no}-CANC` : inv.invoice_no;
      const desc = isCancelled ? `Cancelled Sale to ${inv.customer_name}` : `Sale to ${inv.customer_name}`;
      
      const subtotal = inv.subtotal || 0;
      const discount = inv.discount_amount || 0;
      const tax = inv.tax_amount || 0;
      const grandTotal = inv.grand_total || 0;
      
      let cashAcc = 'Cash';
      let cashCode = '1001';
      if (inv.payment_status === 'Credit') {
        cashAcc = 'Accounts Receivable';
        cashCode = '1200';
      } else if (inv.payment_method === 'Bank Transfer') {
        cashAcc = 'Bank';
        cashCode = '1002';
      }

      if (!isCancelled) {
        addEntry(date, cashAcc, 'Asset', cashCode, grandTotal, 0, ref, 'Sales', desc);
        addEntry(date, 'Sales Discount', 'Expense', '4100', discount, 0, ref, 'Sales', desc);
        addEntry(date, 'Sales Revenue', 'Income', '4000', 0, subtotal, ref, 'Sales', desc);
        addEntry(date, 'Tax Payable', 'Liability', '2100', 0, tax, ref, 'Sales', desc);
      } else {
        // Reversal
        addEntry(date, 'Sales Return', 'Expense', '4050', subtotal, 0, ref, 'Sales Return', desc);
        addEntry(date, 'Tax Payable', 'Liability', '2100', tax, 0, ref, 'Sales Return', desc);
        addEntry(date, cashAcc, 'Asset', cashCode, 0, grandTotal, ref, 'Sales Return', desc);
        addEntry(date, 'Sales Discount', 'Expense', '4100', 0, discount, ref, 'Sales Return', desc);
      }
    });

    // 2. Expenses
    expenses.filter(exp => exp.status === 'Paid').forEach(exp => {
      const date = exp.date;
      const ref = exp.id;
      const desc = exp.title || `Expense: ${exp.category}`;
      const amount = exp.amount || 0;
      
      let cashAcc = exp.paymentMethod === 'Bank Transfer' ? 'Bank' : 'Cash';
      let cashCode = exp.paymentMethod === 'Bank Transfer' ? '1002' : '1001';

      addEntry(date, exp.category, 'Expense', '5000', amount, 0, ref, 'Expense', desc);
      addEntry(date, cashAcc, 'Asset', cashCode, 0, amount, ref, 'Expense', desc);
    });

    return entries;
  }, [invoices, expenses, dateFilter]);

  // Aggregate Trial Balance
  const trialBalanceAccounts = useMemo(() => {
    const accMap = {};

    journalEntries.forEach(entry => {
      if (!accMap[entry.account]) {
        accMap[entry.account] = {
          name: entry.account,
          code: entry.code,
          type: entry.type,
          debit: 0,
          credit: 0,
          ledger: []
        };
      }
      accMap[entry.account].debit += entry.debit;
      accMap[entry.account].credit += entry.credit;
      accMap[entry.account].ledger.push(entry);
    });

    const tb = [];
    Object.values(accMap).forEach(acc => {
      // Calculate net balance
      let netDebit = 0;
      let netCredit = 0;
      if (acc.debit > acc.credit) {
        netDebit = acc.debit - acc.credit;
      } else {
        netCredit = acc.credit - acc.debit;
      }

      if (netDebit !== 0 || netCredit !== 0) {
        tb.push({
          ...acc,
          netDebit,
          netCredit
        });
      }
    });

    // Sort by Type then Name
    const typeOrder = { 'Asset': 1, 'Liability': 2, 'Equity': 3, 'Income': 4, 'Expense': 5 };
    tb.sort((a, b) => {
      if (typeOrder[a.type] !== typeOrder[b.type]) return typeOrder[a.type] - typeOrder[b.type];
      return a.name.localeCompare(b.name);
    });

    return tb;
  }, [journalEntries]);

  // Filter accounts based on search and active type
  const filteredAccounts = trialBalanceAccounts.filter(acc => 
    (acc.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    acc.code.includes(searchQuery)) &&
    (activeType ? acc.type === activeType : true)
  );

  // Compute Totals
  const totalDebit = filteredAccounts.reduce((sum, acc) => sum + acc.netDebit, 0);
  const totalCredit = filteredAccounts.reduce((sum, acc) => sum + acc.netCredit, 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  // Compute Summary Cards based on all accounts (not filtered ones) so cards stay static
  const totalAssets = trialBalanceAccounts.filter(a => a.type === 'Asset').reduce((sum, a) => sum + a.netDebit - a.netCredit, 0);
  const totalLiabilities = trialBalanceAccounts.filter(a => a.type === 'Liability').reduce((sum, a) => sum + a.netCredit - a.netDebit, 0);
  const totalIncome = trialBalanceAccounts.filter(a => a.type === 'Income').reduce((sum, a) => sum + a.netCredit - a.netDebit, 0);
  const totalExpenses = trialBalanceAccounts.filter(a => a.type === 'Expense').reduce((sum, a) => sum + a.netDebit - a.netCredit, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm no-print flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-br from-green-100 to-green-200 p-3 rounded-xl text-green-700 shadow-inner">
            <Scale size={24} />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-gray-800 uppercase tracking-wider">Trial Balance</h2>
            <p className="text-xs text-gray-500 font-medium">Standard double-entry summarized accounting report</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 rounded-xl text-sm font-bold transition">
            <Printer size={16} /> Print
          </button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="no-print">
        <DateFilterBar dateFilter={dateFilter} setDateFilter={setDateFilter} />
      </div>

      {/* Enhanced Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 no-print">
        {/* Assets Card */}
        <div 
          onClick={() => setActiveType(activeType === 'Asset' ? null : 'Asset')}
          className={`p-5 rounded-2xl border shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group cursor-pointer ${
            activeType === 'Asset' ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-500/20' : 'bg-white border-gray-100 hover:border-blue-200'
          }`}
        >
          <div className="absolute -right-4 -top-4 p-4 opacity-[0.03] group-hover:scale-110 group-hover:opacity-10 transition-all duration-500 text-blue-600">
            <Wallet size={80} />
          </div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner">
              <Wallet size={18} />
            </div>
            <span className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">Total Assets</span>
          </div>
          <span className="text-2xl font-black text-gray-900 block mt-1">
            Rs. {totalAssets.toLocaleString()}
          </span>
        </div>

        {/* Liabilities Card */}
        <div 
          onClick={() => setActiveType(activeType === 'Liability' ? null : 'Liability')}
          className={`p-5 rounded-2xl border shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group cursor-pointer ${
            activeType === 'Liability' ? 'bg-orange-50 border-orange-300 ring-2 ring-orange-500/20' : 'bg-white border-gray-100 hover:border-orange-200'
          }`}
        >
          <div className="absolute -right-4 -top-4 p-4 opacity-[0.03] group-hover:scale-110 group-hover:opacity-10 transition-all duration-500 text-orange-600">
            <CreditCard size={80} />
          </div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shadow-inner">
              <CreditCard size={18} />
            </div>
            <span className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">Total Liab.</span>
          </div>
          <span className="text-2xl font-black text-gray-900 block mt-1">
            Rs. {totalLiabilities.toLocaleString()}
          </span>
        </div>

        {/* Revenue Card */}
        <div 
          onClick={() => setActiveType(activeType === 'Income' ? null : 'Income')}
          className={`p-5 rounded-2xl border shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group cursor-pointer ${
            activeType === 'Income' ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20' : 'bg-white border-gray-100 hover:border-emerald-200'
          }`}
        >
          <div className="absolute -right-4 -top-4 p-4 opacity-[0.03] group-hover:scale-110 group-hover:opacity-10 transition-all duration-500 text-emerald-600">
            <TrendingUp size={80} />
          </div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner">
              <TrendingUp size={18} />
            </div>
            <span className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">Total Revenue</span>
          </div>
          <span className="text-2xl font-black text-gray-900 block mt-1">
            Rs. {totalIncome.toLocaleString()}
          </span>
        </div>

        {/* Expenses Card */}
        <div 
          onClick={() => setActiveType(activeType === 'Expense' ? null : 'Expense')}
          className={`p-5 rounded-2xl border shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group cursor-pointer ${
            activeType === 'Expense' ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-500/20' : 'bg-white border-gray-100 hover:border-rose-200'
          }`}
        >
          <div className="absolute -right-4 -top-4 p-4 opacity-[0.03] group-hover:scale-110 group-hover:opacity-10 transition-all duration-500 text-rose-600">
            <TrendingDown size={80} />
          </div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-inner">
              <TrendingDown size={18} />
            </div>
            <span className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">Total Expenses</span>
          </div>
          <span className="text-2xl font-black text-gray-900 block mt-1">
            Rs. {totalExpenses.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex gap-4 no-print">
        <div className="w-full md:w-64">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search accounts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-300 focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none transition-all text-sm font-medium"
            />
          </div>
        </div>
      </div>

      {/* Main TB Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm printable-area">
        
        {/* ── PRINT VIEW EXACT LAYOUT ── */}
        <div className="hidden print:block p-8 font-sans text-[11px] text-black">
          <PrintHeader title="Trial Balance" dateRange={dateFilter.preset === 'Custom' ? `${dateFilter.startDate} to ${dateFilter.endDate}` : dateFilter.preset} />

          <table className="w-full text-left border-collapse mb-1 mt-4">
            <thead>
              <tr className="border-y border-black font-bold">
                <th className="py-1.5 font-bold">Code</th>
                <th className="py-1.5 font-bold">Account Name</th>
                <th className="py-1.5 font-bold">Type</th>
                <th className="py-1.5 font-bold text-right">Debit (Rs.)</th>
                <th className="py-1.5 font-bold text-right">Credit (Rs.)</th>
              </tr>
            </thead>
            <tbody>
              {filteredAccounts.map((acc, idx) => (
                <tr key={idx} className="border-b border-gray-100">
                  <td className="py-1">{acc.code}</td>
                  <td className="py-1">{acc.name}</td>
                  <td className="py-1">{acc.type}</td>
                  <td className="py-1 text-right">{acc.netDebit > 0 ? acc.netDebit.toLocaleString(undefined, {minimumFractionDigits: 2}) : '-'}</td>
                  <td className="py-1 text-right">{acc.netCredit > 0 ? acc.netCredit.toLocaleString(undefined, {minimumFractionDigits: 2}) : '-'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-black font-bold">
                <td colSpan="3" className="py-2 text-right">Grand Total:</td>
                <td className="py-2 text-right border-b-4 border-double border-black">{totalDebit.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                <td className="py-2 text-right border-b-4 border-double border-black">{totalCredit.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="overflow-x-auto no-print">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">
                <th className="p-4 w-24">Code</th>
                <th className="p-4">Account Name</th>
                <th className="p-4 w-32">Type</th>
                <th className="p-4 text-right w-40">Debit (Rs.)</th>
                <th className="p-4 text-right w-40">Credit (Rs.)</th>
                <th className="p-4 text-center w-20 no-print">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-gray-400 font-bold">No accounts match the criteria.</td>
                </tr>
              ) : (
                filteredAccounts.map((acc, idx) => (
                  <tr key={idx} className="hover:bg-green-50/50 transition-colors group">
                    <td className="p-4 font-mono font-bold text-gray-500">{acc.code}</td>
                    <td className="p-4 font-bold text-gray-900 group-hover:text-green-700 transition-colors">{acc.name}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        acc.type === 'Asset' ? 'bg-blue-50 text-blue-700' :
                        acc.type === 'Liability' ? 'bg-orange-50 text-orange-700' :
                        acc.type === 'Equity' ? 'bg-purple-50 text-purple-700' :
                        acc.type === 'Income' ? 'bg-green-50 text-green-700' :
                        'bg-red-50 text-red-700'
                      }`}>
                        {acc.type}
                      </span>
                    </td>
                    <td className="p-4 text-right font-black text-gray-700">
                      {acc.netDebit > 0 ? acc.netDebit.toLocaleString(undefined, {minimumFractionDigits: 2}) : '-'}
                    </td>
                    <td className="p-4 text-right font-black text-gray-700">
                      {acc.netCredit > 0 ? acc.netCredit.toLocaleString(undefined, {minimumFractionDigits: 2}) : '-'}
                    </td>
                    <td className="p-4 text-center no-print">
                      <button 
                        onClick={() => setSelectedAccount(acc)}
                        className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-100 rounded-lg transition-all cursor-pointer"
                        title="View Ledger"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 border-gray-200">
              <tr>
                <td colSpan="3" className="p-4 text-right font-extrabold text-gray-700 uppercase tracking-wider text-xs">
                  Grand Total
                </td>
                <td className="p-4 text-right font-black text-lg text-gray-900 border-b-4 border-double border-gray-400">
                  {totalDebit.toLocaleString(undefined, {minimumFractionDigits: 2})}
                </td>
                <td className="p-4 text-right font-black text-lg text-gray-900 border-b-4 border-double border-gray-400">
                  {totalCredit.toLocaleString(undefined, {minimumFractionDigits: 2})}
                </td>
                <td className="no-print"></td>
              </tr>
            </tfoot>
          </table>
        </div>
        
        {/* Balance Status Footer */}
        <div className="p-5 flex justify-between items-center bg-white border-t border-gray-100">
          <div className="flex items-center space-x-3">
            {isBalanced ? (
              <>
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                  <Scale size={20} />
                </div>
                <div>
                  <p className="font-black text-green-700 text-lg">Trial Balance Balanced</p>
                  <p className="text-xs font-bold text-green-600/70">Debits perfectly match credits.</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                  <Scale size={20} />
                </div>
                <div>
                  <p className="font-black text-red-700 text-lg">Out of Balance</p>
                  <p className="text-xs font-bold text-red-600/70">Difference: Rs. {Math.abs(totalDebit - totalCredit).toLocaleString()}</p>
                </div>
              </>
            )}
          </div>
          <div className="text-right text-xs font-bold text-gray-400 uppercase tracking-wider hidden md:block">
            {filteredAccounts.length} Accounts Displayed
          </div>
        </div>
      </div>

      {/* Ledger Details Modal */}
      {selectedAccount && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-200">
                  <FileSpreadsheet size={24} className="text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900">{selectedAccount.name} Ledger</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-bold text-gray-500 bg-gray-200 px-2 py-0.5 rounded">{selectedAccount.code}</span>
                    <span className="text-xs font-bold text-gray-500 uppercase">{selectedAccount.type}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedAccount(null)} 
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-0">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-white sticky top-0 shadow-sm">
                  <tr className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                    <th className="p-3">Date</th>
                    <th className="p-3">Ref No</th>
                    <th className="p-3">Module</th>
                    <th className="p-3">Description</th>
                    <th className="p-3 text-right">Debit</th>
                    <th className="p-3 text-right">Credit</th>
                    <th className="p-3 text-right text-green-700 bg-green-50/30">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(() => {
                    let runningBal = 0;
                    return selectedAccount.ledger
                      .sort((a, b) => new Date(a.date) - new Date(b.date))
                      .map((entry, idx) => {
                        if (selectedAccount.type === 'Asset' || selectedAccount.type === 'Expense') {
                          runningBal += (entry.debit - entry.credit);
                        } else {
                          runningBal += (entry.credit - entry.debit);
                        }
                        
                        return (
                          <tr key={idx} className="hover:bg-gray-50 transition-colors">
                            <td className="p-3 font-medium text-gray-600">{entry.date}</td>
                            <td className="p-3 font-mono font-bold text-gray-700">{entry.ref}</td>
                            <td className="p-3 font-bold text-gray-500">{entry.module}</td>
                            <td className="p-3 font-medium text-gray-800">{entry.desc}</td>
                            <td className="p-3 text-right font-semibold text-gray-600">
                              {entry.debit > 0 ? entry.debit.toLocaleString() : '-'}
                            </td>
                            <td className="p-3 text-right font-semibold text-gray-600">
                              {entry.credit > 0 ? entry.credit.toLocaleString() : '-'}
                            </td>
                            <td className="p-3 text-right font-black text-gray-900 bg-green-50/20">
                              {runningBal.toLocaleString()}
                            </td>
                          </tr>
                        );
                      });
                  })()}
                </tbody>
              </table>
            </div>
            
            <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end items-center gap-6">
              <div className="text-right">
                <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider block">Closing Balance</span>
                <span className={`text-xl font-black ${
                  (selectedAccount.type === 'Asset' || selectedAccount.type === 'Expense') 
                    ? 'text-blue-700' 
                    : 'text-green-700'
                }`}>
                  Rs. {Math.abs(selectedAccount.netDebit - selectedAccount.netCredit).toLocaleString(undefined, {minimumFractionDigits: 2})} 
                  <span className="text-xs text-gray-500 ml-1">
                    {selectedAccount.netDebit > selectedAccount.netCredit ? ' Dr' : ' Cr'}
                  </span>
                </span>
              </div>
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
