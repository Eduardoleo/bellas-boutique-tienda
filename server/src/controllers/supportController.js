const { withTransaction } = require('../config/db');
const { sendHttpError } = require('../utils/httpErrors');
const { logError, logEvent } = require('../utils/safeLogger');
const SupportModel = require('../models/supportModel');
const UsersModel = require('../models/usersModel');

class SupportController {
  // ========== ENCUESTAS ==========
  
  // Crear encuesta
  static async createEncuesta(req, res) {
    try {
      const userId = req.userId;
      const { purchase_id, puntuacion, comentario } = req.body;

      if (!puntuacion || puntuacion < 1 || puntuacion > 5) {
        return res.status(400).json({
          success: false,
          message: 'La puntuación debe estar entre 1 y 5'
        });
      }

      const encuestaId = await withTransaction(async () => {
        const encuestaId = await SupportModel.createEncuesta({
          user_id: userId,
          purchase_id,
          puntuacion,
          comentario
        });

        // Registrar en bitácora
        await UsersModel.registrarBitacora(userId, 'CREAR_ENCUESTA', 'encuestas', encuestaId,
          `Encuesta creada con puntuación ${puntuacion}`, req.ip);

        return encuestaId;
      });

      res.status(201).json({
        success: true,
        message: 'Encuesta enviada exitosamente',
        encuestaId
      });
    } catch (error) {
      logError('supportcontroller.failure', error);
      return sendHttpError(req, res, error);
    }
  }

  // Obtener todas las encuestas (Admin)
  static async getAllEncuestas(req, res) {
    try {
      const encuestas = await SupportModel.getAllEncuestas();

      res.json({
        success: true,
        encuestas,
        count: encuestas.length
      });
    } catch (error) {
      logError('supportcontroller.failure', error);
      return sendHttpError(req, res, error);
    }
  }

  // Obtener encuestas de un usuario
  static async getUserEncuestas(req, res) {
    try {
      const userId = req.userId;
      const encuestas = await SupportModel.getUserEncuestas(userId);

      res.json({
        success: true,
        encuestas
      });
    } catch (error) {
      logError('supportcontroller.failure', error);
      return sendHttpError(req, res, error);
    }
  }

  // ========== SUGERENCIAS ==========

  // Crear sugerencia
  static async createSugerencia(req, res) {
    try {
      const userId = req.userId;
      const { titulo, descripcion } = req.body;

      if (!titulo || !descripcion) {
        return res.status(400).json({
          success: false,
          message: 'Título y descripción son obligatorios'
        });
      }

      const sugerenciaId = await withTransaction(async () => {
        const sugerenciaId = await SupportModel.createSugerencia({
          user_id: userId,
          titulo,
          descripcion
        });

        // Registrar en bitácora
        await UsersModel.registrarBitacora(userId, 'CREAR_SUGERENCIA', 'sugerencias', sugerenciaId,
          `Sugerencia creada: ${titulo}`, req.ip);

        return sugerenciaId;
      });

      res.status(201).json({
        success: true,
        message: 'Sugerencia enviada exitosamente',
        sugerenciaId
      });
    } catch (error) {
      logError('supportcontroller.failure', error);
      return sendHttpError(req, res, error);
    }
  }

  // Obtener todas las sugerencias (Admin)
  static async getAllSugerencias(req, res) {
    try {
      const estado = req.query.estado;
      const sugerencias = await SupportModel.getAllSugerencias(estado);

      res.json({
        success: true,
        sugerencias,
        count: sugerencias.length
      });
    } catch (error) {
      logError('supportcontroller.failure', error);
      return sendHttpError(req, res, error);
    }
  }

  // Actualizar estado de sugerencia (Admin)
  static async updateSugerenciaEstado(req, res) {
    try {
      const sugerenciaId = req.params.id;
      const { estado } = req.body;
      const userId = req.userId;

      if (!['Pendiente', 'En Revision', 'Implementada', 'Rechazada'].includes(estado)) {
        return res.status(400).json({
          success: false,
          message: 'Estado no válido'
        });
      }

      await withTransaction(async () => {
        await SupportModel.updateSugerenciaEstado(sugerenciaId, estado);

        // Registrar en bitácora
        await UsersModel.registrarBitacora(userId, 'ACTUALIZAR_SUGERENCIA', 'sugerencias', sugerenciaId,
          `Estado actualizado a: ${estado}`, req.ip);

      });

      res.json({
        success: true,
        message: 'Estado de sugerencia actualizado'
      });
    } catch (error) {
      logError('supportcontroller.failure', error);
      return sendHttpError(req, res, error);
    }
  }

