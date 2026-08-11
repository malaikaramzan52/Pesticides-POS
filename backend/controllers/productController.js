const productService = require('../services/productService');
const { successResponse } = require('../utils/apiResponse');

const getProducts = async (req, res, next) => {
  try {
    const products = await productService.getAllProducts(req.query);
    return successResponse(res, 'Products fetched successfully', products);
  } catch (error) {
    next(error);
  }
};

const getProduct = async (req, res, next) => {
  try {
    const product = await productService.getProductById(req.params.id);
    return successResponse(res, 'Product fetched successfully', product);
  } catch (error) {
    next(error);
  }
};

const createProduct = async (req, res, next) => {
  try {
    const product = await productService.createProduct(req.body);
    return successResponse(res, 'Product created successfully', product, 201);
  } catch (error) {
    next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const product = await productService.updateProduct(req.params.id, req.body);
    return successResponse(res, 'Product updated successfully', product);
  } catch (error) {
    next(error);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    await productService.deleteProduct(req.params.id);
    return successResponse(res, 'Product deleted successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct
};
