const Expense = require('../models/Expense');
const ExpenseCategory = require('../models/ExpenseCategory');
const ApiError = require('../utils/apiError');

const getAllExpenses = async (filters = {}) => {
  const query = {};
  if (filters.category) query.category = filters.category;
  if (filters.payment_method) query.payment_method = filters.payment_method;
  if (filters.status) query.status = filters.status;

  return await Expense.find(query).sort({ date: -1, createdAt: -1 });
};

const createExpense = async (expenseData, currentUser = null) => {
  const count = await Expense.countDocuments();
  const expense_no = expenseData.expense_no || `EXP-2026-${String(count + 1).padStart(3, '0')}`;

  const expense = await Expense.create({
    ...expenseData,
    expense_no,
    user: currentUser ? currentUser.name : 'Admin'
  });

  return expense;
};

const deleteExpense = async (id) => {
  const expense = await Expense.findByIdAndDelete(id);
  if (!expense) throw new ApiError(404, 'Expense not found');
  return expense;
};

const getAllCategories = async () => {
  return await ExpenseCategory.find({}).sort({ name: 1 });
};

const createCategory = async (catData) => {
  const existing = await ExpenseCategory.findOne({ name: catData.name });
  if (existing) return existing;

  return await ExpenseCategory.create(catData);
};

module.exports = {
  getAllExpenses,
  createExpense,
  deleteExpense,
  getAllCategories,
  createCategory
};
