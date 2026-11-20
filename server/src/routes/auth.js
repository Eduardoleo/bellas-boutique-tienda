const { asyncRoute } = require('../utils/httpErrors');
const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { validateUserRegistration, validateLogin, rateLimiter } = require('../middleware/validationMiddleware');

// Rate limiter más estricto para autenticación (prevenir ataques de fuerza bruta)
const authRateLimiter = rateLimiter(30, 60000); // 30 intentos por minuto (permite cambios de cuenta)

// Registro de usuario
router.post('/register', authRateLimiter, validateUserRegistration, asyncRoute(AuthController.register));

// Login de usuario
router.post('/login', authRateLimiter, validateLogin, asyncRoute(AuthController.login));

// Verificar token (requiere autenticacion)
router.get('/verify', authMiddleware, asyncRoute(AuthController.verifyToken));

// Renovar token (requiere autenticacion)
router.post('/refresh', authMiddleware, asyncRoute(AuthController.refreshToken));

// Recuperar contraseña
router.post('/forgot-password', authRateLimiter, asyncRoute(AuthController.forgotPassword));
router.post('/reset-password', authRateLimiter, asyncRoute(AuthController.resetPassword));

// Cerrar sesión
router.post('/logout', authMiddleware, asyncRoute(AuthController.logout));

module.exports = router;
