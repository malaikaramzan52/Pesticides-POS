const express = require('express');
const router = express.Router();
const offerController = require('../controllers/offerController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/active', offerController.getActiveSchemes);

router.route('/')
  .get(offerController.getOffers)
  .post(restrictTo('Admin', 'Manager'), offerController.createOffer);

router.route('/:id')
  .put(restrictTo('Admin', 'Manager'), offerController.updateOffer)
  .delete(restrictTo('Admin'), offerController.deleteOffer);

module.exports = router;
