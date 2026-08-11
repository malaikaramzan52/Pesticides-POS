const Account = require('../models/Account');
const SaleInvoice = require('../models/SaleInvoice');
const Expense = require('../models/Expense');
const PurchaseOrder = require('../models/PurchaseOrder');
const CustomerPayment = require('../models/CustomerPayment');
const VendorPayment = require('../models/VendorPayment');
const { normalizeAccountName } = require('../utils/accountUtils');
const { isItemInDateRange } = require('../utils/dateUtils');
const ApiError = require('../utils/apiError');

const DEFAULT_ACCOUNTS = [
  { account_name: 'Cash', type: 'Cash', opening_balance: 0 },
  { account_name: 'HBL', type: 'Bank', provider_name: 'Habib Bank Limited', opening_balance: 0 },
  { account_name: 'Meezan Bank', type: 'Bank', provider_name: 'Meezan Bank', opening_balance: 0 },
  { account_name: 'EasyPaisa', type: 'Mobile Wallet', provider_name: 'EasyPaisa', opening_balance: 0 },
  { account_name: 'JazzCash', type: 'Mobile Wallet', provider_name: 'JazzCash', opening_balance: 0 },
  { account_name: 'SadaPay', type: 'Mobile Wallet', provider_name: 'SadaPay', opening_balance: 0 },
  { account_name: 'Card', type: 'Card', opening_balance: 0 },
  { account_name: 'Cheque', type: 'Cheque', opening_balance: 0 }
];

const getAccounts = async () => {
  let accounts = await Account.find({ status: 'Active' });
  if (accounts.length === 0) {
    accounts = await Account.insertMany(DEFAULT_ACCOUNTS);
  }
  return accounts;
};

const createAccount = async (accountData) => {
  const existing = await Account.findOne({ account_name: accountData.account_name });
  if (existing) throw new ApiError(400, 'Account with this name already exists');

  return await Account.create(accountData);
};

const updateOpeningBalances = async (balancesObject) => {
  for (const [accountName, balance] of Object.entries(balancesObject)) {
    const norm = normalizeAccountName(accountName);
    await Account.findOneAndUpdate(
      { account_name: norm },
      { opening_balance: Number(balance) || 0 },
      { upsert: true }
    );
  }
  return await getAccounts();
};

const getAccountStatement = async ({ accountName = 'Cash', startDate = '', endDate = '', searchQuery = '' }) => {
  const targetAcc = normalizeAccountName(accountName);

  const accDoc = await Account.findOne({ account_name: targetAcc });
  const initialOpeningBalance = accDoc ? accDoc.opening_balance : 0;

  const rawRows = [];

  // 1. Sales Invoices (Money In) & Cancelled Refund (Money Out)
  const invoices = await SaleInvoice.find({});
  invoices.forEach(inv => {
    const invAcc = normalizeAccountName(inv.payment_method || 'Cash');
    if (invAcc === targetAcc && inv.status !== 'Cancelled') {
      const amt = inv.paid_amount !== undefined ? Number(inv.paid_amount) : Number(inv.grand_total || 0);
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

    if (inv.status === 'Cancelled' && inv.refund_status === 'Refunded') {
      const refundAcc = normalizeAccountName(inv.refund_method || inv.payment_method || 'Cash');
      if (refundAcc === targetAcc) {
        const refundAmt = inv.paid_amount !== undefined ? Number(inv.paid_amount) : Number(inv.grand_total || 0);
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
  const expenses = await Expense.find({ status: 'Paid' });
  expenses.forEach(exp => {
    const expAcc = normalizeAccountName(exp.payment_method || 'Cash');
    if (expAcc === targetAcc) {
      const amt = Number(exp.amount || 0);
      if (amt > 0) {
        rawRows.push({
          id: `EXP-${exp.expense_no}`,
          date: exp.date,
          rawDate: new Date(exp.date),
          type: 'Expense Payment',
          module: 'Expenses',
          refNo: exp.ref_no && exp.ref_no !== 'N/A' ? exp.ref_no : exp.expense_no,
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
  const posList = await PurchaseOrder.find({ status: { $ne: 'Cancelled' } });
  posList.forEach(po => {
    const poAcc = normalizeAccountName(po.payment_method || 'Bank Transfer');
    if (poAcc === targetAcc) {
      const amt = Number(po.total || 0);
      if (amt > 0) {
        rawRows.push({
          id: `PO-${po.po_no}`,
          date: po.date,
          rawDate: new Date(po.date),
          type: 'Purchase Payment',
          module: 'Purchases',
          refNo: po.po_no,
          party: po.supplier || 'Supplier',
          description: `PO Stock Inward - ${po.supplier}`,
          moneyIn: 0,
          moneyOut: amt,
          status: po.status || 'Completed'
        });
      }
    }
  });

  // 4. Customer Receipts (Money In)
  const custPayments = await CustomerPayment.find({});
  custPayments.forEach(cp => {
    const cpAcc = normalizeAccountName(cp.payment_method || 'Cash');
    if (cpAcc === targetAcc) {
      const amt = Number(cp.amount || 0);
      if (amt > 0) {
        rawRows.push({
          id: `CP-${cp.ref_no}`,
          date: cp.date,
          rawDate: new Date(cp.date),
          type: 'Customer Receipt',
          module: 'Customer Ledger',
          refNo: cp.ref_no,
          party: cp.customer_name || 'Customer',
          description: `Direct Debt Payment by ${cp.customer_name}`,
          moneyIn: amt,
          moneyOut: 0,
          status: 'Received'
        });
      }
    }
  });

  // 5. Vendor Disbursements (Money Out)
  const vendorPayments = await VendorPayment.find({});
  vendorPayments.forEach(vp => {
    const vpAcc = normalizeAccountName(vp.payment_method || 'Bank Transfer');
    if (vpAcc === targetAcc) {
      const amt = Number(vp.amount || 0);
      if (amt > 0) {
        rawRows.push({
          id: `VP-${vp.ref_no}`,
          date: vp.date,
          rawDate: new Date(vp.date),
          type: 'Vendor Payment',
          module: 'Vendor Ledger',
          refNo: vp.ref_no,
          party: vp.vendor_name || 'Vendor',
          description: `Disbursement to Supplier ${vp.vendor_name}`,
          moneyIn: 0,
          moneyOut: amt,
          status: 'Paid'
        });
      }
    }
  });

  // Sort chronologically ascending
  rawRows.sort((a, b) => a.rawDate - b.rawDate);

  // Compute Running Balance for ALL rows
  let currentRunning = initialOpeningBalance;
  const processedRows = rawRows.map(row => {
    currentRunning = currentRunning + row.moneyIn - row.moneyOut;
    return {
      ...row,
      runningBalance: currentRunning
    };
  });

  // Date range filter
  const dateFiltered = processedRows.filter(row => isItemInDateRange(row.date, startDate, endDate));

  // Search filter
  const q = searchQuery.toLowerCase().trim();
  const searchFiltered = dateFiltered.filter(row => {
    if (!q) return true;
    return (
      (row.refNo || '').toLowerCase().includes(q) ||
      (row.description || '').toLowerCase().includes(q) ||
      (row.type || '').toLowerCase().includes(q) ||
      (row.party || '').toLowerCase().includes(q) ||
      (row.module || '').toLowerCase().includes(q)
    );
  });

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

module.exports = {
  getAccounts,
  createAccount,
  updateOpeningBalances,
  getAccountStatement
};
