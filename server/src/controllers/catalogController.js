const { sendHttpError } = require('../utils/httpErrors');
const { logError } = require('../utils/safeLogger');
const CatalogModel = require('../models/catalogModel');

class CatalogController {
  // Obtener productos para mujeres
  static async getWomenProducts(req, res) {
    try {
      const products = await CatalogModel.getWomenProducts();

      res.json({
        success: true,
        products,
        count: products.length
      });
    } catch (error) {
      logError('catalogcontroller.failure', error);
      return sendHttpError(req, res, error);
    }
  }

  // Obtener productos para hombres
  static async getMenProducts(req, res) {
    try {
      const products = await CatalogModel.getMenProducts();

      res.json({
        success: true,
        products,
        count: products.length
      });
    } catch (error) {
      logError('catalogcontroller.failure', error);
      return sendHttpError(req, res, error);
    }
  }

  // Obtener producto por ID
  static async getProductById(req, res) {
    try {
      const productId = req.params.id;

      const product = await CatalogModel.getProductById(productId);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado'
        });
      }

      res.json({
        success: true,
        product
      });
    } catch (error) {
      logError('catalogcontroller.failure', error);
      return sendHttpError(req, res, error);
    }
  }

  // Obtener categorias
  static async getCategories(req, res) {
    try {
      const categories = await CatalogModel.getCategories();

      res.json({
        success: true,
        categories
      });
    } catch (error) {
      logError('catalogcontroller.failure', error);
      return sendHttpError(req, res, error);
    }
  }

  // Obtener productos por categoria
  static async getProductsByCategory(req, res) {
    try {
      const category = req.params.category;
      const gender = req.query.gender;

      const products = await CatalogModel.getProductsByCategory(category, gender);

      res.json({
        success: true,
        products,
        count: products.length
      });
    } catch (error) {
      logError('catalogcontroller.failure', error);
      return sendHttpError(req, res, error);
    }
  }

  // Buscar productos
  static async searchProducts(req, res) {
    try {
      const searchTerm = req.query.q;
      const gender = req.query.gender;

      if (!searchTerm) {
        return res.status(400).json({
          success: false,
          message: 'Termino de busqueda requerido'
        });
      }

      const products = await CatalogModel.searchProducts(searchTerm, gender);

      res.json({
        success: true,
        products,
        count: products.length
      });
    } catch (error) {
      logError('catalogcontroller.failure', error);
      return sendHttpError(req, res, error);
    }
  }

  // Obtener productos destacados
  static async getFeaturedProducts(req, res) {
    try {
      const limit = req.query.limit || 8;

      const products = await CatalogModel.getFeaturedProducts(limit);

      res.json({
        success: true,
        products
      });
    } catch (error) {
      logError('catalogcontroller.failure', error);
      return sendHttpError(req, res, error);
    }
  }

  // Crear nuevo producto (Admin)
  static async createProduct(req, res) {
    try {
      const { name, description, price, category, gender, image_url } = req.body;

      if (!name || !price || !category || !gender) {
        return res.status(400).json({
          success: false,
          message: 'Nombre, precio, categoria y genero son obligatorios'
        });
      }

      const product = await CatalogModel.createProduct({
        name,
        description,
        price,
        category,
        gender,
        image_url
      });

      res.status(201).json({
        success: true,
        message: 'Producto creado exitosamente',
        product
      });
    } catch (error) {
      logError('catalogcontroller.failure', error);
      return sendHttpError(req, res, error);
    }
  }

  // Actualizar producto (Admin)
  static async updateProduct(req, res) {
    try {
      const productId = req.params.id;
      const { name, description, price, category, gender, image_url } = req.body;

      const product = await CatalogModel.updateProduct(productId, {
        name,
        description,
        price,
        category,
        gender,
        image_url
      });

      res.json({
        success: true,
        message: 'Producto actualizado exitosamente',
        product
      });
    } catch (error) {
      logError('catalogcontroller.failure', error);
      return sendHttpError(req, res, error);
    }
  }

  // Eliminar producto (Admin)
  static async deleteProduct(req, res) {
    try {
      const productId = req.params.id;

      await CatalogModel.deleteProduct(productId);

      res.json({
        success: true,
        message: 'Producto eliminado exitosamente'
      });
    } catch (error) {
      logError('catalogcontroller.failure', error);
      return sendHttpError(req, res, error);
    }
  }

  // Obtener todos los productos
  static async getAllProducts(req, res) {
    try {
      const products = await CatalogModel.getAllProducts();

      res.json({
        success: true,
        products,
        count: products.length
      });
    } catch (error) {
      logError('catalogcontroller.failure', error);
      return sendHttpError(req, res, error);
    }
  }

  // Actualizar stock de un producto
  static async updateStock(req, res) {
    try {
      const productId = req.params.id;
      const { cantidad } = req.body;

      if (cantidad === undefined) {
        return res.status(400).json({
          success: false,
          message: 'La cantidad es requerida'
        });
      }

      const result = await CatalogModel.updateStock(productId, cantidad);

      res.json({
        success: true,
        message: 'Stock actualizado exitosamente',
        stock: result
      });
    } catch (error) {
      logError('catalogcontroller.failure', error);
      return sendHttpError(req, res, error);
    }
  }

  // Búsqueda para chatbot (solo lectura)
  static async chatbotSearch(req, res) {
    try {
      const query = req.query.q || '';
      
      if (typeof query !== 'string') return res.status(400).json({success:false,message:'Consulta inválida'});
      if (!query.trim()) {
        return res.json({
          success: true,
          productos: []
        });
      }

      // Búsqueda simple en base de datos (solo lectura)
      const productos = await CatalogModel.searchProductsForChatbot(query);

      res.json({
        success: true,
        productos: productos.slice(0, 5), // Limitar a 5 resultados
        count: productos.length
      });
    } catch (error) {
      logError('catalogcontroller.failure', error);
      return sendHttpError(req, res, error);
    }
  }
}

module.exports = CatalogController;
