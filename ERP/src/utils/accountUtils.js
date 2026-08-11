import { getStoredData, setStoredData } from './mockData';
import { isItemInDateRange } from './dateUtils';

// Account Types List
export const getConfiguredBanks = () => {
  return getStoredData('AGRO_ERP_BANK_ACCOUNTS', ['HBL', 'Meezan Bank', 'UBL', 'Bank Alfalah']);
};

export const addConfiguredBank = (bankName) => {
  const current = getConfiguredBanks();
  if (!current.includes(bankName)) {
    const updated = [...current, bankName];
    setStoredData('AGRO_ERP_BANK_ACCOUNTS', updated);
  }
};

export const getConfiguredWallets = () => {
  return getStoredData('AGRO_ERP_WALLET_ACCOUNTS', ['EasyPaisa', 'JazzCash', 'SadaPay / NayaPay']);
};

export const addConfiguredWallet = (walletName) => {
  const current = getConfiguredWallets();
  if (!current.includes(walletName)) {
    const updated = [...current, walletName];
    setStoredData('AGRO_ERP_WALLET_ACCOUNTS', updated);
  }
};

export const getDetailedAccounts = () => {
  return getStoredData('AGRO_ERP_DETAILED_ACCOUNTS', []);
};

export const addDetailedAccount = (accObj) => {
  const current = getDetailedAccounts();
  const updated = [...current, accObj];
  setStoredData('AGRO_ERP_DETAILED_ACCOUNTS', updated);
};

