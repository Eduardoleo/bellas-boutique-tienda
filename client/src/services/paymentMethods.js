import { authenticatedFetch } from '../utils/authHandler';
import { API_URL } from '../app/config';



export const getPaymentMethods = async () => {
  const response = await authenticatedFetch(`${API_URL}/payment-methods`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.message || 'Error al obtener métodos de pago');
  }
  
  return data.paymentMethods;
};

export const setDefaultPaymentMethod = async (methodId) => {
  const response = await authenticatedFetch(`${API_URL}/payment-methods/${methodId}/default`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.message || 'Error al actualizar método de pago');
  }
  
  return data;
};

export const deletePaymentMethod = async (methodId) => {
  const response = await authenticatedFetch(`${API_URL}/payment-methods/${methodId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.message || 'Error al eliminar método de pago');
  }
  
  return data;
};
