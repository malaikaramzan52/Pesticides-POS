const Category = require('../models/Category');
const { successResponse } = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');

const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({}).sort({ name: 1 }).lean();
    return successResponse(res, 'Categories fetched successfully', categories);
  } catch (error) {
    next(error);
  }
};

const createCategory = async (req, res, next) => {
  try {
    const { name, description, color } = req.body;
    const count = await Category.countDocuments();
    const code = req.body.code || `CAT-00${count + 1}`;

    const existing = await Category.findOne({ name });
    if (existing) throw new ApiError(400, 'Category already exists');

    const category = await Category.create({ code, name, description, color });
    return successResponse(res, 'Category created successfully', category, 201);
  } catch (error) {
    next(error);
  }
};

const updateCategory = async (req, res, next) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!category) throw new ApiError(404, 'Category not found');
    return successResponse(res, 'Category updated successfully', category);
  } catch (error) {
    next(error);
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) throw new ApiError(404, 'Category not found');
    return successResponse(res, 'Category deleted successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
};
