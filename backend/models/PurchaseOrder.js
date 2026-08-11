const mongoose = require('mongoose');

const poItemSchema = new mongoose.Schema({
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  name: { type: String, required: true },
  qty: { type: Number, required: true },
  cost: { type: Number, required: true },
  total: { type: Number, required: true },
  batch_no: { type: String, default: 'N/A' },
  mfg_date: { type: String, default: 'N/A' },
  expiry_date: { type: String, default: 'N/A' }
}, { _id: false });

const transportSchema = new mongoose.Schema({
  company: { type: String, default: '' },
  vehicle: { type: String, default: '' },
  driver: { type: String, default: '' },
  phone: { type: String, default: '' },
  route: { type: String, default: '' },
  charges: { type: Number, default: 0 }
}, { _id: false });

const purchaseOrderSchema = new mongoose.Schema({
  po_no: { type: String, required: true, unique: true, trim: true },
  date: { type: String, required: true },
  supplier: { type: String, required: true },
  vendor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
  status: { 
    type: String, 
    enum: ['Draft', 'Issued', 'Received', 'Cancelled', 'Returned'], 
    default: 'Draft' 
  },
  payment_method: { type: String, default: 'Bank Transfer' },
  payment_details: { type: Object, default: {} },
  items: [poItemSchema],
  itemsCount: { type: Number, default: 0 },
  total: { type: Number, required: true },
  transport: transportSchema
}, { timestamps: true });

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
