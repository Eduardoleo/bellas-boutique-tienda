import { API_URL } from '../app/config';



// Obtener categorías
export const getCategories = async (gender = null) => {
  try {
    const url = gender 
      ? `${API_URL}/categories?gender=${gender}`
      : `${API_URL}/categories`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (response.ok) {
      return {
        success: true,
        categories: data.data || []
      };
    } else {
      return {
        success: false,
        message: data.message || 'Error al obtener categorías',
        categories: []
      };
    }
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    return {
      success: false,
      message: 'Error de conexión con el servidor',
      categories: []
    };
  }
};

// Obtener catalogo de mujeres
export const getWomenCatalog = async (category = null) => {
  try {
    const url = category 
      ? `${API_URL}/catalog/women?category=${category}`
      : `${API_URL}/catalog/women`;
    
    console.log('🔍 Intentando conectar a:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('✅ Respuesta recibida:', response.status);
    
    const data = await response.json();
    console.log('📦 Datos recibidos:', data);

    if (response.ok) {
      return {
        success: true,
        products: data.products
      };
    } else {
      console.error('❌ Error del servidor:', data.message);
      return {
        success: false,
        message: data.message || 'Error al obtener productos',
        products: []
      };
    }
  } catch (error) {
    console.error('❌ Error de conexión:', error);
    return {
      success: false,
      message: 'Error de conexion con el servidor',
      products: []
    };
  }
};

// Obtener catalogo de hombres
export const getMenCatalog = async (category = null) => {
  try {
    const url = category 
      ? `${API_URL}/catalog/men?category=${category}`
      : `${API_URL}/catalog/men`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (response.ok) {
      return {
        success: true,
        products: data.products
      };
    } else {
      return {
        success: false,
        message: data.message || 'Error al obtener productos',
        products: []
      };
    }
  } catch (error) {
    return {
      success: false,
      message: 'Error de conexion con el servidor',
      products: []
    };
  }
};

// Obtener detalles de un producto
export const getProductById = async (productId) => {
  try {
    const response = await fetch(`${API_URL}/catalog/product/${productId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (response.ok) {
      return {
        success: true,
        product: data.product
      };
    } else {
      return {
        success: false,
        message: data.message || 'Error al obtener producto'
      };
    }
  } catch (error) {
    return {
      success: false,
      message: 'Error de conexion con el servidor'
    };
  }
};
