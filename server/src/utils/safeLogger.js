const { randomUUID } = require('node:crypto');
const seen = new WeakMap();
const requestIds = new WeakMap();
const codes = new Set(['SQLITE_ERROR', 'SQLITE_CONSTRAINT', 'SQLITE_BUSY', 'SQLITE_LOCKED', 'SQLITE_NOTADB', 'SQLITE_IOERR', 'SQLITE_CANTOPEN', 'SQLITE_READONLY', 'SQLITE_FULL', 'SQLITE_CORRUPT', 'ENOENT', 'EACCES', 'EPIPE', 'ECONNRESET', 'ETIMEDOUT', 'EAUTH', 'ESOCKET']);
const names = new Set(['Error', 'TypeError', 'RangeError', 'SyntaxError', 'HttpError', 'CheckoutError', 'TransactionError', 'JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError', 'DatabaseSetupError']);
const eventName = event => typeof event === 'string' && /^[a-z][a-z0-9_.-]{0,79}$/.test(event) ? event : 'backend.error';
function requestContext(req, res, next) {
  const id = randomUUID(); requestIds.set(req, id);
  res.setHeader('X-Request-Id', id); next();
}
function logError(event, error, req) {
  if (error && typeof error === 'object' && seen.has(error)) return seen.get(error);
  const errorId = randomUUID();
  const entry = { level: 'error', event: eventName(event), errorId };
  if (req && requestIds.has(req)) entry.requestId = requestIds.get(req);
  // Allow-list metadata only. Never serialize error, message, stack, SQL or request.
  try {
    entry.errorClass = names.has(error?.name) ? error.name : 'Error';
    if (codes.has(error?.code)) entry.code = error.code;
    if (error?.rollbackFailed === true) entry.rollbackFailed = true;
  } catch { entry.errorClass = 'Error'; }
  if (error && typeof error === 'object') seen.set(error, errorId);
  console.error(JSON.stringify(entry));
  return errorId;
}
function logEvent(event) { console.log(JSON.stringify({ level: 'info', event: eventName(event) })); }
module.exports = { logError, logEvent, requestContext };
