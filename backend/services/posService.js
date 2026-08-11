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

  const invNo = invoice_no || `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`;

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
      const primaryBatch = product.batches.find(b => b.batch_no === item.batch_no || b._id.toString() === item.batch_id);
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
      unit: item.unit || item.unit_name || item.unitOption?.name || 'Unit',
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

  // Create Sale Invoice Document
  const invoice = await SaleInvoice.create({
    invoice_no: invNo,
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    customer_id: customer._id,
    customer_name: customer.name,
    customer_type: customer.customer_type,
    user_id: currentUser ? currentUser._id : null,
    cashier_name: currentUser ? currentUser.name : 'Admin',
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
    `Invoice ${invNo} — ${customer.name} — Rs. ${grand_total}`,
    currentUser ? currentUser.name : 'Admin'
  );

  return invoice;
};

const processSalesReturn = async (returnData, currentUser = null) => {
  const { invoice_no, items, refund_total, refund_method, refund_details } = returnData;

  const invoice = await SaleInvoice.findOne({ invoice_no });
  if (!invoice) throw new ApiError(404, `Invoice "${invoice_no}" not found`);

  // 1. Restore stock to Product batches and WarehouseStock pos_counter_qty in MongoDB
  if (items && Array.isArray(items)) {
    for (const item of items) {
      const pId = item.product_id;
      const qty = Number(item.quantity) || 0;
      if (qty > 0 && pId) {
        const product = await Product.findById(pId);
        if (product) {
          if (product.batches && product.batches.length > 0) {
            product.batches[0].stock_qty += qty;
          } else {
            product.batches.push({
              batch_no: item.batch_no || 'BATCH-RETURNED',
              stock_qty: qty,
              mfg_date: 'N/A',
              expiry_date: 'N/A',
              purchase_rate: product.purchase_price || 0,
              selling_rate: product.retail_price || 0
            });
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
    }
  }

  const returnRecord = await SalesReturn.create({
    return_no: `SR${Date.now()}`,
    date: new Date().toISOString().split('T')[0],
    invoice_no,
    customer: invoice.customer_name,
    items,
    refund_total,
    refund_method,
    refund_details: refund_details || {},
    status: 'Processed'
  });

  await auditService.logAction(
    'Sales Return Processed',
    `Processed refund for Invoice ${invoice_no}. Refunded Rs. ${refund_total}. Stock and value updated.`,
    currentUser ? currentUser.name : 'Admin'
  );

  return returnRecord;
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
