const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(settingsController.getSettings)
  .put(restrictTo('Admin'), settingsController.updateSettings);

router.get('/audit-logs', restrictTo('Admin'), settingsController.getAuditLogs);

module.exports = router;
