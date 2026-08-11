const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
  account_name: { type: String, required: true, unique: true, trim: true },
  type: { 
    type: String, 
    enum: ['Cash', 'Bank', 'Mobile Wallet', 'Card', 'Cheque'], 
    required: true 
  },
  provider_name: { type: String, default: '' },
  account_number: { type: String, default: '' },
  opening_balance: { type: Number, default: 0 },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true });

module.exports = mongoose.model('Account', accountSchema);
