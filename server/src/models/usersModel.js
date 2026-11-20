const database = require('../config/db');
const { withTransaction } = database;
const { HttpError } = require('../utils/httpErrors');
const { logError, logEvent } = require('../utils/safeLogger');
const { getOne, getAll, runQuery } = require('../config/db');
const bcrypt = require('bcrypt');
const {validIdentification,validPhone}=require('../utils/contactValidation');
// Public dummy hash: bcrypt cost matches passwords created by this application; not a credential.
const dummyPasswordHash = bcrypt.hashSync('rf06-dummy-not-a-user-password', 10);
const { sessionKey } = require('../services/sessionService');

class UsersModel {
  // Crear nuevo usuario
  static async createUser(userData, access = database) {
    const { getOne, runQuery } = access;
    const { cedula, name, apellidos, email, password, phone, address, rol } = userData;
    if(!validIdentification(cedula)||!validPhone(phone))throw new HttpError('INVALID_DATA');

    // Verificar si el email ya existe
    const existingUser = await getOne('SELECT COUNT(*) as count FROM users WHERE email = ?', [email]);
    
    if (existingUser.count > 0) {
      throw new HttpError('EMAIL_EXISTS');
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insertar usuario
    const query = 'INSERT INTO users (cedula, name, apellidos, email, password, phone, address, rol) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    const result = await runQuery(query, [cedula || null, name, apellidos || null, email, hashedPassword, phone || null, address || null, rol || 'Cliente']);

    return result.id;
  }

  // Registrar cliente en tabla clientes
  static async registerClient(userId, access = database) {
    const { runQuery } = access;
    const query = 'INSERT INTO clientes (user_id) VALUES (?)';
    await runQuery(query, [userId]);
  }

  // Validar login
  static async validateLogin(email, password) {
    const query = 'SELECT id, cedula, name, apellidos, email, password, phone, address, rol, estado, created_at FROM users WHERE email = ?';
    const user = await getOne(query, [email]);

    // Perform comparable password work even for unknown/inactive accounts, without sleeps.
    const isValidPassword = await bcrypt.compare(password, user?.password || dummyPasswordHash);
    if (!user) {
      return { error: 'USER_NOT_FOUND' };
    }

    // Verificar si el usuario está activo
    if (user.estado !== 'Activo') {
      return { error: 'USER_INACTIVE' };
    }

    // Verificar contraseña
    // Password comparison already performed above.
    
    if (!isValidPassword) {
      return { error: 'INVALID_PASSWORD' };
    }

    // Eliminar password del objeto de retorno
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  // Registrar intento de login
  static async registrarIntentoLogin(email, exitoso, ipAddress, userAgent) {
    try {
      const query = 'INSERT INTO intentos_login (email, exitoso, ip_address, user_agent) VALUES (?, ?, ?, ?)';
      await runQuery(query, [email, exitoso ? 1 : 0, ipAddress, userAgent]);
      logEvent('usersmodel.activity');
    } catch (error) {
      logError('usersmodel.failure', error);
      throw error;
    }
  }

  // Registrar en bitácora
  static async registrarBitacora(userId, accion, tablaAfectada, registroId, descripcion, ipAddress, access = database) {
    const { runQuery } = access;
    const query = 'INSERT INTO bitacora (user_id, accion, tabla_afectada, registro_id, descripcion, ip_address) VALUES (?, ?, ?, ?, ?, ?)';
    await runQuery(query, [userId || null, accion, tablaAfectada, registroId, descripcion, ipAddress]);
  }

  // Registrar sesión
  static async registrarSesion(userId, sid, ipAddress, userAgent) {
    const token = sessionKey(sid);
    return withTransaction(async tx => {
      await tx.runQuery('UPDATE sesiones SET activa=0 WHERE user_id=? AND activa=1', [userId]);
      await tx.runQuery('DELETE FROM sesiones WHERE token=?', [token]);
      await tx.runQuery('INSERT INTO sesiones (user_id,token,ip_address,user_agent) VALUES (?,?,?,?)', [userId,token,ipAddress,userAgent]);
    });
  }

  // Actualizar último acceso de sesión
  static async actualizarSesion(sid) {
    const token = sessionKey(sid);
    const query = 'UPDATE sesiones SET ultimo_acceso = CURRENT_TIMESTAMP WHERE token = ? AND activa = 1';
    await runQuery(query, [token]);
  }

  // Cerrar sesión
  static async cerrarSesion(sid) {
    const token = sessionKey(sid);
    const query = 'UPDATE sesiones SET activa = 0 WHERE token = ?';
    await runQuery(query, [token]);
  }

  // Limpiar intentos de login de un usuario
  static async limpiarIntentosLogin(userId) {
    // Preservar intentos exitosos para reportes; solo limpiar fallidos
    const query = 'DELETE FROM intentos_login WHERE email IN (SELECT email FROM users WHERE id = ?) AND exitoso = 0';
    await runQuery(query, [userId]);
  }

  // Cerrar sesiones inactivas (más de 5 minutos)
  static async cerrarSesionesInactivas() {
    const query = `UPDATE sesiones SET activa = 0 
                   WHERE activa = 1 
                   AND datetime(ultimo_acceso, '+5 minutes') < datetime('now')`;
    await runQuery(query, []);
  }

  // Obtener usuario por email
  static async getUserByEmail(email) {
    const query = 'SELECT id, cedula, name, apellidos, email, phone, address, rol FROM users WHERE email = ?';
    return await getOne(query, [email]);
  }

  // Crear solicitud de recuperación de contraseña
  static async crearRecuperacionPassword(userId, token, nuevaPassword) {
    const hashedPassword = await bcrypt.hash(nuevaPassword, 10);
    const query = 'INSERT INTO recuperacion_password (user_id, token, nueva_password, fecha_expiracion) VALUES (?, ?, ?, datetime("now", "+24 hours"))';
    await runQuery(query, [userId, token, hashedPassword]);
  }

  // Actualizar contraseña
  static async updatePassword(userId, password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = 'UPDATE users SET password = ? WHERE id = ?';
    await runQuery(query, [hashedPassword, userId]);
  }


  // Obtener perfil de usuario
  static async getUserProfile(userId) {
    const query = 'SELECT id, cedula, name, apellidos, email, phone, address, rol, estado, created_at, updated_at FROM users WHERE id = ?';
    const user = await getOne(query, [userId]);
    return user;
  }

  // Actualizar usuario (solo datos permitidos)
  static async updateUser(userId, userData) {
    const { name, apellidos, phone, address } = userData;
    if(!validPhone(phone))throw new HttpError('INVALID_DATA');

    const query = 'UPDATE users SET name = ?, apellidos = ?, phone = ?, address = ? WHERE id = ?';
    await runQuery(query, [name, apellidos || null, phone || null, address || null, userId]);

    return this.getUserProfile(userId);
  }

  // Actualizar estado y rol (solo admin)
  static async updateUserAdmin(userId, userData) {
    const { estado, rol } = userData;

    return withTransaction(async tx => {
      const currentUser = await tx.getOne('SELECT estado,rol FROM users WHERE id=?', [userId]);
      if (!currentUser) throw new HttpError('INVALID_DATA');
      const newEstado = estado || currentUser.estado;
      const newRol = rol || currentUser.rol;
      await tx.runQuery('UPDATE users SET estado=?,rol=? WHERE id=?', [newEstado,newRol,userId]);
      if (newEstado !== 'Activo') await tx.runQuery('UPDATE sesiones SET activa=0 WHERE user_id=?', [userId]);
      return this.getUserProfile(userId);
    });
  }

  // Verificar si existe un usuario por email
  static async existsByEmail(email) {
    const result = await getOne('SELECT COUNT(*) as count FROM users WHERE email = ?', [email]);
    return result.count > 0;
  }

  // Obtener usuario por ID
  static async getUserById(userId, access = database) {
    const { getOne } = access;
    const query = 'SELECT id, cedula, name, apellidos, email, phone, address, rol FROM users WHERE id = ?';
    return await getOne(query, [userId]);
  }

  // Listar todos los usuarios (admin)
  static async getAllUsers() {
    const query = 'SELECT id, cedula, name, apellidos, email, phone, rol, estado, created_at FROM users ORDER BY created_at DESC';
    return await getAll(query);
  }

  // Eliminar usuario
  static async deleteUser(userId) {
    const query = 'DELETE FROM users WHERE id = ?';
    await runQuery(query, [userId]);
  }

  // Obtener historial de compras de un usuario
  static async getUserPurchases(userId) {
    const query = `
      SELECT 
        p.id,
        p.created_at as fecha,
        p.total_amount as total,
        i.consecutivo,
        i.cantidad_productos,
        (i.pdf_path IS NOT NULL AND i.pdf_path != '') as has_invoice_pdf,
        (i.xml_path IS NOT NULL AND i.xml_path != '') as has_invoice_xml,
        s.tracking_number,
        COUNT(DISTINCT pi.id) as items_count
      FROM purchases p
      LEFT JOIN invoices i ON p.id = i.purchase_id
      LEFT JOIN purchase_items pi ON p.id = pi.purchase_id
      LEFT JOIN shipments s ON p.id = s.purchase_id
      WHERE p.user_id = ?
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `;
    return await getAll(query, [userId]);
  }

  // Obtener factura por ID (verificando que pertenezca al usuario)
  static async getInvoiceById(invoiceId, userId) {
    const query = `
      SELECT 
        i.*,
        p.user_id
      FROM invoices i
      INNER JOIN purchases p ON i.purchase_id = p.id
      WHERE i.id = ? AND p.user_id = ?
    `;
    return await getOne(query, [invoiceId, userId]);
  }
}

module.exports = UsersModel;
