const { logError } = require('./safeLogger');
const publicErrors = Object.freeze({
  IDEMPOTENCY_KEY_REQUIRED: [400, 'Se requiere Idempotency-Key'],
  IDEMPOTENCY_KEY_INVALID: [400, 'Idempotency-Key debe ser UUID v4'],
  IDEMPOTENCY_KEY_CONFLICT: [409, 'La clave ya está vinculada a otra solicitud'],
  CHECKOUT_BUSY: [503, 'Checkout ocupado; reintente la misma solicitud'],
  CHECKOUT_ENDPOINT_RETIRED: [410, 'Checkout retirado. Use /api/payments/process'],
  AUTH_REQUIRED: [401, 'Sesión inválida o revocada'],
  RESOURCE_NOT_FOUND: [404, 'Recurso no encontrado'],
  INTERNAL_ERROR: [500, 'Error interno del servidor'],
  INVALID_BODY: [400, 'Datos de solicitud inválidos'],
  EMAIL_EXISTS: [409, 'El email ya esta registrado'],
  CATEGORY_IN_USE: [400, 'No se puede eliminar una categoría que tiene productos asociados'],
  CATEGORY_EXISTS: [409, 'Ya existe una categoría con ese nombre para ese género'],
  INVALID_DATA: [400, 'Datos inválidos para esta operación'],
  CART_EMPTY: [400, 'El carrito está vacío'],
  INVALID_QUANTITY: [400, 'La cantidad debe ser un entero positivo'],
  QUANTITY_OVERFLOW: [400, 'Cantidad inválida'],
  INVALID_PRODUCT: [400, 'Producto o cantidad inválidos'],
  PRODUCT_UNAVAILABLE: [404, 'Producto no disponible'],
  INSUFFICIENT_STOCK: [409, 'Stock insuficiente'],
  INVALID_PRICE: [400, 'Precio del producto inválido'],
  INVALID_TOTAL: [400, 'Importe del carrito inválido'],
  PAYLOAD_TOO_LARGE: [413, 'La solicitud excede el tamaño permitido']
});
class HttpError extends Error {
  constructor(code) {
    const known = Object.hasOwn(publicErrors, code) ? code : 'INTERNAL_ERROR';
    super(publicErrors[known][1]); this.name = 'HttpError'; this.code = known; this.status = publicErrors[known][0];
  }
}
function sendHttpError(req, res, error) {
  const code = error instanceof HttpError && Object.hasOwn(publicErrors, error.code) ? error.code : error?.type === 'entity.parse.failed' ? 'INVALID_BODY' : error?.type === 'entity.too.large' ? 'PAYLOAD_TOO_LARGE' : 'INTERNAL_ERROR';
  const [status, message] = publicErrors[code] || publicErrors.INTERNAL_ERROR;
  const errorId = status >= 500 ? logError('http.failure', error, req) : undefined;
  if (res.headersSent || res.writableEnded || res.destroyed) { if (!res.writableEnded) res.destroy?.(); return; }
  if (code === 'CHECKOUT_BUSY') res.setHeader?.('Retry-After', '1');
  return res.status(status).json({ success: false, message, code, ...(errorId ? { errorId } : {}) });
}
function errorHandler(error, req, res, next) { return sendHttpError(req, res, error); }
function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve().then(() => handler(req, res, next)).catch(next);
}
function validateBodyShape(req, res, next) {
  if (!['POST', 'PUT', 'PATCH'].includes(req.method)) return next();
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) return sendHttpError(req, res, new HttpError('INVALID_BODY'));
  const text = ['name', 'nombre', 'email', 'correo', 'password', 'phone', 'telefono', 'address', 'direccion', 'description', 'category', 'gender', 'cardNumber', 'cardName', 'expiryDate', 'cvv', 'identificacion', 'shipping_address', 'shipping_notes', 'titulo', 'descripcion', 'pregunta', 'respuesta', 'categoria', 'motivo'];
  if (text.some(key => body[key] !== undefined && body[key] !== null && typeof body[key] !== 'string')) return sendHttpError(req, res, new HttpError('INVALID_BODY'));
  const numeric = ['price', 'quantity', 'product_id', 'cantidad', 'puntuacion', 'savedCardId'];
  if (numeric.some(key => body[key] !== undefined && body[key] !== null && !['number','string'].includes(typeof body[key]))) return sendHttpError(req, res, new HttpError('INVALID_BODY'));
  next();
}
module.exports = { HttpError, sendHttpError, errorHandler, asyncRoute, validateBodyShape };
