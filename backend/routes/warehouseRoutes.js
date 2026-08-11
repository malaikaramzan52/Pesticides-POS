const express = require('express');
const router = express.Router();
const warehouseController = require('../controllers/warehouseController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/stock', warehouseController.getStockLevels);
router.post('/transfers', warehouseController.transferStock);
router.get('/transfers', warehouseController.getTransfers);

module.exports = router;
