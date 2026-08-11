const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/sales', reportController.getSalesReport);
router.get('/purchases', reportController.getPurchaseReport);
router.get('/stock', reportController.getStockReport);
router.get('/expenses', reportController.getExpenseReport);
router.get('/trial-balance', reportController.getTrialBalance);
router.get('/balance-sheet', reportController.getBalanceSheet);

module.exports = router;
