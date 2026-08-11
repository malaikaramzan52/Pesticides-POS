const accountService = require('../services/accountService');
const { successResponse } = require('../utils/apiResponse');

const getAccounts = async (req, res, next) => {
  try {
    const accounts = await accountService.getAccounts();
    return successResponse(res, 'Accounts fetched successfully', accounts);
  } catch (error) {
    next(error);
  }
};

const createAccount = async (req, res, next) => {
  try {
    const account = await accountService.createAccount(req.body);
    return successResponse(res, 'Account created successfully', account, 201);
  } catch (error) {
    next(error);
  }
};

const updateOpeningBalances = async (req, res, next) => {
  try {
    const accounts = await accountService.updateOpeningBalances(req.body);
    return successResponse(res, 'Opening balances updated successfully', accounts);
  } catch (error) {
    next(error);
  }
};

const getAccountStatement = async (req, res, next) => {
  try {
    const statement = await accountService.getAccountStatement(req.query);
    return successResponse(res, 'Account statement generated successfully', statement);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAccounts,
  createAccount,
  updateOpeningBalances,
  getAccountStatement
};
