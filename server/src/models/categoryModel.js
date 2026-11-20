const { HttpError } = require('../utils/httpErrors');
const { getAll, runQuery, getOne } = require('../config/db');

class CategoryModel {
  // Obtener todas las categorías
  static async getAllCategories(gender = null) {
    let query = 'SELECT * FROM categories WHERE is_active = 1';
    const params = [];
    
    if (gender) {
      query += ' AND gender = ?';
      params.push(gender);
    }
    
    query += ' ORDER BY gender, display_order';
    return await getAll(query, params);
  }

  // Obtener categoría por ID
  static async getCategoryById(id) {
    const query = 'SELECT * FROM categories WHERE id = ?';
    return await getOne(query, [id]);
  }

  // Crear nueva categoría
  static async createCategory(data) {
    const query = `
      INSERT INTO categories (name, gender, display_order, is_active, image_url, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const result = await runQuery(query, [
      data.name,
      data.gender,
      data.display_order || 0,
      data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1,
      data.image_url || null,
      data.description || null
    ]);
    return result.id;
  }

  // Actualizar categoría
  static async updateCategory(id, data) {
    const query = `
      UPDATE categories 
      SET name = ?, gender = ?, display_order = ?, is_active = ?, image_url = ?, description = ?
      WHERE id = ?
    `;
    await runQuery(query, [
      data.name,
      data.gender,
      data.display_order,
      data.is_active ? 1 : 0,
      data.image_url || null,
      data.description || null,
      id
    ]);
  }

  // Eliminar categoría (solo si no tiene productos asociados)
  static async deleteCategory(id) {
    // Verificar si hay productos con esta categoría
    const checkQuery = `
      SELECT COUNT(*) as count 
      FROM products p
      JOIN categories c ON p.category = c.name AND p.gender = c.gender
      WHERE c.id = ?
    `;
    const result = await getOne(checkQuery, [id]);
    
    if (result.count > 0) {
      throw new HttpError('CATEGORY_IN_USE');
    }
    
    const deleteQuery = 'DELETE FROM categories WHERE id = ?';
    await runQuery(deleteQuery, [id]);
  }

  // Desactivar categoría
  static async toggleCategoryStatus(id, isActive) {
    const query = 'UPDATE categories SET is_active = ? WHERE id = ?';
    await runQuery(query, [isActive ? 1 : 0, id]);
  }
}

module.exports = CategoryModel;
