const { body } = require('express-validator');

const createSaleValidation = [
  body('customer_id').notEmpty().withMessage('Customer ID is required'),
  body('items').isArray({ min: 1 }).withMessage('Cart items must not be empty'),
  body('grand_total').isNumeric().withMessage('Valid grand total is required'),
  body('payment_method').notEmpty().withMessage('Payment method is required')
];

const salesReturnValidation = [
  body('invoice_no').notEmpty().withMessage('Invoice number is required'),
  body('items').isArray({ min: 1 }).withMessage('Return items must not be empty'),
  body('refund_total').isNumeric().withMessage('Refund total is required'),
  body('refund_method').notEmpty().withMessage('Refund method is required')
];

const cancelSaleValidation = [
  body('reason').trim().notEmpty().withMessage('Cancellation reason is required')
];

module.exports = {
  createSaleValidation,
  salesReturnValidation,
  cancelSaleValidation
};
