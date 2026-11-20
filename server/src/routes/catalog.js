const { asyncRoute } = require('../utils/httpErrors');
const express = require('express');
const router = express.Router();
const CatalogController = require('../controllers/catalogController');
const { authMiddleware, checkRole } = require('../middleware/authMiddleware');
const { validateProduct, validateNumericId } = require('../middleware/validationMiddleware');

// Rutas publicas

// Obtener productos de mujeres
router.get('/women', asyncRoute(CatalogController.getWomenProducts));

// Obtener productos de hombres
router.get('/men', asyncRoute(CatalogController.getMenProducts));

// Obtener producto por ID
router.get('/product/:id', validateNumericId(), asyncRoute(CatalogController.getProductById));

// Obtener categorias
router.get('/categories', asyncRoute(CatalogController.getCategories));

// Obtener productos por categoria
router.get('/category/:category', asyncRoute(CatalogController.getProductsByCategory));

// Buscar productos
router.get('/search', asyncRoute(CatalogController.searchProducts));

// Búsqueda específica para chatbot (solo lectura, sin auth)
router.get('/chatbot/search', asyncRoute(CatalogController.chatbotSearch));

// Productos destacados
router.get('/featured', asyncRoute(CatalogController.getFeaturedProducts));

// Obtener todos los productos
router.get('/all', asyncRoute(CatalogController.getAllProducts));

// Rutas que requieren autenticacion (Admin o Vendedor)

// Crear producto
router.post('/product', authMiddleware, checkRole('Administrador', 'Vendedor'), validateProduct, asyncRoute(CatalogController.createProduct));

// Actualizar producto
router.put('/product/:id', authMiddleware, checkRole('Administrador', 'Vendedor'), validateNumericId(), validateProduct, asyncRoute(CatalogController.updateProduct));

// Eliminar producto
router.delete('/product/:id', authMiddleware, checkRole('Administrador'), validateNumericId(), asyncRoute(CatalogController.deleteProduct));

// ========== RUTAS DE ADMINISTRACIÓN CON PREFIJO /admin ==========

// Obtener todos los productos para administración
router.get('/admin/products', authMiddleware, checkRole('Administrador', 'Vendedor'), asyncRoute(CatalogController.getAllProducts));

// Crear producto (admin)
router.post('/admin/products', authMiddleware, checkRole('Administrador', 'Vendedor'), validateProduct, asyncRoute(CatalogController.createProduct));

// Actualizar producto (admin)
router.put('/admin/products/:id', authMiddleware, checkRole('Administrador', 'Vendedor'), validateNumericId(), validateProduct, asyncRoute(CatalogController.updateProduct));

// Eliminar producto (admin)
router.delete('/admin/products/:id', authMiddleware, checkRole('Administrador'), validateNumericId(), asyncRoute(CatalogController.deleteProduct));

// Actualizar stock de producto (admin)
router.put('/admin/products/:id/stock', authMiddleware, checkRole('Administrador', 'Vendedor'), validateNumericId(), asyncRoute(CatalogController.updateStock));

module.exports = router;
