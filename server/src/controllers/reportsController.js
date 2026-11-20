const { withTransaction } = require('../config/db');
const { sendHttpError } = require('../utils/httpErrors');
const { logError, logEvent } = require('../utils/safeLogger');
const ReportsModel = require('../models/reportsModel');
const UsersModel = require('../models/usersModel');
const { getCostaRicaDateString } = require('../utils/dateUtils');

class ReportsController {
  // Generar reporte diario
  static async generateDailyReport(req, res) {
    try {
      const fecha = req.query.fecha || getCostaRicaDateString();
      const userId = req.userId;

      const reporte = await withTransaction(async () => {
        const reporte = await ReportsModel.generateDailyReport(fecha);

        // Registrar en bitácora
        await UsersModel.registrarBitacora(userId, 'GENERAR_REPORTE', 'reportes_diarios', reporte.id,
          `Reporte diario generado para ${fecha}`, req.ip);

        return reporte;
      });

      res.json({
        success: true,
        reporte
      });
    } catch (error) {
      logError('reportscontroller.failure', error);
      return sendHttpError(req, res, error);
    }
  }

  // Obtener reporte diario
  static async getDailyReport(req, res) {
    try {
      const fecha = req.query.fecha || getCostaRicaDateString();

      const reporte = await ReportsModel.getDailyReport(fecha);

      if (!reporte) {
        // Generar reporte si no existe
        const nuevoReporte = await ReportsModel.generateDailyReport(fecha);
        return res.json({
          success: true,
          reporte: nuevoReporte
        });
      }

      res.json({
        success: true,
        reporte
      });
    } catch (error) {
      logError('reportscontroller.failure', error);
      return sendHttpError(req, res, error);
    }
  }

  // Obtener reporte mensual
  static async getMonthlyReport(req, res) {
    try {
      const { year, month } = req.query;

      if (!year || !month) {
        return res.status(400).json({
          success: false,
          message: 'Año y mes son obligatorios'
        });
      }

      const reporte = await ReportsModel.getMonthlyReport(year, month);

      res.json({
        success: true,
        reporte
      });
    } catch (error) {
      logError('reportscontroller.failure', error);
      return sendHttpError(req, res, error);
    }
  }

  // Obtener productos con stock bajo
  static async getLowStockProducts(req, res) {
    try {
      const productos = await ReportsModel.getLowStockProducts();

      res.json({
        success: true,
        productos,
        count: productos.length
      });
    } catch (error) {
      logError('reportscontroller.failure', error);
      return sendHttpError(req, res, error);
    }
  }

  // Obtener productos más vendidos
  static async getTopSellingProducts(req, res) {
    try {
      const limit = req.query.limit || 10;
      const startDate = req.query.start_date;
      const endDate = req.query.end_date;

      const productos = await ReportsModel.getTopSellingProducts(limit, startDate, endDate);

      res.json({
        success: true,
        productos
      });
    } catch (error) {
      logError('reportscontroller.failure', error);
      return sendHttpError(req, res, error);
    }
  }

  // Obtener estadísticas de ventas
  static async getSalesStats(req, res) {
    try {
      const startDate = req.query.start_date;
      const endDate = req.query.end_date;

      const stats = await ReportsModel.getSalesStats(startDate, endDate);

      res.json({
        success: true,
        stats
      });
    } catch (error) {
      logError('reportscontroller.failure', error);
      return sendHttpError(req, res, error);
    }
  }

  // Obtener bitácora de actividades
  static async getBitacora(req, res) {
    try {
      const userId = req.query.user_id;
      const accion = req.query.accion;
      const startDate = req.query.start_date;
      const endDate = req.query.end_date;
      const limit = req.query.limit || 100;

      const bitacora = await ReportsModel.getBitacora({
        userId,
        accion,
        startDate,
        endDate,
        limit
      });

      res.json({
        success: true,
        bitacora,
        count: bitacora.length
      });
    } catch (error) {
      logError('reportscontroller.failure', error);
      return sendHttpError(req, res, error);
    }
  }

  // Obtener intentos de login
  static async getLoginAttempts(req, res) {
    try {
      const { email, exitoso, startDate, endDate, limit } = req.query;

      const intentos = await ReportsModel.getLoginAttempts({
        email,
        exitoso,
        startDate,
        endDate,
        limit
      });

      res.json({
        success: true,
        intentos,
        count: intentos.length
      });
    } catch (error) {
      logError('reportscontroller.failure', error);
      return sendHttpError(req, res, error);
    }
  }

  // Obtener dashboard de administrador
  static async getAdminDashboard(req, res) {
    try {
      const dashboard = await ReportsModel.getAdminDashboard();

      res.json({
        success: true,
        dashboard
      });
    } catch (error) {
      logError('reportscontroller.failure', error);
      return sendHttpError(req, res, error);
    }
  }

