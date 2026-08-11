const SaleInvoice = require('../models/SaleInvoice');
const PurchaseOrder = require('../models/PurchaseOrder');
const Product = require('../models/Product');
const Expense = require('../models/Expense');
const Customer = require('../models/Customer');
const Vendor = require('../models/Vendor');
const Account = require('../models/Account');

const getSalesReport = async (startDate, endDate) => {
  const query = { status: { $ne: 'Cancelled' } };
  const invoices = await SaleInvoice.find(query);

  let totalSales = 0;
  let totalDiscount = 0;
  let totalTax = 0;
  let totalPaid = 0;
  let totalCredit = 0;

  invoices.forEach(inv => {
    totalSales += (inv.grand_total || 0);
    totalDiscount += (inv.discount_amount || 0) + (inv.bill_discount || 0);
    totalTax += (inv.tax_amount || 0);
    totalPaid += (inv.paid_amount || 0);
    totalCredit += (inv.remaining_amount || 0);
  });

  return {
    invoiceCount: invoices.length,
    totalSales,
    totalDiscount,
    totalTax,
    totalPaid,
    totalCredit,
    invoices
  };
};

const getPurchaseReport = async (startDate, endDate) => {
  const pos = await PurchaseOrder.find({ status: { $ne: 'Cancelled' } });

  let totalPurchases = 0;
  let totalFreight = 0;

  pos.forEach(po => {
    totalPurchases += (po.total || 0);
    totalFreight += (po.transport?.charges || 0);
  });

  return {
    poCount: pos.length,
    totalPurchases,
    totalFreight,
    purchaseOrders: pos
  };
};

const getStockReport = async () => {
  const products = await Product.find({}).populate('company_id category_id');

  let totalProducts = products.length;
  let totalValuationCost = 0;
  let totalValuationRetail = 0;
  let lowStockCount = 0;

  products.forEach(p => {
    const totalStock = p.batches ? p.batches.reduce((s, b) => s + (b.stock_qty || 0), 0) : 0;
    if (totalStock <= (p.min_stock || 15)) lowStockCount++;
    totalValuationCost += totalStock * (p.purchase_price || 0);
    totalValuationRetail += totalStock * (p.retail_price || 0);
  });

  return {
    totalProducts,
    lowStockCount,
    totalValuationCost,
    totalValuationRetail,
    products
  };
};

const getExpenseReport = async () => {
  const expenses = await Expense.find({ status: 'Paid' });

  let totalExpense = 0;
  const categoryMap = {};

  expenses.forEach(e => {
    totalExpense += (e.amount || 0);
    categoryMap[e.category] = (categoryMap[e.category] || 0) + (e.amount || 0);
  });

  return {
    totalExpense,
    categoryBreakdown: categoryMap,
    expenses
  };
};

const getTrialBalance = async () => {
  const invoices = await SaleInvoice.find({ status: { $ne: 'Cancelled' } });
  const pos = await PurchaseOrder.find({ status: { $ne: 'Cancelled' } });
  const expenses = await Expense.find({ status: 'Paid' });
  const customers = await Customer.find({});
  const vendors = await Vendor.find({});
  const accounts = await Account.find({});

  let cashAndBankBalance = accounts.reduce((s, a) => s + (a.opening_balance || 0), 0);
  let totalAccountsReceivable = customers.reduce((s, c) => s + (c.outstanding_balance || 0), 0);
  let totalAccountsPayable = vendors.reduce((s, v) => s + (v.outstanding_balance || 0), 0);
  let totalSalesRevenue = invoices.reduce((s, i) => s + (i.grand_total || 0), 0);
  let totalPurchasesCost = pos.reduce((s, p) => s + (p.total || 0), 0);
  let totalExpensesCost = expenses.reduce((s, e) => s + (e.amount || 0), 0);

  const debits = cashAndBankBalance + totalAccountsReceivable + totalPurchasesCost + totalExpensesCost;
  const credits = totalAccountsPayable + totalSalesRevenue;

  return {
    accountsReceivable: totalAccountsReceivable,
    accountsPayable: totalAccountsPayable,
    purchasesCost: totalPurchasesCost,
    expensesCost: totalExpensesCost,
    salesRevenue: totalSalesRevenue,
    cashAndBank: cashAndBankBalance,
    totalDebit: debits,
    totalCredit: credits,
    isBalanced: Math.abs(debits - credits) < 1
  };
};

const getBalanceSheet = async () => {
  const stockReport = await getStockReport();
  const trialBalance = await getTrialBalance();

  const totalAssets = trialBalance.cashAndBank + trialBalance.accountsReceivable + stockReport.totalValuationCost;
  const totalLiabilities = trialBalance.accountsPayable;
  const equity = totalAssets - totalLiabilities;

  return {
    assets: {
      cashAndBank: trialBalance.cashAndBank,
      accountsReceivable: trialBalance.accountsReceivable,
      inventoryValuation: stockReport.totalValuationCost,
      totalAssets
    },
    liabilities: {
      accountsPayable: trialBalance.accountsPayable,
      totalLiabilities
    },
    equity: {
      ownerEquity: equity,
      totalEquity: equity
    },
    isBalanced: true
  };
};

module.exports = {
  getSalesReport,
  getPurchaseReport,
  getStockReport,
  getExpenseReport,
  getTrialBalance,
  getBalanceSheet
};
