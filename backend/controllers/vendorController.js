const vendorService = require('../services/vendorService');
const { successResponse } = require('../utils/apiResponse');

const getVendors = async (req, res, next) => {
  try {
    const vendors = await vendorService.getAllVendors();
    return successResponse(res, 'Vendors fetched successfully', vendors);
  } catch (error) {
    next(error);
  }
};

const createVendor = async (req, res, next) => {
  try {
    const vendor = await vendorService.createVendor(req.body);
    return successResponse(res, 'Vendor created successfully', vendor, 201);
  } catch (error) {
    next(error);
  }
};

const updateVendor = async (req, res, next) => {
  try {
    const vendor = await vendorService.updateVendor(req.params.id, req.body);
    return successResponse(res, 'Vendor updated successfully', vendor);
  } catch (error) {
    next(error);
  }
};

const deleteVendor = async (req, res, next) => {
  try {
    const vendor = await vendorService.deleteVendor(req.params.id);
    return successResponse(res, 'Vendor deleted successfully', vendor);
  } catch (error) {
    next(error);
  }
};

const recordPayment = async (req, res, next) => {
  try {
    const payment = await vendorService.recordVendorPayment(req.params.id, req.body);
    return successResponse(res, 'Vendor disbursement recorded successfully', payment, 201);
  } catch (error) {
    next(error);
  }
};

const getVendorLedger = async (req, res, next) => {
  try {
    const ledger = await vendorService.getVendorLedger(req.params.id);
    return successResponse(res, 'Vendor ledger statement fetched successfully', ledger);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getVendors,
  createVendor,
  updateVendor,
  deleteVendor,
  recordPayment,
  getVendorLedger
};
