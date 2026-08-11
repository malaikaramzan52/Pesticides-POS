const { body } = require('express-validator');

const loginValidation = [
  body('passcode')
    .custom((value, { req }) => {
      const code = req.body.passcode || req.body.password;
      if (!code || typeof code !== 'string' || !code.trim()) {
        throw new Error('Passcode or password is required');
      }
      return true;
    })
];

const createUserValidation = [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('passcode').notEmpty().withMessage('Passcode is required'),
  body('role').optional().isIn(['Admin', 'Manager', 'Cashier']).withMessage('Invalid role')
];

module.exports = {
  loginValidation,
  createUserValidation
};
