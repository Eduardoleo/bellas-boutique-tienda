import { API_URL } from '../app/config';
// Utilidad para manejar errores de autenticación centralizadamente
import { showToast } from './toast';

export const handleAuthError = (response) => {
  // Si el token expiró o es inválido (401 o 403)
  if (response.status === 401 || response.status === 403) {
    console.log('🚨 handleAuthError: Token expirado detectado (401/403)');
    
    // Mostrar notificación al usuario ANTES de redirigir
    showToast('⚠️ Tu sesión ha expirado. Por favor inicia sesión nuevamente.', 'warning');
    
    // Limpiar datos de sesión
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Disparar evento personalizado de logout
    window.dispatchEvent(new Event('logout'));
    
    // Redirigir al login después de un pequeño delay para que se vea el toast
    setTimeout(() => {
      window.location.href = '/login';
    }, 1500);
    
    return true; // Indica que se manejó un error de autenticación
  }
  return false; // No es un error de autenticación
};

// Wrapper para fetch que maneja automáticamente errores de autenticación
export const authenticatedFetch = async (url, options = {}) => {
  const token = localStorage.getItem('token');
  
  // Agregar el token automáticamente si existe
  if (token && !options.headers) {
    options.headers = {};
  }
  
  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }
  
  const { sensitiveCheckout = false, ...requestOptions } = options;
  try {
    const response = await fetch(url, requestOptions);
    
    // Verificar si hay error de autenticación
    if (handleAuthError(response)) {
      // Retornar una respuesta de error controlada
      return {
        ok: false,
        status: 401,
        json: async () => ({ success: false, message: 'Sesión expirada' })
      };
    }
    
    return response;
  } catch (error) {
    if (sensitiveCheckout) console.error('No se pudo completar la solicitud de checkout');
    else console.error('Error en authenticatedFetch:', error);
    throw error;
  }
};

// Función helper para verificar si el usuario está autenticado
export const isAuthenticated = () => {
  const token = localStorage.getItem('token');
  return !!token;
};

// Función para logout manual
export const logout = async () => {
  const token = localStorage.getItem('token');
  
  // Llamar al backend para limpiar intentos de login
  if (token) {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('Error al notificar logout al servidor:', error);
      // Continuar con el logout local aunque falle el servidor
    }
  }
  
  // Limpiar datos locales
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  
  // Disparar evento personalizado de logout para que otros componentes reaccionen
  window.dispatchEvent(new Event('logout'));
  
  // Redirigir al login
  window.location.href = '/login';
};
