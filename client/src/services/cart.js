import { API_URL } from '../app/config';
import { authenticatedFetch, handleAuthError } from '../utils/authHandler';

// Agregar producto al carrito
export const addToCart = async (productId, quantity = 1) => {
  try {
    const token = localStorage.getItem('token');
    
    console.log('addToCart - productId:', productId, 'quantity:', quantity);
    console.log('Token:', token ? 'Existe' : 'No existe');
    
    const response = await authenticatedFetch(`${API_URL}/cart/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ product_id: productId, quantity }),
    });

    console.log('Response status:', response.status);
    const data = await response.json();
    console.log('Response data:', data);

    if (response.ok) {
      return {
        success: true,
        message: data.message || 'Producto agregado al carrito'
      };
    } else {
      // Manejo especial para error 401 (no autenticado)
      if (response.status === 401) {
        return {
          success: false,
          message: 'Debes iniciar sesión para agregar productos al carrito',
          requiresAuth: true
        };
      }
      return {
        success: false,
        message: data.message || 'Error al agregar producto'
      };
    }
  } catch (error) {
    console.error('Error en addToCart:', error);
    return {
      success: false,
      message: 'Error de conexion con el servidor'
    };
  }
};

// Eliminar producto del carrito
export const removeFromCart = async (userId, productId) => {
  try {
    const response = await authenticatedFetch(`${API_URL}/cart/remove/${productId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (response.ok) {
      return {
        success: true,
        message: data.message || 'Producto eliminado del carrito'
      };
    } else {
      return {
        success: false,
        message: data.message || 'Error al eliminar producto'
      };
    }
  } catch (error) {
    return {
      success: false,
      message: 'Error de conexion con el servidor'
    };
  }
};

// Obtener carrito del usuario
export const getUserCart = async (userId) => {
  try {
    const response = await authenticatedFetch(`${API_URL}/cart`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (response.ok) {
      return {
        success: true,
        cart: data.cart
      };
    } else {
      return {
        success: false,
        message: data.message || 'Error al obtener carrito'
      };
    }
  } catch (error) {
    return {
      success: false,
      message: 'Error de conexion con el servidor'
    };
  }
};

// Completar compra
export const completePurchase = async () => ({success:false,code:'CHECKOUT_ENDPOINT_RETIRED',message:'Checkout retirado; use el formulario de pago simulado',httpStatus:410});

// Vaciar todo el carrito
export const clearCart = async () => {
  try {
    const response = await authenticatedFetch(`${API_URL}/cart/clear`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (response.ok) {
      return {
        success: true,
        message: data.message || 'Carrito vaciado correctamente'
      };
    } else {
      return {
        success: false,
        message: data.message || 'Error al vaciar el carrito'
      };
    }
  } catch (error) {
    return {
      success: false,
      message: 'Error de conexión con el servidor'
    };
  }
};

// Obtener historial de compras
export const getPurchaseHistory = async (userId) => {
  try {
    const response = await authenticatedFetch(`${API_URL}/users/purchases`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (response.ok) {
      return data.purchases.map(p => ({
        date: new Date(p.purchase_date).toLocaleDateString(),
        total: p.total.toFixed(2),
        items: p.items_count,
        status: p.status
      }));
    } else {
      return [];
    }
  } catch (error) {
    console.error('Error al obtener historial:', error);
    return [];
  }
};
