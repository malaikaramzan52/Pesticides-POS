const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true, trim: true },
  contact_person: { type: String, default: '' },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  address: { type: String, default: '' },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  notes: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Company', companySchema);
