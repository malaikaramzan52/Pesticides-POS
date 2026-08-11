const StoreSettings = require('../models/StoreSettings');
const AuditLog = require('../models/AuditLog');
const { successResponse } = require('../utils/apiResponse');

const getSettings = async (req, res, next) => {
  try {
    let settings = await StoreSettings.findOne({});
    if (!settings) {
      settings = await StoreSettings.create({});
    }
    return successResponse(res, 'Store settings fetched successfully', settings);
  } catch (error) {
    next(error);
  }
};

const updateSettings = async (req, res, next) => {
  try {
    let settings = await StoreSettings.findOne({});
    if (!settings) {
      settings = await StoreSettings.create(req.body);
    } else {
      settings = await StoreSettings.findByIdAndUpdate(settings._id, req.body, { new: true });
    }
    return successResponse(res, 'Store settings updated successfully', settings);
  } catch (error) {
    next(error);
  }
};

const getAuditLogs = async (req, res, next) => {
  try {
    const logs = await AuditLog.find({}).sort({ timestamp: -1, createdAt: -1 }).limit(200);
    return successResponse(res, 'Audit logs fetched successfully', logs);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSettings,
  updateSettings,
  getAuditLogs
};
