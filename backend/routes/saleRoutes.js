const express = require('express');
const router = express.Router();
const posController = require('../controllers/posController');
const saleController = require('../controllers/saleController');
const { createSaleValidation, salesReturnValidation, cancelSaleValidation } = require('../validators/posValidator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/pos', createSaleValidation, validate, posController.createSale);
router.post('/returns', salesReturnValidation, validate, posController.processReturn);
router.post('/:id/cancel', cancelSaleValidation, validate, posController.cancelSale);

router.get('/history', saleController.getSalesHistory);
router.get('/:id', saleController.getSaleById);
router.post('/:id/pay-balance', saleController.paySaleBalance);

module.exports = router;
