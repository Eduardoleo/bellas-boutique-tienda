const { asyncRoute } = require('../utils/httpErrors');
const express = require('express');
const router = express.Router();
const CartController = require('../controllers/cartController');
const { authMiddleware } = require('../middleware/authMiddleware');

// Todas las rutas requieren autenticacion
router.use(authMiddleware);

// Obtener carrito del usuario
router.get('/', asyncRoute(CartController.getCart));

// Agregar producto al carrito
router.post('/add', asyncRoute(CartController.addToCart));

// Eliminar producto del carrito
router.delete('/remove/:id', asyncRoute(CartController.removeFromCart));

// Actualizar cantidad de un item
router.put('/update/:id', asyncRoute(CartController.updateCartItem));

// Vaciar carrito
router.delete('/clear', asyncRoute(CartController.clearCart));

// Finalizar compra (Checkout)
router.post('/checkout', asyncRoute(CartController.checkout));

// Obtener historial de compras
router.get('/purchases', asyncRoute(CartController.getPurchaseHistory));

// Obtener detalles de una compra
router.get('/purchases/:id', asyncRoute(CartController.getPurchaseDetails));

module.exports = router;
