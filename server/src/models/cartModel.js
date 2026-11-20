const { HttpError } = require('../utils/httpErrors');
const { getOne, getAll, runQuery, runTransaction, withTransaction } = require('../config/db');

class CartModel {
  // Agregar producto al carrito
  static async addToCart(userId, productId, quantity = 1) {
    // Verificar si el producto ya esta en el carrito
    const existingItem = await getOne(
      'SELECT id, quantity FROM cart WHERE user_id = ? AND product_id = ?',
      [userId, productId]
    );

    if (existingItem) {
      // Actualizar cantidad
      const query = 'UPDATE cart SET quantity = quantity + ? WHERE user_id = ? AND product_id = ?';
      await runQuery(query, [quantity, userId, productId]);
      return existingItem.id;
    } else {
      // Insertar nuevo item
      const query = 'INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)';
      const result = await runQuery(query, [userId, productId, quantity]);
      return result.id;
    }
  }

  // Eliminar producto del carrito
  static async removeFromCart(cartId, userId) {
    const query = 'DELETE FROM cart WHERE id = ? AND user_id = ?';
    const result = await runQuery(query, [cartId, userId]);
    return result.changes > 0;
  }

  // Actualizar cantidad de un item
  static async updateCartQuantity(cartId, userId, quantity) {
    if (quantity <= 0) {
      return this.removeFromCart(cartId, userId);
    }

    const query = 'UPDATE cart SET quantity = ? WHERE id = ? AND user_id = ?';
    await runQuery(query, [quantity, cartId, userId]);
  }

  // Obtener carrito del usuario
  static async getUserCart(userId) {
    const query = `
      SELECT 
        c.id,
        c.product_id,
        c.quantity,
        c.added_at,
        p.name as product_name,
        p.description,
        p.price,
        p.category,
        p.gender,
        p.image_url,
        (c.quantity * p.price) as subtotal
      FROM cart c
      JOIN products p ON c.product_id = p.id
      WHERE c.user_id = ?
      ORDER BY c.added_at DESC
    `;
    return await getAll(query, [userId]);
  }

  // Vaciar carrito
  static async clearCart(userId) {
    const query = 'DELETE FROM cart WHERE user_id = ?';
    await runQuery(query, [userId]);
  }

  // Finalizar compra (Checkout)
  static async completePurchase(){throw new HttpError('CHECKOUT_ENDPOINT_RETIRED');}

  // Obtener historial de compras
  static async getPurchaseHistory(userId) {
    const query = `
      SELECT 
        p.id,
        p.total_amount,
        p.payment_method,
        p.status,
        p.created_at,
        COUNT(pi.id) as total_items
      FROM purchases p
      LEFT JOIN purchase_items pi ON p.id = pi.purchase_id
      WHERE p.user_id = ?
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `;
    return await getAll(query, [userId]);
  }

  // Obtener detalles de una compra
  static async getPurchaseDetails(purchaseId, userId) {
    const query = `
      SELECT 
        pi.id,
        pi.product_id,
        pr.name as product_name,
        pr.description,
        pi.quantity,
        pi.price,
        (pi.quantity * pi.price) as subtotal
      FROM purchase_items pi
      JOIN products pr ON pi.product_id = pr.id
      JOIN purchases p ON pi.purchase_id = p.id
      WHERE pi.purchase_id = ? AND p.user_id = ?
    `;
    return await getAll(query, [purchaseId, userId]);
  }
}

module.exports = CartModel;
