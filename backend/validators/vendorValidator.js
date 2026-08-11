const { body } = require('express-validator');

const vendorValidation = [
  body('name').trim().notEmpty().withMessage('Vendor name is required')
];

const vendorPaymentValidation = [
  body('amount').isNumeric().withMessage('Valid disbursement amount is required'),
  body('payment_method').notEmpty().withMessage('Payment method is required')
];

module.exports = {
  vendorValidation,
  vendorPaymentValidation
};
