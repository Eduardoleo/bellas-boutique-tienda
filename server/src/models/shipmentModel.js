const { getOne, getAll, runQuery } = require('../config/db');

class ShipmentModel {
  // Generar número de tracking único
  static generateTrackingNumber() {
    const prefix = 'BB';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}${timestamp}${random}`;
  }

  // Crear envío
  static async createShipment(purchaseId, shipmentData) {
    const { shipping_address, recipient_name, recipient_phone, estimated_delivery } = shipmentData;
    const tracking_number = this.generateTrackingNumber();

    const query = `
      INSERT INTO shipments (
        purchase_id, tracking_number, shipping_address, recipient_name, recipient_phone,
        status, estimated_delivery
      )
      VALUES (?, ?, ?, ?, ?, 'central', ?)
    `;

    const result = await runQuery(query, [
      purchaseId,
      tracking_number,
      shipping_address,
      recipient_name,
      recipient_phone,
      estimated_delivery
    ]);

    return {
      id: result.id,
      tracking_number
    };
  }

  // Obtener envío por tracking number
  static async getShipmentByTracking(trackingNumber) {
    const query = `
      SELECT s.*, p.user_id as owner_id, p.total_amount, p.created_at as purchase_date,
             u.name as customer_name, u.email as customer_email
      FROM shipments s
      JOIN purchases p ON s.purchase_id = p.id
      JOIN users u ON p.user_id = u.id
      WHERE s.tracking_number = ?
    `;
    return await getOne(query, [trackingNumber]);
  }

  // Obtener envío por purchase_id
  static async getShipmentByPurchase(purchaseId) {
    const query = 'SELECT * FROM shipments WHERE purchase_id = ?';
    return await getOne(query, [purchaseId]);
  }

  // Actualizar estado del envío
  static async updateShipmentStatus(shipmentId, newStatus, notes = null, changedBy = 'system') {
    const query = 'UPDATE shipments SET status = ? WHERE id = ?';
    await runQuery(query, [newStatus, shipmentId]);

    // El trigger se encargará de registrar en el historial
  }

  // Obtener historial de estados
  static async getShipmentHistory(shipmentId) {
    const query = `
      SELECT * FROM shipment_status_history
      WHERE shipment_id = ?
      ORDER BY created_at ASC
    `;
    return await getAll(query, [shipmentId]);
  }

  // Obtener todos los envíos con un estado específico
  static async getShipmentsByStatus(status) {
    const query = `
      SELECT s.*, p.id as purchase_id, u.name as customer_name
      FROM shipments s
      JOIN purchases p ON s.purchase_id = p.id
      JOIN users u ON p.user_id = u.id
      WHERE s.status = ?
      ORDER BY s.created_at DESC
    `;
    return await getAll(query, [status]);
  }

  // Obtener envíos del usuario
  static async getUserShipments(userId) {
    const query = `
      SELECT s.*, p.total_amount, p.created_at as purchase_date
      FROM shipments s
      JOIN purchases p ON s.purchase_id = p.id
      WHERE p.user_id = ?
      ORDER BY s.created_at DESC
    `;
    return await getAll(query, [userId]);
  }
}

module.exports = ShipmentModel;
