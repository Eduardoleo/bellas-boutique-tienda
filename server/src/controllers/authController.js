const { withTransaction } = require('../config/db');
const { sendHttpError } = require('../utils/httpErrors');
const { logError } = require('../utils/safeLogger');
const UsersModel = require('../models/usersModel');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sessions = require('../services/sessionService');

const {createRecovery,generic:recoveryGeneric}=require('../services/recoveryService');
let recoveryInstance;
function recovery(){
  if(!recoveryInstance){const {db}=require('../config/db');recoveryInstance=createRecovery({db,...require('../services/recoveryDelivery').createRecoveryDelivery()});}return recoveryInstance;
}
class AuthController {
  // Registro de nuevo usuario
  static async register(req, res) {
    try {
      const { cedula, name, apellidos, email, password, phone, address, rol } = req.body;

      // Validaciones
      if (!name || !email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Nombre, email y contraseña son obligatorios'
        });
      }

      // Validar seguridad de contraseña
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!passwordRegex.test(password)) {
        return res.status(400).json({
          success: false,
          message: 'La contraseña debe tener al menos 8 caracteres, incluir mayúsculas, minúsculas, números y caracteres especiales'
        });
      }

      const user = await withTransaction(async access => {
        const userId = await UsersModel.createUser({ cedula,name,apellidos,email,password,phone,address,rol:'Cliente' }, access);
        await UsersModel.registerClient(userId, access);
        await UsersModel.registrarBitacora(userId,'REGISTRO','users',userId,'Usuario registrado: ' + email,req.ip,access);
        return UsersModel.getUserById(userId, access);
      });

      res.status(201).json({
        success: true,
        message: 'Usuario registrado exitosamente',
        user
      });
    } catch (error) {
      logError('authcontroller.failure', error);
      return sendHttpError(req, res, error);
    }
  }

  // Login de usuario
  static async login(req, res) {
    try {
      const { email, password } = req.body;

      // Validaciones
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email y contraseña son obligatorios'
        });
      }

      // Registrar intento de login
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'];

      // Validar credenciales
      const result = await UsersModel.validateLogin(email, password);

      // Verificar si hay error
      if (result && result.error) {
        // Registrar intento fallido
        await UsersModel.registrarIntentoLogin(email, false, ipAddress, userAgent);
        
        return res.status(401).json({success:false,code:'INVALID_CREDENTIALS',message:'Email o contraseña incorrectos'});
      }

      const issued = await withTransaction(async () => {
        // Recheck under the write lock: reset/suspension may have happened during bcrypt.
        const currentUser = await UsersModel.validateLogin(email,password);
        if (!currentUser || currentUser.error) return null;
        await UsersModel.registrarIntentoLogin(email,true,ipAddress,userAgent);
        await UsersModel.registrarBitacora(currentUser.id,'LOGIN','users',currentUser.id,'Inicio de sesión',ipAddress);
        const sid = crypto.randomUUID();
        const token = sessions.issue(currentUser,sid);
        await UsersModel.registrarSesion(currentUser.id,sid,ipAddress,userAgent);
        return {token,user:currentUser};
      });
      if (!issued) return res.status(401).json({success:false,code:'INVALID_CREDENTIALS',message:'Email o contraseña incorrectos'});
      const token = issued.token;

      res.json({
        success: true,
        message: 'Login exitoso',
        token,
        user: issued.user
      });
    } catch (error) {
      logError('authcontroller.failure', error);
      return sendHttpError(req, res, error);
    }
  }

  // Recuperar contraseña
  static async forgotPassword(req, res) {
    if (typeof req.body?.email !== 'string' || !req.body.email.trim()) return res.status(400).json({success:false,message:'Email es obligatorio'});
    try { await recovery().request(req.body.email.trim()); return res.status(202).json({success:true,message:recoveryGeneric}); }
    catch (error) { return sendHttpError(req, res, error); }
  }

  static async resetPassword(req, res) {
    try { const ok=await recovery().reset(req.body?.token,req.body?.password);
      return res.status(ok?200:400).json({success:ok,message:ok?'Contraseña actualizada':'Solicitud de recuperación inválida o vencida'});
    } catch (error) { return sendHttpError(req, res, error); }
  }

  // Verificar token
  static async verifyToken(req, res) {
    try {
      const userId = req.userId;
      
      const user = await UsersModel.getUserProfile(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      // Actualizar último acceso de sesión
      const sid = req.sessionId;
      if (sid) {
        await UsersModel.actualizarSesion(sid);
      }

      res.json({
        success: true,
        user
      });
    } catch (error) {
      logError('authcontroller.failure', error);
      return sendHttpError(req, res, error);
    }
  }

  // Renovar token (mantener sesión activa)
  static async refreshToken(req, res) {
    try {
      const newToken = await withTransaction(async access => {
        const user = await sessions.current(access,req.userId,req.sessionId);
        if (!user) return null;
        await UsersModel.actualizarSesion(req.sessionId);
        return sessions.issue(user,req.sessionId);
      });
      if (!newToken) return res.status(401).json({success:false,message:'Sesión inválida o revocada',requiresAuth:true});

      res.json({
        success: true,
        message: 'Token renovado',
        token: newToken
      });
    } catch (error) {
      logError('authcontroller.failure', error);
      return sendHttpError(req, res, error);
    }
  }

  // Cerrar sesión
  static async logout(req, res) {
    try {
      const token = req.sessionId;
      const userId = req.userId;

      await withTransaction(async () => {
        if (token) {
          await UsersModel.cerrarSesion(token);
        }

        // Limpiar intentos de login del usuario (evita bloqueos al volver a iniciar sesión)
        if (userId) {
          await UsersModel.limpiarIntentosLogin(userId);
        }

        // Registrar en bitácora
        await UsersModel.registrarBitacora(userId, 'LOGOUT', 'users', userId, 'Cierre de sesión', req.ip);

      });

      res.json({
        success: true,
        message: 'Sesión cerrada exitosamente'
      });
    } catch (error) {
      logError('authcontroller.failure', error);
      return sendHttpError(req, res, error);
    }
  }
}

module.exports = AuthController;
