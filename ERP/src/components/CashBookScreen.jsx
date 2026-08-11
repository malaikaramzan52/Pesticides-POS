import React, { useState } from 'react';
import { Wallet, CheckCircle, ShieldAlert, Lock, Unlock, TrendingUp, History, Coins, ArrowRightLeft, TrendingDown } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function CashBookScreen({ invoices = [], expenses = [], triggerNotificationToast }) {
  const { t } = useLanguage();
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [openingBalance, setOpeningBalance] = useState(10000);
  const [closingBalanceInput, setClosingBalanceInput] = useState('');
  const [closingNote, setClosingNote] = useState('');

  // 1. Cash Sales (Cash In)
  const cashInvoices = invoices.filter(i => i.payment_method === 'Cash');
  const cashSales = cashInvoices.reduce((sum, i) => sum + (i.amount_paid !== undefined ? Number(i.amount_paid) : i.grand_total), 0);

  // 2. Cash Expenses (Cash Out)
  const cashExpenses = expenses.filter(e => e.status === 'Paid' && e.payment_method === 'Cash');
  const cashExpensesTotal = cashExpenses.reduce((sum, e) => sum + e.amount, 0);

  // 3. Cash Refunds (Cash Out)
  const cashRefunds = invoices.filter(i => i.status === 'Cancelled' && i.refund_status === 'Refunded' && i.refund_method === 'Cash');
  const cashRefundsTotal = cashRefunds.reduce((sum, i) => {
    // Determine the refund amount
    // If partial payment logic exists, we should use the actual amount received/refunded.
    // For now we assume the entire grand_total or amount_paid was refunded.
    return sum + (i.amount_paid !== undefined ? Number(i.amount_paid) : i.grand_total);
  }, 0);

  // Expected Cash calculation
  const totalCalculatedDrawer = openingBalance + cashSales - cashExpensesTotal - cashRefundsTotal;

  // Combine transactions for history view
  const combinedHistory = [
    ...cashInvoices.map(i => ({
      id: i.invoice_no,
      date: i.date,
      desc: `Sale: ${i.customer_name}`,
      amount: i.amount_paid !== undefined ? Number(i.amount_paid) : i.grand_total,
      type: 'IN'
    })),
    ...cashExpenses.map(e => ({
      id: e.id,
      date: e.date,
      desc: `Expense: ${e.title}`,
      amount: e.amount,
      type: 'OUT'
    })),
    ...cashRefunds.map(i => ({
      id: `${i.invoice_no}-REF`,
      date: i.cancellation_details?.on || i.date,
      desc: `Refund: ${i.customer_name}`,
      amount: i.amount_paid !== undefined ? Number(i.amount_paid) : i.grand_total,
      type: 'OUT'
    }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  const handleCloseDrawer = (e) => {
    e.preventDefault();
    setDrawerOpen(false);
    if (triggerNotificationToast) {
      triggerNotificationToast('Register Closed', 'Cash drawer has been successfully locked for the day.', 'success');
    }
  };

  const handleOpenDrawer = () => {
    setDrawerOpen(true);
    setClosingBalanceInput('');
    setClosingNote('');
    if (triggerNotificationToast) {
      triggerNotificationToast('Register Opened', 'A new cash drawer session has been initialized.', 'success');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        {/* Title */}
        <div className="flex items-center space-x-3 border-b border-gray-100 pb-5 mb-5">
          <div className="bg-gradient-to-br from-green-100 to-green-200 p-3 rounded-xl text-green-700 shadow-inner">
            <Wallet size={24} />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-gray-800 uppercase tracking-wider">Cash Drawer Book</h2>
            <p className="text-xs text-gray-500 font-medium">Manage daily cashier shifts, tracking automatic Cash In & Cash Out</p>
          </div>
        </div>

        {/* Tally Panel */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
          
          <div className="bg-white border border-gray-200 p-4 rounded-2xl shadow-sm relative overflow-hidden group hover:border-gray-300 transition flex flex-col justify-center">
            <span className="text-gray-400 block font-bold uppercase tracking-wider text-[10px] mb-2">Counter Status</span>
            <div className="flex items-center space-x-2">
              {drawerOpen ? (
                <>
                  <div className="bg-green-100 p-1.5 rounded-lg text-green-600"><Unlock size={18} /></div>
                  <span className="text-sm font-black text-green-700 uppercase tracking-wide">Active</span>
                </>
              ) : (
                <>
                  <div className="bg-red-100 p-1.5 rounded-lg text-red-600"><Lock size={18} /></div>
                  <span className="text-sm font-black text-red-600 uppercase tracking-wide">Closed</span>
                </>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 p-4 rounded-2xl shadow-sm relative overflow-hidden group hover:border-blue-200 transition">
            <span className="text-blue-600 block font-bold uppercase tracking-wider text-[10px] mb-2">Opening Cash Balance</span>
            <h3 className="text-xl font-black text-blue-900 mt-1 font-mono">Rs. {openingBalance.toLocaleString()}</h3>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 p-4 rounded-2xl shadow-sm relative overflow-hidden group hover:border-green-300 transition">
            <span className="text-green-700 block font-bold uppercase tracking-wider text-[10px] mb-2">Total Cash In (Sales)</span>
            <h3 className="text-xl font-black text-green-800 mt-1 font-mono">+ Rs. {cashSales.toLocaleString()}</h3>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-orange-50 border border-red-200 p-4 rounded-2xl shadow-sm relative overflow-hidden group hover:border-red-300 transition">
            <span className="text-red-600 block font-bold uppercase tracking-wider text-[10px] mb-2">Cash Out (Exp + Ref)</span>
            <h3 className="text-xl font-black text-red-700 mt-1 font-mono">- Rs. {(cashExpensesTotal + cashRefundsTotal).toLocaleString()}</h3>
          </div>

        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Drawer Closing Form */}
          <div>
            {drawerOpen ? (
              <form onSubmit={handleCloseDrawer} className="bg-gray-50 border border-gray-200 rounded-2xl p-6 space-y-5 h-full">
                <div className="flex items-center gap-2 border-b border-gray-200 pb-3">
                  <Lock size={16} className="text-gray-500" />
                  <span className="font-extrabold text-gray-700 uppercase tracking-wide text-[11px]">End of Day Cash Closing</span>
                </div>
                
                <div className="bg-gray-800 text-white p-4 rounded-xl flex justify-between items-center shadow-inner">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-300">Expected System Cash:</span>
                  <span className="text-xl font-black font-mono">Rs. {totalCalculatedDrawer.toLocaleString()}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wide mb-1.5">Actual Physical Cash (Rs.) *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">Rs.</span>
                      <input
                        type="number"
                        required
                        placeholder="0.00"
                        value={closingBalanceInput}
                        onChange={(e) => setClosingBalanceInput(e.target.value)}
                        className="w-full rounded-xl border border-gray-300 pl-9 pr-3 py-2.5 text-sm font-bold text-gray-800 focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none transition-all shadow-sm bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wide mb-1.5">Closing Difference</label>
                    <div className={`p-2.5 rounded-xl border-2 font-mono font-bold text-right text-sm shadow-sm flex items-center justify-between ${
                      closingBalanceInput && parseFloat(closingBalanceInput) !== totalCalculatedDrawer
                        ? (parseFloat(closingBalanceInput) > totalCalculatedDrawer ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700')
                        : 'bg-gray-100 border-gray-200 text-gray-700'
                    }`}>
                      <span className="text-[10px] uppercase font-sans">Diff:</span>
                      <span>
                        Rs. {closingBalanceInput ? (parseFloat(closingBalanceInput) - totalCalculatedDrawer).toLocaleString() : '0'}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wide mb-1.5">Shift / Closing Notes</label>
                  <textarea
                    placeholder="Enter notes about cash variances, shifts, or handovers..."
                    rows="3"
                    value={closingNote}
                    onChange={(e) => setClosingNote(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-xs font-medium text-gray-700 focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none transition-all shadow-sm bg-white resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center space-x-2 shadow-md"
                >
                  <Lock size={16} />
                  <span>Post Cash Close & Lock Counter</span>
                </button>
              </form>
            ) : (
              <div className="border-2 border-red-200 rounded-2xl p-8 bg-gradient-to-b from-red-50 to-white text-center h-full flex flex-col justify-center items-center space-y-4">
                <div className="bg-red-100 p-4 rounded-full text-red-600 mb-2">
                  <ShieldAlert size={36} />
                </div>
                <div>
                  <h3 className="text-base font-black text-red-700 uppercase tracking-wider mb-1">Counter is Locked</h3>
                  <p className="text-xs text-gray-500 font-medium max-w-sm mx-auto mb-4">
                    This drawer register session has been saved and locked. Initialize a new session to start processing transactions.
                  </p>
                </div>
                <div className="w-full max-w-xs space-y-1.5 text-left mb-2">
                  <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wide">Set New Opening Balance (Rs.)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">Rs.</span>
                    <input
                      type="number"
                      min="0"
                      value={openingBalance}
                      onChange={(e) => setOpeningBalance(parseFloat(e.target.value) || 0)}
                      className="w-full rounded-xl border border-gray-300 pl-9 pr-3 py-2.5 text-sm font-bold text-gray-800 focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none transition-all shadow-sm bg-white text-center"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleOpenDrawer}
                  className="mt-2 px-6 py-3 w-full max-w-xs bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-md flex items-center justify-center space-x-2"
                >
                  <Unlock size={16} />
                  <span>Initialize New Session</span>
                </button>
              </div>
            )}
          </div>

          {/* Recent Cash Transactions Table */}
          <div className="bg-white border border-gray-200 rounded-2xl flex flex-col h-full overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-200 px-5 py-4 flex items-center gap-2">
              <History size={16} className="text-gray-500" />
              <span className="font-extrabold text-gray-700 uppercase tracking-wide text-[11px]">Today's Cash Transactions</span>
            </div>
            
            <div className="flex-1 overflow-y-auto max-h-[340px] scrollbar-thin scrollbar-thumb-gray-200">
              {combinedHistory.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8 space-y-2">
                  <ArrowRightLeft size={32} className="opacity-30" />
                  <span className="text-xs font-bold">No cash transactions yet</span>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {combinedHistory.map((tx, idx) => (
                    <div key={idx} className="px-5 py-3 hover:bg-gray-50 transition flex items-center justify-between">
                      <div>
                        <span className="block text-xs font-bold text-gray-800">{tx.id}</span>
                        <span className="text-[10px] text-gray-500 font-medium">{tx.desc}</span>
                      </div>
                      <div className="text-right">
                        <span className={`block text-sm font-black font-mono ${tx.type === 'IN' ? 'text-green-700' : 'text-red-700'}`}>
                          {tx.type === 'IN' ? '+' : '-'} Rs. {tx.amount.toLocaleString()}
                        </span>
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded inline-block mt-0.5 ${
                          tx.type === 'IN' ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'
                        }`}>
                          Cash {tx.type}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-gray-800 border-t border-gray-700 px-5 py-4 flex justify-between items-center mt-auto">
              <span className="text-xs font-bold text-gray-300 uppercase">Calculated Expected Cash</span>
              <span className="text-lg font-black text-white font-mono">Rs. {totalCalculatedDrawer.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
