import { logout } from './authHandler';

// interceptor para manejar tokens expirados
export const handleApiError = (error, navigate) => {
  if (error.response?.status === 401) {
    const data = error.response.data;
    
    if (data?.expired || data?.message?.includes('expirada') || data?.message?.includes('expired')) {
      logout();
      return true;
    }
  }
  
  return false;
};

// función helper para hacer fetch con manejo automático de token expirado
export const fetchWithAuth = async (url, options = {}) => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    window.location.href = '/login';
    throw new Error('No token');
  }

  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (response.status === 401) {
    const data = await response.json();
    
    if (data?.expired || data?.message?.includes('expirada') || data?.message?.includes('expired')) {
      logout();
      throw new Error('Token expired');
    }
  }

  return response;
};
