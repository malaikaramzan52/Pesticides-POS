const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  description: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Brand', brandSchema);
