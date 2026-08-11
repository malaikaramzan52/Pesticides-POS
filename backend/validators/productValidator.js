const { body } = require('express-validator');

const productValidation = [
  body('code').trim().notEmpty().withMessage('Product code is required'),
  body('name').trim().notEmpty().withMessage('Product name is required'),
  body('company_id').optional(),
  body('category_id').optional(),
  body('unit_id').optional(),
  body('purchase_price').optional().isNumeric().withMessage('Valid purchase price is required'),
  body('retail_price').optional().isNumeric().withMessage('Valid retail price is required')
];

module.exports = {
  productValidation
};
