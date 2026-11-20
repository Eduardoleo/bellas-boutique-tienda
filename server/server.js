const { errorHandler, validateBodyShape } = require('./src/utils/httpErrors');
const { logError, logEvent, requestContext } = require('./src/utils/safeLogger');
const { loadEnvironment, DatabaseSetupError } = require('./src/config/databasePaths');
loadEnvironment();

let database;
async function startServer() {
  database = require('./src/config/db');
  await database.ready;
  require('./src/services/checkoutIdempotency').requireSecret();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const path = require('path');

// Importar rutas
const authRoutes = require('./src/routes/auth');
const usersRoutes = require('./src/routes/users');
const cartRoutes = require('./src/routes/cart');
const catalogRoutes = require('./src/routes/catalog');
const paymentRoutes = require('./src/routes/paymentRoutes');
const trackingRoutes = require('./src/routes/tracking');
const paymentMethodsRoutes = require('./src/routes/paymentMethods');
const supportRoutes = require('./src/routes/support');
const reportsRoutes = require('./src/routes/reports');
const categoriesRoutes = require('./src/routes/categories');

// Importar modelos para cron jobs
const ReportsModel = require('./src/models/reportsModel');

// Importar middlewares de seguridad
const { rateLimiter, sanitizeQueryParams } = require('./src/middleware/validationMiddleware');

// Inicializar Express
const app = express();
const PORT = process.env.PORT || 4000;

app.use(requestContext);

// Middlewares de seguridad
app.use(cors(require('./src/config/corsOptions').buildCorsOptions()));

// Rate limiting global
app.use(rateLimiter(150, 60000)); // 150 requests por minuto

app.use(express.json({ limit: '10mb' })); // Limitar tamaño del body
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(validateBodyShape);

// Sanitizar query params globalmente
app.use(sanitizeQueryParams);

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

// Logging middleware
app.use((req, res, next) => {
  logEvent('http.request');
  next();
});

// Rutas principales
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/payment-methods', paymentMethodsRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/categories', categoriesRoutes);

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Bellas Boutique API - Backend funcionando correctamente',
    version: '2.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      cart: '/api/cart',
      catalog: '/api/catalog',
      payments: '/api/payments',
      tracking: '/api/tracking',
      paymentMethods: '/api/payment-methods',
      support: '/api/support',
      reports: '/api/reports',
      categories: '/api/categories'
    }
  });
});

// Ruta para verificar estado del servidor
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Manejo de rutas no encontradas
app.use((req, res) => {
  // Si es una ruta API, devolver JSON 404
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      success: false,
      message: 'Ruta no encontrada'
    });
  }
  
  // Ruta no encontrada
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada'
  });
});

// HTTP errors never serialize exception details or request values.
app.use(errorHandler);

// Iniciar servidor
const listener = app.listen(PORT, process.env.BB_DEMO_ISOLATED === '1' ? '127.0.0.1' : undefined, () => {
  console.log(`API lista en puerto ${listener.address().port}`);
  console.log('===========================================');
  console.log('   BELLAS BOUTIQUE - BACKEND API');
  console.log('===========================================');
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log(`Ambiente: desarrollo local`);
  console.log('===========================================');
  console.log('Endpoints disponibles:');
  console.log(`  - POST   http://localhost:${PORT}/api/auth/register`);
  console.log(`  - POST   http://localhost:${PORT}/api/auth/login`);
  console.log(`  - GET    http://localhost:${PORT}/api/users/profile`);
  console.log(`  - GET    http://localhost:${PORT}/api/catalog/women`);
  console.log(`  - GET    http://localhost:${PORT}/api/catalog/men`);
  console.log(`  - GET    http://localhost:${PORT}/api/cart`);
  console.log(`  - POST   http://localhost:${PORT}/api/cart/add`);
  console.log(`  - POST   http://localhost:${PORT}/api/cart/checkout`);
  console.log('===========================================');
  
  // Iniciar cron jobs
  initCronJobs();
});

// Configurar cron jobs para tareas automáticas (solo producción)
function initCronJobs() {
  // Generar reporte diario a las 23:59 todos los días
  cron.schedule('59 23 * * *', async () => {
    console.log('Ejecutando generación de reporte diario automático...');
    try {
      await ReportsModel.generarReporteDiario();
      console.log('Reporte diario generado exitosamente');
    } catch (error) {
      logError('cron.failure', error);
    }
  }, {
    timezone: "America/Costa_Rica"
  });

  // Limpiar intentos de login antiguos cada semana
  cron.schedule('0 0 * * 0', async () => {
    console.log('Limpiando intentos de login antiguos...');
    try {
      await ReportsModel.limpiarIntentosLoginAntiguos();
      console.log('Intentos de login antiguos eliminados');
    } catch (error) {
      logError('cron.failure', error);
    }
  }, {
    timezone: "America/Costa_Rica"
  });

  // Enviar alertas de stock bajo cada día a las 8:00 AM
  cron.schedule('0 8 * * *', async () => {
    console.log('Verificando productos con stock bajo...');
    try {
      await ReportsModel.enviarAlertasStockBajo();
      console.log('Alertas de stock bajo procesadas');
    } catch (error) {
      logError('cron.failure', error);
    }
  }, {
    timezone: "America/Costa_Rica"
  });

  console.log('Cron jobs iniciados:');
  console.log('  - Reporte diario: 23:59 cada día');
  console.log('  - Limpieza de logs: Domingos a medianoche');
  console.log('  - Alertas de stock: 8:00 AM cada día');
  console.log('===========================================');
}

  listener.on('error', () => {
    console.error('No se pudo escuchar en el puerto configurado.');
    database.db.close(() => {});
    process.exitCode = 1;
  });
  module.exports = app;
}
startServer().catch(error => {
  console.error(error instanceof DatabaseSetupError ? error.message : 'No se pudo iniciar la API. Verifique la configuración.');
  if (database) database.db.close(() => {});
  process.exitCode = 1;
});
