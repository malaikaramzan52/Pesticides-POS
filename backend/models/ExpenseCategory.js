const mongoose = require('mongoose');

const expenseCategorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  description: { type: String, default: '' },
  color: { type: String, default: 'bg-indigo-50 text-indigo-700 border-indigo-200' }
}, { timestamps: true });

module.exports = mongoose.model('ExpenseCategory', expenseCategorySchema);
