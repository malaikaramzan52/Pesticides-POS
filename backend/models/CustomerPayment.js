const mongoose = require('mongoose');

const customerPaymentSchema = new mongoose.Schema({
  customer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  customer_name: { type: String, required: true },
  invoice_id: { type: mongoose.Schema.Types.ObjectId, ref: 'SaleInvoice', default: null },
  date: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 },
  payment_method: { type: String, required: true },
  payment_details: { type: Object, default: {} },
  ref_no: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['Sale Credit', 'Direct Receipt', 'Discount Adjustment', 'Return Adjustment'], 
    default: 'Direct Receipt' 
  },
  notes: { type: String, default: '' },
  recorded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('CustomerPayment', customerPaymentSchema);
