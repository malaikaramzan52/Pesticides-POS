import React, { useEffect } from 'react';
import { CreditCard, Smartphone, Building, Coins, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function PaymentProcessor({
  paymentMethod,
  setPaymentMethod,
  grandTotal,
  receivedAmount,
  setReceivedAmount,
  paymentDetails,
  setPaymentDetails,
  allowedMethods = ['Cash', 'Card', 'Bank Transfer', 'Mobile Wallet', 'Credit'],
  layout = 'vertical', // 'vertical' for forms like Expense, 'compact' for POS
  transactionType = 'in' // 'in' for sales, 'out' for expenses/purchases
}) {
  const { t } = useLanguage();

  // Reset payment details when method changes
  useEffect(() => {
    setPaymentDetails({});
    if (paymentMethod === 'Cash') {
      // Keep receivedAmount if it was already set, otherwise empty
    } else if (paymentMethod === 'Credit') {
      setReceivedAmount(''); // Default to 0 for credit
    } else {
      setReceivedAmount(grandTotal); // Auto-fill for non-cash methods
    }
  }, [paymentMethod, setPaymentDetails, setReceivedAmount, grandTotal]);

  const updateDetail = (key, value) => {
    setPaymentDetails(prev => ({ ...prev, [key]: value }));
  };

  const changeReturn = Math.max(0, (parseFloat(receivedAmount) || 0) - grandTotal);
  const receivedVal = parseFloat(receivedAmount) || 0;

  const renderMethodButtons = () => (
    <div className={`grid gap-2 ${layout === 'compact' ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5'}`}>
      {allowedMethods.map(m => (
        <button
          key={m}
          type="button"
          onClick={() => setPaymentMethod(m)}
          className={`py-2 px-3 rounded-xl text-xs font-extrabold border transition cursor-pointer flex flex-col items-center justify-center gap-1 min-h-[60px] ${
            paymentMethod === m
              ? 'bg-green-600 text-white border-green-600 shadow-sm'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          {m === 'Cash' && <Coins size={18} />}
          {m === 'Card' && <CreditCard size={18} />}
          {m === 'Bank Transfer' && <Building size={18} />}
          {m === 'Mobile Wallet' && <Smartphone size={18} />}
          {m === 'Credit' && <AlertTriangle size={18} />}
          <span>{m}</span>
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* 1. Payment Method Selection */}
      <div>
        <label className="text-xs font-black text-gray-700 uppercase tracking-wider block mb-2">
          {layout === 'compact' ? '1. Payment Method' : 'Payment Method'}
        </label>
        {renderMethodButtons()}
      </div>

      {/* 2. Dynamic Fields */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-4">
        
        {paymentMethod === 'Cash' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-700 uppercase">
                {transactionType === 'out' ? 'Paid Amount (Rs.)' : 'Received Amount (Rs.)'}
              </label>
              {changeReturn > 0 && (
                <span className="text-xs font-bold text-green-700 font-mono">Return Change: Rs. {changeReturn.toFixed(2)}</span>
              )}
            </div>
            <input
              type="number"
              min="0"
              value={receivedAmount}
              onChange={e => setReceivedAmount(e.target.value)}
              placeholder={`Enter ${transactionType === 'out' ? 'paid' : 'received'} amount e.g. Rs. ${grandTotal}`}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-800 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
            />
            {receivedVal < 0 && receivedAmount !== '' && (
              <p className="text-xs text-red-600 font-semibold flex items-center gap-1.5 mt-1">
                <AlertTriangle size={14} className="shrink-0" /> Amount cannot be negative
              </p>
            )}
            {receivedVal >= 0 && receivedVal < grandTotal && receivedAmount !== '' && (
              <p className="text-xs text-red-600 font-semibold flex items-center gap-1.5 mt-1">
                <AlertTriangle size={14} className="shrink-0" /> Short by Rs. {(grandTotal - receivedVal).toLocaleString()}
              </p>
            )}
          </div>
        )}

        {paymentMethod === 'Card' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase">Card Type</label>
              <select
                value={paymentDetails.card_type || ''}
                onChange={e => updateDetail('card_type', e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold focus:border-green-600 focus:outline-none"
              >
                <option value="">Select Card Type</option>
                <option value="Visa">Visa</option>
                <option value="Mastercard">Mastercard</option>
                <option value="PayPak">PayPak</option>
                <option value="UnionPay">UnionPay</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase">Cardholder / Slip Name</label>
              <input
                type="text"
                autoComplete="off"
                data-lpignore="true"
                data-form-type="other"
                data-1p-ignore="true"
                aria-autocomplete="none"
                value={paymentDetails.card_name || ''}
                onChange={e => updateDetail('card_name', e.target.value)}
                placeholder="e.g. Ali Khan"
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold focus:border-green-600 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase">Card Digits (Last 4)</label>
              <input
                type="text"
                autoComplete="off"
                data-lpignore="true"
                data-form-type="other"
                data-1p-ignore="true"
                aria-autocomplete="none"
                maxLength="4"
                value={paymentDetails.card_number || ''}
                onChange={e => updateDetail('card_number', e.target.value.replace(/\D/g, ''))}
                placeholder="e.g. 5678"
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold focus:border-green-600 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase">Approval / Auth Code</label>
              <input
                type="text"
                autoComplete="off"
                data-lpignore="true"
                data-form-type="other"
                data-1p-ignore="true"
                aria-autocomplete="none"
                value={paymentDetails.auth_code || ''}
                onChange={e => updateDetail('auth_code', e.target.value)}
                placeholder="Optional"
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold focus:border-green-600 focus:outline-none"
              />
            </div>
          </div>
        )}

        {paymentMethod === 'Bank Transfer' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase">Bank Name</label>
              <input
                type="text"
                autoComplete="off"
                value={paymentDetails.bank_name || ''}
                onChange={e => updateDetail('bank_name', e.target.value)}
                placeholder="e.g. HBL, Meezan, Allied"
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold focus:border-green-600 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase">Account / IBAN (Last 4)</label>
              <input
                type="text"
                autoComplete="off"
                value={paymentDetails.account_no || ''}
                onChange={e => updateDetail('account_no', e.target.value)}
                placeholder="e.g. 5678"
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold focus:border-green-600 focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase">Transaction ID / Reference</label>
              <input
                type="text"
                autoComplete="off"
                value={paymentDetails.transaction_id || ''}
                onChange={e => updateDetail('transaction_id', e.target.value)}
                placeholder="Txn ID"
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold focus:border-green-600 focus:outline-none"
              />
            </div>
          </div>
        )}

        {paymentMethod === 'Mobile Wallet' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase">Wallet Provider</label>
              <select
                value={paymentDetails.wallet_name || ''}
                onChange={e => updateDetail('wallet_name', e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold focus:border-green-600 focus:outline-none"
              >
                <option value="">Select Provider</option>
                <option value="JazzCash">JazzCash</option>
                <option value="EasyPaisa">EasyPaisa</option>
                <option value="SadaPay">SadaPay</option>
                <option value="NayaPay">NayaPay</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase">Mobile Number</label>
              <input
                type="text"
                autoComplete="off"
                value={paymentDetails.mobile_no || ''}
                onChange={e => updateDetail('mobile_no', e.target.value)}
                placeholder="03XX-XXXXXXX"
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold focus:border-green-600 focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase">Transaction ID (TID)</label>
              <input
                type="text"
                autoComplete="off"
                value={paymentDetails.transaction_id || ''}
                onChange={e => updateDetail('transaction_id', e.target.value)}
                placeholder="e.g. 0212345678"
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold focus:border-green-600 focus:outline-none"
              />
            </div>
          </div>
        )}

        {paymentMethod === 'Credit' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 uppercase block">
                Partial Payment / Advance (Rs.)
              </label>
              <input
                type="number"
                min="0"
                value={receivedAmount}
                onChange={e => setReceivedAmount(e.target.value)}
                placeholder={`Enter amount if any (e.g. 500)`}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-800 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
              />
              {receivedVal < 0 && receivedAmount !== '' && (
                <p className="text-xs text-red-600 font-semibold flex items-center gap-1.5 mt-1">
                  <AlertTriangle size={14} className="shrink-0" /> Amount cannot be negative
                </p>
              )}
              {receivedVal > 0 && receivedVal < grandTotal && (
                <p className="text-xs text-amber-600 font-semibold mt-1">
                  Rs. {(grandTotal - receivedVal).toLocaleString()} will be added to the ledger.
                </p>
              )}
              {receivedVal >= grandTotal && (
                <p className="text-xs text-green-600 font-semibold">
                  Fully paid. Consider selecting Cash or another payment method.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
