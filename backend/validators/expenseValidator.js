const { body } = require('express-validator');

const expenseValidation = [
  body('title').trim().notEmpty().withMessage('Expense title is required'),
  body('amount').isNumeric().withMessage('Valid expense amount is required'),
  body('category').notEmpty().withMessage('Expense category is required'),
  body('payment_method').notEmpty().withMessage('Payment method is required')
];

module.exports = {
  expenseValidation
};
