const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(companyController.getCompanies)
  .post(restrictTo('Admin', 'Manager'), companyController.createCompany);

router.route('/:id')
  .put(restrictTo('Admin', 'Manager'), companyController.updateCompany)
  .delete(restrictTo('Admin'), companyController.deleteCompany);

module.exports = router;
