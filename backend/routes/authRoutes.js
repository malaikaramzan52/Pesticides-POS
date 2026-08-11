const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { loginValidation } = require('../validators/authValidator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/authMiddleware');

router.post('/login', loginValidation, validate, authController.login);
router.get('/me', protect, authController.getMe);

module.exports = router;
