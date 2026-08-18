const mongoose = require('mongoose');

const saleInvoiceItemSchema = new mongoose.Schema({
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  product_name: { type: String, required: true },
  batch_no: { type: String, default: 'N/A' },
  quantity: { type: Number, required: true, min: 0.0001 },
  returned_qty: { type: Number, default: 0 },   // tracks cumulative returned qty per item
  unit: { type: String, required: true },
  price: { type: Number, required: true },
  line_total: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  offer_applied: { type: String, default: null },
  offer_type: { type: String, default: null },
  free_qty: { type: Number, default: 0 },
  original_price: { type: Number }
}, { _id: false });

const cancellationSchema = new mongoose.Schema({
  by: { type: String },
  on: { type: String },
  reason: { type: String },
  stock_reversed: { type: Boolean, default: false }
}, { _id: false });

const saleInvoiceSchema = new mongoose.Schema({
  invoice_no: { type: String, required: true, unique: true, trim: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  customer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  customer_name: { type: String, required: true },
  customer_type: { type: String, required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  cashier_name: { type: String, required: true },
  subtotal: { type: Number, required: true },
  discount_amount: { type: Number, default: 0 },
  bill_discount: { type: Number, default: 0 },
  bill_discount_type: { type: String, enum: ['Amount', 'Percentage'], default: 'Amount' },
  bill_discount_value: { type: Number, default: 0 },
  tax_amount: { type: Number, default: 0 },
  freight: { type: Number, default: 0 },
  other_charges: { type: Number, default: 0 },
  grand_total: { type: Number, required: true },
  paid_amount: { type: Number, required: true },
  remaining_amount: { type: Number, default: 0 },
  payment_status: { 
    type: String, 
    enum: ['Paid', 'Partial', 'Credit', 'Unpaid', 'Cancelled'], 
    required: true 
  },
  payment_method: { type: String, required: true },
  payment_details: { type: Object, default: {} },
  is_held: { type: Boolean, default: false },
  // Extended status includes return states
  status: { 
    type: String, 
    enum: ['Completed', 'Cancelled', 'Fully Returned', 'Partial Return'], 
    default: 'Completed' 
  },
  // Tracks overall return progress
  return_status: {
    type: String,
    enum: ['None', 'Partial', 'Full'],
    default: 'None'
  },
  total_returned_amount: { type: Number, default: 0 },
  cancellation_details: cancellationSchema,
  refund_status: { type: String, enum: ['Not Required', 'Pending', 'Refunded'], default: 'Not Required' },
  refund_method: { type: String, default: '' },
  refund_details: { type: Object, default: {} },
  items: [saleInvoiceItemSchema]
}, { timestamps: true });

saleInvoiceSchema.index({ createdAt: -1 });
saleInvoiceSchema.index({ customer_id: 1, createdAt: -1 });
saleInvoiceSchema.index({ payment_status: 1 });
saleInvoiceSchema.index({ date: -1 });

module.exports = mongoose.model('SaleInvoice', saleInvoiceSchema);
