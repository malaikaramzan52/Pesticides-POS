const posService = require('../services/posService');
const { successResponse } = require('../utils/apiResponse');

const createSale = async (req, res, next) => {
  try {
    const invoice = await posService.processPOSSale(req.body, req.user);
    return successResponse(res, 'Sale completed successfully', invoice, 201);
  } catch (error) {
    next(error);
  }
};

const processReturn = async (req, res, next) => {
  try {
    const returnRecord = await posService.processSalesReturn(req.body, req.user);
    return successResponse(res, 'Sales return processed successfully', returnRecord, 201);
  } catch (error) {
    next(error);
  }
};

const cancelSale = async (req, res, next) => {
  try {
    const invoice = await posService.cancelSaleInvoice(req.params.id, req.body, req.user);
    return successResponse(res, 'Sale invoice cancelled successfully', invoice);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSale,
  processReturn,
  cancelSale
};
