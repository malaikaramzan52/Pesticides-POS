const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { productValidation } = require('../validators/productValidator');
const validate = require('../middleware/validate');
const { protect, restrictTo } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(productController.getProducts)
  .post(restrictTo('Admin', 'Manager'), productValidation, validate, productController.createProduct);

router.route('/:id')
  .get(productController.getProduct)
  .put(restrictTo('Admin', 'Manager'), productController.updateProduct)
  .delete(restrictTo('Admin'), productController.deleteProduct);

module.exports = router;
