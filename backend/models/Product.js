const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
  batch_no: { type: String, required: true },
  stock_qty: { type: Number, required: true, min: 0, default: 0 },
  mfg_date: { type: String, default: 'N/A' },
  expiry_date: { type: String, default: 'N/A' },
  purchase_rate: { type: Number, default: 0 },
  selling_rate: { type: Number, default: 0 }
}, { _id: true, timestamps: true });

const productSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, trim: true },
  barcode: { type: String, index: true, default: '' },
  name: { type: String, required: true, trim: true },
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  category_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  brand_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', default: null },
  unit_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit', required: true },
  purchase_price: { type: Number, default: 0, min: 0 },
  retail_price: { type: Number, required: true, min: 0 },
  wholesale_price: { type: Number, default: 0 },
  dealer_price: { type: Number, default: 0 },
  farmer_price: { type: Number, default: 0 },
  tax_rate: { type: Number, default: 0 },
  min_stock: { type: Number, default: 15 },
  location: { type: String, default: '' },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  batches: [batchSchema]
}, { timestamps: true });

productSchema.virtual('total_stock').get(function () {
  if (!this.batches || this.batches.length === 0) return 0;
  return this.batches.reduce((sum, b) => sum + (b.stock_qty || 0), 0);
});

productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Product', productSchema);
