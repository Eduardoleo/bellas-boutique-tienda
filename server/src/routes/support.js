const { asyncRoute } = require('../utils/httpErrors');
const express = require('express');
const router = express.Router();
const SupportController = require('../controllers/supportController');
const { authMiddleware, checkRole } = require('../middleware/authMiddleware');

// ========== ENCUESTAS ==========
router.post('/encuestas', authMiddleware, asyncRoute(SupportController.createEncuesta));
router.get('/encuestas', authMiddleware, asyncRoute(SupportController.getUserEncuestas));
router.get('/encuestas/all', authMiddleware, checkRole('Administrador', 'Vendedor'), asyncRoute(SupportController.getAllEncuestas));

// ========== SUGERENCIAS ==========
router.post('/sugerencias', authMiddleware, asyncRoute(SupportController.createSugerencia));
router.get('/sugerencias/all', authMiddleware, checkRole('Administrador', 'Vendedor'), asyncRoute(SupportController.getAllSugerencias));
router.put('/sugerencias/:id/estado', authMiddleware, checkRole('Administrador'), asyncRoute(SupportController.updateSugerenciaEstado));
router.put('/sugerencias/:id/rechazar', authMiddleware, checkRole('Administrador'), asyncRoute(SupportController.rechazarSugerencia));

// ========== PREGUNTAS FRECUENTES ==========
router.get('/faqs', asyncRoute(SupportController.getAllFAQs));
router.post('/faqs', authMiddleware, checkRole('Administrador'), asyncRoute(SupportController.createFAQ));
router.put('/faqs/:id', authMiddleware, checkRole('Administrador'), asyncRoute(SupportController.updateFAQ));
router.delete('/faqs/:id', authMiddleware, checkRole('Administrador'), asyncRoute(SupportController.deleteFAQ));

// ========== CHAT EN LÍNEA ==========
router.post('/chat/salas',authMiddleware,asyncRoute(SupportController.createChatRoom));
router.post('/chat/mensaje', authMiddleware, asyncRoute(SupportController.sendChatMessage));
router.get('/chat/:sala_id/mensajes', authMiddleware, asyncRoute(SupportController.getChatMessages));
router.put('/chat/:sala_id/leer', authMiddleware, asyncRoute(SupportController.markMessagesAsRead));
router.get('/chat/salas', authMiddleware, asyncRoute(SupportController.getUserChatRooms));

module.exports = router;
