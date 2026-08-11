const Customer = require('../models/Customer');
const CustomerPayment = require('../models/CustomerPayment');
const SaleInvoice = require('../models/SaleInvoice');
const ApiError = require('../utils/apiError');

const getAllCustomers = async () => {
  return await Customer.find({}).sort({ createdAt: -1 });
};

const createCustomer = async (custData) => {
  const count = await Customer.countDocuments();
  const code = custData.code || `CUST-REG${count + 1}`;
  return await Customer.create({ ...custData, code });
};

const updateCustomer = async (id, updateData) => {
  const cust = await Customer.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
  if (!cust) throw new ApiError(404, 'Customer not found');
  return cust;
};

const recordCustomerPayment = async (customerId, paymentData) => {
  const customer = await Customer.findById(customerId);
  if (!customer) throw new ApiError(404, 'Customer not found');

  const { amount, payment_method, payment_details, notes } = paymentData;
  const numAmt = Number(amount);

  customer.outstanding_balance = Math.max(0, customer.outstanding_balance - numAmt);
  await customer.save();

  const ref_no = `CP-${Date.now()}`;
  const payment = await CustomerPayment.create({
    customer_id: customer._id,
    customer_name: customer.name,
    date: new Date().toISOString().split('T')[0],
    amount: numAmt,
    payment_method,
    payment_details: payment_details || {},
    ref_no,
    type: 'Direct Receipt',
    notes: notes || `Direct Debt Payment by ${customer.name}`
  });

  return payment;
};

const getCustomerLedger = async (customerId) => {
  const customer = await Customer.findById(customerId);
  if (!customer) throw new ApiError(404, 'Customer not found');

  const invoices = await SaleInvoice.find({ customer_id: customerId, status: { $ne: 'Cancelled' } });
  const payments = await CustomerPayment.find({ customer_id: customerId });

  const rows = [];

  invoices.forEach(inv => {
    if (inv.payment_status === 'Credit' || inv.payment_status === 'Partial') {
      rows.push({
        id: `INV-${inv.invoice_no}`,
        date: inv.date,
        rawDate: new Date(inv.date),
        type: 'Sale Credit',
        refNo: inv.invoice_no,
        description: `POS Credit Sale Invoice #${inv.invoice_no}`,
        moneyIn: 0,
        moneyOut: inv.grand_total,
        paid: inv.paid_amount,
        balanceDue: inv.remaining_amount
      });
    }
  });

  payments.forEach(cp => {
    rows.push({
      id: `PAY-${cp.ref_no}`,
      date: cp.date,
      rawDate: new Date(cp.date),
      type: cp.type,
      refNo: cp.ref_no,
      description: cp.notes || `Customer Payment via ${cp.payment_method}`,
      moneyIn: cp.amount,
      moneyOut: 0
    });
  });

  rows.sort((a, b) => a.rawDate - b.rawDate);

  let running = 0;
  const statementRows = rows.map(r => {
    running = running + r.moneyOut - r.moneyIn;
    return { ...r, runningBalance: running };
  });

  return {
    customer,
    statementRows,
    totalOutstanding: customer.outstanding_balance
  };
};

module.exports = {
  getAllCustomers,
  createCustomer,
  updateCustomer,
  recordCustomerPayment,
  getCustomerLedger
};
