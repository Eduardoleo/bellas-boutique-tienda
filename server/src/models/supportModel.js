const database = require('../config/db');
const { getOne, getAll, runQuery } = require('../config/db');

class SupportModel {
  // ========== ENCUESTAS ==========

  // Crear encuesta
  static async createEncuesta(data) {
    const { user_id, purchase_id, puntuacion, comentario } = data;
    const { HttpError } = require('../utils/httpErrors');
    return database.withTransaction(async tx => {
      let purchaseId = null;
      if (purchase_id !== undefined && purchase_id !== null && purchase_id !== '') {
        if (!['number', 'string'].includes(typeof purchase_id)) throw new HttpError('INVALID_DATA');
        purchaseId = Number(purchase_id);
        if (!Number.isSafeInteger(purchaseId) || purchaseId <= 0) throw new HttpError('INVALID_DATA');
        const owned = await tx.getOne('SELECT id FROM purchases WHERE id=? AND user_id=?', [purchaseId, user_id]);
        if (!owned) throw new HttpError('RESOURCE_NOT_FOUND');
      }
      const result = await tx.runQuery('INSERT INTO encuestas (user_id,purchase_id,puntuacion,comentario) VALUES (?,?,?,?)', [user_id,purchaseId,puntuacion,comentario || null]);
      return result.id;
    });
  }

  // Obtener todas las encuestas
  static async getAllEncuestas() {
    const query = `
      SELECT 
        e.*,
        u.name as user_name,
        u.name as usuario_nombre,
        u.email as usuario_email
      FROM encuestas e
      INNER JOIN users u ON e.user_id = u.id
      ORDER BY e.fecha DESC
    `;
    return await getAll(query);
  }

  // Obtener encuestas de un usuario
  static async getUserEncuestas(userId) {
    const query = `
      SELECT 
        e.*,
        p.id as compra_id,
        p.total_amount as compra_total
      FROM encuestas e
      LEFT JOIN purchases p ON e.purchase_id = p.id AND p.user_id = e.user_id
      WHERE e.user_id = ? AND (e.purchase_id IS NULL OR p.id IS NOT NULL)
      ORDER BY e.fecha DESC
    `;
    return await getAll(query, [userId]);
  }

  // Obtener estadísticas de encuestas
  static async getEncuestasStats() {
    const query = `
      SELECT 
        COUNT(*) as total,
        AVG(puntuacion) as promedio,
        COUNT(CASE WHEN puntuacion >= 4 THEN 1 END) as satisfechos,
        COUNT(CASE WHEN puntuacion <= 2 THEN 1 END) as insatisfechos
      FROM encuestas
    `;
    return await getOne(query);
  }

  // ========== SUGERENCIAS ==========

  // Crear sugerencia
  static async createSugerencia(data) {
    const { user_id, titulo, descripcion } = data;
    const query = 'INSERT INTO sugerencias (user_id, titulo, descripcion) VALUES (?, ?, ?)';
    const result = await runQuery(query, [user_id, titulo, descripcion]);
    return result.id;
  }

  // Obtener todas las sugerencias
  static async getAllSugerencias(estado = null) {
    let query = `
      SELECT 
        s.*,
        u.name as user_name,
        u.name as usuario_nombre,
        u.email as usuario_email
      FROM sugerencias s
      INNER JOIN users u ON s.user_id = u.id
    `;
    
    const params = [];
    if (estado) {
      query += ' WHERE s.estado = ?';
      params.push(estado);
    }
    
    query += ' ORDER BY s.fecha DESC';
    
    return await getAll(query, params);
  }

  // Obtener sugerencias de un usuario
  static async getUserSugerencias(userId) {
    const query = `
      SELECT * FROM sugerencias
      WHERE user_id = ?
      ORDER BY fecha DESC
    `;
    return await getAll(query, [userId]);
  }

  // Actualizar estado de sugerencia
  static async updateSugerenciaEstado(sugerenciaId, estado, access = database) {
    const { runQuery } = access;
    const query = 'UPDATE sugerencias SET estado = ? WHERE id = ?';
    await runQuery(query, [estado, sugerenciaId]);
  }

  // Obtener sugerencia por ID
  static async getSugerenciaById(sugerenciaId) {
    const query = `
      SELECT 
        s.*,
        u.name as user_name,
        u.email as user_email
      FROM sugerencias s
      INNER JOIN users u ON s.user_id = u.id
      WHERE s.id = ?
    `;
    return await getOne(query, [sugerenciaId]);
  }

  // ========== PREGUNTAS FRECUENTES ==========

