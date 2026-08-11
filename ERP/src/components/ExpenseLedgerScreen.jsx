import React, { useState, useMemo } from 'react';
import { BookOpen, Printer, Search, Eye, Edit3, X, CheckCircle2 } from 'lucide-react';
import DateFilterBar from './DateFilterBar';
import { isItemInDateRange } from '../utils/dateUtils';
import { normalizeAccountName, getSupportedAccounts } from '../utils/accountUtils';
import PrintHeader from './PrintHeader';
import { useLanguage } from '../context/LanguageContext';

export default function ExpenseLedgerScreen({ expenses = [], setExpenses, triggerNotificationToast, dateFilter, setDateFilter }) {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [viewExpense, setViewExpense] = useState(null);
  const [editExpense, setEditExpense] = useState(null);

  const ledgerData = useMemo(() => {
    return [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [expenses]);

  const dateFilteredLedger = useMemo(() => {
    return ledgerData.filter(row => isItemInDateRange(row.date, dateFilter.startDate, dateFilter.endDate));
  }, [ledgerData, dateFilter]);

  const filteredLedger = useMemo(() => {
    return dateFilteredLedger.filter(row => 
      row.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
      row.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [dateFilteredLedger, searchQuery]);

  const totalExpense = filteredLedger.reduce((sum, r) => sum + (r.status === 'Cancelled' ? 0 : r.amount), 0);

  const handlePrint = () => {
    window.print();
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editExpense.title.trim() || !editExpense.amount || parseFloat(editExpense.amount) <= 0) {
      if (triggerNotificationToast) triggerNotificationToast('Error', 'Invalid expense data', 'error');
      return;
    }

    setExpenses(prev => prev.map(exp => 
      exp.id === editExpense.id ? {
        ...exp,
        title: editExpense.title,
        category: editExpense.category,
        payment_method: editExpense.payment_method,
        amount: parseFloat(editExpense.amount),
        notes: editExpense.notes,
        status: editExpense.status
      } : exp
    ));
    
    if (triggerNotificationToast) triggerNotificationToast('Success', 'Expense updated successfully', 'success');
    setEditExpense(null);
  };

  return (
    <div className="space-y-6">
      {/* Header (No Print) */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm no-print">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-red-100 to-red-200 p-3 rounded-xl text-red-700 shadow-inner">
              <BookOpen size={24} />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-gray-800 uppercase tracking-wider">Expense Ledger</h2>
              <p className="text-xs text-gray-500 font-medium">Complete record of business expenditures and costs</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl text-sm font-bold transition">
              <Printer size={16} /> Print
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-6">
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Search Expenses</label>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search by ID, Category, or Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-300 focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none transition-all shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="no-print">
        <DateFilterBar dateFilter={dateFilter} setDateFilter={setDateFilter} />
      </div>

      {/* Ledger Body */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm printable-area">
        {/* ── PRINT VIEW EXACT LAYOUT ── */}
        <div className="hidden print:block p-8 font-sans text-[11px] text-black">
          <PrintHeader title="Expense Ledger" subtitle="Store(s): Main Store" />

          <div className="flex justify-between items-end mb-2 font-bold text-xs">
            <div className="w-1/3 text-left">All Expenses</div>
            <div className="w-1/3 text-center"></div>
            <div className="w-1/3 text-right"></div>
          </div>

          <table className="w-full text-left border-collapse mb-1">
            <thead>
              <tr className="border-y border-black font-bold">
                <th className="py-1.5 font-bold">Transaction date</th>
                <th className="py-1.5 font-bold">Store</th>
                <th className="py-1.5 font-bold">Expense #</th>
                <th className="py-1.5 font-bold">Category</th>
                <th className="py-1.5 font-bold">Paid From Account</th>
                <th className="py-1.5 font-bold text-right">Amount (Rs.)</th>
              </tr>
            </thead>
            <tbody>
              {filteredLedger.map((row, idx) => (
                <tr key={idx}>
                  <td className="py-1">{row.date}</td>
                  <td className="py-1">Main Store</td>
                  <td className="py-1">{row.id}</td>
                  <td className="py-1">{row.category}</td>
                  <td className="py-1">{row.payment_method}</td>
                  <td className="py-1 text-right">{row.amount > 0 ? row.amount.toLocaleString('en-US', {minimumFractionDigits: 2}) : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end pt-1 border-t border-black">
            <div className="w-1/2 flex justify-between pl-20 pr-1">
              <span>Total during period:</span>
              <span>{totalExpense.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
            </div>
          </div>
          <div className="flex justify-end mt-1 pt-1 border-b border-black font-bold mb-10 pb-1">
            <div className="w-1/2 flex justify-between pl-20 pr-1">
              <span>Closing balance:</span>
              <span>{totalExpense.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
            </div>
          </div>
        </div>

        <div className="p-6 overflow-y-auto no-print">
          {/* Table */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">
                  <th className="p-3 w-28">Date</th>
                  <th className="p-3 w-32">Expense #</th>
                  <th className="p-3 w-40">Category</th>
                  <th className="p-3">Expense Name</th>
                  <th className="p-3 w-32">Paid From Account</th>
                  <th className="p-3 w-28 text-center">Status</th>
                  <th className="p-3 text-right w-32">Amount (Rs.)</th>
                  <th className="p-3 text-center w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredLedger.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="p-8 text-center text-gray-400 font-bold">No expenses found.</td>
                  </tr>
                ) : (
                  filteredLedger.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50 align-middle">
                      <td className="p-3 font-bold text-gray-600">{row.date}</td>
                      <td className="p-3 font-mono font-bold text-red-600">{row.id}</td>
                      <td className="p-3 font-bold text-gray-700">
                        <span className="bg-gray-100 px-2 py-1 rounded text-gray-600">{row.category}</span>
                      </td>
                      <td className="p-3 font-bold text-gray-800">{row.title}</td>
                      <td className="p-3 text-gray-600">{row.payment_method}</td>
                      <td className="p-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                          row.status === 'Paid' ? 'bg-green-50 text-green-700 border-green-200' :
                          row.status === 'Cancelled' ? 'bg-red-50 text-red-700 border-red-200' :
                          'bg-orange-50 text-orange-700 border-orange-200'
                        }`}>
                          {row.status || 'Paid'}
                        </span>
                      </td>
                      <td className="p-3 text-right font-black text-red-600">
                        {row.amount > 0 ? row.amount.toLocaleString() : '-'}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button onClick={() => setViewExpense(row)} className="text-gray-400 hover:text-blue-600 transition" title="View Details">
                            <Eye size={16} />
                          </button>
                          <button onClick={() => setEditExpense({...row})} className="text-gray-400 hover:text-green-600 transition" title="Edit Expense">
                            <Edit3 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
                {filteredLedger.length > 0 && (
                  <tr className="bg-gray-100 border-t-2 border-gray-300">
                    <td colSpan="6" className="p-3 text-right font-black text-gray-800 uppercase tracking-wider text-[11px]">Total Expenses</td>
                    <td className="p-3 text-right font-black text-red-700 text-sm">Rs. {totalExpense.toLocaleString()}</td>
                    <td></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* VIEW MODAL */}
      {viewExpense && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-150 overflow-hidden flex flex-col max-h-screen">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center space-x-2">
                <BookOpen size={18} className="text-blue-600" />
                <h3 className="text-sm font-extrabold text-gray-800 uppercase tracking-wide">Expense Details</h3>
              </div>
              <button onClick={() => setViewExpense(null)} className="text-gray-400 hover:text-gray-600 font-bold transition">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4 text-sm overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider mb-1">Expense Number</span>
                  <span className="font-mono font-bold text-gray-800">{viewExpense.id}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider mb-1">Date</span>
                  <span className="font-bold text-gray-800">{viewExpense.date}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider mb-1">Category</span>
                  <span className="font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded">{viewExpense.category}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider mb-1">Status</span>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    viewExpense.status === 'Paid' ? 'bg-green-50 text-green-700 border-green-200' :
                    viewExpense.status === 'Cancelled' ? 'bg-red-50 text-red-700 border-red-200' :
                    'bg-orange-50 text-orange-700 border-orange-200'
                  }`}>
                    {viewExpense.status || 'Paid'}
                  </span>
                </div>
              </div>

              <div>
                <span className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider mb-1">Expense Name</span>
                <span className="font-bold text-gray-900">{viewExpense.title}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider mb-1">Paid From Account</span>
                  <span className="font-semibold text-gray-700">{viewExpense.payment_method}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider mb-1">Amount</span>
                  <span className="font-black text-red-600">Rs. {viewExpense.amount.toLocaleString()}</span>
                </div>
              </div>

              <div>
                <span className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider mb-1">Notes</span>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-gray-700 text-xs min-h-[60px]">
                  {viewExpense.notes || '—'}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end">
              <button onClick={() => setViewExpense(null)} className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl text-xs transition">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editExpense && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-150 overflow-hidden flex flex-col max-h-screen">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center space-x-2">
                <Edit3 size={18} className="text-green-600" />
                <h3 className="text-sm font-extrabold text-gray-800 uppercase tracking-wide">Edit Expense: {editExpense.id}</h3>
              </div>
              <button onClick={() => setEditExpense(null)} className="text-gray-400 hover:text-gray-600 font-bold transition">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 overflow-y-auto">
              <div className="space-y-1">
                <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">Expense Name</label>
                <input
                  type="text"
                  required
                  value={editExpense.title}
                  onChange={(e) => setEditExpense({...editExpense, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl font-semibold text-gray-800 focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">Category</label>
                  <select
                    value={editExpense.category}
                    onChange={(e) => setEditExpense({...editExpense, category: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl font-semibold text-gray-800 bg-white focus:border-green-500 focus:outline-none transition"
                  >
                    <option value="Rent & Leases">Rent & Leases</option>
                    <option value="Electricity & Utilities">Electricity & Utilities</option>
                    <option value="Freight & Transport">Freight & Transport</option>
                    <option value="Staff Salaries">Staff Salaries</option>
                    <option value="Shop Maintenance">Shop Maintenance</option>
                    <option value="Packaging & Bags">Packaging & Bags</option>
                    <option value="Tea & Refreshments">Tea & Refreshments</option>
                    <option value="Miscellaneous">Miscellaneous</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">Paid From Account</label>
                  <select
                    value={editExpense.payment_method}
                    onChange={(e) => setEditExpense({...editExpense, payment_method: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl font-semibold text-gray-800 bg-white focus:border-green-500 focus:outline-none transition"
                  >
                    {getSupportedAccounts().map(acc => (
                      <option key={acc.id} value={acc.name}>{acc.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">Amount (Rs.)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={editExpense.amount}
                    onChange={(e) => setEditExpense({...editExpense, amount: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl font-bold text-gray-900 focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none transition"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">Status</label>
                  <select
                    value={editExpense.status}
                    onChange={(e) => setEditExpense({...editExpense, status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl font-semibold text-gray-800 bg-white focus:border-green-500 focus:outline-none transition"
                  >
                    <option value="Paid">Paid</option>
                    <option value="Pending">Pending</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">Notes</label>
                <textarea
                  rows="3"
                  value={editExpense.notes}
                  onChange={(e) => setEditExpense({...editExpense, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl font-medium text-gray-800 focus:border-green-500 focus:outline-none transition resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t border-gray-100 pt-4 mt-4">
                <button
                  type="button"
                  onClick={() => setEditExpense(null)}
                  className="px-5 py-2 border border-gray-300 text-gray-600 rounded-xl font-bold text-xs hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-sm text-xs transition flex items-center gap-1.5"
                >
                  <CheckCircle2 size={16} /> Save Changes
                </button>
              </div>
            </form>
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

