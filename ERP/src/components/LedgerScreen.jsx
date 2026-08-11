import React, { useState, useEffect } from 'react';
import { BookOpen, Search, Filter, RefreshCw, Eye, Printer, X } from 'lucide-react';
import PrintHeader from './PrintHeader';
import { CUSTOMERS } from '../utils/mockData';
import { useLanguage } from '../context/LanguageContext';

// ─── Customer Ledger Modal ───────────────────────────────────────────────────
function CustomerLedgerModal({ customerName, invoices, onClose, autoPrint }) {
  const customer = CUSTOMERS.find(c => c.name === customerName) || {};
  
  const customerInvoices = invoices
    .filter(i => i.customer_name === customerName)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  
  let runningBalance = 0;
  const ledgerRows = [];

  customerInvoices.forEach(inv => {
    const debit = inv.grand_total || 0;
    // Determine credit: if amount_paid exists use it, else if Cash assume full payment.
    const credit = inv.amount_paid !== undefined 
      ? Number(inv.amount_paid) 
      : (inv.payment_method === 'Cash' || inv.payment_method?.includes('Cash') ? debit : 0);
    
    runningBalance = runningBalance + debit - credit;

    const productsList = (inv.cart || []).map(p => `${p.name} (Qty: ${p.cart_qty || p.qty || 1})`);

    ledgerRows.push({
      id: inv.invoice_no || inv.id,
      date: inv.date,
      invoice_no: inv.invoice_no,
      debit,
      credit,
      balance: runningBalance,
      products: productsList
    });
  });

  const totalDebit = ledgerRows.reduce((sum, r) => sum + r.debit, 0);
  const totalCredit = ledgerRows.reduce((sum, r) => sum + r.credit, 0);

  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    if (autoPrint) {
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [autoPrint]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 print-wrapper">
      <div className="bg-white rounded-2xl w-full max-w-5xl border border-gray-200 shadow-2xl flex flex-col max-h-[90vh] printable-area">
        
        {/* ── SCREEN VIEW HEADER ── */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 no-print">
          <div>
            <h2 className="text-lg font-black text-gray-800">Customer Ledger Statement</h2>
            <p className="text-xs text-gray-500 font-medium">Account statement for {customerName}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition">
              <Printer size={14} /> Print Ledger
            </button>
            <button onClick={onClose} className="p-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl transition">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── PRINT VIEW EXACT LAYOUT ── */}
        <div className="hidden print:block p-8 font-sans text-[11px] text-black">
          <PrintHeader title="Customer Ledger Statement" subtitle="Store(s): Main Store" />

          <div className="flex justify-between items-end mb-2 font-bold text-xs">
            <div className="w-1/3 text-left">{customerName}</div>
            <div className="w-1/3 text-center">Credit limit: &nbsp;&nbsp;&nbsp;&nbsp; {Number(300000).toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
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
                <th className="py-1.5 font-bold text-right">Debit</th>
                <th className="py-1.5 font-bold text-right">Credit</th>
                <th className="py-1.5 font-bold text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {ledgerRows.map((row, idx) => (
                <tr key={idx}>
                  <td className="py-1">{row.date}</td>
                  <td className="py-1">Main Store</td>
                  <td className="py-1">Invoice</td>
                  <td className="py-1">{row.invoice_no}</td>
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
              <span>{runningBalance.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
            </div>
          </div>
          <div className="flex justify-end mt-1 pt-1 border-b border-black font-bold mb-10 pb-1">
            <div className="w-1/2 flex justify-between pl-20 pr-1">
              <span>Closing balance:</span>
              <span>{runningBalance.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
            </div>
          </div>
        </div>

        {/* ── SCREEN VIEW BODY ── */}
        <div className="p-6 overflow-y-auto no-print">
          
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <h3 className="text-sm font-bold text-gray-800">{customerName}</h3>
              <p className="text-xs text-gray-500 font-medium mt-1">{customer.phone || 'No Phone'} • {customer.address || 'No Address'}</p>
            </div>
            <div className="text-right border-r border-gray-200 pr-4">
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">Total Sales (Debit)</p>
              <p className="text-lg font-black text-red-600">Rs. {totalDebit.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">Total Payments (Credit)</p>
              <p className="text-lg font-black text-green-600">Rs. {totalCredit.toLocaleString()}</p>
            </div>
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">
                  <th className="p-3 w-24">Date</th>
                  <th className="p-3">Particulars & Details</th>
                  <th className="p-3 text-right w-28">Debit (Rs.)</th>
                  <th className="p-3 text-right w-28">Credit (Rs.)</th>
                  <th className="p-3 text-right w-32">Balance (Rs.)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {ledgerRows.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-gray-400 font-bold">No transactions found for this customer.</td>
                  </tr>
                ) : (
                  ledgerRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 align-top">
                      <td className="p-3 text-gray-600 font-bold whitespace-nowrap pt-4">{row.date}</td>
                      <td className="p-3 pt-4">
                        <div className="font-bold text-gray-800 mb-1">Sales Bill <span className="font-mono text-blue-600">#{row.invoice_no}</span></div>
                        <div className="text-[10px] text-gray-500 space-y-0.5">
                          {row.products.length > 0 ? (
                            row.products.map((prod, pIdx) => (
                              <div key={pIdx}>• {prod}</div>
                            ))
                          ) : (
                            <div className="italic">No products listed</div>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-right font-black text-red-600 pt-4">
                        {row.debit > 0 ? row.debit.toLocaleString() : '-'}
                      </td>
                      <td className="p-3 text-right font-black text-green-600 pt-4">
                        {row.credit > 0 ? row.credit.toLocaleString() : '-'}
                      </td>
                      <td className="p-3 text-right font-black text-gray-900 bg-gray-50/50 pt-4">
                        {row.balance.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
                {ledgerRows.length > 0 && (
                  <tr className="bg-gray-50 border-t-2 border-gray-300">
                    <td colSpan="2" className="p-3 text-right font-black text-gray-800 uppercase tracking-wider text-[11px]">Closing Balance</td>
                    <td className="p-3 text-right font-black text-red-700">{totalDebit.toLocaleString()}</td>
                    <td className="p-3 text-right font-black text-green-700">{totalCredit.toLocaleString()}</td>
                    <td className="p-3 text-right font-black text-gray-900">{runningBalance.toLocaleString()}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-wrapper { position: absolute; left: 0; top: 0; width: 100%; height: 100%; background: transparent; z-index: 9999; }
          .printable-area, .printable-area * { visibility: visible; }
          .printable-area { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none; border: none; max-width: 100%; max-height: none; overflow: visible; }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
}

// ─── Main Ledger Screen ───────────────────────────────────────────────────────
export default function LedgerScreen({ invoices = [] }) {
  const { t } = useLanguage();
  const [selectedCust, setSelectedCust] = useState('All');
  const [historyModalCust, setHistoryModalCust] = useState(null);
  const [autoPrintCust, setAutoPrintCust] = useState(null);
  
  const mockLedgerEntries = [
    { id: 1, date: '2026-07-27', customer: 'Suresh Agro Agencies', ref: 'INV-2026-0001', type: 'Sales Bill', debit: 17850, credit: 17850, balance: 145000 },
    { id: 2, date: '2026-07-27', customer: 'Ramesh Kumar Chaudhary', ref: 'INV-2026-0002', type: 'Sales Bill', debit: 8460, credit: 2000, balance: 22800 },
    { id: 3, date: '2026-07-26', customer: 'Verma Seeds & Chemicals', ref: 'INV-2026-0003', type: 'Sales Bill', debit: 35300, credit: 0, balance: 320000 },
    { id: 4, date: '2026-07-25', customer: 'Suresh Agro Agencies', ref: 'PAY-1002', type: 'Cash Recovery', debit: 0, credit: 25000, balance: 145000 },
    { id: 5, date: '2026-07-24', customer: 'Verma Seeds & Chemicals', ref: 'PAY-1003', type: 'Bank Settlement', debit: 0, credit: 50000, balance: 284700 }
  ];

  const filteredEntries = selectedCust === 'All' 
    ? mockLedgerEntries 
    : mockLedgerEntries.filter(e => e.customer === selectedCust);

  const openHistory = (customerName, print = false) => {
    setHistoryModalCust(customerName);
    setAutoPrintCust(print);
  };

  const closeHistory = () => {
    setHistoryModalCust(null);
    setAutoPrintCust(false);
  };

  return (
    <div className={`bg-white rounded-2xl border border-gray-200 p-6 shadow-sm ${historyModalCust ? 'print:p-0 print:border-none print:shadow-none bg-transparent' : 'space-y-6'}`}>
      
      {/* Main Screen Content - Hidden during Print */}
      <div className={`space-y-6 flex-col ${historyModalCust ? 'print:hidden flex' : 'flex'}`}>
        {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-br from-green-100 to-green-200 p-2.5 rounded-xl text-green-700 shadow-inner">
            <BookOpen size={24} />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-gray-800 uppercase tracking-wider">Customer Journal Ledger Book</h2>
            <p className="text-xs text-gray-500 font-medium">Track wholesale debits, payment recoveries, and running client balances</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="font-bold text-gray-500 uppercase tracking-wider text-[10px]">Filter Customer:</span>
          <select
            value={selectedCust}
            onChange={(e) => setSelectedCust(e.target.value)}
            className="rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 font-bold text-gray-700 focus:outline-none focus:border-green-500 transition shadow-sm"
          >
            <option value="All">All Customer Accounts</option>
            {CUSTOMERS.filter(c => c.code !== 'CUST-WALK').map(c => (
               <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              <th className="py-4 px-4">Transaction Date</th>
              <th className="py-4 px-4">Customer Account</th>
              <th className="py-4 px-4">Reference No</th>
              <th className="py-4 px-4">Transaction Type</th>
              <th className="py-4 px-4 text-right">Debit (Rs.)</th>
              <th className="py-4 px-4 text-right">Credit (Rs.)</th>
              <th className="py-4 px-4 text-right">Balance (Rs.)</th>
              <th className="py-4 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {filteredEntries.map((entry) => (
              <tr key={entry.id} className="hover:bg-gray-50 transition group">
                <td className="py-3 px-4 text-gray-500 font-bold">{entry.date}</td>
                <td className="py-3 px-4 font-black text-gray-800">{entry.customer}</td>
                <td className="py-3 px-4 font-mono font-bold text-gray-500 bg-gray-50/50">{entry.ref}</td>
                <td className="py-3 px-4 font-bold text-gray-600">{entry.type}</td>
                <td className="py-3 px-4 text-right text-red-600 font-black">
                  {entry.debit > 0 ? entry.debit.toLocaleString() : '-'}
                </td>
                <td className="py-3 px-4 text-right text-green-600 font-black">
                  {entry.credit > 0 ? entry.credit.toLocaleString() : '-'}
                </td>
                <td className="py-3 px-4 text-right font-black text-gray-900 bg-gray-50/50">
                  {entry.balance.toLocaleString()}
                </td>
                <td className="py-3 px-4 text-center">
                  <div className="flex items-center justify-center space-x-1.5 opacity-80 group-hover:opacity-100 transition">
                    <button 
                      onClick={() => openHistory(entry.customer, false)}
                      className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg transition"
                      title="View Customer Product History"
                    >
                      <Eye size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      </div>

      {historyModalCust && (
        <CustomerLedgerModal 
          customerName={historyModalCust} 
          invoices={invoices} 
          onClose={closeHistory}
          autoPrint={autoPrintCust}
        />
      )}
    </div>
  );
}
