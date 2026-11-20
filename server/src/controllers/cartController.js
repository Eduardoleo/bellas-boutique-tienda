const { sendHttpError, HttpError } = require('../utils/httpErrors');
const { logError } = require('../utils/safeLogger');
const CartModel = require('../models/cartModel');

class CartController {
  // Agregar producto al carrito
  static async addToCart(req, res) {
    try {
      const userId = req.userId;
      const { product_id, quantity = 1 } = req.body;

      if (!product_id) {
        return res.status(400).json({
          success: false,
          message: 'Error al procesar la solicitud'
        });
      }

      if (quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: 'La cantidad debe ser mayor a 0'
        });
      }

      const cartItemId = await CartModel.addToCart(userId, product_id, quantity);

      res.json({
        success: true,
        message: 'Producto agregado al carrito',
        cartItemId
      });
    } catch (error) {
      logError('cartcontroller.failure', error);
      
      // Si el error es de constraint (producto o usuario no existe)
      if (error.code === 'SQLITE_CONSTRAINT') {
        return res.status(400).json({
          success: false,
          message: 'Error al procesar la solicitud. Verifica que el producto exista.'
        });
      }
      
      // Si el error es por falta de stock
      if (error instanceof HttpError && error.code === 'INSUFFICIENT_STOCK') {
        return res.status(400).json({
          success: false,
          message: 'Producto sin stock disponible'
        });
      }
      
      return sendHttpError(req, res, error);
    }
  }

  // Eliminar producto del carrito
  static async removeFromCart(req, res) {
    try {
      const userId = req.userId;
      const cartId = req.params.id;

      const removed = await CartModel.removeFromCart(cartId, userId);

      if (!removed) {
        return res.status(404).json({
          success: false,
          message: 'Item no encontrado en el carrito'
        });
      }

      res.json({
        success: true,
        message: 'Producto eliminado del carrito'
      });
    } catch (error) {
      logError('cartcontroller.failure', error);
      return sendHttpError(req, res, error);
    }
  }

  // Obtener carrito del usuario
  static async getCart(req, res) {
    try {
      const userId = req.userId;

      const cartItems = await CartModel.getUserCart(userId);

      const total = cartItems.reduce((sum, item) => sum + parseFloat(item.subtotal), 0);

      res.json({
        success: true,
        cart: cartItems,
        total: total.toFixed(2),
        itemCount: cartItems.length
      });
    } catch (error) {
      logError('cartcontroller.failure', error);
      return sendHttpError(req, res, error);
    }
  }

  // Actualizar cantidad de item en el carrito
  static async updateCartItem(req, res) {
    try {
      const userId = req.userId;
      const cartId = req.params.id;
      const { quantity } = req.body;

      if (!quantity || quantity < 0) {
        return res.status(400).json({
          success: false,
          message: 'Cantidad invalida'
        });
      }

      await CartModel.updateCartQuantity(cartId, userId, quantity);

      res.json({
        success: true,
        message: 'Cantidad actualizada'
      });
    } catch (error) {
      logError('cartcontroller.failure', error);
      return sendHttpError(req, res, error);
    }
  }

  // Vaciar carrito
  static async clearCart(req, res) {
    try {
      const userId = req.userId;

      await CartModel.clearCart(userId);

      res.json({
        success: true,
        message: 'Carrito vaciado'
      });
    } catch (error) {
      logError('cartcontroller.failure', error);
      return sendHttpError(req, res, error);
    }
  }

  // Finalizar compra (Checkout)
  static async checkout(req,res){return sendHttpError(req,res,new (require('../utils/httpErrors').HttpError)('CHECKOUT_ENDPOINT_RETIRED'));}

  // Obtener historial de compras
  static async getPurchaseHistory(req, res) {
    try {
      const userId = req.userId;

      const purchases = await CartModel.getPurchaseHistory(userId);

      res.json({
        success: true,
        purchases
      });
    } catch (error) {
      logError('cartcontroller.failure', error);
      return sendHttpError(req, res, error);
    }
  }

  // Obtener detalles de una compra
  static async getPurchaseDetails(req, res) {
    try {
      const userId = req.userId;
      const purchaseId = req.params.id;

      const details = await CartModel.getPurchaseDetails(purchaseId, userId);

      res.json({
        success: true,
        items: details
      });
    } catch (error) {
      logError('cartcontroller.failure', error);
      return sendHttpError(req, res, error);
    }
  }
}

module.exports = CartController;
