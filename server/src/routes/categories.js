const { asyncRoute } = require('../utils/httpErrors');
const express = require('express');
const router = express.Router();
const CategoryController = require('../controllers/categoryController');
const { authMiddleware, isAdmin } = require('../middleware/authMiddleware');

// Ruta pública para obtener categorías
router.get('/', asyncRoute(CategoryController.getCategories));

// Rutas de administración (requieren autenticación y rol admin)
router.post('/', authMiddleware, isAdmin, asyncRoute(CategoryController.createCategory));
router.put('/:id', authMiddleware, isAdmin, asyncRoute(CategoryController.updateCategory));
router.delete('/:id', authMiddleware, isAdmin, asyncRoute(CategoryController.deleteCategory));
router.patch('/:id/status', authMiddleware, isAdmin, asyncRoute(CategoryController.toggleStatus));

module.exports = router;
