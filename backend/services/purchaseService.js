const mongoose = require('mongoose');
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
              stock_qty: 0, // Starts at 0 in counter inventory, exists in warehouse only
              mfg_date: 'N/A',
              expiry_date: 'N/A',
              purchase_rate: Number(item.cost || item.rate) || 0,
              selling_rate: product.retail_price || 0
            });
          } else {
            if (Number(item.cost || item.rate) > 0) {
              product.batches[0].purchase_rate = Number(item.cost || item.rate);
            }
          }
          product.markModified('batches');
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
 
  // When PO status becomes "Received", auto-add stock to Central Warehouse only (counter starts at 0 until transferred)
  if (status === 'Received' && oldStatus !== 'Received') {
    for (const item of po.items) {
      if (item.product_id) {
        const product = await Product.findById(item.product_id);
        if (product) {
          // Add or update batch
          const batchNo = item.batch_no || `BATCH-${Date.now()}`;
          const existingBatch = product.batches.find(b => b.batch_no === batchNo);
 
          if (existingBatch) {
            existingBatch.purchase_rate = item.cost;
          } else {
            product.batches.push({
              batch_no: batchNo,
              stock_qty: 0, // Starts at 0 in counter inventory, exists in warehouse only
              mfg_date: item.mfg_date || 'N/A',
              expiry_date: item.expiry_date || 'N/A',
              purchase_rate: item.cost,
              selling_rate: product.retail_price
            });
          }
          product.markModified('batches');
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

  // 1. Find Purchase Order by po_no or id
  let po = null;
  if (po_no) {
    po = await PurchaseOrder.findOne({ $or: [{ po_no }, { _id: mongoose.Types.ObjectId.isValid(po_no) ? po_no : null }] });
  }

  if (po) {
    if (po.status === 'Cancelled') {
      throw new ApiError(400, `Purchase Order "${po.po_no}" is cancelled. Returns are not allowed.`);
    }
    if (po.return_status === 'Full' || po.status === 'Returned') {
      throw new ApiError(400, `Purchase Order "${po.po_no}" has already been fully returned.`);
    }
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, 'Return items are required');
  }

  let actualRefundTotal = 0;
  let allItemsFullyReturned = true;

  // 2. Validate return items and deduct stock
  for (const item of items) {
    const returnQty = Number(item.qty || item.quantity) || 0;
    const unitRate = Number(item.rate || item.cost) || 0;
    if (returnQty <= 0) continue;

    let poItem = po ? po.items.find(pi => pi.name?.toLowerCase() === (item.name || '').toLowerCase()) : null;

    let validQty = returnQty;
    if (poItem) {
      const alreadyReturned = poItem.returned_qty || 0;
      const maxReturnable = poItem.qty - alreadyReturned;
      if (maxReturnable <= 0) {
        throw new ApiError(400, `"${poItem.name}" has already been fully returned.`);
      }
      validQty = Math.min(returnQty, maxReturnable);
      poItem.returned_qty = alreadyReturned + validQty;
      actualRefundTotal += validQty * (poItem.cost || unitRate);

      if (poItem.returned_qty < poItem.qty) {
        allItemsFullyReturned = false;
      }
    } else {
      actualRefundTotal += returnQty * unitRate;
      allItemsFullyReturned = false;
    }

    // Deduct stock from Product batches and WarehouseStock
    let product = null;
    if (item.name) {
      product = await Product.findOne({ name: { $regex: new RegExp(`^${item.name}$`, 'i') } });
    }

    if (product) {
      // Deduct from batches
      if (product.batches && product.batches.length > 0) {
        let remainingToDeduct = validQty;
        for (let b of product.batches) {
          if (remainingToDeduct <= 0) break;
          if (b.stock_qty > 0) {
            if (b.stock_qty >= remainingToDeduct) {
              b.stock_qty -= remainingToDeduct;
              remainingToDeduct = 0;
            } else {
              remainingToDeduct -= b.stock_qty;
              b.stock_qty = 0;
            }
          }
        }
        product.markModified('batches');
        await product.save();
      }

      // Deduct from WarehouseStock warehouse_qty
      await WarehouseStock.findOneAndUpdate(
        { product_id: product._id },
        { $inc: { warehouse_qty: -validQty } },
        { upsert: true }
      );
    }
  }

  const finalRefundTotal = actualRefundTotal || Number(refund_total) || 0;

  // 3. Update Purchase Order return_status and status if PO was matched
  if (po) {
    po.total_returned_amount = (po.total_returned_amount || 0) + finalRefundTotal;

    if (allItemsFullyReturned) {
      po.return_status = 'Full';
      po.status = 'Returned';
    } else {
      po.return_status = 'Partial';
      po.status = 'Partial Return';
    }
    po.markModified('items');
    await po.save();
  }

  // 4. Update Vendor balance and create VendorPayment entry
  try {
    const supplierName = supplier || (po ? po.supplier : '');
    if (supplierName) {
      const vendor = await Vendor.findOne({ name: { $regex: new RegExp(`^${supplierName}$`, 'i') } });
      if (vendor && finalRefundTotal > 0) {
        vendor.outstanding_balance = Math.max(0, (vendor.outstanding_balance || 0) - finalRefundTotal);
        await vendor.save();

        await VendorPayment.create({
          vendor_id: vendor._id,
          vendor_name: vendor.name,
          po_id: po ? po._id : null,
          date: new Date().toISOString().split('T')[0],
          amount: finalRefundTotal,
          payment_method: refund_method || 'Bank Transfer',
          ref_no: po_no || `PR${Date.now()}`,
          type: 'Purchase Return',
          notes: `Purchase Return for ${po_no || 'Supplier Order'}`
        });
      }
    }
  } catch (_) { /* Vendor ledger update failure is non-fatal */ }

  // 5. Create PurchaseReturn document
  const returnRecord = await PurchaseReturn.create({
    return_no: `PR${Date.now()}`,
    date: new Date().toISOString().split('T')[0],
    po_no: po_no || (po ? po.po_no : 'N/A'),
    supplier: supplier || (po ? po.supplier : 'Supplier'),
    items,
    refund_total: finalRefundTotal,
    refund_method: refund_method || 'Bank Transfer',
    refund_details: refund_details || {},
    status: 'Processed'
  });

  await auditService.logAction(
    'Purchase Return Processed',
    `Processed return for PO ${po_no || 'N/A'}. Refund: Rs. ${finalRefundTotal}. Warehouse stock deducted.`,
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
