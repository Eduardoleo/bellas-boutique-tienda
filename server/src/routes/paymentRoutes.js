const { asyncRoute } = require('../utils/httpErrors');
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const { processPayment, getCheckoutStatus } = require('../controllers/paymentController');

// Rutas de procesamiento de pagos
// Procesar pago
router.get('/checkouts/:key',authMiddleware,asyncRoute(getCheckoutStatus));
router.post('/process', authMiddleware, asyncRoute(processPayment));

module.exports = router;
