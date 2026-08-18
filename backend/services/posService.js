const SaleInvoice = require('../models/SaleInvoice');
const SalesReturn = require('../models/SalesReturn');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const CustomerPayment = require('../models/CustomerPayment');
const WarehouseStock = require('../models/WarehouseStock');
const ApiError = require('../utils/apiError');
const auditService = require('./auditService');

const mongoose = require('mongoose');

const processPOSSale = async (saleData, currentUser = null) => {
  const {
    invoice_no,
    customer_id,
    customer_name,
    payment_method,
    payment_details,
    items,
    subtotal,
    discount_amount,
    bill_discount,
    bill_discount_type,
    bill_discount_value,
    tax_amount,
    grand_total,
    paid_amount,
    remaining_amount
  } = saleData;

  let customer = null;
  const custPhone = saleData.customer_phone || saleData.phone || saleData.walkInPhone || '';
  const finalCustName = customer_name ? customer_name.trim() : '';

  // 1. Try finding customer by customer_id if valid Mongo ObjectId
  if (customer_id && customer_id !== 'CUST001' && mongoose.Types.ObjectId.isValid(customer_id)) {
    customer = await Customer.findById(customer_id);
  }

  // 2. Try finding customer by name or phone
  if (!customer && finalCustName && finalCustName !== 'Walk-in Customer') {
    customer = await Customer.findOne({
      $or: [
        { name: new RegExp(`^${finalCustName}$`, 'i') },
        ...(custPhone ? [{ phone: custPhone }] : [])
      ]
    });
  }

  // 3. If still not found and custom name was provided, create new Customer in MongoDB
  if (!customer && finalCustName && finalCustName !== 'Walk-in Customer') {
    const count = await Customer.countDocuments();
    customer = await Customer.create({
      code: `CUST-${String(count + 1).padStart(3, '0')}`,
      name: finalCustName,
      phone: custPhone || '03000000000',
      customer_type: saleData.customer_type || 'Retail',
      address: 'Counter Customer',
      status: 'Active'
    });
  }

  // 4. Fallback to default Walk-in Customer if no custom details provided
  if (!customer) {
    customer = await Customer.findOne({ customer_type: 'Walk-in Customer' });
  }
  if (!customer) {
    customer = await Customer.create({
      code: 'CUST001',
      name: 'Walk-in Customer',
      customer_type: 'Walk-in Customer',
      phone: '0000000000',
      address: 'Counter Sale',
      status: 'Active'
    });
  }

  let invNo = invoice_no;
  if (!invNo || (await SaleInvoice.exists({ invoice_no: invNo }))) {
    let attempts = 0;
    do {
      const rand = Math.floor(1000 + Math.random() * 9000);
      const timeSuffix = Date.now().toString().slice(-4);
      invNo = `INV-2026-${rand}-${timeSuffix}`;
      attempts++;
    } while ((await SaleInvoice.exists({ invoice_no: invNo })) && attempts < 20);
  }

  // Deduct stock from product batches (FEFO/FIFO / Cascade)
  for (const item of items || []) {
    let product = null;
    const pId = item.product_id || item.product?.id || item.product?._id;
    if (pId) {
      if (mongoose.Types.ObjectId.isValid(pId)) {
        product = await Product.findById(pId);
      }
      if (!product) {
        product = await Product.findOne({ code: pId });
      }
    }
    if (product && product.batches) {
      let remainingToDeduct = item.quantity;
      
      // 1. Primary batch deduction
      const primaryBatch = product.batches.find(b => {
        if (!b) return false;
        if (item.batch_no && b.batch_no && b.batch_no === item.batch_no) return true;
        const bId = (b._id || b.id)?.toString();
        const itemId = (item.batch_id || item.batch_no)?.toString();
        return Boolean(bId && itemId && bId === itemId);
      });
      if (primaryBatch) {
        if (primaryBatch.stock_qty >= remainingToDeduct) {
          primaryBatch.stock_qty -= remainingToDeduct;
          remainingToDeduct = 0;
        } else {
          remainingToDeduct -= primaryBatch.stock_qty;
          primaryBatch.stock_qty = 0;
        }
      }

      // 2. Cascade remaining deduction to other batches
      if (remainingToDeduct > 0) {
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
      }

      product.markModified('batches');
      await product.save();

      // Sync POS counter stock in WarehouseStock
      const totalStock = product.batches.reduce((sum, b) => sum + (b.stock_qty || 0), 0);
      await WarehouseStock.findOneAndUpdate(
        { product_id: product._id },
        { 
          product_name: product.name,
          code: product.code,
          pos_counter_qty: totalStock 
        },
        { upsert: true }
      );
    }
  }

  // Format items array to match SaleInvoice schema
  const formattedItems = [];
  for (const item of items || []) {
    let product = null;
    const pId = item.product_id || item.product?.id || item.product?._id || item.code;
    if (pId) {
      if (mongoose.Types.ObjectId.isValid(pId)) {
        product = await Product.findById(pId);
      }
      if (!product) {
        product = await Product.findOne({ code: pId });
      }
    }
    if (!product) {
      product = await Product.findOne({});
    }
    const targetProdId = product ? product._id : new mongoose.Types.ObjectId();
    const prodName = item.product_name || item.name || item.product?.name || (product ? product.name : 'Pesticide Product');

    formattedItems.push({
      product_id: targetProdId,
      product_name: prodName,
      batch_no: item.batch_no || item.batch?.batch_no || 'BATCH-001',
      quantity: Number(item.quantity) || 1,
      unit: item.unit || item.unitLabel || item.unit_name || item.unitOption?.name || 'Unit',
      price: Number(item.price || item.retail_price || 0),
      line_total: Number(item.line_total || item.total || (item.price || 0) * (item.quantity || 1)),
      discount: Number(item.discount || 0),
      offer_applied: item.offer_applied || null,
      offer_type: item.offer_type || null,
      free_qty: Number(item.free_qty || 0)
    });
  }

  const calculatedSubtotal = Number(subtotal || grand_total || formattedItems.reduce((s, i) => s + i.line_total, 0));
  const calculatedGrandTotal = Number(grand_total || calculatedSubtotal);

  // Update Customer Outstanding Balance if Credit
  if (payment_method === 'Credit') {
    const addedCredit = calculatedGrandTotal - (paid_amount || 0);
    customer.outstanding_balance += addedCredit;
    
    // Also record CustomerPayment ledger entry for credit sale
    await CustomerPayment.create({
      customer_id: customer._id,
      customer_name: customer.name,
      date: new Date().toISOString().split('T')[0],
      amount: calculatedGrandTotal,
      payment_method: 'Credit',
      ref_no: invNo,
      type: 'Sale Credit',
      notes: `Credit Sale Invoice ${invNo}`
    });
  }
  customer.last_purchase_date = new Date().toISOString().split('T')[0];
  await customer.save();

  const validUserId = (currentUser && currentUser._id && mongoose.Types.ObjectId.isValid(currentUser._id))
    ? currentUser._id
    : ((saleData.user_id && mongoose.Types.ObjectId.isValid(saleData.user_id)) ? saleData.user_id : null);

  // Create Sale Invoice Document
  const invoice = await SaleInvoice.create({
    invoice_no: invNo,
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    customer_id: customer._id,
    customer_name: customer.name,
    customer_type: customer.customer_type,
    user_id: validUserId,
    cashier_name: currentUser ? (currentUser.name || 'Admin') : (saleData.cashier_name || 'Admin'),
    subtotal: calculatedSubtotal,
    discount_amount: Number(discount_amount || 0),
    bill_discount: Number(bill_discount || 0),
    bill_discount_type: bill_discount_type || 'Amount',
    bill_discount_value: Number(bill_discount_value || 0),
    tax_amount: Number(tax_amount || 0),
    grand_total: calculatedGrandTotal,
    paid_amount: payment_method === 'Credit' ? Number(paid_amount || 0) : calculatedGrandTotal,
    remaining_amount: payment_method === 'Credit' ? (calculatedGrandTotal - Number(paid_amount || 0)) : 0,
    payment_status: payment_method === 'Credit' ? (Number(paid_amount || 0) > 0 ? 'Partial' : 'Credit') : 'Paid',
    payment_method: payment_method || 'Cash',
    payment_details: payment_details || {},
    items: formattedItems
  });

  await auditService.logAction(
    'Invoice Completed',
    `Invoice ${invNo} — ${customer.name} — Rs. ${calculatedGrandTotal}`,
    currentUser ? (currentUser.name || 'Admin') : 'Admin'
  );

  return invoice;
};

