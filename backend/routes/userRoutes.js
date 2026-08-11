const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { createUserValidation } = require('../validators/authValidator');
const validate = require('../middleware/validate');
const { protect, restrictTo } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(userController.getUsers)
  .post(restrictTo('Admin'), createUserValidation, validate, userController.createUser);

router.route('/:id')
  .put(restrictTo('Admin'), userController.updateUser)
  .delete(restrictTo('Admin'), userController.deleteUser);

module.exports = router;
