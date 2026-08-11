const Vendor = require('../models/Vendor');
const VendorPayment = require('../models/VendorPayment');
const PurchaseOrder = require('../models/PurchaseOrder');
const ApiError = require('../utils/apiError');

const getAllVendors = async () => {
  return await Vendor.find({}).sort({ createdAt: -1 });
};

const createVendor = async (vendorData) => {
  const count = await Vendor.countDocuments();
  const code = vendorData.code || `VDR-2026-${String(count + 1).padStart(3, '0')}`;
  return await Vendor.create({ ...vendorData, code });
};

const updateVendor = async (id, updateData) => {
  const vdr = await Vendor.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
  if (!vdr) throw new ApiError(404, 'Vendor not found');
  return vdr;
};

const recordVendorPayment = async (vendorId, paymentData) => {
  const vendor = await Vendor.findById(vendorId);
  if (!vendor) throw new ApiError(404, 'Vendor not found');

  const { amount, payment_method, payment_details, notes } = paymentData;
  const numAmt = Number(amount);

  vendor.outstanding_balance = Math.max(0, vendor.outstanding_balance - numAmt);
  await vendor.save();

  const ref_no = `VP-${Date.now()}`;
  const payment = await VendorPayment.create({
    vendor_id: vendor._id,
    vendor_name: vendor.name,
    date: new Date().toISOString().split('T')[0],
    amount: numAmt,
    payment_method,
    payment_details: payment_details || {},
    ref_no,
    type: 'Direct Disbursement',
    notes: notes || `Disbursement to Supplier ${vendor.name}`
  });

  return payment;
};

const getVendorLedger = async (vendorId) => {
  const vendor = await Vendor.findById(vendorId);
  if (!vendor) throw new ApiError(404, 'Vendor not found');

  const pos = await PurchaseOrder.find({ vendor_id: vendorId, status: { $ne: 'Cancelled' } });
  const payments = await VendorPayment.find({ vendor_id: vendorId });

  const rows = [];

  pos.forEach(po => {
    rows.push({
      id: `PO-${po.po_no}`,
      date: po.date,
      rawDate: new Date(po.date),
      type: 'PO Stock Inward',
      refNo: po.po_no,
      description: `Purchase Order Stock Inward - ${po.supplier}`,
      moneyIn: 0,
      moneyOut: po.total
    });
  });

  payments.forEach(vp => {
    rows.push({
      id: `PAY-${vp.ref_no}`,
      date: vp.date,
      rawDate: new Date(vp.date),
      type: vp.type,
      refNo: vp.ref_no,
      description: vp.notes || `Disbursement to ${vendor.name}`,
      moneyIn: vp.amount,
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
    vendor,
    statementRows,
    totalOutstanding: vendor.outstanding_balance
  };
};

module.exports = {
  getAllVendors,
  createVendor,
  updateVendor,
  recordVendorPayment,
  getVendorLedger
};