const processSalesReturn = async (returnData, currentUser = null) => {
  const { invoice_no, items, refund_total, refund_method, refund_details, customer } = returnData;

  const invoice = await SaleInvoice.findOne({ invoice_no });
  if (!invoice) throw new ApiError(404, `Invoice "${invoice_no}" not found`);

  // ── Guard: block return on cancelled invoices ──────────────────────────────
  if (invoice.status === 'Cancelled') {
    throw new ApiError(400, `Invoice "${invoice_no}" is cancelled. Returns not allowed.`);
  }

  // ── Guard: block return on fully-returned invoices ─────────────────────────
  if (invoice.return_status === 'Full' || invoice.status === 'Fully Returned') {
    throw new ApiError(400, `Invoice "${invoice_no}" has already been fully returned. No further returns allowed.`);
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, 'Return items are required');
  }

  let actualRefundTotal = 0;
  let allItemsFullyReturned = true;

  // ── 1. Validate return qtys and restore stock ──────────────────────────────
  for (const item of items) {
    const returnQty = Number(item.qty || item.quantity) || 0;
    if (returnQty <= 0) continue;

    // Find corresponding invoice item by product_id or name match
    const invoiceItem = invoice.items.find(
      ii => (item.product_id && ii.product_id && ii.product_id.toString() === item.product_id.toString()) ||
            ii.product_name?.toLowerCase().trim() === (item.name || item.product_name || '').toLowerCase().trim()
    );

    if (invoiceItem) {
      const alreadyReturned = invoiceItem.returned_qty || 0;
      const maxReturnable    = invoiceItem.quantity - alreadyReturned;

      if (maxReturnable <= 0) {
        throw new ApiError(400, `"${invoiceItem.product_name}" has already been fully returned.`);
      }

      if (returnQty > maxReturnable) {
        throw new ApiError(400, `Return quantity for "${invoiceItem.product_name}" (${returnQty}) exceeds remaining returnable quantity (${maxReturnable}).`);
      }

      const validQty = returnQty;

      // Restore stock in product batches
      let product = null;
      if (mongoose.Types.ObjectId.isValid(invoiceItem.product_id)) {
        product = await Product.findById(invoiceItem.product_id);
      }
      if (!product && item.name) {
        product = await Product.findOne({ name: { $regex: new RegExp(`^${item.name}$`, 'i') } });
      }

      if (product) {
        if (product.batches && product.batches.length > 0) {
          // Try to restore to the same batch that was sold
          const targetBatch = product.batches.find(b => b.batch_no === (invoiceItem.batch_no || 'N/A')) || product.batches[0];
          targetBatch.stock_qty = (targetBatch.stock_qty || 0) + validQty;
        } else {
          product.batches.push({
            batch_no: invoiceItem.batch_no || 'BATCH-RETURNED',
            stock_qty: validQty,
            mfg_date: 'N/A',
            expiry_date: 'N/A',
            purchase_rate: product.purchase_price || 0,
            selling_rate: product.retail_price || 0
          });
        }
        product.markModified('batches');
        await product.save();

        // Sync WarehouseStock pos_counter_qty
        const totalStock = product.batches.reduce((sum, b) => sum + (b.stock_qty || 0), 0);
        await WarehouseStock.findOneAndUpdate(
          { product_id: product._id },
          { product_name: product.name, code: product.code, pos_counter_qty: totalStock },
          { upsert: true }
        );
      }

      // Update returned_qty on invoice item
      invoiceItem.returned_qty = alreadyReturned + validQty;
      actualRefundTotal += validQty * (invoiceItem.price || 0);

      // Check if this item is still not fully returned
      if (invoiceItem.returned_qty < invoiceItem.quantity) {
        allItemsFullyReturned = false;
      }
    } else {
      // Item not found in invoice — skip silently (might be a free item)
      allItemsFullyReturned = false;
    }
  }

  // Check items that weren't part of this return
  for (const ii of invoice.items) {
    if ((ii.returned_qty || 0) < ii.quantity) {
      allItemsFullyReturned = false;
    }
  }

  // ── 2. Update invoice return_status & status ───────────────────────────────
  const usedRefundTotal = actualRefundTotal || Number(refund_total) || 0;
  invoice.total_returned_amount = (invoice.total_returned_amount || 0) + usedRefundTotal;

  if (allItemsFullyReturned) {
    invoice.return_status = 'Full';
    invoice.status        = 'Fully Returned';
    invoice.refund_status = 'Refunded';
  } else {
    invoice.return_status = 'Partial';
    invoice.status        = 'Partial Return';
  }
  invoice.markModified('items');
  await invoice.save();

  // ── 3. Update Customer ledger if credit sale was returned ──────────────────
  try {
    const cust = await mongoose.model('Customer').findById(invoice.customer_id);
    if (cust && invoice.payment_method === 'Credit' && usedRefundTotal > 0) {
      cust.outstanding_balance = Math.max(0, (cust.outstanding_balance || 0) - usedRefundTotal);
      await cust.save();

      await CustomerPayment.create({
        customer_id: cust._id,
        customer_name: cust.name,
        date: new Date().toISOString().split('T')[0],
        amount: usedRefundTotal,
        payment_method: refund_method || 'Cash',
        ref_no: invoice_no,
        type: 'Sales Return',
        notes: `Sales Return for Invoice ${invoice_no}`
      });
    }
  } catch (_) { /* ledger update failure is non-fatal */ }

  // ── 4. Save the SalesReturn record ────────────────────────────────────────
  const returnRecord = await SalesReturn.create({
    return_no: `SR${Date.now()}`,
    date: new Date().toISOString().split('T')[0],
    invoice_no,
    customer: customer || invoice.customer_name,
    items,
    refund_total: usedRefundTotal,
    refund_method: refund_method || 'Cash',
    refund_details: refund_details || {},
    status: 'Processed'
  });

  await auditService.logAction(
    'Sales Return Processed',
    `Invoice ${invoice_no} — ${allItemsFullyReturned ? 'FULL' : 'PARTIAL'} return. Refunded Rs. ${usedRefundTotal}.`,
    currentUser ? currentUser.name : 'Admin'
  );

  return { returnRecord, invoice };
};


