const expenseService = require('../services/expenseService');
const { successResponse } = require('../utils/apiResponse');

const getExpenses = async (req, res, next) => {
  try {
    const expenses = await expenseService.getAllExpenses(req.query);
    return successResponse(res, 'Expenses fetched successfully', expenses);
  } catch (error) {
    next(error);
  }
};

const createExpense = async (req, res, next) => {
  try {
    const expense = await expenseService.createExpense(req.body, req.user);
    return successResponse(res, 'Expense created successfully', expense, 201);
  } catch (error) {
    next(error);
  }
};

const deleteExpense = async (req, res, next) => {
  try {
    await expenseService.deleteExpense(req.params.id);
    return successResponse(res, 'Expense deleted successfully');
  } catch (error) {
    next(error);
  }
};

const getCategories = async (req, res, next) => {
  try {
    const categories = await expenseService.getAllCategories();
    return successResponse(res, 'Expense categories fetched successfully', categories);
  } catch (error) {
    next(error);
  }
};

const createCategory = async (req, res, next) => {
  try {
    const category = await expenseService.createCategory(req.body);
    return successResponse(res, 'Expense category created successfully', category, 201);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getExpenses,
  createExpense,
  deleteExpense,
  getCategories,
  createCategory
};
