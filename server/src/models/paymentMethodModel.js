const { getOne, getAll, runQuery, withTransaction } = require('../config/db');
const { HttpError } = require('../utils/httpErrors');

class PaymentMethodModel {
  // Crear método de pago
  static async createPaymentMethod(userId, paymentData) {
    const { card_type, card_last_four, card_holder_name, expiry_month, expiry_year, is_default } = paymentData;

    return withTransaction(async tx => {
      if (is_default) await tx.runQuery('UPDATE payment_methods SET is_default=0 WHERE user_id=?', [userId]);
      const result = await tx.runQuery('INSERT INTO payment_methods (user_id,card_type,card_last_four,card_holder_name,expiry_month,expiry_year,is_default) VALUES (?,?,?,?,?,?,?)', [userId,card_type,card_last_four,card_holder_name,expiry_month,expiry_year,is_default ? 1 : 0]);
      return result.id;
    });
  }

  // Obtener métodos de pago del usuario
  static async getUserPaymentMethods(userId) {
    const query = `
      SELECT id, card_type, card_last_four, card_holder_name, expiry_month, expiry_year, is_default, created_at
      FROM payment_methods
      WHERE user_id = ?
      ORDER BY is_default DESC, created_at DESC
    `;
    return await getAll(query, [userId]);
  }

  // Establecer método de pago como default
  static async setDefaultPaymentMethod(userId, paymentMethodId) {
    return withTransaction(async tx => {
      const card = await this.requireOwnedPaymentMethod(paymentMethodId, userId, tx);
      await tx.runQuery('UPDATE payment_methods SET is_default=0 WHERE user_id=?', [userId]);
      const changed = await tx.runQuery('UPDATE payment_methods SET is_default=1 WHERE id=? AND user_id=?', [card.id,userId]);
      if (changed.changes !== 1) throw new HttpError('RESOURCE_NOT_FOUND');
    });
  }

  // Eliminar método de pago
  static async deletePaymentMethod(userId, paymentMethodId) {
    await runQuery('DELETE FROM payment_methods WHERE id = ? AND user_id = ?', [paymentMethodId, userId]);
  }

  // Required references never fall back to an unverified card or silent success.
  static async requireOwnedPaymentMethod(paymentMethodId, userId, access = { getOne }) {
    if (!['number', 'string'].includes(typeof paymentMethodId)) throw new HttpError('INVALID_DATA');
    const id = Number(paymentMethodId);
    if (!Number.isSafeInteger(id) || id <= 0) throw new HttpError('INVALID_DATA');
    const card = await access.getOne('SELECT * FROM payment_methods WHERE id=? AND user_id=?', [id,userId]);
    if (!card) throw new HttpError('RESOURCE_NOT_FOUND');
    return card;
  }

  // Obtener método de pago por ID
  static async getPaymentMethod(paymentMethodId, userId) {
    const query = 'SELECT * FROM payment_methods WHERE id = ? AND user_id = ?';
    return await getOne(query, [paymentMethodId, userId]);
  }
}

module.exports = PaymentMethodModel;
