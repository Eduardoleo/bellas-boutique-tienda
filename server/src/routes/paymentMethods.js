const { asyncRoute } = require('../utils/httpErrors');
const { sendHttpError } = require('../utils/httpErrors');
const { logError } = require('../utils/safeLogger');
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const PaymentMethodModel = require('../models/paymentMethodModel');

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Obtener métodos de pago del usuario
router.get('/', asyncRoute(async (req, res) => {
  try {
    const userId = req.userId;
    const methods = await PaymentMethodModel.getUserPaymentMethods(userId);
    
    res.json({
      success: true,
      paymentMethods: methods
    });
  } catch (error) {
    logError('paymentmethods.failure', error);
    return sendHttpError(req, res, error);
  }
}));

// Establecer método de pago como default
router.put('/:id/default', asyncRoute(async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    
    await PaymentMethodModel.setDefaultPaymentMethod(userId, id);
    
    res.json({
      success: true,
      message: 'Método de pago establecido como predeterminado'
    });
  } catch (error) {
    logError('paymentmethods.failure', error);
    return sendHttpError(req, res, error);
  }
}));

// Eliminar método de pago
router.delete('/:id', asyncRoute(async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    
    await PaymentMethodModel.deletePaymentMethod(userId, id);
    
    res.json({
      success: true,
      message: 'Método de pago eliminado correctamente'
    });
  } catch (error) {
    logError('paymentmethods.failure', error);
    return sendHttpError(req, res, error);
  }
}));

module.exports = router;
