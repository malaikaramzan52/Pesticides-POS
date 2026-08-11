const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', accountController.getAccounts);
router.post('/', accountController.createAccount);
router.post('/opening-balances', accountController.updateOpeningBalances);
router.get('/statement', accountController.getAccountStatement);

module.exports = router;
