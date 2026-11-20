const { getOne, getAll, runQuery, withTransaction } = require('../config/db');

class CatalogModel {
  // Obtener productos por genero
  static async getProductsByGender(gender) {
    const query = `
      SELECT 
        p.id,
        p.name,
        p.description,
        p.price,
        p.category,
        p.gender,
        p.colors,
        p.size_type,
        p.image_url,
        s.quantity as stock_quantity,
        (s.quantity - s.reserved_quantity) as available_quantity
      FROM products p
      LEFT JOIN stock s ON p.id = s.product_id
      WHERE p.gender = ?
      GROUP BY p.id
      ORDER BY p.category, p.name
    `;
    return await getAll(query, [gender]);
  }

  // Obtener productos de mujeres
  static async getWomenProducts() {
    return this.getProductsByGender('mujer');
  }

  // Obtener productos de hombres
  static async getMenProducts() {
    return this.getProductsByGender('hombre');
  }

  // Obtener producto por ID
  static async getProductById(productId) {
    const query = `
      SELECT 
        p.id,
        p.name,
        p.description,
        p.price,
        p.category,
        p.gender,
        p.colors,
        p.size_type,
        p.image_url,
        p.created_at,
        s.quantity as stock_quantity,
        (s.quantity - s.reserved_quantity) as available_quantity
      FROM products p
      LEFT JOIN stock s ON p.id = s.product_id
      WHERE p.id = ?
    `;
    return await getOne(query, [productId]);
  }

  // Obtener todas las categorias
  static async getCategories() {
    const query = `
      SELECT DISTINCT category, COUNT(*) as product_count
      FROM products
      GROUP BY category
      ORDER BY category
    `;
    return await getAll(query);
  }

  // Obtener productos por categoria
  static async getProductsByCategory(category, gender = null) {
    let query = `
      SELECT 
        p.id,
        p.name,
        p.description,
        p.price,
        p.category,
        p.gender,
        p.colors,
        p.image_url,
        s.quantity as stock_quantity,
        (s.quantity - s.reserved_quantity) as available_quantity
      FROM products p
      LEFT JOIN stock s ON p.id = s.product_id
      WHERE p.category = ?
    `;
    
    const params = [category];
    
    if (gender) {
      query += ' AND p.gender = ?';
      params.push(gender);
    }
    
    query += ' ORDER BY p.name';
    
    return await getAll(query, params);
  }

  // Buscar productos
  static async searchProducts(searchTerm, gender = null) {
    let query = `
      SELECT 
        p.id,
        p.name,
        p.description,
        p.price,
        p.category,
        p.gender,
        p.colors,
        p.image_url,
        s.quantity as stock_quantity,
        (s.quantity - s.reserved_quantity) as available_quantity
      FROM products p
      LEFT JOIN stock s ON p.id = s.product_id
      WHERE (p.name LIKE ? OR p.description LIKE ? OR p.category LIKE ?)
    `;
    
    const searchPattern = `%${searchTerm}%`;
    const params = [searchPattern, searchPattern, searchPattern];
    
    if (gender) {
      query += ' AND p.gender = ?';
      params.push(gender);
    }
    
    query += ' ORDER BY p.name';
    
    return await getAll(query, params);
  }

  // Obtener productos destacados
  static async getFeaturedProducts(limit = 8) {
    const query = `
      SELECT 
        p.id,
        p.name,
        p.description,
        p.price,
        p.category,
        p.gender,
        p.colors,
        p.image_url,
        s.quantity as stock_quantity,
        (s.quantity - s.reserved_quantity) as available_quantity
      FROM products p
      LEFT JOIN stock s ON p.id = s.product_id
      WHERE (s.quantity - s.reserved_quantity) > 0
      ORDER BY RANDOM()
      LIMIT ?
    `;
    return await getAll(query, [limit]);
  }

  // Crear nuevo producto
  static async createProduct(productData) {
    const { name, description, price, category, gender, image_url } = productData;
    
    const query = `
      INSERT INTO products (name, description, price, category, gender, image_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    const productId = await withTransaction(async tx => {
      const result = await tx.runQuery(query, [name,description,price,category,gender,image_url || null]);
      await tx.runQuery('INSERT INTO stock (product_id,quantity) VALUES (?,100)', [result.id]);
      return result.id;
    });
    return this.getProductById(productId);
  }

  // Actualizar producto
  static async updateProduct(productId, productData) {
    const { name, description, price, category, gender, image_url } = productData;
    
    const query = `
      UPDATE products
      SET name = ?, description = ?, price = ?, category = ?, gender = ?, image_url = ?
      WHERE id = ?
    `;
    
    await runQuery(query, [name, description, price, category, gender, image_url, productId]);
    
    return this.getProductById(productId);
  }

  // Eliminar producto
  static async deleteProduct(productId) {
    await runQuery('DELETE FROM products WHERE id = ?', [productId]);
  }

  // Obtener todos los productos
  static async getAllProducts() {
    const query = `
      SELECT 
        p.id,
        p.name,
        p.description,
        p.price,
        p.category,
        p.gender,
        p.colors,
        p.image_url,
        s.quantity,
        (s.quantity - s.reserved_quantity) as available_quantity
      FROM products p
      LEFT JOIN stock s ON p.id = s.product_id
      ORDER BY p.created_at DESC
    `;
    return await getAll(query);
  }

  // Actualizar stock de un producto
  static async updateStock(productId, cantidad) {
    const query = `
      UPDATE stock 
      SET quantity = ?
      WHERE product_id = ?
    `;
    await runQuery(query, [cantidad, productId]);
    
    // Retornar el stock actualizado
    const stockQuery = 'SELECT * FROM stock WHERE product_id = ?';
    return await getOne(stockQuery, [productId]);
  }

  // Búsqueda de productos para chatbot (solo lectura)
  static async searchProductsForChatbot(searchTerm) {
    const query = `
      SELECT 
        p.id,
        p.name as nombre,
        p.description as descripcion,
        p.price as precio,
        p.category as categoria,
        p.gender as genero,
        p.colors as colores,
        p.image_url,
        s.quantity as stock_quantity,
        (s.quantity - s.reserved_quantity) as available_quantity
      FROM products p
      LEFT JOIN stock s ON p.id = s.product_id
      WHERE 
        p.name LIKE ? OR 
        p.description LIKE ? OR 
        p.category LIKE ? OR
        p.colors LIKE ?
      ORDER BY p.name
      LIMIT 10
    `;
    const searchPattern = `%${searchTerm}%`;
    return await getAll(query, [searchPattern, searchPattern, searchPattern, searchPattern]);
  }
}

module.exports = CatalogModel;
