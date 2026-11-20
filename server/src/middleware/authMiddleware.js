const { sendHttpError } = require('../utils/httpErrors');
const { logError } = require('../utils/safeLogger');
const jwt = require('jsonwebtoken');

const sessions = require('../services/sessionService');
const authMiddleware = async (req, res, next) => {
  try {
    // Obtener token del header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Debes iniciar sesión para realizar esta acción',
        requiresAuth: true
      });
    }

    // Extraer token
    const token = authHeader.substring(7);

    // Verificar token
    if (!process.env.JWT_SECRET) return sendHttpError(req, res, new Error('JWT configuration unavailable'));
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {algorithms:['HS256']});
    if (!decoded || !Number.isSafeInteger(decoded.userId) || decoded.userId <= 0 || typeof decoded.rol !== 'string') {
      return res.status(401).json({success:false,message:'Token invalido',expired:false});
    }

    const user = await sessions.current(require('../config/db'), decoded.userId, decoded.sid);
    if (!user) return res.status(401).json({success:false,message:'Sesión inválida o revocada',requiresAuth:true});
    req.sessionId = decoded.sid;
    // Agregar información vigente del usuario al request
    req.userId = decoded.userId;
    req.userEmail = user.email;
    req.userRol = user.rol;

    next();
  } catch (error) {
    logError('authmiddleware.failure', error);

    if (error.name === 'JsonWebTokenError' || error.name === 'NotBeforeError') {
      return res.status(401).json({
        success: false,
        message: 'Token invalido',
        expired: false
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Sesión expirada. Por favor inicie sesión nuevamente.',
        expired: true
      });
    }

    return sendHttpError(req, res, error);
  }
};

// Middleware para verificar roles
const checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.userRol || !allowedRoles.includes(req.userRol)) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para realizar esta acción'
      });
    }
    next();
  };
};

// Middleware específico para administradores
const isAdmin = (req, res, next) => {
  if (!req.userRol || req.userRol !== 'Administrador') {
    return res.status(403).json({
      success: false,
      message: 'No tiene permisos para realizar esta acción'
    });
  }
  next();
};

module.exports = {
  authMiddleware,
  checkRole,
  isAdmin
};

