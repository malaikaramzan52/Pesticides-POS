const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true, trim: true },
  scope: { type: String, enum: ['Product', 'Company', 'Category'], required: true },
  target_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  target_name: { type: String, default: '' },
  type: { type: String, enum: ['Percentage', 'Fixed', 'BuyXGetY'], required: true },
  discountValue: { type: Number, default: 0 },
  buyQty: { type: Number, default: 0 },
  getQty: { type: Number, default: 0 },
  startDate: { type: String, required: true },
  endDate: { type: String, required: true },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true });

module.exports = mongoose.model('Offer', offerSchema);
