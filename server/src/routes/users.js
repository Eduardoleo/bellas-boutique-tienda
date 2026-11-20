const { asyncRoute } = require('../utils/httpErrors');
const { sendHttpError } = require('../utils/httpErrors');
const { logError } = require('../utils/safeLogger');
const express = require('express');
const router = express.Router();
const UsersController = require('../controllers/usersController');
const { authMiddleware, checkRole } = require('../middleware/authMiddleware');
const { validateProfileUpdate, validateNumericId } = require('../middleware/validationMiddleware');
const path = require('path');
const fs = require('fs');

// Descarga autenticada de PDF/XML de factura, siempre vinculada al propietario
router.get('/invoice/:filename', authMiddleware, asyncRoute(async (req, res) => {
  try {
    const filename = req.params.filename;
    const allowed=/^factura_[A-Za-z0-9_-]+\.(pdf|xml)$/;
    if(!allowed.test(filename))return res.status(400).json({success:false,message:'Nombre de factura inválido'});
    const {getOne}=require('../config/db');
    const consecutivo=filename.slice('factura_'.length,-4);
    const invoice=await getOne('SELECT user_id FROM invoices WHERE consecutivo=?',[consecutivo]);
    if(!invoice || invoice.user_id!==req.userId)return res.status(404).json({success:false,message:'Factura no encontrada'});
    const filePath = path.resolve(__dirname, '../invoices', filename);
    
    // Verificar que el archivo existe
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Factura no encontrada' });
    }
    
    // Enviar el archivo
    res.download(filePath, err => {
      if (err) {
        if (err.code === 'ENOENT' && !res.headersSent) return res.status(404).json({success:false,message:'Factura no encontrada'});
        return sendHttpError(req, res, err);
      }
    });
  } catch (error) {
    logError('users.failure', error);
    return sendHttpError(req, res, error);
  }
}));

// Todas las rutas siguientes requieren autenticacion
router.use(authMiddleware);

// Obtener perfil del usuario
router.get('/profile', asyncRoute(UsersController.getProfile));

// Actualizar perfil del usuario
router.put('/update', validateProfileUpdate, asyncRoute(UsersController.updateProfile));

// Obtener historial de compras
router.get('/purchases', asyncRoute(UsersController.getPurchaseHistory));

// Reenviar factura por email
router.post('/invoice/:invoiceId/resend', validateNumericId('invoiceId'), asyncRoute(UsersController.resendInvoice));

// ========== RUTAS DE ADMINISTRACIÓN ==========

// Obtener todos los usuarios (Admin)
router.get('/all', checkRole('Administrador'), asyncRoute(UsersController.getAllUsers));

// Crear usuario con rol específico (Admin)
router.post('/admin/create', checkRole('Administrador'), asyncRoute(UsersController.createUserAdmin));

// Actualizar estado/rol de usuario (Admin)
router.put('/admin/:id/status', checkRole('Administrador'), validateNumericId(), asyncRoute(UsersController.updateUserStatus));

// Eliminar usuario (Admin)
router.delete('/admin/:id', checkRole('Administrador'), validateNumericId(), asyncRoute(UsersController.deleteUser));

module.exports = router;
