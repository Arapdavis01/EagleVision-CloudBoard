const router = require('express').Router();
const financeController = require('../controllers/financeController');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/sales', financeController.getSales);
router.post('/sales', financeController.addSale);
router.delete('/sales/:id', financeController.deleteSale);

module.exports = router;
