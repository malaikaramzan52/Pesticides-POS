const mongoose = require('mongoose');

const purchaseReturnItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  qty: { type: Number, required: true },
  rate: { type: Number, required: true },
  reason: { type: String, default: 'Damaged Packaging' }
}, { _id: false });

const purchaseReturnSchema = new mongoose.Schema({
  return_no: { type: String, required: true, unique: true, trim: true },
  date: { type: String, required: true },
  po_no: { type: String, required: true },
  supplier: { type: String, required: true },
  items: [purchaseReturnItemSchema],
  refund_total: { type: Number, required: true },
  refund_method: { type: String, required: true },
  refund_details: { type: Object, default: {} },
  status: { type: String, default: 'Processed' }
}, { timestamps: true });

module.exports = mongoose.model('PurchaseReturn', purchaseReturnSchema);
