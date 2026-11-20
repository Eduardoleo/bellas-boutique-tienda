const { withTransaction } = require('../config/db');
const { sendHttpError } = require('../utils/httpErrors');
const { logError } = require('../utils/safeLogger');
const UsersModel = require('../models/usersModel');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

class UsersController {
  // Obtener perfil del usuario
  static async getProfile(req, res) {
    try {
      const userId = req.userId; // Del middleware de autenticacion
      
      const user = await UsersModel.getUserProfile(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }
      
      res.json({
        success: true,
        user
      });
    } catch (error) {
      logError('userscontroller.failure', error);
      return sendHttpError(req, res, error);
    }
  }

  // Actualizar informacion del usuario
  static async updateProfile(req, res) {
    try {
      const userId = req.userId;
      const { name, email, phone, address } = req.body;

      if (!name || !email) {
        return res.status(400).json({
          success: false,
          message: 'Nombre y email son obligatorios'
        });
      }

      const updatedUser = await UsersModel.updateUser(userId, {
        name,
        email,
        phone,
        address
      });

      res.json({
        success: true,
        message: 'Perfil actualizado correctamente',
        user: updatedUser
      });
    } catch (error) {
      logError('userscontroller.failure', error);
      return sendHttpError(req, res, error);
    }
  }

  // Obtener todos los usuarios (Admin)
  static async getAllUsers(req, res) {
    try {
      const users = await UsersModel.getAllUsers();
      
      res.json({
        success: true,
        users
      });
    } catch (error) {
      logError('userscontroller.failure', error);
      return sendHttpError(req, res, error);
    }
  }

  // Eliminar usuario
  static async deleteUser(req, res) {
    try {
      const userId = req.params.id;
      
      await withTransaction(async () => {
        await UsersModel.deleteUser(userId);
      
      });

      res.json({
        success: true,
        message: 'Usuario eliminado correctamente'
      });
    } catch (error) {
      logError('userscontroller.failure', error);
      return sendHttpError(req, res, error);
    }
  }

  // Obtener historial de compras del usuario
  static async getPurchaseHistory(req, res) {
    try {
      const userId = req.userId; // Del middleware de autenticación

      const purchases = await UsersModel.getUserPurchases(userId);
      
      res.json({
        success: true,
        purchases
      });
    } catch (error) {
      logError('userscontroller.failure', error);
      return sendHttpError(req, res, error);
    }
  }

