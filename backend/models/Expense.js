const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  expense_no: { type: String, required: true, unique: true, trim: true },
  title: { type: String, required: true, trim: true },
  category: { type: String, required: true },
  category_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ExpenseCategory' },
  amount: { type: Number, required: true, min: 0 },
  payment_method: { type: String, required: true },
  date: { type: String, required: true },
  ref_no: { type: String, default: 'N/A' },
  notes: { type: String, default: '—' },
  user: { type: String, default: 'Admin' },
  status: { type: String, enum: ['Paid', 'Pending'], default: 'Paid' }
}, { timestamps: true });

module.exports = mongoose.model('Expense', expenseSchema);
