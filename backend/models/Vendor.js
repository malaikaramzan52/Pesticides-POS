const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true, trim: true },
  company: { type: String, default: '' },
  contact_person: { type: String, default: '' },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  address: { type: String, default: '' },
  city: { type: String, default: '' },
  tax_no: { type: String, default: '' },
  credit_limit: { type: Number, default: 0 },
  outstanding_balance: { type: Number, default: 0 },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true });

module.exports = mongoose.model('Vendor', vendorSchema);
