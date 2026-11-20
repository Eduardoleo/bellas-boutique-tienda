const { logError } = require('../utils/safeLogger');
const crypto = require('node:crypto');
const bcrypt = require('bcrypt');
const { createDatabaseAccess } = require('../config/sqliteOperations');
const { HttpError } = require('../utils/httpErrors');
const generic = 'Si la cuenta existe y el correo está configurado, recibirá instrucciones de recuperación.';
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
function createRecovery({ db, deliver, enabled = () => true, now = () => Date.now() }) {
  const access = createDatabaseAccess(db);
  const ready = () => access.runQuery('CREATE TABLE IF NOT EXISTS portfolio_password_resets (token_hash TEXT PRIMARY KEY,user_id INTEGER NOT NULL,expires_at INTEGER NOT NULL,used INTEGER NOT NULL DEFAULT 0)');
  const deliveries = new Set();
  async function dispatch(email, token) {
    try { await deliver(email, token); }
    catch (error) {
      logError('recovery.delivery.failure', error);
      try { await access.runQuery('DELETE FROM portfolio_password_resets WHERE token_hash=?', [hash(token)]); }
      catch (cleanupError) { logError('recovery.cleanup.failure', cleanupError); }
    }
  }
  async function processRequest(email) {
    const user = await access.getOne('SELECT id,email FROM users WHERE email=?', [email]);
    if (!user) return generic;
    const token = crypto.randomBytes(32).toString('hex');
    await access.runQuery('INSERT INTO portfolio_password_resets(token_hash,user_id,expires_at) VALUES(?,?,?)', [hash(token),user.id,now() + 15*60*1000]);
    // Acceptance does not promise email delivery. SMTP never controls the public response.
    await dispatch(user.email, token);
  }
  async function request(email) {
    if (!enabled()) return generic;
    await ready();
    // Account-independent preflight: broken storage is still an HTTP error for every email.
    await access.getAll('SELECT id,email FROM users LIMIT 0');
    const job = new Promise(resolve => setImmediate(resolve)).then(() => processRequest(email))
      .catch(error => logError('recovery.processing.failure', error));
    deliveries.add(job);
    job.finally(() => deliveries.delete(job));
    return generic;
  }
  async function reset(token, password) {
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return false;
    if (typeof password !== 'string' || !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password)) return false;
    await ready();
    const encoded = await bcrypt.hash(password, 10);
    return access.withTransaction(async tx => {
      const row = await tx.getOne('SELECT user_id FROM portfolio_password_resets WHERE token_hash=? AND used=0 AND expires_at>?', [hash(token),now()]);
      if (!row) return false;
      const consumed = await tx.runQuery('UPDATE portfolio_password_resets SET used=1 WHERE token_hash=? AND used=0', [hash(token)]);
      if (consumed.changes !== 1) return false;
      const changed = await tx.runQuery('UPDATE users SET password=? WHERE id=?', [encoded,row.user_id]);
      if (changed.changes !== 1) throw new HttpError('INTERNAL_ERROR');
      // Minimal service fixtures can omit sesiones; full installations always contain it.
      const sessions = await tx.getOne("SELECT name FROM sqlite_master WHERE type='table' AND name='sesiones'");
      if (sessions) await tx.runQuery('UPDATE sesiones SET activa=0 WHERE user_id=?', [row.user_id]);
      await tx.runQuery('UPDATE portfolio_password_resets SET used=1 WHERE user_id=?', [row.user_id]);
      return true;
    });
  }
  return { request, reset, waitForDeliveries: () => Promise.all([...deliveries]) };
}
module.exports = { createRecovery, generic };
