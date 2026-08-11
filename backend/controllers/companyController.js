const Company = require('../models/Company');
const { successResponse } = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');

const getCompanies = async (req, res, next) => {
  try {
    const companies = await Company.find({}).sort({ name: 1 });
    return successResponse(res, 'Companies fetched successfully', companies);
  } catch (error) {
    next(error);
  }
};

const createCompany = async (req, res, next) => {
  try {
    const count = await Company.countDocuments();
    const code = req.body.code || `CMP-00${count + 1}`;

    const company = await Company.create({ ...req.body, code });
    return successResponse(res, 'Company created successfully', company, 201);
  } catch (error) {
    next(error);
  }
};

const updateCompany = async (req, res, next) => {
  try {
    const company = await Company.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!company) throw new ApiError(404, 'Company not found');
    return successResponse(res, 'Company updated successfully', company);
  } catch (error) {
    next(error);
  }
};

const deleteCompany = async (req, res, next) => {
  try {
    const company = await Company.findByIdAndDelete(req.params.id);
    if (!company) throw new ApiError(404, 'Company not found');
    return successResponse(res, 'Company deleted successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCompanies,
  createCompany,
  updateCompany,
  deleteCompany
};
