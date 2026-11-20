const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const sessionKey = sid => 'sid:' + crypto.createHash('sha256').update(sid).digest('hex');
const validSid = sid => typeof sid === 'string' && /^[a-f0-9-]{36}$/.test(sid);
function issue(user, sid = crypto.randomUUID()) {
  return jwt.sign({userId:user.id,email:user.email,rol:user.rol,sid}, process.env.JWT_SECRET, {algorithm:'HS256',expiresIn:'10m',jwtid:crypto.randomUUID()});
}
async function current(access, userId, sid) {
  if (!validSid(sid)) return null;
  return access.getOne("SELECT u.id,u.email,u.rol,u.estado FROM users u JOIN sesiones s ON s.user_id=u.id WHERE u.id=? AND s.token=? AND s.activa=1 AND u.estado='Activo'", [userId,sessionKey(sid)]);
}
module.exports = {sessionKey, validSid, issue, current};
