const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true, trim: true },
  phone: { type: String, default: 'N/A' },
  email: { type: String, default: '' },
  address: { type: String, default: 'N/A' },
  customer_type: { 
    type: String, 
    enum: ['Walk-in Customer', 'Retail', 'Farmer', 'Dealer', 'Wholesaler'], 
    default: 'Retail' 
  },
  credit_limit: { type: Number, default: 0 },
  outstanding_balance: { type: Number, default: 0 },
  last_purchase_date: { type: String, default: 'N/A' },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true });

customerSchema.virtual('available_credit').get(function () {
  return Math.max(0, (this.credit_limit || 0) - (this.outstanding_balance || 0));
});

customerSchema.index({ createdAt: -1 });
customerSchema.index({ name: 1, code: 1 });

customerSchema.set('toJSON', { virtuals: true });
customerSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Customer', customerSchema);