export const getSupportedAccounts = () => {
  const baseAccounts = [
    { id: 'Cash', name: 'Cash', label: 'Cash', icon: 'Wallet', badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  ];

  const banks = getConfiguredBanks();
  const bankAccounts = banks.map(b => ({
    id: b,
    name: b,
    label: `Bank - ${b}`,
    icon: 'Building2',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200'
  }));

  const wallets = getConfiguredWallets();
  const walletAccounts = wallets.map(w => ({
    id: w,
    name: w,
    label: `Wallet - ${w}`,
    icon: 'Smartphone',
    badgeColor: 'bg-green-50 text-green-700 border-green-200'
  }));

  const detailed = getDetailedAccounts();
  const detailedAccounts = detailed.map(d => ({
    id: d.accountName,
    name: d.accountName,
    label: `${d.type} - ${d.accountName}`,
    icon: d.type === 'Bank' ? 'Building2' : (d.type === 'Mobile Wallet' ? 'Smartphone' : (d.type === 'Cash' ? 'Wallet' : 'CreditCard')),
    badgeColor: d.type === 'Bank' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-green-50 text-green-700 border-green-200'
  }));

  const remainingBase = [
    { id: 'Card', name: 'Card', label: 'Credit / Debit Card', icon: 'CreditCard', badgeColor: 'bg-purple-50 text-purple-700 border-purple-200' },
    { id: 'Cheque', name: 'Cheque', label: 'Cheque Clearance', icon: 'FileText', badgeColor: 'bg-amber-50 text-amber-700 border-amber-200' }
  ];

  // We filter out from base accounts any that are identically named to avoid duplicates
  const allCustomNames = new Set([...banks, ...wallets, ...detailed.map(d => d.accountName)]);
  const finalRemaining = remainingBase.filter(r => !allCustomNames.has(r.name));

  return [...baseAccounts, ...bankAccounts, ...walletAccounts, ...detailedAccounts, ...finalRemaining];
};

export const SUPPORTED_ACCOUNTS = getSupportedAccounts();

const DEFAULT_OPENING_BALANCES = {
  'Cash': 0,
  'Bank': 0,
  'Bank Transfer': 0,
  'EasyPaisa': 0,
  'JazzCash': 0,
  'SadaPay': 0,
  'Card': 0,
  'Cheque': 0
};

export const normalizeAccountName = (accName) => {
  if (!accName) return 'Cash';
  const lower = accName.toLowerCase().trim();
  if (lower.includes('cash') && !lower.includes('jazz') && !lower.includes('easy')) return 'Cash';
  if (lower.includes('easypaisa')) return 'EasyPaisa';
  if (lower.includes('jazzcash') || lower.includes('jazz')) return 'JazzCash';
  if (lower.includes('sadapay') || lower.includes('nayapay')) return 'SadaPay';
  if (lower.includes('card') || lower.includes('credit') || lower.includes('debit')) return 'Card';
  if (lower.includes('cheque') || lower.includes('check')) return 'Cheque';
  
  // Check against configured banks dynamically
  const banks = getConfiguredBanks();
  const matchedBank = banks.find(b => lower.includes(b.toLowerCase()));
  if (matchedBank) return matchedBank;

  // Check against configured wallets dynamically
  const wallets = getConfiguredWallets();
  const matchedWallet = wallets.find(w => lower.includes(w.toLowerCase()));
  if (matchedWallet) return matchedWallet;

  // Fallback for generic bank or transfer
  if (lower.includes('bank') || lower.includes('transfer')) return banks[0] || 'Bank';
  
  return accName;
};

// Get Opening Balances from localStorage
export const getAccountOpeningBalances = () => {
  return getStoredData('AGRO_ERP_ACCOUNT_OPENING_BALANCES', DEFAULT_OPENING_BALANCES);
};

// Save Opening Balances to localStorage
export const saveAccountOpeningBalances = (balances) => {
  setStoredData('AGRO_ERP_ACCOUNT_OPENING_BALANCES', balances);
};

/**
 * Aggregates all transactions across modules for a target account.
 */
export const getAccountStatementData = ({
  accountName = 'Cash',
  dateFilter = { startDate: '', endDate: '' },
  searchQuery = '',
  invoices = [],
  expenses = [],
  purchaseOrders = [],
  customerPayments = [],
  vendorPayments = []
}) => {
  const targetAcc = normalizeAccountName(accountName);
  const openingBalances = getAccountOpeningBalances();
  const initialOpeningBalance = Number(openingBalances[targetAcc] || openingBalances[accountName] || 0);

  // Fetch purchase orders from localStorage if not passed
  const posList = (purchaseOrders && purchaseOrders.length > 0) 
    ? purchaseOrders 
    : getStoredData('AGRO_ERP_PURCHASE_ORDERS', []);

  // Fetch customer payments from localStorage if not passed
  const custPayList = (customerPayments && customerPayments.length > 0)
    ? customerPayments
    : getStoredData('AGRO_ERP_CUSTOMER_PAYMENTS', []);

  // Fetch vendor payments from localStorage if not passed
  const vdrPayList = (vendorPayments && vendorPayments.length > 0)
    ? vendorPayments
    : getStoredData('AGRO_ERP_VENDOR_PAYMENTS', []);

  const rawRows = [];

  // 1. Sales Invoices (Money In)
  invoices.forEach(inv => {
    const invAcc = normalizeAccountName(inv.payment_method || 'Cash');
    if (invAcc === targetAcc && inv.status !== 'Cancelled') {
      const amt = inv.amount_paid !== undefined ? Number(inv.amount_paid) : Number(inv.grand_total || 0);
      if (amt > 0) {
        rawRows.push({
          id: `INV-${inv.invoice_no}`,
          date: inv.date,
          rawDate: new Date(inv.date),
          type: 'Sale Payment',
          module: 'Sales',
          refNo: inv.invoice_no,
          party: inv.customer_name || 'Walk-in Customer',
          description: `POS Counter Sale - ${inv.customer_name || 'Walk-in'}`,
          moneyIn: amt,
          moneyOut: 0,
          status: inv.status || 'Completed'
        });
      }
    }

    // Handle Cancelled Sale Refunds (Money Out)
    if (inv.status === 'Cancelled' && inv.refund_status === 'Refunded') {
      const refundAcc = normalizeAccountName(inv.refund_method || inv.payment_method || 'Cash');
      if (refundAcc === targetAcc) {
        const refundAmt = inv.amount_paid !== undefined ? Number(inv.amount_paid) : Number(inv.grand_total || 0);
        if (refundAmt > 0) {
          rawRows.push({
            id: `REF-${inv.invoice_no}`,
            date: inv.cancellation_details?.on || inv.date,
            rawDate: new Date(inv.cancellation_details?.on || inv.date),
            type: 'Sale Refund',
            module: 'Sales',
            refNo: `${inv.invoice_no}-REF`,
            party: inv.customer_name || 'Walk-in Customer',
            description: `Refund for Cancelled Invoice #${inv.invoice_no}`,
            moneyIn: 0,
            moneyOut: refundAmt,
            status: 'Refunded'
          });
        }
      }
    }
  });

  // 2. Expenses (Money Out)
  expenses.forEach(exp => {
    const expAcc = normalizeAccountName(exp.payment_method || 'Cash');
    if (expAcc === targetAcc && exp.status === 'Paid') {
      const amt = Number(exp.amount || 0);
      if (amt > 0) {
        rawRows.push({
          id: `EXP-${exp.id}`,
          date: exp.date,
          rawDate: new Date(exp.date),
          type: 'Expense Payment',
          module: 'Expenses',
          refNo: exp.ref_no && exp.ref_no !== 'N/A' ? exp.ref_no : exp.id,
          party: exp.category || 'Expense',
          description: `${exp.title} (${exp.category})`,
          moneyIn: 0,
          moneyOut: amt,
          status: exp.status || 'Paid'
        });
      }
    }
  });

  // 3. Purchase Orders (Money Out)
  posList.forEach(po => {
    if (po.status !== 'Cancelled') {
      const poAcc = normalizeAccountName(po.payment_method || 'Bank Transfer');
      if (poAcc === targetAcc) {
        const amt = Number(po.total || 0);
        if (amt > 0) {
          rawRows.push({
            id: `PO-${po.id}`,
            date: po.date,
            rawDate: new Date(po.date),
            type: 'Purchase Payment',
            module: 'Purchases',
            refNo: po.id,
            party: po.supplier || 'Supplier',
            description: `PO Stock Inward - ${po.supplier}`,
            moneyIn: 0,
            moneyOut: amt,
            status: po.status || 'Completed'
          });
        }
      }
    }
  });

  // 4. Customer Direct Ledger Payments (Money In)
  custPayList.forEach(cp => {
    const cpAcc = normalizeAccountName(cp.payment_method || 'Cash');
    if (cpAcc === targetAcc) {
      const amt = Number(cp.amount || 0);
      if (amt > 0) {
        rawRows.push({
          id: `CP-${cp.id || cp.ref_no}`,
          date: cp.date,
          rawDate: new Date(cp.date),
          type: 'Customer Receipt',
          module: 'Customer Ledger',
          refNo: cp.ref_no || cp.id,
          party: cp.customer_name || 'Customer',
          description: `Direct Debt Payment by ${cp.customer_name}`,
          moneyIn: amt,
          moneyOut: 0,
          status: 'Received'
        });
      }
    }
  });

  // 5. Vendor Direct Ledger Payments (Money Out)
  vdrPayList.forEach(vp => {
    const vpAcc = normalizeAccountName(vp.payment_method || 'Bank Transfer');
    if (vpAcc === targetAcc) {
      const amt = Number(vp.amount || 0);
      if (amt > 0) {
        rawRows.push({
          id: `VP-${vp.id || vp.ref_no}`,
          date: vp.date,
          rawDate: new Date(vp.date),
          type: 'Vendor Payment',
          module: 'Vendor Ledger',
          refNo: vp.ref_no || vp.id,
          party: vp.vendor_name || vp.supplier || 'Vendor',
          description: `Disbursement to Supplier ${vp.vendor_name || vp.supplier}`,
          moneyIn: 0,
          moneyOut: amt,
          status: 'Paid'
        });
      }
    }
  });

  // Sort chronologically ascending
  rawRows.sort((a, b) => a.rawDate - b.rawDate);

  // Compute Running Balance for ALL rows (from Opening Balance)
  let currentRunning = initialOpeningBalance;
  const processedRows = rawRows.map(row => {
    currentRunning = currentRunning + row.moneyIn - row.moneyOut;
    return {
      ...row,
      runningBalance: currentRunning
    };
  });

  // Filter by Date Range if specified
  const dateFiltered = processedRows.filter(row => {
    if (!dateFilter.startDate && !dateFilter.endDate) return true;
    return isItemInDateRange(row.date, dateFilter.startDate, dateFilter.endDate);
  });

  // Filter by Search Query if specified
  const queryNormalized = searchQuery.toLowerCase().trim();
  const searchFiltered = dateFiltered.filter(row => {
    if (!queryNormalized) return true;
    return (
      (row.refNo || '').toLowerCase().includes(queryNormalized) ||
      (row.description || '').toLowerCase().includes(queryNormalized) ||
      (row.type || '').toLowerCase().includes(queryNormalized) ||
      (row.party || '').toLowerCase().includes(queryNormalized) ||
      (row.module || '').toLowerCase().includes(queryNormalized)
    );
  });

  // Calculate Metrics
  const totalMoneyIn = searchFiltered.reduce((sum, r) => sum + r.moneyIn, 0);
  const totalMoneyOut = searchFiltered.reduce((sum, r) => sum + r.moneyOut, 0);
  const endingBalance = initialOpeningBalance + totalMoneyIn - totalMoneyOut;

  return {
    accountName: targetAcc,
    openingBalance: initialOpeningBalance,
    moneyIn: totalMoneyIn,
    moneyOut: totalMoneyOut,
    currentBalance: endingBalance,
    rows: searchFiltered,
    totalCount: searchFiltered.length
  };
};
