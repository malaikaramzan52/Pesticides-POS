const reportService = require('../services/reportService');
const { successResponse } = require('../utils/apiResponse');

const getSalesReport = async (req, res, next) => {
  try {
    const report = await reportService.getSalesReport(req.query.startDate, req.query.endDate);
    return successResponse(res, 'Sales report generated', report);
  } catch (error) {
    next(error);
  }
};

const getPurchaseReport = async (req, res, next) => {
  try {
    const report = await reportService.getPurchaseReport(req.query.startDate, req.query.endDate);
    return successResponse(res, 'Purchase report generated', report);
  } catch (error) {
    next(error);
  }
};

const getStockReport = async (req, res, next) => {
  try {
    const report = await reportService.getStockReport();
    return successResponse(res, 'Stock report generated', report);
  } catch (error) {
    next(error);
  }
};

const getExpenseReport = async (req, res, next) => {
  try {
    const report = await reportService.getExpenseReport();
    return successResponse(res, 'Expense report generated', report);
  } catch (error) {
    next(error);
  }
};

const getTrialBalance = async (req, res, next) => {
  try {
    const report = await reportService.getTrialBalance();
    return successResponse(res, 'Trial Balance generated', report);
  } catch (error) {
    next(error);
  }
};

const getBalanceSheet = async (req, res, next) => {
  try {
    const report = await reportService.getBalanceSheet();
    return successResponse(res, 'Balance Sheet generated', report);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSalesReport,
  getPurchaseReport,
  getStockReport,
  getExpenseReport,
  getTrialBalance,
  getBalanceSheet
};
