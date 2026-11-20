// Configuración de la aplicación
// VITE_API_URL is the backend origin/prefix, without /api. Only public configuration.
export const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/+$/, '');
export const API_URL = `${API_BASE_URL}/api`;

export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/api/auth/login',
  REGISTER: '/api/auth/register',
  VERIFY_TOKEN: '/api/auth/verify',
  REFRESH_TOKEN: '/api/auth/refresh',
  FORGOT_PASSWORD: '/api/auth/forgot-password',
  RESET_PASSWORD: '/api/auth/reset-password',
  LOGOUT: '/api/auth/logout',

  // Users
  USERS: '/api/users',
  USER_PROFILE: '/api/users/profile',

  // Catalog
  PRODUCTS: '/api/catalog/products',
  PRODUCT_DETAIL: (id) => `/api/catalog/products/${id}`,
  
  // Cart
  CART: '/api/cart',
  CART_ITEMS: '/api/cart/items',
  
  // Categories
  CATEGORIES: '/api/categories',
  
  // Payment
  PAYMENT_METHODS: '/api/payment-methods',
  PROCESS_PAYMENT: '/api/payments/process',
  
  // Support
  SUPPORT: '/api/support',
  FAQ: '/api/support/faq',
  
  // Reports
  REPORTS: '/api/reports',
  
  // Tracking
  TRACKING: '/api/tracking'
};

export const APP_CONFIG = {
  APP_NAME: 'Bellas Boutique',
  VERSION: '1.0.0',
  DEFAULT_PAGE_SIZE: 10,
  MAX_CART_ITEMS: 99,
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutos
};
