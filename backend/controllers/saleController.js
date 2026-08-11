const SaleInvoice = require('../models/SaleInvoice');
const Customer = require('../models/Customer');
const CustomerPayment = require('../models/CustomerPayment');
const { successResponse } = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');

const getSalesHistory = async (req, res, next) => {
  try {
    const query = {};
    if (req.query.status) query.payment_status = req.query.status;
    if (req.query.customer_id) query.customer_id = req.query.customer_id;
    if (req.query.invoice_no) query.invoice_no = new RegExp(req.query.invoice_no, 'i');

    const invoices = await SaleInvoice.find(query).sort({ date: -1, createdAt: -1 });
    return successResponse(res, 'Sales history fetched successfully', invoices);
  } catch (error) {
    next(error);
  }
};

const getSaleById = async (req, res, next) => {
  try {
    const invoice = await SaleInvoice.findById(req.params.id);
    if (!invoice) throw new ApiError(404, 'Sale invoice not found');
    return successResponse(res, 'Sale invoice fetched successfully', invoice);
  } catch (error) {
    next(error);
  }
};

const paySaleBalance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, payment_method, payment_details, notes } = req.body;
    const payAmt = Number(amount);

    const invoice = await SaleInvoice.findById(id);
    if (!invoice) throw new ApiError(404, 'Sale invoice not found');

    if (invoice.remaining_amount <= 0) {
      throw new ApiError(400, 'Invoice has no remaining balance due');
    }

    const actualPay = Math.min(invoice.remaining_amount, payAmt);
    invoice.paid_amount += actualPay;
    invoice.remaining_amount -= actualPay;
    invoice.payment_status = invoice.remaining_amount <= 0 ? 'Paid' : 'Partial';
    await invoice.save();

    // Update customer outstanding balance
    const customer = await Customer.findById(invoice.customer_id);
    if (customer) {
      customer.outstanding_balance = Math.max(0, customer.outstanding_balance - actualPay);
      await customer.save();
    }

    // Record Customer Payment log
    await CustomerPayment.create({
      customer_id: invoice.customer_id,
      customer_name: invoice.customer_name,
      invoice_id: invoice._id,
      date: new Date().toISOString().split('T')[0],
      amount: actualPay,
      payment_method: payment_method || 'Cash',
      payment_details: payment_details || {},
      ref_no: `PAY-${invoice.invoice_no}`,
      type: 'Direct Receipt',
      notes: notes || `Balance Payment for Invoice #${invoice.invoice_no}`
    });

    return successResponse(res, 'Balance payment recorded successfully', invoice);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSalesHistory,
  getSaleById,
  paySaleBalance
};
