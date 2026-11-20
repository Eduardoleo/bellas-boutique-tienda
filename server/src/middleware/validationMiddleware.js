const {validIdentification,validPhone}=require('../utils/contactValidation');
const { logEvent } = require('../utils/safeLogger');
// Middleware de validación y sanitización de datos

// Validar email
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return typeof email === 'string' && emailRegex.test(email);
};

// Validar teléfono de Costa Rica
const validatePhone = (phone) => {
  const phoneRegex = /^[0-9]{8}$/;
  return typeof phone === 'string' && phoneRegex.test(phone.replace(/\s|-/g, ''));
};

// Sanitizar string (remover caracteres peligrosos)
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  
  // Remover caracteres HTML peligrosos
  return str
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
};

// Sanitizar objeto completo
const sanitizeObject = (obj) => {
  const sanitized = {};
  for (const key in obj) {
    // NO sanitizar contraseñas para mantener caracteres especiales
    if (key === 'password' || key === 'newPassword' || key === 'currentPassword') {
      sanitized[key] = obj[key];
    } else if (typeof obj[key] === 'string') {
      sanitized[key] = sanitizeString(obj[key]);
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitized[key] = sanitizeObject(obj[key]);
    } else {
      sanitized[key] = obj[key];
    }
  }
  return sanitized;
};

// Validar registro de usuario
const validateUserRegistration = (req, res, next) => {
  const { name, email, password } = req.body;
  if(!validIdentification(req.body.cedula)||!validPhone(req.body.phone))return res.status(400).json({success:false,message:'Identificación o teléfono inválidos',code:'INVALID_DATA'});

  // Validar campos requeridos
  if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string' || !name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Nombre, email y contraseña son obligatorios'
    });
  }

  // Validar formato de email
  if (!validateEmail(email)) {
    return res.status(400).json({
      success: false,
      message: 'El formato del correo electrónico no es válido'
    });
  }

  // Validar longitud del nombre
  if (name.length < 2 || name.length > 100) {
    return res.status(400).json({
      success: false,
      message: 'El nombre debe tener entre 2 y 100 caracteres'
    });
  }

  // Validar longitud de contraseña (mínimo 8 caracteres para cumplir con los requisitos de seguridad)
  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      message: 'La contraseña debe tener al menos 8 caracteres'
    });
  }

  // Validar formato de contraseña (debe incluir mayúsculas, minúsculas, números y caracteres especiales)
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json({
      success: false,
      message: 'La contraseña debe incluir mayúsculas, minúsculas, números y caracteres especiales (@$!%*?&)'
    });
  }

  // Sanitizar datos EXCEPTO la contraseña
  const { password: pwd, ...otherData } = req.body;
  req.body = {
    ...sanitizeObject(otherData),
    password: pwd  // Mantener password sin sanitizar
  };

  next();
};

// Validar login
const validateLogin = (req, res, next) => {
  const { email, correo, password } = req.body;
  
  // Aceptar tanto 'email' como 'correo'
  const emailValue = email || correo;

  if (typeof emailValue !== 'string' || typeof password !== 'string' || !emailValue || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email y contraseña son obligatorios'
    });
  }

  if (!validateEmail(emailValue)) {
    return res.status(400).json({
      success: false,
      message: 'El formato del correo electrónico no es válido'
    });
  }

  // Sanitizar solo el email, NO la contraseña
  if (email) {
    req.body.email = sanitizeString(email);
  }
  if (correo) {
    req.body.correo = sanitizeString(correo);
  }
  // NO sanitizar password
  
  next();
};

// Validar creación de producto
const validateProduct = (req, res, next) => {
  const { name, description, price, category, gender } = req.body;

  if (![name, description, category, gender].every(value => typeof value === 'string' && value.length) || !price) {
    return res.status(400).json({
      success: false,
      message: 'Todos los campos son obligatorios'
    });
  }

  // Validar precio
  const parsedPrice = parseFloat(price);
  if (isNaN(parsedPrice) || parsedPrice < 0) {
    return res.status(400).json({
      success: false,
      message: 'El precio debe ser un número válido mayor o igual a 0'
    });
  }

  // Validar género
  if (!['hombre', 'mujer'].includes(gender.toLowerCase())) {
    return res.status(400).json({
      success: false,
      message: 'El género debe ser "hombre" o "mujer"'
    });
  }

  // Validar longitud de nombre
  if (name.length < 3 || name.length > 200) {
    return res.status(400).json({
      success: false,
      message: 'El nombre debe tener entre 3 y 200 caracteres'
    });
  }

  // Sanitizar datos
  req.body = sanitizeObject(req.body);
  next();
};

// Validar actualización de perfil
const validateProfileUpdate = (req, res, next) => {
  const { name:nombre, phone:telefono, address:direccion } = req.body;
  if(!validIdentification(req.body.cedula)||!validPhone(telefono))return res.status(400).json({success:false,message:'Identificación o teléfono inválidos',code:'INVALID_DATA'});

  if (nombre && (nombre.length < 2 || nombre.length > 100)) {
    return res.status(400).json({
      success: false,
      message: 'El nombre debe tener entre 2 y 100 caracteres'
    });
  }

  if (telefono && !validPhone(telefono)) {
    return res.status(400).json({
      success: false,
      message: 'El formato del teléfono no es válido. Debe tener 8 dígitos'
    });
  }

  if (direccion && direccion.length > 500) {
    return res.status(400).json({
      success: false,
      message: 'La dirección no puede exceder los 500 caracteres'
    });
  }

  req.body = sanitizeObject(req.body);
  next();
};

// Validar ID numérico
const validateNumericId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: 'ID inválido'
      });
    }

    next();
  };
};

// Rate limiting simple en memoria (producción debe usar Redis)
const rateLimiter = (maxRequests = 100, windowMs = 60000) => {
  const requestCounts = new Map();
  return (req, res, next) => {
    // Usar IP + email (si está en el body) para identificador único
    const ip = req.ip || req.connection.remoteAddress;
    const userEmail = req.body?.email || req.body?.correo || '';
    const identifier = `${ip}:${userEmail}`;
    const now = Date.now();
    
    // Limpiar entradas antiguas (cada 100 solicitudes)
    if (requestCounts.size > 1000) {
      for (const [key, value] of requestCounts.entries()) {
        if (now - value.firstRequest > windowMs) {
          requestCounts.delete(key);
        }
      }
    }

    if (!requestCounts.has(identifier)) {
      requestCounts.set(identifier, { count: 1, firstRequest: now });
      return next();
    }

    const requestData = requestCounts.get(identifier);
    
    // Si pasó la ventana de tiempo, reiniciar contador
    if (now - requestData.firstRequest > windowMs) {
      requestCounts.set(identifier, { count: 1, firstRequest: now });
      return next();
    }

    if (requestData.count >= maxRequests) {
      logEvent('validationmiddleware.activity');
      return res.status(429).json({
        success: false,
        message: 'Demasiadas solicitudes. Por favor, intente más tarde.'
      });
    }

    requestData.count++;
    next();
  };
};

// Sanitizar query params para prevenir SQL injection
const sanitizeQueryParams = (req, res, next) => {
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  next();
};

module.exports = {
  validateEmail,
  validatePhone,
  sanitizeString,
  sanitizeObject,
  validateUserRegistration,
  validateLogin,
  validateProduct,
  validateProfileUpdate,
  validateNumericId,
  rateLimiter,
  sanitizeQueryParams
};
