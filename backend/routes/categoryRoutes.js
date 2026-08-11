const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(categoryController.getCategories)
  .post(restrictTo('Admin', 'Manager'), categoryController.createCategory);

router.route('/:id')
  .put(restrictTo('Admin', 'Manager'), categoryController.updateCategory)
  .delete(restrictTo('Admin'), categoryController.deleteCategory);

module.exports = router;
