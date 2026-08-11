const customerService = require('../services/customerService');
const { successResponse } = require('../utils/apiResponse');

const getCustomers = async (req, res, next) => {
  try {
    const customers = await customerService.getAllCustomers();
    return successResponse(res, 'Customers fetched successfully', customers);
  } catch (error) {
    next(error);
  }
};

const createCustomer = async (req, res, next) => {
  try {
    const customer = await customerService.createCustomer(req.body);
    return successResponse(res, 'Customer created successfully', customer, 201);
  } catch (error) {
    next(error);
  }
};

const updateCustomer = async (req, res, next) => {
  try {
    const customer = await customerService.updateCustomer(req.params.id, req.body);
    return successResponse(res, 'Customer updated successfully', customer);
  } catch (error) {
    next(error);
  }
};

const recordPayment = async (req, res, next) => {
  try {
    const payment = await customerService.recordCustomerPayment(req.params.id, req.body);
    return successResponse(res, 'Customer payment recorded successfully', payment, 201);
  } catch (error) {
    next(error);
  }
};

const getCustomerLedger = async (req, res, next) => {
  try {
    const ledger = await customerService.getCustomerLedger(req.params.id);
    return successResponse(res, 'Customer ledger statement fetched successfully', ledger);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCustomers,
  createCustomer,
  updateCustomer,
  recordPayment,
  getCustomerLedger
};
