const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const productRoutes = require('./productRoutes');
const categoryRoutes = require('./categoryRoutes');
const companyRoutes = require('./companyRoutes');
const offerRoutes = require('./offerRoutes');
const saleRoutes = require('./saleRoutes');
const purchaseRoutes = require('./purchaseRoutes');
const customerRoutes = require('./customerRoutes');
const vendorRoutes = require('./vendorRoutes');
const expenseRoutes = require('./expenseRoutes');
const accountRoutes = require('./accountRoutes');
const warehouseRoutes = require('./warehouseRoutes');
const reportRoutes = require('./reportRoutes');
const settingsRoutes = require('./settingsRoutes');

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/companies', companyRoutes);
router.use('/offers', offerRoutes);
router.use('/sales', saleRoutes);
router.use('/purchases', purchaseRoutes);
router.use('/customers', customerRoutes);
router.use('/vendors', vendorRoutes);
router.use('/expenses', expenseRoutes);
router.use('/accounts', accountRoutes);
router.use('/warehouse', warehouseRoutes);
router.use('/reports', reportRoutes);
router.use('/settings', settingsRoutes);

module.exports = router;
