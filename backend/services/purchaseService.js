const PurchaseOrder = require('../models/PurchaseOrder');
const PurchaseReturn = require('../models/PurchaseReturn');
const Product = require('../models/Product');
const WarehouseStock = require('../models/WarehouseStock');
const Vendor = require('../models/Vendor');
const VendorPayment = require('../models/VendorPayment');
const ApiError = require('../utils/apiError');
const auditService = require('./auditService');

const getAllPOs = async (filters = {}) => {
  const query = {};
  if (filters.status) query.status = filters.status;
  if (filters.supplier) query.supplier = new RegExp(filters.supplier, 'i');

  return await PurchaseOrder.find(query).sort({ createdAt: -1 });
};

const createPO = async (poData) => {
  const count = await PurchaseOrder.countDocuments();
  const po_no = poData.po_no || `PO-2026-${String(count + 1).padStart(3, '0')}`;
  const itemsCount = poData.items ? poData.items.reduce((s, i) => s + (Number(i.qty) || 0), 0) : 0;

  const po = await PurchaseOrder.create({
    ...poData,
    po_no,
    itemsCount
  });

  // Auto-add stock to Product batches & WarehouseStock
  if (po.items && Array.isArray(po.items)) {
    for (const item of po.items) {
      const prodId = item.product_id || item.productId;
      const itemQty = Number(item.qty) || Number(item.quantity) || 0;
      if (itemQty > 0) {
        let product = null;
        if (prodId) {
          product = await Product.findById(prodId).catch(() => null);
        }
        if (!product && item.name) {
          product = await Product.findOne({ name: new RegExp(`^${item.name}$`, 'i') });
        }
        if (product) {
          if (!product.batches || product.batches.length === 0) {
            product.batches.push({
              batch_no: item.batch_no || `BATCH-${Date.now()}`,
              stock_qty: itemQty,
              mfg_date: 'N/A',
              expiry_date: 'N/A',
              purchase_rate: Number(item.cost || item.rate) || 0,
              selling_rate: product.retail_price || 0
            });
          } else {
            product.batches[0].stock_qty = (product.batches[0].stock_qty || 0) + itemQty;
            if (Number(item.cost || item.rate) > 0) {
              product.batches[0].purchase_rate = Number(item.cost || item.rate);
            }
          }
          await product.save();

          await WarehouseStock.findOneAndUpdate(
            { product_id: product._id },
            { $inc: { warehouse_qty: itemQty } },
            { upsert: true }
          );
        }
      }
    }
  }

  return po;
};

const updatePOStatus = async (id, status, currentUser = null) => {
  const po = await PurchaseOrder.findById(id);
  if (!po) throw new ApiError(404, 'Purchase Order not found');

  const oldStatus = po.status;
  po.status = status;
  await po.save();

  // When PO status becomes "Received", auto-add stock to Central Warehouse & batch records
  if (status === 'Received' && oldStatus !== 'Received') {
    for (const item of po.items) {
      if (item.product_id) {
        const product = await Product.findById(item.product_id);
        if (product) {
          // Add or update batch
          const batchNo = item.batch_no || `BATCH-${Date.now()}`;
          const existingBatch = product.batches.find(b => b.batch_no === batchNo);

          if (existingBatch) {
            existingBatch.stock_qty += item.qty;
            existingBatch.purchase_rate = item.cost;
          } else {
            product.batches.push({
              batch_no: batchNo,
              stock_qty: item.qty,
              mfg_date: item.mfg_date || 'N/A',
              expiry_date: item.expiry_date || 'N/A',
              purchase_rate: item.cost,
              selling_rate: product.retail_price
            });
          }
          await product.save();

          // Increment WarehouseStock warehouse_qty
          await WarehouseStock.findOneAndUpdate(
            { product_id: product._id },
            { $inc: { warehouse_qty: item.qty } },
            { upsert: true }
          );
        }
      }
    }

    // Update Vendor Outstanding Balance
    const vendor = await Vendor.findOne({ name: po.supplier });
    if (vendor) {
      vendor.outstanding_balance += po.total;
      await vendor.save();

      await VendorPayment.create({
        vendor_id: vendor._id,
        vendor_name: vendor.name,
        po_id: po._id,
        date: new Date().toISOString().split('T')[0],
        amount: po.total,
        payment_method: po.payment_method || 'Bank Transfer',
        ref_no: po.po_no,
        type: 'PO Purchase',
        notes: `Purchase Order Received ${po.po_no}`
      });
    }

    await auditService.logAction(
      'PO Received',
      `Purchase Order ${po.po_no} received. Total: Rs. ${po.total}`,
      currentUser ? currentUser.name : 'Admin'
    );
  }

  return po;
};

const processPurchaseReturn = async (returnData, currentUser = null) => {
  const { po_no, supplier, items, refund_total, refund_method, refund_details } = returnData;

  const returnRecord = await PurchaseReturn.create({
    return_no: `PR${Date.now()}`,
    date: new Date().toISOString().split('T')[0],
    po_no,
    supplier,
    items,
    refund_total,
    refund_method,
    refund_details: refund_details || {},
    status: 'Processed'
  });

  await auditService.logAction(
    'Purchase Return Processed',
    `Processed return for PO ${po_no}. Refund: Rs. ${refund_total}`,
    currentUser ? currentUser.name : 'Admin'
  );

  return returnRecord;
};

module.exports = {
  getAllPOs,
  createPO,
  updatePOStatus,
  processPurchaseReturn
};
