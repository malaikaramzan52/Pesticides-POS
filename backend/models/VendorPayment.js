const mongoose = require('mongoose');

const vendorPaymentSchema = new mongoose.Schema({
  vendor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  vendor_name: { type: String, required: true },
  po_id: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder', default: null },
  date: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 },
  payment_method: { type: String, required: true },
  payment_details: { type: Object, default: {} },
  ref_no: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['PO Purchase', 'Direct Disbursement', 'Purchase Return Refund', 'Adjustment'], 
    default: 'Direct Disbursement' 
  },
  notes: { type: String, default: '' },
  recorded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('VendorPayment', vendorPaymentSchema);
