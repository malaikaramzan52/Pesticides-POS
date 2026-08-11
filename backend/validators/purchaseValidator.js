const { body } = require('express-validator');

const createPOValidation = [
  body('supplier').trim().notEmpty().withMessage('Supplier name is required'),
  body('items').isArray({ min: 1 }).withMessage('PO line items must not be empty'),
  body('total').isNumeric().withMessage('PO total amount is required')
];

module.exports = {
  createPOValidation
};
