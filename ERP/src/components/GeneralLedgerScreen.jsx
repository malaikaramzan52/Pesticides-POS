import React, { useState, useMemo } from 'react';
import { BookOpen, Printer, Search, Eye, Settings, CheckCircle2, X, AlertTriangle } from 'lucide-react';
import DateFilterBar from './DateFilterBar';
import PrintHeader from './PrintHeader';
import { isItemInDateRange } from '../utils/dateUtils';
import { getStoredData, setStoredData, CUSTOMERS, COMPANIES } from '../utils/mockData';
import { useLanguage } from '../context/LanguageContext';

// ── City helpers ───────────────────────────────────────────────────────────────
const getCustomerCity = (custName) => {
  if (!custName) return '';
  const cust = CUSTOMERS.find(c => c.name === custName);
  return cust?.city || '';
};
const getSupplierCity = (supplierName) => {
  if (!supplierName) return '';
  const comp = COMPANIES.find(c => c.name.toLowerCase() === supplierName.toLowerCase() || supplierName.toLowerCase().includes(c.name.toLowerCase()));
  return comp?.city || '';
};

// ── Format helper ─────────────────────────────────────────────────────────────
const fmt = (n) => Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function GeneralLedgerScreen({
  invoices = [],
  expenses = [],
  triggerNotificationToast,
  dateFilter, setDateFilter,
  selectedCity, setSelectedCity, cities = []
}) {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery]   = useState('');
  const [moduleFilter, setModuleFilter] = useState('All');
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showObSetup, setShowObSetup]   = useState(false);
  const [obInput, setObInput]           = useState('');
  const [obDate, setObDate]             = useState('');

  // ── Stored initial Opening Balance ────────────────────────────────────────
  const [obConfig, setObConfig] = useState(() => {
    const emptyConfig = { amount: 0, asOfDate: '' };
    setStoredData('AGRO_ERP_OPENING_BALANCE', emptyConfig);
    return emptyConfig;
  });

  const saveObConfig = () => {
    const amount = parseFloat(obInput);
    if (isNaN(amount)) {
      if (triggerNotificationToast) triggerNotificationToast('Invalid Amount', 'Please enter a valid Opening Balance.', 'error');
      return;
    }
    if (!obDate) {
      if (triggerNotificationToast) triggerNotificationToast('Date Required', 'Please select the "As of Date" for the Opening Balance.', 'error');
      return;
    }
    const config = { amount, asOfDate: obDate };
    setStoredData('AGRO_ERP_OPENING_BALANCE', config);
    setObConfig(config);
    setShowObSetup(false);
    if (triggerNotificationToast) triggerNotificationToast('Opening Balance Saved', `Initial OB of Rs. ${amount.toLocaleString()} set from ${obDate}.`, 'success');
  };

  // ── Fetch Purchase Orders ──────────────────────────────────────────────────
  const purchaseOrders = useMemo(() => getStoredData('AGRO_ERP_PURCHASE_ORDERS', []), []);

  // ── Build full chronological ledger from all transactions ──────────────────
  const allLedgerRows = useMemo(() => {
    let rows = [];

    // Sales
    invoices.forEach(inv => {
      rows.push({ date: inv.date, ref_no: inv.invoice_no, module: 'Sales', type: 'Sale', party: inv.customer_name, amount: inv.grand_total || 0, details: inv });
      if (inv.status === 'Cancelled') {
        if (inv.refund_status === 'Refunded') {
          rows.push({ date: inv.cancellation_details?.on || inv.date, ref_no: `${inv.invoice_no}-REF`, module: 'Sales', type: 'Sale Refund', party: inv.customer_name, amount: -(inv.grand_total || 0), details: inv });
        } else if (inv.refund_status === 'Not Required') {
          rows.push({ date: inv.cancellation_details?.on || inv.date, ref_no: `${inv.invoice_no}-CANC`, module: 'Sales', type: 'Sale Reversal', party: inv.customer_name, amount: -(inv.grand_total || 0), details: inv });
        }
      }
    });

    // Purchases
    purchaseOrders.filter(po => po.status !== 'Cancelled').forEach(po => {
      rows.push({ date: po.date, ref_no: po.id, module: 'Purchase', type: 'Purchase', party: po.supplier, amount: -po.total, details: po });
    });

    // Expenses
    expenses.filter(exp => exp.status === 'Paid').forEach(exp => {
      rows.push({ date: exp.date, ref_no: exp.id, module: 'Expense', type: 'Expense', party: exp.category, amount: -exp.amount, details: exp });
    });

    // Sort chronologically ascending
    rows.sort((a, b) => new Date(a.date) - new Date(b.date));
    return rows;
  }, [invoices, expenses, purchaseOrders]);

  // ── Determine effective date range start ──────────────────────────────────
  const periodStartDate = dateFilter.startDate || '';
  const periodEndDate   = dateFilter.endDate   || '';

  // ── Auto-calculate Opening Balance for the selected period ────────────────
  // Sum all transactions strictly BEFORE the period start date,
  // then add the user-configured initial OB (if its asOfDate is also before period start).
  const openingBalance = useMemo(() => {
    // Start with the configured initial OB if it precedes the period
    let base = 0;
    if (obConfig.asOfDate && periodStartDate && obConfig.asOfDate < periodStartDate) {
      base = obConfig.amount;
    } else if (!periodStartDate) {
      // No date filter → use full initial OB as base (everything counts)
      base = obConfig.amount;
    }

    if (!periodStartDate) {
      // No date range filter active → OB = initial config only
      return base;
    }

    // Sum all transactions with date < periodStartDate
    const prePeriodSum = allLedgerRows
      .filter(r => r.date < periodStartDate)
      .reduce((s, r) => s + r.amount, 0);

    return base + prePeriodSum;
  }, [allLedgerRows, periodStartDate, obConfig]);

  // ── Filter by date range ──────────────────────────────────────────────────
  const periodRows = useMemo(() => {
    return allLedgerRows.filter(row => {
      const matchesDate = isItemInDateRange(row.date, periodStartDate, periodEndDate);
      let matchesCity = true;
      if (selectedCity !== 'All') {
        if (row.module === 'Sales')    matchesCity = getCustomerCity(row.party) === selectedCity;
        else if (row.module === 'Purchase') matchesCity = getSupplierCity(row.party) === selectedCity;
        else matchesCity = false;
      }
      return matchesDate && matchesCity;
    });
  }, [allLedgerRows, periodStartDate, periodEndDate, selectedCity]);

  // ── Compute running balance starting from Opening Balance ─────────────────
  const ledgerWithBalance = useMemo(() => {
    let runBal = openingBalance;
    return periodRows.map(r => {
      runBal += r.amount;
      return { ...r, balance: runBal, id: `${r.module}-${r.ref_no}-${r.type}` };
    }).reverse(); // newest first for display
  }, [periodRows, openingBalance]);

  // ── Search / Module filter ────────────────────────────────────────────────
  const filteredLedger = useMemo(() => {
    return ledgerWithBalance.filter(row => {
      const partyCity = row.module === 'Sales' ? getCustomerCity(row.party) : row.module === 'Purchase' ? getSupplierCity(row.party) : '';
      const matchesSearch =
        !searchQuery ||
        row.ref_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.party?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        partyCity.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesModule = moduleFilter === 'All' || row.module === moduleFilter;
      return matchesSearch && matchesModule;
    });
  }, [ledgerWithBalance, searchQuery, moduleFilter]);

  const totalDebit  = periodRows.reduce((sum, r) => r.amount > 0 ? sum + r.amount : sum, 0);
  const totalCredit = periodRows.reduce((sum, r) => r.amount < 0 ? sum + Math.abs(r.amount) : sum, 0);
  const closingBalance = openingBalance + totalDebit - totalCredit;

  const handlePrint = () => window.print();

  return (
    <div className="space-y-6">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm no-print">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-indigo-100 to-indigo-200 p-3 rounded-xl text-indigo-700 shadow-inner">
              <BookOpen size={24} />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-gray-800 uppercase tracking-wider">Journal Ledger</h2>
              <p className="text-xs text-gray-500 font-medium">Combined financial history • Auto-computed Opening & Closing Balances</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setObInput(obConfig.amount.toString()); setObDate(obConfig.asOfDate || ''); setShowObSetup(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <Settings size={14} /> Setup Opening Balance
            </button>
            <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl text-xs font-bold transition cursor-pointer">
              <Printer size={14} /> Print
            </button>
          </div>
        </div>

        {/* Filters row */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Filter Module</label>
            <select
              value={moduleFilter}
              onChange={e => setModuleFilter(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-2.5 font-bold text-gray-700 focus:outline-none focus:border-indigo-500 transition shadow-sm cursor-pointer"
            >
              <option value="All">All Modules</option>
              <option value="Sales">Sales</option>
              <option value="Purchase">Purchases</option>
              <option value="Expense">Expenses</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search Reference, Party or Type..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all shadow-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Date Filter Bar ───────────────────────────────────────────────── */}
      <div className="no-print">
        <DateFilterBar
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          selectedCity={selectedCity}
          setSelectedCity={setSelectedCity}
          cities={cities}
        />
      </div>

      {/* ── Balance Summary Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 no-print">
        {[
          {
            label: 'Opening Balance',
            value: openingBalance,
            color: openingBalance >= 0 ? 'text-indigo-700' : 'text-red-600',
            bg: 'bg-indigo-50/40 border-indigo-100',
            sign: openingBalance >= 0 ? '' : '-',
            icon: '📂',
            sub: periodStartDate ? `Before ${periodStartDate}` : 'Financial Year Start'
          },
          {
            label: 'Total Income (Dr)',
            value: totalDebit,
            color: 'text-green-700',
            bg: 'bg-green-50/40 border-green-100',
            sign: '+',
            icon: '📈',
            sub: `${periodRows.filter(r => r.amount > 0).length} transactions`
          },
          {
            label: 'Total Outflow (Cr)',
            value: totalCredit,
            color: 'text-red-600',
            bg: 'bg-red-50/40 border-red-100',
            sign: '-',
            icon: '📉',
            sub: `${periodRows.filter(r => r.amount < 0).length} transactions`
          },
          {
            label: 'Closing Balance',
            value: closingBalance,
            color: closingBalance >= 0 ? 'text-emerald-700' : 'text-red-600',
            bg: closingBalance >= 0 ? 'bg-emerald-50/40 border-emerald-100' : 'bg-red-50/40 border-red-100',
            sign: closingBalance >= 0 ? '' : '-',
            icon: '🏦',
            sub: periodEndDate ? `As of ${periodEndDate}` : 'As of Today'
          },
        ].map((card, i) => (
          <div key={i} className={`rounded-2xl border p-4 ${card.bg}`}>
            <div className="text-lg mb-1">{card.icon}</div>
            <p className="text-[9px] font-black uppercase tracking-wider text-gray-500">{card.label}</p>
            <p className={`text-lg font-black mt-1 font-mono ${card.color}`}>
              {card.sign}Rs. {fmt(card.value)}
            </p>
            <p className="text-[9px] text-gray-400 font-semibold mt-0.5">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Opening Balance info strip (shows if OB is configured) ───────── */}
      {obConfig.asOfDate ? (
        <div className="flex items-center gap-3 px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-semibold text-indigo-800 no-print">
          <CheckCircle2 size={15} className="text-indigo-500 flex-shrink-0" />
          <span>
            Initial Opening Balance of <strong>Rs. {obConfig.amount.toLocaleString()}</strong> set as of <strong>{obConfig.asOfDate}</strong>.
            Period OB is auto-calculated from all transactions before the selected start date.
          </span>
          <button onClick={() => { setObInput(obConfig.amount.toString()); setObDate(obConfig.asOfDate); setShowObSetup(true); }} className="ml-auto text-indigo-600 hover:text-indigo-800 underline cursor-pointer flex-shrink-0">Edit</button>
        </div>
      ) : (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-800 no-print">
          <AlertTriangle size={15} className="text-amber-500 flex-shrink-0" />
          <span>No initial Opening Balance configured. Set it up for accurate financial reporting from the start of your Financial Year.</span>
          <button onClick={() => { setObInput('0'); setObDate(''); setShowObSetup(true); }} className="ml-auto px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg cursor-pointer flex-shrink-0 font-bold">Set Up Now</button>
        </div>
      )}

      {/* ── Ledger Body ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm printable-area">

        {/* ── PRINT ONLY LAYOUT ──────────────────────────────────────────── */}
        <div className="hidden print:block p-8 font-sans text-[11px] text-black">
          <PrintHeader title="Journal Ledger" dateRange={periodStartDate ? `${periodStartDate} → ${periodEndDate || 'Today'}` : ''} />

          {/* Balance summary row for print */}
          <div className="grid grid-cols-4 gap-4 border border-black p-3 mb-4 text-[10px]">
            <div><strong>Opening Balance:</strong><br/>Rs. {fmt(openingBalance)}</div>
            <div><strong>Total Income (Dr):</strong><br/>+ Rs. {fmt(totalDebit)}</div>
            <div><strong>Total Outflow (Cr):</strong><br/>- Rs. {fmt(totalCredit)}</div>
            <div><strong>Closing Balance:</strong><br/>Rs. {fmt(closingBalance)}</div>
          </div>

          <table className="w-full text-left border-collapse mb-1 font-mono">
            <thead>
              <tr className="border-y border-black font-bold">
                <th className="py-1.5 font-bold">Date</th>
                <th className="py-1.5 font-bold">Ref #</th>
                <th className="py-1.5 font-bold">Module</th>
                <th className="py-1.5 font-bold">Type</th>
                <th className="py-1.5 font-bold">Party</th>
                <th className="py-1.5 font-bold text-right">Amount (Rs.)</th>
                <th className="py-1.5 font-bold text-right">Balance (Rs.)</th>
              </tr>
            </thead>
            <tbody>
              {/* Opening balance row */}
              <tr className="border-b border-gray-200">
                <td className="py-1" colSpan={5}><strong>Opening Balance</strong> {periodStartDate ? `(as of ${periodStartDate})` : ''}</td>
                <td className="py-1 text-right"></td>
                <td className="py-1 text-right font-bold">{fmt(openingBalance)}</td>
              </tr>
              {filteredLedger.slice().reverse().map((row, idx) => (
                <tr key={idx} className="border-b border-gray-100">
                  <td className="py-1">{row.date}</td>
                  <td className="py-1">{row.ref_no}</td>
                  <td className="py-1">{row.module}</td>
                  <td className="py-1">{row.type}</td>
                  <td className="py-1 max-w-[180px] truncate">{row.party}</td>
                  <td className="py-1 text-right">{row.amount > 0 ? '+' : '-'} {fmt(row.amount)}</td>
                  <td className="py-1 text-right font-bold">{row.balance >= 0 ? '' : '-'}{fmt(row.balance)}</td>
                </tr>
              ))}
              {/* Closing balance row */}
              <tr className="border-t-2 border-black">
                <td className="py-1 font-bold" colSpan={5}><strong>Closing Balance</strong></td>
                <td className="py-1 text-right"></td>
                <td className="py-1 text-right font-bold">{closingBalance >= 0 ? '' : '-'}{fmt(closingBalance)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── Screen table ──────────────────────────────────────────────── */}
        <div className="p-6 overflow-y-auto no-print">
          {/* Opening balance row */}
          <div className="flex items-center justify-between px-4 py-3 bg-indigo-50 border border-indigo-150 rounded-xl mb-3 text-xs font-bold text-indigo-900">
            <span className="uppercase tracking-wide text-[10px] text-indigo-600 font-black">Opening Balance {periodStartDate ? `(Before ${periodStartDate})` : '(Financial Year Start)'}</span>
            <span className="font-mono text-sm font-black text-indigo-800">
              {openingBalance >= 0 ? '' : '-'} Rs. {fmt(openingBalance)}
            </span>
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">
                  <th className="p-3 w-28">Date</th>
                  <th className="p-3 w-28">Ref #</th>
                  <th className="p-3 w-24">Module</th>
                  <th className="p-3 w-32">Type</th>
                  <th className="p-3">Party / Category</th>
                  <th className="p-3 text-right w-36">Amount</th>
                  <th className="p-3 text-right w-36">Running Balance</th>
                  <th className="p-3 text-center w-20">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredLedger.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-400 font-bold">
                      No transactions found in this period.
                    </td>
                  </tr>
                ) : filteredLedger.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 align-middle">
                    <td className="p-3 font-bold text-gray-600">{row.date}</td>
                    <td className="p-3 font-mono font-bold text-indigo-600">{row.ref_no}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold ${
                        row.module === 'Sales'    ? 'bg-blue-50 text-blue-600' :
                        row.module === 'Purchase' ? 'bg-purple-50 text-purple-600' :
                                                    'bg-red-50 text-red-600'
                      }`}>
                        {row.module}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-gray-800">{row.type}</td>
                    <td className="p-3 font-bold text-gray-900 truncate max-w-[150px]" title={row.party}>{row.party}</td>
                    <td className="p-3 text-right font-black">
                      <span className={row.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {row.amount > 0 ? '+' : '-'} Rs. {fmt(row.amount)}
                      </span>
                    </td>
                    <td className="p-3 text-right font-black text-indigo-700 bg-indigo-50/30">
                      <span className={row.balance < 0 ? 'text-red-600' : 'text-indigo-700'}>
                        {row.balance < 0 ? '-' : ''} Rs. {fmt(row.balance)}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => setSelectedTransaction(row)}
                        className="text-gray-400 hover:text-indigo-600 transition cursor-pointer"
                        title="View Details"
                      >
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Closing Balance footer */}
          <div className="flex items-center justify-between px-4 py-3 mt-3 bg-emerald-50 border border-emerald-150 rounded-xl text-xs font-bold text-emerald-900">
            <span className="uppercase tracking-wide text-[10px] text-emerald-600 font-black">Closing Balance {periodEndDate ? `(As of ${periodEndDate})` : '(As of Today)'}</span>
            <span className={`font-mono text-sm font-black ${closingBalance < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
              {closingBalance < 0 ? '- ' : ''}Rs. {fmt(closingBalance)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Opening Balance Setup Modal ───────────────────────────────────── */}
      {showObSetup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm border border-gray-200 shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-indigo-100 p-2 rounded-xl text-indigo-700"><Settings size={16} /></div>
                <div>
                  <h3 className="text-sm font-extrabold text-gray-900">Initial Opening Balance</h3>
                  <p className="text-[10px] text-gray-500 font-medium">Set once for Financial Year start. Auto-calculated thereafter.</p>
                </div>
              </div>
              <button onClick={() => setShowObSetup(false)} className="p-1 rounded hover:bg-gray-100 text-gray-500 cursor-pointer"><X size={16} /></button>
            </div>

            <div className="space-y-4 text-xs font-semibold text-gray-700">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide">Opening Balance Amount (Rs.)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 250000"
                  value={obInput}
                  onChange={e => setObInput(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:border-indigo-500 focus:outline-none transition shadow-sm font-bold text-gray-800"
                />
                <p className="text-[10px] text-gray-400">Use a negative value if the business started with a deficit/liability.</p>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide">As of Date (Financial Year Start)</label>
                <input
                  type="date"
                  value={obDate}
                  onChange={e => setObDate(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 focus:border-indigo-500 focus:outline-none transition shadow-sm font-bold text-gray-800"
                />
                <p className="text-[10px] text-gray-400">All transactions <em>before</em> this date will be excluded when computing the auto Opening Balance for future periods.</p>
              </div>


            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowObSetup(false)} className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition cursor-pointer text-xs">
                Cancel
              </button>
              <button onClick={saveObConfig} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition cursor-pointer text-xs flex items-center justify-center gap-2">
                <CheckCircle2 size={13} /> Save Opening Balance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Transaction Detail Modal ─────────────────────────────────────── */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex justify-between items-start border-b pb-4 mb-4">
              <div>
                <h3 className="text-lg font-black text-gray-800">Transaction Details</h3>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-1">{selectedTransaction.module} • {selectedTransaction.ref_no}</p>
              </div>
              <button onClick={() => setSelectedTransaction(null)} className="text-gray-400 hover:text-gray-600 font-bold p-1 bg-gray-100 rounded-lg cursor-pointer transition">✕</button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Date</p>
                  <p className="font-bold text-gray-800 text-sm">{selectedTransaction.date}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Party / Category</p>
                  <p className="font-bold text-gray-800 text-sm truncate" title={selectedTransaction.party}>{selectedTransaction.party}</p>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex justify-between items-center">
                <p className="text-xs font-bold text-gray-600 uppercase">Transaction Amount</p>
                <p className={`text-lg font-black ${selectedTransaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {selectedTransaction.amount > 0 ? '+' : '-'} Rs. {fmt(selectedTransaction.amount)}
                </p>
              </div>

              {selectedTransaction.module === 'Sales' && selectedTransaction.details?.items && (
                <div>
                  <p className="text-xs font-bold text-gray-600 uppercase mb-2">Products Sold</p>
                  <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-100 sticky top-0">
                        <tr>
                          <th className="p-2 font-bold text-gray-600">Item</th>
                          <th className="p-2 font-bold text-gray-600 text-right">Qty</th>
                          <th className="p-2 font-bold text-gray-600 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {selectedTransaction.details.items.map((item, idx) => (
                          <tr key={idx}>
                            <td className="p-2 font-semibold text-gray-800">{item.product_name || item.name}</td>
                            <td className="p-2 text-right text-gray-600">{item.quantity}</td>
                            <td className="p-2 text-right font-bold text-gray-800">Rs. {(item.line_total || item.total || (item.quantity * item.price)).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {selectedTransaction.module === 'Expense' && selectedTransaction.details && (
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="font-bold text-gray-500 uppercase">Title</span>
                    <span className="font-semibold text-gray-800">{selectedTransaction.details.title}</span>
                  </div>
                  {selectedTransaction.details.paidTo && (
                    <div className="flex justify-between">
                      <span className="font-bold text-gray-500 uppercase">Paid To</span>
                      <span className="font-semibold text-gray-800">{selectedTransaction.details.paidTo}</span>
                    </div>
                  )}
                  {selectedTransaction.details.paymentMethod && (
                    <div className="flex justify-between">
                      <span className="font-bold text-gray-500 uppercase">Method</span>
                      <span className="font-semibold text-gray-800">{selectedTransaction.details.paymentMethod}</span>
                    </div>
                  )}
                </div>
              )}

              {selectedTransaction.module === 'Purchase' && selectedTransaction.details && (
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="font-bold text-gray-500 uppercase">Vendor</span>
                    <span className="font-semibold text-gray-800">{selectedTransaction.details.vendor || selectedTransaction.details.supplier}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold text-gray-500 uppercase">Status</span>
                    <span className="font-bold text-indigo-600">{selectedTransaction.details.status}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .printable-area, .printable-area * { visibility: visible !important; }
          .printable-area { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none; border: none; max-width: 100%; max-height: none; overflow: visible; }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
}
