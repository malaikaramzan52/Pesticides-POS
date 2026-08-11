const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const { expenseValidation } = require('../validators/expenseValidator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/categories', expenseController.getCategories);
router.post('/categories', expenseController.createCategory);

router.route('/')
  .get(expenseController.getExpenses)
  .post(expenseValidation, validate, expenseController.createExpense);

router.delete('/:id', expenseController.deleteExpense);

module.exports = router;