  // Obtener FAQs activas
  static async getAllFAQs(categoria = null) {
    let query = 'SELECT * FROM faqs WHERE activo = 1';
    const params = [];
    
    if (categoria) {
      query += ' AND categoria = ?';
      params.push(categoria);
    }
    
    query += ' ORDER BY orden ASC, created_at DESC';
    
    return await getAll(query, params);
  }

  // Obtener todas las FAQs (incluyendo inactivas) - Admin
  static async getAllFAQsAdmin() {
    const query = 'SELECT * FROM faqs ORDER BY orden ASC, created_at DESC';
    return await getAll(query);
  }

  // Crear FAQ
  static async createFAQ(data) {
    const { pregunta, respuesta, categoria, orden } = data;
    const query = 'INSERT INTO faqs (pregunta, respuesta, categoria, orden) VALUES (?, ?, ?, ?)';
    const result = await runQuery(query, [pregunta, respuesta, categoria || null, orden || 0]);
    return result.id;
  }

  // Actualizar FAQ
  static async updateFAQ(faqId, data) {
    const { pregunta, respuesta, categoria, orden, activo } = data;
    const query = `
      UPDATE faqs 
      SET pregunta = ?, respuesta = ?, categoria = ?, orden = ?, activo = ?
      WHERE id = ?
    `;
    await runQuery(query, [pregunta, respuesta, categoria, orden, activo !== undefined ? (activo ? 1 : 0) : 1, faqId]);
  }

  // Eliminar FAQ
  static async deleteFAQ(faqId) {
    const query = 'DELETE FROM faqs WHERE id = ?';
    await runQuery(query, [faqId]);
  }

  // Obtener categorías de FAQs
  static async getFAQCategories() {
    const query = 'SELECT DISTINCT categoria FROM faqs WHERE categoria IS NOT NULL AND activo = 1';
    return await getAll(query);
  }

  // ========== CHAT EN LÍNEA ==========

  static async createChatRoom(userId) {
    const sala_id=require('node:crypto').randomUUID();
    await runQuery('INSERT INTO salas_chat(sala_id,owner_id) VALUES(?,?)',[sala_id,userId]);
    return sala_id;
  }
  static async authorizeRoom(access,salaId,userId,role) {
    const room=await access.getOne('SELECT owner_id FROM salas_chat WHERE sala_id=?',[salaId]);
    if(!room||(room.owner_id!==userId&&!['Administrador','Vendedor'].includes(role)))throw new (require('../utils/httpErrors').HttpError)('RESOURCE_NOT_FOUND');
  }
  static async createChatMessage(data,role) {
    return database.withTransaction(async tx=>{
      await this.authorizeRoom(tx,data.sala_id,data.user_id,role);
      const result=await tx.runQuery('INSERT INTO mensajes_chat(sala_id,user_id,mensaje,tipo) VALUES(?,?,?,?)',[data.sala_id,data.user_id,data.mensaje,data.tipo||'texto']);
      return result.id;
    });
  }
  static async getChatMessages(salaId,limit=50,userId,role) {
    return database.withTransaction(async tx=>{
      await this.authorizeRoom(tx,salaId,userId,role);
      const messages=await tx.getAll('SELECT m.*,u.name AS usuario_nombre,u.rol AS usuario_rol FROM mensajes_chat m JOIN users u ON u.id=m.user_id WHERE m.sala_id=? ORDER BY m.fecha DESC,m.id DESC LIMIT ?',[salaId,limit]);
      return messages.reverse();
    });
  }
  static async markMessagesAsRead(salaId,userId,role) {
    return database.withTransaction(async tx=>{
      await this.authorizeRoom(tx,salaId,userId,role);
      await tx.runQuery('UPDATE mensajes_chat SET leido=1 WHERE sala_id=? AND user_id!=? AND leido=0',[salaId,userId]);
    });
  }
  static async getUserChatRooms(userId,role) {
    const support=['Administrador','Vendedor'].includes(role);
    return getAll('SELECT r.sala_id,COUNT(CASE WHEN m.leido=0 AND m.user_id!=? THEN 1 END) AS mensajes_no_leidos,MAX(m.fecha) AS ultimo_mensaje FROM salas_chat r LEFT JOIN mensajes_chat m ON m.sala_id=r.sala_id '+(support?'':'WHERE r.owner_id=? ')+ 'GROUP BY r.sala_id ORDER BY ultimo_mensaje DESC',support?[userId]:[userId,userId]);
  }
  static async getUnreadMessagesCount(userId,role) {
    const rooms=await this.getUserChatRooms(userId,role);
    return rooms.reduce((total,room)=>total+room.mensajes_no_leidos,0);
  }
  static async getAllChatRooms() {return this.getUserChatRooms(0,'Administrador');}

}

module.exports = SupportModel;
