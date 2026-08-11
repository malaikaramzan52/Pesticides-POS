import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  Wallet, 
  Building2, 
  ArrowRightLeft, 
  Smartphone, 
  CreditCard, 
  FileText, 
  Search, 
  Printer, 
  FileSpreadsheet, 
  TrendingUp, 
  TrendingDown, 
  ArrowDownRight, 
  ArrowUpRight, 
  Filter, 
  RefreshCw,
  Edit2,
  CheckCircle2,
  AlertCircle,
  PlusCircle
} from 'lucide-react';
import { 
  getAccountStatementData, 
  getAccountOpeningBalances, 
  saveAccountOpeningBalances, 
  normalizeAccountName,
  getSupportedAccounts,
  addConfiguredBank
} from '../utils/accountUtils';
import DateFilterBar from './DateFilterBar';
import { useLanguage } from '../context/LanguageContext';
import PrintHeader from './PrintHeader';
import { accountApi } from '../api';

export default function AccountDetailsScreen({
  initialAccount = 'Cash',
  invoices = [],
  expenses = [],
  purchaseOrders = [],
  customerPayments = [],
  vendorPayments = [],
  triggerNotificationToast
}) {
  const { t, isRTL } = useLanguage();
  const [selectedAccount, setSelectedAccount] = useState(normalizeAccountName(initialAccount));
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState({ preset: 'All Time', startDate: '', endDate: '' });
  const [supportedAccounts, setSupportedAccounts] = useState(getSupportedAccounts());
  const openingBalances = useMemo(() => getAccountOpeningBalances(), []);
  const [isAddingBank, setIsAddingBank] = useState(false);
  const [newBankName, setNewBankName] = useState('');

  // Opening Balance Edit Modal State
  const [showObModal, setShowObModal] = useState(false);
  const [obInput, setObInput] = useState('');

  // Single Transaction Print State
  const [printTx, setPrintTx] = useState(null);

  useEffect(() => {
    const handleAfterPrint = () => setPrintTx(null);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  const handleAddBank = () => {
    if (newBankName.trim()) {
      addConfiguredBank(newBankName.trim());
      setSupportedAccounts(getSupportedAccounts());
      setSelectedAccount(newBankName.trim());
      setNewBankName('');
      setIsAddingBank(false);
    }
  };

  // Sync selected account when initialAccount changes
  useEffect(() => {
    if (initialAccount) {
      setSelectedAccount(normalizeAccountName(initialAccount));
      setSupportedAccounts(getSupportedAccounts());
    }
  }, [initialAccount]);

  const [apiStatement, setApiStatement] = useState(null);

  useEffect(() => {
    const fetchStatement = async () => {
      try {
        const res = await accountApi.getStatement({ account: selectedAccount });
        if (res && res.transactions) setApiStatement(res);
      } catch (e) {}
    };
    fetchStatement();
  }, [selectedAccount, dateFilter]);

  // Compute Statement Data dynamically
  const statement = useMemo(() => {
    if (apiStatement && Array.isArray(apiStatement.transactions) && apiStatement.transactions.length > 0) {
      return apiStatement;
    }
    return getAccountStatementData({
      accountName: selectedAccount,
      dateFilter,
      searchQuery,
      invoices,
      expenses,
      purchaseOrders,
      customerPayments,
      vendorPayments,
      openingBalances
    });
  }, [apiStatement, selectedAccount, dateFilter, searchQuery, invoices, expenses, purchaseOrders, customerPayments, vendorPayments, openingBalances]);

  const currentAccObj = useMemo(() => {
    return supportedAccounts.find(a => a.name === selectedAccount) || supportedAccounts[0];
  }, [selectedAccount, supportedAccounts]);

  // Handle Save Opening Balance
  const handleSaveOB = (e) => {
    e.preventDefault();
    const val = parseFloat(obInput);
    if (isNaN(val) || val < 0) {
      if (triggerNotificationToast) triggerNotificationToast('Invalid Amount', 'Please enter a valid non-negative number for Opening Balance.', 'error');
      return;
    }

    const currentBalances = getAccountOpeningBalances();
    const updatedBalances = {
      ...currentBalances,
      [selectedAccount]: val
    };
    saveAccountOpeningBalances(updatedBalances);
    setShowObModal(false);
    if (triggerNotificationToast) {
      triggerNotificationToast('Opening Balance Updated', `Set opening balance for ${selectedAccount} to Rs. ${val.toLocaleString()}`, 'success');
    }
  };

  // Export CSV Handler
  const handleExportCSV = () => {
    const headers = ['Date', 'Transaction Type', 'Module', 'Reference No', 'Description / Particulars', 'Party Name', 'Money In (Rs)', 'Money Out (Rs)', 'Running Balance (Rs)'];
    const csvRows = [headers.join(',')];

    statement.rows.forEach(row => {
      const csvRow = [
        row.date,
        `"${row.type}"`,
        `"${row.module}"`,
        `"${row.refNo}"`,
        `"${(row.description || '').replace(/"/g, '""')}"`,
        `"${(row.party || '').replace(/"/g, '""')}"`,
        row.moneyIn || 0,
        row.moneyOut || 0,
        row.runningBalance || 0
      ];
      csvRows.push(csvRow.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Account_Statement_${selectedAccount}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <div className="flex-1 flex flex-col h-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col flex-1 overflow-hidden">
        
        {/* ── HEADER ── */}
        <div className="bg-white border-b border-gray-200 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between no-print gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-600 to-emerald-700 text-white flex items-center justify-center shadow-md">
                <Wallet size={20} />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-base font-extrabold text-gray-900 tracking-tight">{t('account_statement', 'Account Statement & History')}</h2>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${currentAccObj.badgeColor}`}>
                    {selectedAccount}
                  </span>
                </div>
                <p className="text-xs text-gray-500 font-medium">Real-time synchronized transactions across all modules</p>
              </div>
            </div>

            {/* Account Selector */}
            <div className="flex items-center">
              <div className="hidden sm:flex items-center space-x-1.5 bg-gray-100 p-1 rounded-xl border border-gray-200">
                <label className="text-[10px] font-extrabold text-gray-500 uppercase px-2">{t('paid_from_account', 'Account')}:</label>
                <select
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  className="bg-white text-xs font-extrabold text-gray-800 px-3 py-1.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500/20 cursor-pointer"
                >
                  {supportedAccounts.map(acc => (
                    <option key={acc.id} value={acc.name}>
                      {acc.label}
                    </option>
                  ))}
                </select>

              </div>
            </div>
          </div>

          {/* ── BODY CONTENT ── */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-gray-50">


            {/* SUMMARY CARDS (4 KPIs) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 no-print">
              
              {/* Opening Balance Card */}
              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs relative group hover:border-blue-300 transition">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">{t('opening_balance', 'Opening Balance')}</span>
                  <button
                    onClick={() => { setObInput(String(statement.openingBalance)); setShowObModal(true); }}
                    className="p-1 text-gray-400 hover:text-blue-600 transition cursor-pointer"
                    title="Edit Opening Balance"
                  >
                    <Edit2 size={12} />
                  </button>
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-lg font-black text-gray-800">
                    Rs. {statement.openingBalance.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                  </span>
                </div>
              </div>

              {/* Money In Card */}
              <div className="bg-emerald-50/50 border border-emerald-200/80 p-4 rounded-2xl shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider">{t('total_money_in', 'Total Money In')}</span>
                  <div className="p-1 rounded-md bg-emerald-100 text-emerald-700">
                    <ArrowDownRight size={14} />
                  </div>
                </div>
                <div className="mt-2">
                  <span className="text-lg font-black text-emerald-700">
                    + Rs. {statement.moneyIn.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                  </span>
                </div>
              </div>

              {/* Money Out Card */}
              <div className="bg-rose-50/50 border border-rose-200/80 p-4 rounded-2xl shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-rose-700 uppercase tracking-wider">{t('total_money_out', 'Total Money Out')}</span>
                  <div className="p-1 rounded-md bg-rose-100 text-rose-700">
                    <ArrowUpRight size={14} />
                  </div>
                </div>
                <div className="mt-2">
                  <span className="text-lg font-black text-rose-700">
                    - Rs. {statement.moneyOut.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                  </span>
                </div>
                <p className="text-[10px] text-rose-600 font-semibold mt-1">Expenses, POs, Vendor Pay</p>
              </div>

              {/* Current Net Balance Card */}
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white p-4 rounded-2xl shadow-md border border-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-gray-300 uppercase tracking-wider">{t('current_balance', 'Current Balance')}</span>
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <div className="mt-2">
                  <span className={`text-lg font-black ${statement.currentBalance < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    Rs. {statement.currentBalance.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 font-medium mt-1">Net synchronized balance</p>
              </div>

            </div>

            {/* ── TOOLBAR & FILTERS ── */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs space-y-3 no-print">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                
                {/* Search Bar */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder={t('search_placeholder', 'Search by Ref #, Description, Party Name...')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-xl text-xs font-semibold focus:border-green-500 focus:outline-none bg-gray-50 focus:bg-white transition"
                  />
                </div>

                {/* Actions: Export & Print */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportCSV}
                    className="flex items-center space-x-1.5 px-3 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    <FileSpreadsheet size={14} className="text-green-600" />
                    <span>CSV</span>
                  </button>
                  
                  <button
                    onClick={handlePrint}
                    className="flex items-center space-x-1.5 px-3 py-2 bg-gray-900 text-white hover:bg-gray-800 text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    <Printer size={14} />
                    <span>Print / PDF</span>
                  </button>
                </div>
              </div>

              {/* Date Filter Bar Component */}
              <div className="pt-2 border-t border-gray-100">
                <DateFilterBar dateFilter={dateFilter} setDateFilter={setDateFilter} />
              </div>
            </div>

            {/* ── PRINTABLE FULL STATEMENT VIEW (HIDDEN ON SCREEN) ── */}
            <div className="hidden print:block print-statement-view w-full bg-white text-black p-6 font-sans text-xs">
              <PrintHeader title="ACCOUNT STATEMENT" subtitle={`Account: ${selectedAccount}`} />
              
              <div className="flex justify-end items-start mb-6 border-b border-black pb-4">
                <div className="text-right text-xs">
                  <p>Opening Balance: Rs. {statement.openingBalance.toLocaleString()}</p>
                  <p className="font-bold text-sm mt-1">Current Balance: Rs. {statement.currentBalance.toLocaleString()}</p>
                </div>
              </div>

              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-black font-bold uppercase text-[10px]">
                    <th className="py-2">Date</th>
                    <th className="py-2">Type</th>
                    <th className="py-2">Ref No.</th>
                    <th className="py-2">Particulars / Party</th>
                    <th className="py-2 text-right">Money In</th>
                    <th className="py-2 text-right">Money Out</th>
                    <th className="py-2 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-300">
                  {statement.rows.map(r => (
                    <tr key={r.id} className="text-xs">
                      <td className="py-2 font-medium">{r.date}</td>
                      <td className="py-2">{r.type}</td>
                      <td className="py-2 font-mono font-bold">{r.refNo}</td>
                      <td className="py-2">{r.description}</td>
                      <td className="py-2 text-right">{r.moneyIn > 0 ? `Rs. ${r.moneyIn.toLocaleString()}` : '-'}</td>
                      <td className="py-2 text-right">{r.moneyOut > 0 ? `Rs. ${r.moneyOut.toLocaleString()}` : '-'}</td>
                      <td className="py-2 text-right font-bold">Rs. {r.runningBalance.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── TRANSACTION HISTORY TABLE ── */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden no-print">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center space-x-2">
                  <FileText size={15} className="text-gray-500" />
                  <h3 className="text-xs font-extrabold text-gray-800 uppercase tracking-wide">
                    Transaction Records ({statement.totalCount})
                  </h3>
                </div>
                <span className="text-[10px] text-gray-400 font-semibold">Chronological Order</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-gray-100/70 border-b border-gray-200 text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-3">{t('date', 'Date')}</th>
                      <th className="py-3 px-3">{t('transaction_type', 'Transaction Type')}</th>
                      <th className="py-3 px-3">{t('ref_no', 'Ref No.')}</th>
                      <th className="py-3 px-3">{t('description', 'Description / Particulars')}</th>
                      <th className="py-3 px-3 text-right">{t('total_money_in', 'Money In')}</th>
                      <th className="py-3 px-3 text-right">{t('total_money_out', 'Money Out')}</th>
                      <th className="py-3 px-3 text-right">{t('running_balance', 'Running Balance')}</th>
                      <th className="py-3 px-3 text-center">{t('action', 'Action')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {statement.rows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-gray-400">
                          <Wallet size={36} className="mx-auto mb-2 opacity-30" />
                          <p className="font-semibold text-xs">No transactions recorded for account "{selectedAccount}".</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">Try adjusting date filters or search terms.</p>
                        </td>
                      </tr>
                    ) : (
                      statement.rows.map(row => (
                        <tr key={row.id} className="hover:bg-gray-50/80 transition">
                          <td className="py-3 px-3 text-gray-500 font-medium text-[11px] whitespace-nowrap">{row.date}</td>
                          
                          {/* Transaction Type Badge */}
                          <td className="py-3 px-3">
                            <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${
                              row.type === 'Sale Payment' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              row.type === 'Customer Receipt' ? 'bg-green-50 text-green-700 border-green-200' :
                              row.type === 'Expense Payment' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                              row.type === 'Sale Refund' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              row.type === 'Purchase Payment' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                              'bg-indigo-50 text-indigo-700 border-indigo-200'
                            }`}>
                              {row.type}
                            </span>
                          </td>

                          <td className="py-3 px-3 font-mono font-bold text-gray-800 text-[11px] whitespace-nowrap">{row.refNo}</td>
                          
                          <td className="py-3 px-3 font-semibold text-gray-900">
                            <div className="line-clamp-1">{row.description}</div>
                            {row.party && row.party !== row.description && (
                              <div className="text-[10px] text-gray-400 font-normal">{row.party} • {row.module}</div>
                            )}
                          </td>

                          {/* Money In */}
                          <td className="py-3 px-3 text-right font-black text-emerald-600 text-xs">
                            {row.moneyIn > 0 ? `+ Rs. ${row.moneyIn.toLocaleString()}` : <span className="text-gray-300 font-normal">-</span>}
                          </td>

                          {/* Money Out */}
                          <td className="py-3 px-3 text-right font-black text-rose-600 text-xs">
                            {row.moneyOut > 0 ? `- Rs. ${row.moneyOut.toLocaleString()}` : <span className="text-gray-300 font-normal">-</span>}
                          </td>

                          {/* Running Balance */}
                          <td className="py-3 px-3 text-right font-extrabold text-gray-900 text-xs bg-gray-50/50">
                            Rs. {row.runningBalance.toLocaleString()}
                          </td>

                          {/* Print Action */}
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => {
                                setPrintTx(row);
                                setTimeout(() => window.print(), 100);
                              }}
                              title="Print this transaction"
                              className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition"
                            >
                              <Printer size={14} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer Summary */}
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between text-[11px] font-semibold text-gray-500 gap-2">
                <span>Showing {statement.rows.length} synchronized transactions</span>
                <div className="flex items-center space-x-4">
                  <span className="text-emerald-700 font-bold">In: +Rs. {statement.moneyIn.toLocaleString()}</span>
                  <span className="text-rose-700 font-bold">Out: -Rs. {statement.moneyOut.toLocaleString()}</span>
                  <span className="text-gray-900 font-black">Net: Rs. {statement.currentBalance.toLocaleString()}</span>
                </div>
              </div>

            </div>

          </div>
        </div>
      </div>

      {/* Edit Opening Balance Modal */}
      {showObModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-sm font-extrabold text-gray-900">Set Opening Balance</h3>
              <button onClick={() => setShowObModal(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>
            <form onSubmit={handleSaveOB} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider mb-1">
                  Account Name
                </label>
                <input
                  type="text"
                  disabled
                  value={selectedAccount}
                  className="w-full px-3 py-2 bg-gray-100 border rounded-xl font-bold text-gray-700"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider mb-1">
                  Initial Opening Balance (Rs.) *
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 50000"
                  value={obInput}
                  onChange={(e) => setObInput(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl font-extrabold text-gray-900 focus:border-green-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowObModal(false)}
                  className="px-4 py-2 border text-gray-600 rounded-xl font-bold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-sm"
                >
                  Save Balance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print Specific CSS */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print\\:block, .print\\:block * { visibility: visible !important; }
          .print\\:block { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print-backdrop { background: transparent !important; }
          .no-print { display: none !important; }
          
          /* Hide main statement if printing single tx */
          ${printTx ? '.print-statement-view { display: none !important; }' : ''}
          /* Hide single tx if printing statement */
          ${!printTx ? '.print-single-tx-view { display: none !important; }' : ''}
        }
      `}</style>
      
      {/* ── PRINTABLE SINGLE TRANSACTION VIEW (HIDDEN ON SCREEN) ── */}
      {printTx && (
        <div className="hidden print:block print-single-tx-view w-full bg-white text-black p-8">
          <PrintHeader title="Transaction Receipt" />
          
          <div className="mt-8 border border-gray-300 rounded-lg p-6 max-w-2xl mx-auto">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold uppercase tracking-widest text-gray-800">Transaction Receipt</h2>
              <p className="text-gray-500 mt-1">Generated on {new Date().toLocaleDateString('en-PK')} {new Date().toLocaleTimeString('en-PK')}</p>
            </div>
            
            <table className="w-full text-sm border-collapse">
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-3 font-semibold text-gray-600 w-1/3">Account</td>
                  <td className="py-3 font-bold text-gray-900">{selectedAccount}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 font-semibold text-gray-600">Date</td>
                  <td className="py-3 font-bold text-gray-900">{printTx.date}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 font-semibold text-gray-600">Transaction Type</td>
                  <td className="py-3 font-bold text-gray-900">{printTx.type}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 font-semibold text-gray-600">Ref / Voucher No.</td>
                  <td className="py-3 font-bold text-gray-900">{printTx.refNo}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 font-semibold text-gray-600">Description / Particulars</td>
                  <td className="py-3 font-bold text-gray-900">
                    <div>{printTx.description}</div>
                    {printTx.party && printTx.party !== printTx.description && (
                      <div className="text-xs text-gray-500 mt-1">{printTx.party} • {printTx.module}</div>
                    )}
                  </td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 font-semibold text-gray-600">Amount</td>
                  <td className="py-3 font-bold text-lg">
                    {printTx.moneyIn > 0 
                      ? <span className="text-emerald-700">Rs. {printTx.moneyIn.toLocaleString()} (IN)</span>
                      : <span className="text-rose-700">Rs. {printTx.moneyOut.toLocaleString()} (OUT)</span>
                    }
                  </td>
                </tr>
                <tr>
                  <td className="py-3 font-semibold text-gray-600">Running Balance</td>
                  <td className="py-3 font-bold text-gray-900">Rs. {printTx.runningBalance.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
