const { asyncRoute } = require('../utils/httpErrors');
const express = require('express');
const router = express.Router();
const ReportsController = require('../controllers/reportsController');
const { authMiddleware, checkRole } = require('../middleware/authMiddleware');

// Todas las rutas requieren autenticación y rol de Administrador o Vendedor

// Reportes diarios
router.post('/diario', authMiddleware, checkRole('Administrador', 'Vendedor'), asyncRoute(ReportsController.generateDailyReport));
router.get('/diario', authMiddleware, checkRole('Administrador', 'Vendedor'), asyncRoute(ReportsController.getDailyReport));

// Reportes mensuales
router.get('/mensual', authMiddleware, checkRole('Administrador', 'Vendedor'), asyncRoute(ReportsController.getMonthlyReport));

// Productos
router.get('/productos/stock-bajo', authMiddleware, checkRole('Administrador', 'Vendedor'), asyncRoute(ReportsController.getLowStockProducts));
router.get('/productos/mas-vendidos', authMiddleware, checkRole('Administrador', 'Vendedor'), asyncRoute(ReportsController.getTopSellingProducts));

// Estadísticas de ventas
router.get('/ventas/estadisticas', authMiddleware, checkRole('Administrador', 'Vendedor'), asyncRoute(ReportsController.getSalesStats));
router.get('/ventas/exportar', authMiddleware, checkRole('Administrador'), asyncRoute(ReportsController.exportSalesReport));

// Bitácora
router.get('/bitacora', authMiddleware, checkRole('Administrador'), asyncRoute(ReportsController.getBitacora));
router.get('/login-attempts', authMiddleware, checkRole('Administrador'), asyncRoute(ReportsController.getLoginAttempts));
router.get('/intentos-login', authMiddleware, checkRole('Administrador'), asyncRoute(ReportsController.getLoginAttempts));

// Ventas
router.get('/ventas', authMiddleware, checkRole('Administrador', 'Vendedor'), asyncRoute(ReportsController.getVentas));

// Reportes diarios
router.get('/reportes-diarios', authMiddleware, checkRole('Administrador', 'Vendedor'), asyncRoute(ReportsController.getReportesDiarios));
router.post('/generar-reporte-diario', authMiddleware, checkRole('Administrador', 'Vendedor'), asyncRoute(ReportsController.generateDailyReport));

// Purchases (pedidos)
router.get('/purchases', authMiddleware, checkRole('Administrador', 'Vendedor'), asyncRoute(ReportsController.getPurchases));
router.get('/purchases/:id', authMiddleware, checkRole('Administrador', 'Vendedor'), asyncRoute(ReportsController.getPurchaseById));
router.put('/purchases/:id/status', authMiddleware, checkRole('Administrador', 'Vendedor'), asyncRoute(ReportsController.updatePurchaseStatus));
router.put('/purchases/:id/shipping-status', authMiddleware, checkRole('Administrador', 'Vendedor'), asyncRoute(ReportsController.updateShippingStatus));

// Dashboard
router.get('/dashboard', authMiddleware, checkRole('Administrador', 'Vendedor'), asyncRoute(ReportsController.getAdminDashboard));

module.exports = router;
