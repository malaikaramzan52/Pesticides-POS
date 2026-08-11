const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { customerValidation, customerPaymentValidation } = require('../validators/customerValidator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(customerController.getCustomers)
  .post(customerValidation, validate, customerController.createCustomer);

router.route('/:id')
  .put(customerController.updateCustomer);

router.get('/:id/ledger', customerController.getCustomerLedger);
router.post('/:id/payments', customerPaymentValidation, validate, customerController.recordPayment);

module.exports = router;
