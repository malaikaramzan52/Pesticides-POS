const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/purchaseController');
const { createPOValidation } = require('../validators/purchaseValidator');
const validate = require('../middleware/validate');
const { protect, restrictTo } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/returns', purchaseController.processPurchaseReturn);

router.route('/')
  .get(purchaseController.getPurchaseOrders)
  .post(restrictTo('Admin', 'Manager'), createPOValidation, validate, purchaseController.createPurchaseOrder);

router.route('/:id')
  .get(purchaseController.getPurchaseOrderById);

router.patch('/:id/status', restrictTo('Admin', 'Manager'), purchaseController.updatePOStatus);

module.exports = router;
