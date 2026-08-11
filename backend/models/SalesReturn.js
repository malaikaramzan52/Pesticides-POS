const mongoose = require('mongoose');

const salesReturnItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  qty: { type: Number, required: true },
  rate: { type: Number, required: true },
  reason: { type: String, default: 'Farmer Return' }
}, { _id: false });

const salesReturnSchema = new mongoose.Schema({
  return_no: { type: String, required: true, unique: true, trim: true },
  date: { type: String, required: true },
  invoice_no: { type: String, required: true },
  customer: { type: String, required: true },
  items: [salesReturnItemSchema],
  refund_total: { type: Number, required: true },
  refund_method: { type: String, required: true },
  refund_details: { type: Object, default: {} },
  status: { type: String, default: 'Processed' }
}, { timestamps: true });

module.exports = mongoose.model('SalesReturn', salesReturnSchema);
