const purchaseService = require('../services/purchaseService');
const PurchaseOrder = require('../models/PurchaseOrder');
const { successResponse } = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');

const getPurchaseOrders = async (req, res, next) => {
  try {
    const pos = await purchaseService.getAllPOs(req.query);
    return successResponse(res, 'Purchase orders fetched successfully', pos);
  } catch (error) {
    next(error);
  }
};

const getPurchaseOrderById = async (req, res, next) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id);
    if (!po) throw new ApiError(404, 'Purchase order not found');
    return successResponse(res, 'Purchase order fetched successfully', po);
  } catch (error) {
    next(error);
  }
};

const createPurchaseOrder = async (req, res, next) => {
  try {
    const po = await purchaseService.createPO(req.body);
    return successResponse(res, 'Purchase order created successfully', po, 201);
  } catch (error) {
    next(error);
  }
};

const updatePOStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const po = await purchaseService.updatePOStatus(req.params.id, status, req.user);
    return successResponse(res, `PO status updated to ${status}`, po);
  } catch (error) {
    next(error);
  }
};

const processPurchaseReturn = async (req, res, next) => {
  try {
    const returnRecord = await purchaseService.processPurchaseReturn(req.body, req.user);
    return successResponse(res, 'Purchase return processed successfully', returnRecord, 201);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePOStatus,
  processPurchaseReturn
};
