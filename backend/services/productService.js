const Product = require('../models/Product');
const Company = require('../models/Company');
const Category = require('../models/Category');
const Brand = require('../models/Brand');
const Unit = require('../models/Unit');
const WarehouseStock = require('../models/WarehouseStock');
const ApiError = require('../utils/apiError');

const getAllProducts = async (filters = {}) => {
  const query = {};
  if (filters.search) {
    const q = new RegExp(filters.search, 'i');
    query.$or = [{ name: q }, { code: q }, { barcode: q }];
  }
  if (filters.category_id) query.category_id = filters.category_id;
  if (filters.company_id) query.company_id = filters.company_id;
  if (filters.status) query.status = filters.status;

  const products = await Product.find(query)
    .populate('company_id', 'name code')
    .populate('category_id', 'name code color')
    .populate('brand_id', 'name')
    .populate('unit_id', 'name key')
    .sort({ createdAt: -1 });

  return products;
};

const getProductById = async (id) => {
  const product = await Product.findById(id)
    .populate('company_id', 'name code')
    .populate('category_id', 'name code color')
    .populate('brand_id', 'name')
    .populate('unit_id', 'name key');

  if (!product) throw new ApiError(404, 'Product not found');
  return product;
};

const mongoose = require('mongoose');

const createProduct = async (productData) => {
  let code = productData.code;
  const existingCode = await Product.findOne({ code });
  if (existingCode) {
    return await Product.findByIdAndUpdate(existingCode._id, productData, { new: true, runValidators: true });
  }

  // Resolve or create default Category, Company, Unit ObjectIds if missing
  if (!productData.category_id || !mongoose.Types.ObjectId.isValid(productData.category_id)) {
    let cat = await Category.findOne({});
    if (!cat) cat = await Category.create({ name: 'General Pesticides', code: 'CAT-GEN' });
    productData.category_id = cat._id;
  }
  if (!productData.company_id || !mongoose.Types.ObjectId.isValid(productData.company_id)) {
    let comp = await Company.findOne({});
    if (!comp) comp = await Company.create({ name: 'General Agro', code: 'COMP-GEN' });
    productData.company_id = comp._id;
  }
  if (!productData.unit_id || !mongoose.Types.ObjectId.isValid(productData.unit_id)) {
    let un = await Unit.findOne({});
    if (!un) un = await Unit.create({ name: 'Litre', key: 'ltr' });
    productData.unit_id = un._id;
  }

  const product = await Product.create(productData);

  // Initialize WarehouseStock record
  await WarehouseStock.create({
    product_id: product._id,
    product_name: product.name,
    code: product.code,
    warehouse_qty: 0,
    pos_counter_qty: product.batches ? product.batches.reduce((sum, b) => sum + (b.stock_qty || 0), 0) : 0,
    min_alert_qty: product.min_stock || 15
  });

  return product;
};

const updateProduct = async (id, updateData) => {
  const product = await Product.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
  if (!product) throw new ApiError(404, 'Product not found');

  // Sync total pos_counter_qty in WarehouseStock
  const totalBatchStock = product.batches ? product.batches.reduce((sum, b) => sum + (b.stock_qty || 0), 0) : 0;
  await WarehouseStock.findOneAndUpdate(
    { product_id: id },
    { product_name: product.name, code: product.code, pos_counter_qty: totalBatchStock },
    { upsert: true }
  );

  return product;
};

const deleteProduct = async (id) => {
  const product = await Product.findByIdAndDelete(id);
  if (!product) throw new ApiError(404, 'Product not found');
  await WarehouseStock.findOneAndDelete({ product_id: id });
  return product;
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};
