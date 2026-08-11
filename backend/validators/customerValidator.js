const { body } = require('express-validator');

const customerValidation = [
  body('name').trim().notEmpty().withMessage('Customer name is required'),
  body('customer_type').optional().isIn(['Walk-in Customer', 'Retail', 'Farmer', 'Dealer', 'Wholesaler']).withMessage('Invalid customer type')
];

const customerPaymentValidation = [
  body('amount').isNumeric().withMessage('Valid payment amount is required'),
  body('payment_method').notEmpty().withMessage('Payment method is required')
];

module.exports = {
  customerValidation,
  customerPaymentValidation
};
