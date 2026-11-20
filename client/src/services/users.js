import { API_URL } from '../app/config';
import { authenticatedFetch } from '../utils/authHandler';

// Registro de usuario
export const registerUser = async (userData) => {
  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    const data = await response.json();

    if (response.ok) {
      return {
        success: true,
        user: data.user
      };
    } else {
      return {
        success: false,
        message: data.message || 'Error al crear usuario'
      };
    }
  } catch (error) {
    return {
      success: false,
      message: 'Error de conexion con el servidor'
    };
  }
};

// Login de usuario
export const loginUser = async (email, password) => {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (response.ok) {
      localStorage.setItem('token', data.token);
      return {
        success: true,
        user: data.user,
        token: data.token
      };
    } else {
      return {
        success: false,
        message: data.message || 'Email o contraseña incorrectos'
      };
    }
  } catch (error) {
    return {
      success: false,
      message: 'Error de conexion con el servidor'
    };
  }
};

// Obtener datos del usuario
export const getUserData = async (userId) => {
  try {
    const response = await authenticatedFetch(`${API_URL}/users/profile`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (response.ok) {
      return {
        success: true,
        user: data.user
      };
    } else {
      return {
        success: false,
        message: data.message || 'Error al obtener datos'
      };
    }
  } catch (error) {
    return {
      success: false,
      message: 'Error de conexion con el servidor'
    };
  }
};

// Actualizar datos del usuario
export const updateUserData = async (userId, newData) => {
  try {
    const response = await authenticatedFetch(`${API_URL}/users/update`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newData),
    });

    const data = await response.json();

    if (response.ok) {
      return {
        success: true,
        user: data.user
      };
    } else {
      return {
        success: false,
        message: data.message || 'Error al actualizar datos'
      };
    }
  } catch (error) {
    return {
      success: false,
      message: 'Error de conexion con el servidor'
    };
  }
};

// Obtener historial de compras
export const getPurchaseHistory = async () => {
  try {
    const response = await authenticatedFetch(`${API_URL}/users/purchases`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (response.ok) {
      return {
        success: true,
        purchases: data.purchases
      };
    } else {
      return {
        success: false,
        message: data.message || 'Error al obtener historial'
      };
    }
  } catch (error) {
    return {
      success: false,
      message: 'Error de conexion con el servidor'
    };
  }
};

// Obtener URL para descargar PDF de factura
export const getInvoicePdfUrl = (filename) => `${API_URL}/users/invoice/${encodeURIComponent(filename)}`;

export const downloadInvoiceDocument = async (filename) => {
  if (!/^factura_[A-Za-z0-9_-]+\.(pdf|xml)$/.test(filename)) throw new Error('Factura no disponible');
  const response = await authenticatedFetch(getInvoicePdfUrl(filename), {method:'GET',headers:{}});
  if (!response.ok) throw new Error('No se pudo descargar la factura');
  return response.blob();
};

export const downloadInvoicePdf = downloadInvoiceDocument;

// Reenviar factura por email
export const resendInvoice = async (invoiceId) => {
  try {
    const response = await authenticatedFetch(`${API_URL}/users/invoice/${invoiceId}/resend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (response.ok) {
      return {
        success: true,
        message: data.message
      };
    } else {
      return {
        success: false,
        message: data.message || 'Error al reenviar factura'
      };
    }
  } catch (error) {
    return {
      success: false,
      message: 'Error de conexion con el servidor'
    };
  }
};