  // Reenviar factura por correo
  static async resendInvoice(req, res) {
    try {
      const userId = req.userId;
      const { invoiceId } = req.params;

      // Obtener datos de la factura
      const invoice = await UsersModel.getInvoiceById(invoiceId, userId);
      
      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: 'Factura no encontrada'
        });
      }

      // Obtener datos del usuario
      const user = await UsersModel.getUserProfile(userId);

      // Configurar transporter
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });

      // Preparar archivos adjuntos
      const attachments = [];
      
      if (invoice.pdf_path) {
        const pdfPath = path.join(__dirname, '..', invoice.pdf_path);
        if (fs.existsSync(pdfPath)) {
          attachments.push({
            filename: path.basename(pdfPath),
            path: pdfPath
          });
        }
      }

      if (invoice.xml_path) {
        const xmlPath = path.join(__dirname, '..', invoice.xml_path);
        if (fs.existsSync(xmlPath)) {
          attachments.push({
            filename: path.basename(xmlPath),
            path: xmlPath
          });
        }
      }

      // Enviar email
      await transporter.sendMail({
        from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_USER}>`,
        replyTo: process.env.EMAIL_FROM_ADDRESS,
        to: user.email,
        subject: `Reenvío de Factura - ${invoice.consecutivo}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #64D7DB;">Reenvío de Factura</h2>
            <p>Estimado/a ${user.name},</p>
            <p>Le reenviamos la factura solicitada correspondiente a su compra:</p>
            <ul>
              <li><strong>Consecutivo:</strong> ${invoice.consecutivo}</li>
              <li><strong>Fecha:</strong> ${new Date(invoice.created_at).toLocaleDateString('es-CR')}</li>
              <li><strong>Total:</strong> ₡${parseFloat(invoice.total).toLocaleString('es-CR', { minimumFractionDigits: 2 })}</li>
            </ul>
            <p>Adjunto encontrará los archivos de la factura en formato PDF y XML.</p>
            <br>
            <p>Gracias por su compra.</p>
            <p><strong>Bellas Boutique</strong></p>
          </div>
        `,
        attachments
      });

      res.json({
        success: true,
        message: 'Factura reenviada correctamente'
      });
    } catch (error) {
      logError('userscontroller.failure', error);
      return sendHttpError(req, res, error);
    }
  }

  // ========== FUNCIONES DE ADMINISTRACIÓN ==========

  // Listar todos los usuarios (Admin)
  static async getAllUsers(req, res) {
    try {
      const users = await UsersModel.getAllUsers();
      
      res.json({
        success: true,
        users,
        count: users.length
      });
    } catch (error) {
      logError('userscontroller.failure', error);
      return sendHttpError(req, res, error);
    }
  }

  // Crear usuario (Admin) - con rol específico
  static async createUserAdmin(req, res) {
    try {
      const { cedula, name, apellidos, email, password, phone, address, rol } = req.body;
      const adminUserId = req.userId;

      if (!name || !email || !password || !rol) {
        return res.status(400).json({
          success: false,
          message: 'Nombre, email, contraseña y rol son obligatorios'
        });
      }

      if (!['Administrador', 'Vendedor', 'Cliente'].includes(rol)) {
        return res.status(400).json({
          success: false,
          message: 'Rol no válido'
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
        const userId = await UsersModel.createUser({cedula,name,apellidos,email,password,phone,address,rol}, access);
        if (rol === 'Cliente') await UsersModel.registerClient(userId, access);
        await UsersModel.registrarBitacora(adminUserId,'CREAR_USUARIO','users',userId,'Usuario creado por admin: ' + email + ' (' + rol + ')',req.ip,access);
        return UsersModel.getUserById(userId, access);
      });

      res.status(201).json({
        success: true,
        message: 'Usuario creado exitosamente',
        user
      });
    } catch (error) {
      logError('userscontroller.failure', error);
      return sendHttpError(req, res, error);
    }
  }

  // Actualizar rol y estado de usuario (Admin)
  static async updateUserStatus(req, res) {
    try {
      const targetUserId = req.params.id;
      const { estado, rol } = req.body;
      const adminUserId = req.userId;

      if (!estado && !rol) {
        return res.status(400).json({
          success: false,
          message: 'Debe proporcionar al menos estado o rol'
        });
      }

      if (estado && !['Activo', 'Inactivo', 'Suspendido'].includes(estado)) {
        return res.status(400).json({
          success: false,
          message: 'Estado no válido'
        });
      }

      if (rol && !['Administrador', 'Vendedor', 'Cliente'].includes(rol)) {
        return res.status(400).json({
          success: false,
          message: 'Rol no válido'
        });
      }

      const updatedUser = await withTransaction(async () => {
        const updatedUser = await UsersModel.updateUserAdmin(targetUserId, {
          estado: estado || undefined,
          rol: rol || undefined
        });

        // Registrar en bitácora
        await UsersModel.registrarBitacora(adminUserId, 'ACTUALIZAR_USUARIO', 'users', targetUserId,
          `Estado/Rol actualizado: ${estado || ''} ${rol || ''}`, req.ip);

        return updatedUser;
      });

      res.json({
        success: true,
        message: 'Usuario actualizado exitosamente',
        user: updatedUser
      });
    } catch (error) {
      logError('userscontroller.failure', error);
      return sendHttpError(req, res, error);
    }
  }

  // Eliminar usuario (Admin)
  static async deleteUser(req, res) {
    try {
      const targetUserId = req.params.id;
      const adminUserId = req.userId;

      // No permitir que un admin se elimine a sí mismo
      if (parseInt(targetUserId) === parseInt(adminUserId)) {
        return res.status(400).json({
          success: false,
          message: 'No puedes eliminar tu propia cuenta'
        });
      }

      await withTransaction(async () => {
        await UsersModel.deleteUser(targetUserId);

        // Registrar en bitácora
        await UsersModel.registrarBitacora(adminUserId, 'ELIMINAR_USUARIO', 'users', targetUserId,
          'Usuario eliminado', req.ip);

      });

      res.json({
        success: true,
        message: 'Usuario eliminado exitosamente'
      });
    } catch (error) {
      logError('userscontroller.failure', error);
      return sendHttpError(req, res, error);
    }
  }
}

module.exports = UsersController;