  // Exportar reporte de ventas
  static async exportSalesReport(req, res) {
    try {
      const startDate = req.query.start_date;
      const endDate = req.query.end_date;
      const format = req.query.format || 'json'; // json, csv

      const ventas = await ReportsModel.getDetailedSalesReport(startDate, endDate);

      if (format === 'csv') {
        // Convertir a CSV
        const csv = ReportsModel.convertToCSV(ventas);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=ventas_${startDate}_${endDate}.csv`);
        return res.send(csv);
      }

      res.json({
        success: true,
        ventas,
        count: ventas.length
      });
    } catch (error) {
      logError('reportscontroller.failure', error);
      return sendHttpError(req, res, error);
    }
  }

  // Obtener todas las ventas
  static async getVentas(req, res) {
    try {
      const ventas = await ReportsModel.getVentas();
      res.json({
        success: true,
        ventas
      });
    } catch (error) {
      logError('reportscontroller.failure', error);
      return sendHttpError(req, res, error);
    }
  }

  // Obtener todos los reportes diarios
  static async getReportesDiarios(req, res) {
    try {
      const reportes = await ReportsModel.getReportesDiarios();
      res.json({
        success: true,
        reportes
      });
    } catch (error) {
      logError('reportscontroller.failure', error);
      return sendHttpError(req, res, error);
    }
  }

  // Obtener todas las compras/pedidos
  static async getPurchases(req, res) {
    try {
      const purchases = await ReportsModel.getPurchases();
      res.json({
        success: true,
        purchases
      });
    } catch (error) {
      logError('reportscontroller.failure', error);
      return sendHttpError(req, res, error);
    }
  }

  // Obtener detalle de una compra/pedido
  static async getPurchaseById(req, res) {
    try {
      const { id } = req.params;
      const purchase = await ReportsModel.getPurchaseById(id);
      
      if (!purchase) {
        return res.status(404).json({
          success: false,
          message: 'Pedido no encontrado'
        });
      }

      res.json({
        success: true,
        purchase
      });
    } catch (error) {
      logError('reportscontroller.failure', error);
      return sendHttpError(req, res, error);
    }
  }

  // Actualizar estado de una compra/pedido
  static async updatePurchaseStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      await ReportsModel.updatePurchaseStatus(id, status);

      res.json({
        success: true,
        message: 'Estado actualizado exitosamente'
      });
    } catch (error) {
      logError('reportscontroller.failure', error);
      return sendHttpError(req, res, error);
    }
  }

  // Actualizar estado de envío
  static async updateShippingStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      // Obtener el estado actual del envío
      const purchase = await ReportsModel.getPurchaseById(id);
      
      if (!purchase) {
        return res.status(404).json({
          success: false,
          message: 'Pedido no encontrado'
        });
      }

      // Validar que no se pueda cambiar un pedido ya entregado o cancelado
      if (purchase.shipping_status === 'entregado' || purchase.shipping_status === 'cancelado') {
        return res.status(400).json({
          success: false,
          message: `No se puede modificar el estado de un pedido ${purchase.shipping_status}`
        });
      }

      await ReportsModel.updateShipmentStatus(id, status);

      // Obtener información actualizada del pedido
      const updatedPurchase = await ReportsModel.getPurchaseById(id);
      
      let mailSent = true;
      if (updatedPurchase && updatedPurchase.user_email) {
        // Enviar correo de seguimiento
        mailSent = await ReportsController.sendShipmentStatusEmail(
          updatedPurchase.user_email,
          updatedPurchase.user_name || 'Cliente',
          status,
          updatedPurchase.tracking_number || id
        );
      }

      res.json({
        success: true,
        message: 'Estado de envío actualizado exitosamente',
        warnings: mailSent ? [] : ['EMAIL_NOT_SENT']
      });
    } catch (error) {
      logError('reportscontroller.failure', error);
      return sendHttpError(req, res, error);
    }
  }

  // Enviar correo de seguimiento de envío
  static async sendShipmentStatusEmail(email, customerName, status, trackingNumber) {
    try {
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        logEvent('reportscontroller.activity');
        return false;
      }

      const nodemailer = require('nodemailer');
      
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });

      const statusMessages = {
        'pending': 'Pendiente de procesamiento',
        'processing': 'En preparación',
        'in_transit': 'En camino a su destino',
        'delivered': 'Entregado exitosamente',
        'cancelled': 'Cancelado'
      };

      const statusMessage = statusMessages[status] || status;
      const trackingLink = `http://localhost:3000/rastreo/${trackingNumber}`;

      const mailOptions = {
        from: `"Bellas Boutique" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `Actualización de su pedido #${trackingNumber} - Bellas Boutique`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #64D7DB 0%, #5ac5c9 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .status-box { background-color: white; border-left: 4px solid #64D7DB; padding: 20px; margin: 20px 0; border-radius: 5px; }
              .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #64D7DB 0%, #5ac5c9 100%); color: white; text-decoration: none; border-radius: 25px; margin: 20px 0; font-weight: bold; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Bellas Boutique</h1>
                <p>Actualización de su Pedido</p>
              </div>
              <div class="content">
                <h2>Estimado/a ${customerName},</h2>
                <p>Le informamos que el estado de su envío ha sido actualizado:</p>
                
                <div class="status-box">
                  <h3 style="color: #64D7DB; margin-top: 0;">Estado Actual: ${statusMessage}</h3>
                  <p><strong>Número de rastreo:</strong> ${trackingNumber}</p>
                </div>

                <p>Puede rastrear su pedido en tiempo real haciendo clic en el siguiente enlace:</p>
                
                <div style="text-align: center;">
                  <a href="${trackingLink}" class="button">Rastrear mi Pedido</a>
                </div>

                <p>Si tiene alguna pregunta sobre su pedido, no dude en contactarnos.</p>
              </div>
              <div class="footer">
                <p><strong>Bellas Boutique</strong></p>
                <p>San José, Costa Rica</p>
                <p>Teléfono: +506 2222-3333 | Email: info@bellasboutique.cr</p>
                <p style="margin-top: 20px;">
                  Este es un correo automático, por favor no responder a este mensaje.
                </p>
              </div>
            </div>
          </body>
          </html>
        `
      };

      await transporter.sendMail(mailOptions);
      logEvent('reportscontroller.activity');
      return true;
    } catch (error) {
      logError('reportscontroller.failure', error);
      return false;
    }
  }
}

module.exports = ReportsController;
