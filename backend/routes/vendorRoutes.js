const express = require('express');
const router = express.Router();
const vendorController = require('../controllers/vendorController');
const { vendorValidation, vendorPaymentValidation } = require('../validators/vendorValidator');
const validate = require('../middleware/validate');
const { protect, restrictTo } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(vendorController.getVendors)
  .post(restrictTo('Admin', 'Manager'), vendorValidation, validate, vendorController.createVendor);

router.route('/:id')
  .put(restrictTo('Admin', 'Manager'), vendorController.updateVendor)
  .delete(restrictTo('Admin', 'Manager'), vendorController.deleteVendor);

router.get('/:id/ledger', vendorController.getVendorLedger);
router.post('/:id/payments', restrictTo('Admin', 'Manager'), vendorPaymentValidation, validate, vendorController.recordPayment);

module.exports = router;