  // Rechazar sugerencia con motivo y envío de correo (Admin)
  static async rechazarSugerencia(req, res) {
    try {
      const sugerenciaId = req.params.id;
      const { motivo } = req.body;
      const userId = req.userId;

      if (!motivo) {
        return res.status(400).json({
          success: false,
          message: 'El motivo de rechazo es obligatorio'
        });
      }

      // Obtener datos de la sugerencia y el usuario
      const sugerencia = await SupportModel.getSugerenciaById(sugerenciaId);
      
      if (!sugerencia) {
        return res.status(404).json({
          success: false,
          message: 'Sugerencia no encontrada'
        });
      }

      const usuario = await UsersModel.getUserById(sugerencia.user_id);

      if (!usuario) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      // Actualizar estado a Rechazada
      await withTransaction(async access => {
        await SupportModel.updateSugerenciaEstado(sugerenciaId, 'Rechazada', access);
        await UsersModel.registrarBitacora(userId,'RECHAZAR_SUGERENCIA','sugerencias',sugerenciaId,'Sugerencia rechazada. Motivo: ' + motivo,req.ip,access);
      });

      // Enviar correo al cliente
      const nodemailer = require('nodemailer');

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });

      const fromName = process.env.EMAIL_FROM_NAME || 'Bellas Boutique';
      const fromAddress = process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER;
      const mailOptions = {
        from: `"${fromName} - Mejora Continua" <${fromAddress}>`,
        to: usuario.email,
        subject: 'Respuesta a su sugerencia - Bellas Boutique',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #64D7DB 0%, #4ECDC4 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .motivo-box { background-color: #fff3e0; border-left: 4px solid #ff9800; padding: 15px; margin: 20px 0; border-radius: 5px; }
              .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #999; }
              .sugerencia-box { background-color: #e3f2fd; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #64D7DB; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Bellas Boutique</h1>
                <p>Equipo de Mejora Continua</p>
              </div>
              <div class="content">
                <p><strong>Estimado/a ${usuario.name},</strong></p>
                
                <p>Gracias por tomarse el tiempo en enviarnos su sugerencia. Su opinión es muy importante para nosotros.</p>

                <div class="sugerencia-box">
                  <strong>Su sugerencia:</strong>
                  <p><em>"${sugerencia.titulo}"</em></p>
                </div>

                <p>En esta ocasión hemos decidido rechazarla por el siguiente motivo:</p>

                <div class="motivo-box">
                  <strong>Motivo del rechazo:</strong>
                  <p style="margin: 10px 0 0 0; font-style: italic;">"${motivo}"</p>
                </div>

                <p>Apreciamos su interés en ayudarnos a mejorar nuestros servicios. Le invitamos a seguir compartiendo sus ideas y comentarios con nosotros.</p>

                <p style="margin-top: 30px;">Saludos,</p>
                <p><strong>Cordialmente equipo de mejora continua</strong><br/>Bellas Boutique</p>
              </div>
              <div class="footer">
                <p>Bellas Boutique - Costa Rica</p>
                <p>Este es un correo automático, por favor no responder.</p>
              </div>
            </div>
          </body>
          </html>
        `
      };

      let mailSent = false;
      try {
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) { await transporter.sendMail(mailOptions); mailSent = true; }
        logEvent('supportcontroller.activity');
      } catch (emailError) {
        logError('supportcontroller.failure', emailError);
        // No fallar la operación si el correo falla
      }



      res.json({
        success: true,
        message: mailSent ? 'Sugerencia rechazada y correo enviado al cliente' : 'Sugerencia rechazada; correo pendiente',
        warnings: mailSent ? [] : ['EMAIL_NOT_SENT']
      });
    } catch (error) {
      logError('supportcontroller.failure', error);
      return sendHttpError(req, res, error);
    }
  }

  // ========== PREGUNTAS FRECUENTES ==========

  // Obtener todas las FAQ activas
  static async getAllFAQs(req, res) {
    try {
      const categoria = req.query.categoria;
      const faqs = await SupportModel.getAllFAQs(categoria);

      res.json({
        success: true,
        faqs
      });
    } catch (error) {
      logError('supportcontroller.failure', error);
      return sendHttpError(req, res, error);
    }
  }

  // Crear FAQ (Admin)
  static async createFAQ(req, res) {
    try {
      const { pregunta, respuesta, categoria, orden } = req.body;
      const userId = req.userId;

      if (!pregunta || !respuesta) {
        return res.status(400).json({
          success: false,
          message: 'Pregunta y respuesta son obligatorias'
        });
      }

      const faqId = await withTransaction(async () => {
        const faqId = await SupportModel.createFAQ({
          pregunta,
          respuesta,
          categoria,
          orden: orden || 0
        });

        // Registrar en bitácora
        await UsersModel.registrarBitacora(userId, 'CREAR_FAQ', 'preguntas_frecuentes', faqId,
          `FAQ creada: ${pregunta}`, req.ip);

        return faqId;
      });

      res.status(201).json({
        success: true,
        message: 'FAQ creada exitosamente',
        faqId
      });
    } catch (error) {
      logError('supportcontroller.failure', error);
      return sendHttpError(req, res, error);
    }
  }

  // Actualizar FAQ (Admin)
  static async updateFAQ(req, res) {
    try {
      const faqId = req.params.id;
      const { pregunta, respuesta, categoria, orden, activo } = req.body;
      const userId = req.userId;

      await withTransaction(async () => {
        await SupportModel.updateFAQ(faqId, {
          pregunta,
          respuesta,
          categoria,
          orden,
          activo
        });

        // Registrar en bitácora
        await UsersModel.registrarBitacora(userId, 'ACTUALIZAR_FAQ', 'preguntas_frecuentes', faqId,
          'FAQ actualizada', req.ip);

      });

      res.json({
        success: true,
        message: 'FAQ actualizada exitosamente'
      });
    } catch (error) {
      logError('supportcontroller.failure', error);
      return sendHttpError(req, res, error);
    }
  }

  // Eliminar FAQ (Admin)
  static async deleteFAQ(req, res) {
    try {
      const faqId = req.params.id;
      const userId = req.userId;

      await withTransaction(async () => {
        await SupportModel.deleteFAQ(faqId);

        // Registrar en bitácora
        await UsersModel.registrarBitacora(userId, 'ELIMINAR_FAQ', 'preguntas_frecuentes', faqId,
          'FAQ eliminada', req.ip);

      });

      res.json({
        success: true,
        message: 'FAQ eliminada exitosamente'
      });
    } catch (error) {
      logError('supportcontroller.failure', error);
      return sendHttpError(req, res, error);
    }
  }

  // ========== CHAT EN LÍNEA ==========

  static async createChatRoom(req,res) {
    try{return res.status(201).json({success:true,sala_id:await SupportModel.createChatRoom(req.userId)});}
    catch(error){return sendHttpError(req,res,error);}
  }
  // Enviar mensaje de chat
  static async sendChatMessage(req, res) {
    try {
      const userId = req.userId;
      const { sala_id, mensaje, tipo } = req.body;

      if (!sala_id || !mensaje) {
        return res.status(400).json({
          success: false,
          message: 'Sala y mensaje son obligatorios'
        });
      }

      const mensajeId = await SupportModel.createChatMessage({
        sala_id,
        user_id: userId,
        mensaje,
        tipo: tipo || 'texto'
      }, req.userRol);

      res.status(201).json({
        success: true,
        message: 'Mensaje enviado',
        mensajeId
      });
    } catch (error) {
      logError('supportcontroller.failure', error);
      return sendHttpError(req, res, error);
    }
  }

  // Obtener mensajes de una sala
  static async getChatMessages(req, res) {
    try {
      const { sala_id } = req.params;
      const limit = Number(req.query.limit || 50);
      if (!Number.isInteger(limit) || limit < 1 || limit > 200) return res.status(400).json({success:false,message:'Límite inválido'});

      const mensajes = await SupportModel.getChatMessages(sala_id, limit, req.userId, req.userRol);

      res.json({
        success: true,
        mensajes
      });
    } catch (error) {
      logError('supportcontroller.failure', error);
      return sendHttpError(req, res, error);
    }
  }

  // Marcar mensajes como leídos
  static async markMessagesAsRead(req, res) {
    try {
      const { sala_id } = req.params;
      const userId = req.userId;

      await SupportModel.markMessagesAsRead(sala_id, userId, req.userRol);

      res.json({
        success: true,
        message: 'Mensajes marcados como leídos'
      });
    } catch (error) {
      logError('supportcontroller.failure', error);
      return sendHttpError(req, res, error);
    }
  }

  // Obtener salas de chat del usuario
  static async getUserChatRooms(req, res) {
    try {
      const userId = req.userId;
      const salas = await SupportModel.getUserChatRooms(userId, req.userRol);

      res.json({
        success: true,
        salas
      });
    } catch (error) {
      logError('supportcontroller.failure', error);
      return sendHttpError(req, res, error);
    }
  }
}

module.exports = SupportController;
