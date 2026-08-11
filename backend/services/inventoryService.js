const WarehouseStock = require('../models/WarehouseStock');
const WarehouseTransfer = require('../models/WarehouseTransfer');
const Product = require('../models/Product');
const ApiError = require('../utils/apiError');
const auditService = require('./auditService');

const getWarehouseStockLevels = async () => {
  return await WarehouseStock.find({}).populate('product_id').sort({ createdAt: -1 });
};

const transferStockToPOS = async (transferData, currentUser = null) => {
  const { product_id, quantity } = transferData;
  const numQty = Number(quantity);

  if (numQty <= 0) throw new ApiError(400, 'Transfer quantity must be greater than zero');

  const stock = await WarehouseStock.findOne({ product_id });
  if (!stock) throw new ApiError(404, 'Warehouse stock entry for this product not found');

  if (stock.warehouse_qty < numQty) {
    throw new ApiError(400, `Insufficient warehouse stock. Only ${stock.warehouse_qty} units available.`);
  }

  stock.warehouse_qty -= numQty;
  stock.pos_counter_qty += numQty;
  await stock.save();

  // Update primary batch of product
  const product = await Product.findById(product_id);
  if (product && product.batches && product.batches.length > 0) {
    product.batches[0].stock_qty += numQty;
    await product.save();
  }

  const count = await WarehouseTransfer.countDocuments();
  const transfer = await WarehouseTransfer.create({
    transfer_no: `TRF-2026-${String(count + 1).padStart(3, '0')}`,
    date: new Date().toISOString().split('T')[0],
    product_id,
    product_name: stock.product_name,
    quantity: numQty,
    from: 'Central Warehouse',
    to: 'POS Counter',
    status: 'Completed',
    requested_by: currentUser ? currentUser.name : 'Admin'
  });

  await auditService.logAction(
    'Stock Transfer',
    `Transferred ${numQty} units of ${stock.product_name} from Warehouse to POS Counter`,
    currentUser ? currentUser.name : 'Admin'
  );

  return transfer;
};

const getAllTransfers = async () => {
  return await WarehouseTransfer.find({}).sort({ createdAt: -1 });
};

module.exports = {
  getWarehouseStockLevels,
  transferStockToPOS,
  getAllTransfers
};
