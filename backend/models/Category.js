const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  color: { type: String, default: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);
