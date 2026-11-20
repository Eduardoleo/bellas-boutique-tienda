// CORS restringido a los orígenes de FRONTEND_URL (lista separada por comas).
// Nunca '*': la API acepta credenciales.
const DEFAULT_ORIGINS = 'http://localhost:5173,http://127.0.0.1:5173';

function parseOrigins(value = process.env.FRONTEND_URL) {
  return (value || DEFAULT_ORIGINS)
    .split(',')
    .map(origin => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

function buildCorsOptions(value) {
  const allowed = parseOrigins(value);
  return {
    // Sin cabecera Origin (mismo origen, curl, pruebas) no hay CORS que aplicar.
    origin: (origin, callback) => callback(null, !origin || allowed.includes(origin)),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
    exposedHeaders: ['Idempotency-Replayed', 'Retry-After', 'X-Request-Id']
  };
}

module.exports = { parseOrigins, buildCorsOptions };
