const inventoryService = require('../services/inventoryService');
const { successResponse } = require('../utils/apiResponse');

const getStockLevels = async (req, res, next) => {
  try {
    const stocks = await inventoryService.getWarehouseStockLevels();
    return successResponse(res, 'Warehouse stock levels fetched successfully', stocks);
  } catch (error) {
    next(error);
  }
};

const transferStock = async (req, res, next) => {
  try {
    const transfer = await inventoryService.transferStockToPOS(req.body, req.user);
    return successResponse(res, 'Stock transfer completed successfully', transfer, 201);
  } catch (error) {
    next(error);
  }
};

const getTransfers = async (req, res, next) => {
  try {
    const transfers = await inventoryService.getAllTransfers();
    return successResponse(res, 'Warehouse transfers log fetched successfully', transfers);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStockLevels,
  transferStock,
  getTransfers
};