const cancelSaleInvoice = async (invoiceId, cancelData, currentUser = null) => {
  const invoice = await SaleInvoice.findById(invoiceId);
  if (!invoice) throw new ApiError(404, 'Invoice not found');
  if (invoice.status === 'Cancelled') throw new ApiError(400, 'Invoice is already cancelled');

  const { reason, refundMode, refundMethod, paymentDetails } = cancelData;

  let rStatus = 'Not Required';
  let rMethod = '';
  let rDetails = {};

  if (invoice.payment_status !== 'Credit' && invoice.payment_status !== 'Cancelled') {
    if (refundMode === 'now') {
      rStatus = 'Refunded';
      rMethod = refundMethod || 'Cash';
      rDetails = paymentDetails || {};
    } else {
      rStatus = 'Pending';
    }
  }

  // 1. Reverse Stock back to POS Counter
  for (const item of invoice.items) {
    const product = await Product.findById(item.product_id);
    if (product) {
      if (product.batches && product.batches.length > 0) {
        product.batches[0].stock_qty += item.quantity;
      } else {
        product.batches.push({
          batch_no: item.batch_no || 'BATCH-001',
          stock_qty: item.quantity,
          purchase_rate: product.purchase_price || 0,
          selling_rate: product.retail_price || 0
        });
      }
      product.markModified('batches');
      await product.save();

      await WarehouseStock.findOneAndUpdate(
        { product_id: item.product_id },
        { 
          product_name: product.name,
          code: product.code,
          $inc: { pos_counter_qty: item.quantity } 
        },
        { upsert: true }
      );
    }
  }

  // 2. Mark Invoice as Cancelled
  invoice.status = 'Cancelled';
  invoice.payment_status = 'Cancelled';
  invoice.refund_status = rStatus;
  invoice.refund_method = rMethod;
  invoice.refund_details = rDetails;
  invoice.cancellation_details = {
    by: currentUser ? currentUser.name : 'Admin',
    on: new Date().toLocaleString('en-GB'),
    reason,
    stock_reversed: true
  };

  await invoice.save();

  await auditService.logAction(
    'Cancel Sale',
    `Cancelled invoice ${invoice.invoice_no}. Reason: ${reason}`,
    currentUser ? currentUser.name : 'Admin'
  );

  return invoice;
};

module.exports = {
  processPOSSale,
  processSalesReturn,
  cancelSaleInvoice
};
