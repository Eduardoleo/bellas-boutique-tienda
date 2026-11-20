const { sendHttpError, HttpError } = require('../utils/httpErrors');
const { logError } = require('../utils/safeLogger');
const CategoryModel = require('../models/categoryModel');

class CategoryController {
  // Obtener todas las categorías
  static async getCategories(req, res) {
    try {
      const { gender } = req.query;
      const categories = await CategoryModel.getAllCategories(gender);
      
      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      logError('categorycontroller.failure', error);
      return sendHttpError(req, res, error);
    }
  }

  // Crear nueva categoría
  static async createCategory(req, res) {
    try {
      const { name, gender, display_order, is_active, image_url, description } = req.body;

      if (!name || !gender) {
        return res.status(400).json({
          success: false,
          message: 'Nombre y género son requeridos'
        });
      }

      const categoryId = await CategoryModel.createCategory({
        name,
        gender,
        display_order,
        is_active,
        image_url,
        description
      });

      res.json({
        success: true,
        message: 'Categoría creada exitosamente',
        categoryId
      });
    } catch (error) {
      logError('categorycontroller.failure', error);
      
      // SQLite error for UNIQUE constraint violation
      if (error.code === 'SQLITE_CONSTRAINT') return sendHttpError(req, res, new HttpError(/UNIQUE constraint failed/.test(error.message) ? 'CATEGORY_EXISTS' : 'INVALID_DATA'));
      
      return sendHttpError(req, res, error);
    }
  }

  // Actualizar categoría
  static async updateCategory(req, res) {
    try {
      const { id } = req.params;
      const { name, gender, display_order, is_active, image_url, description } = req.body;

      await CategoryModel.updateCategory(id, {
        name,
        gender,
        display_order,
        is_active,
        image_url,
        description
      });

      res.json({
        success: true,
        message: 'Categoría actualizada exitosamente'
      });
    } catch (error) {
      logError('categorycontroller.failure', error);
      return sendHttpError(req, res, error);
    }
  }

  // Eliminar categoría
  static async deleteCategory(req, res) {
    try {
      const { id } = req.params;
      
      await CategoryModel.deleteCategory(id);

      res.json({
        success: true,
        message: 'Categoría eliminada exitosamente'
      });
    } catch (error) {
      logError('categorycontroller.failure', error);
      return sendHttpError(req, res, error);
    }
  }

  // Cambiar estado activo/inactivo
  static async toggleStatus(req, res) {
    try {
      const { id } = req.params;
      const { is_active } = req.body;

      await CategoryModel.toggleCategoryStatus(id, is_active);

      res.json({
        success: true,
        message: `Categoría ${is_active ? 'activada' : 'desactivada'} exitosamente`
      });
    } catch (error) {
      logError('categorycontroller.failure', error);
      return sendHttpError(req, res, error);
    }
  }
}

module.exports = {
  getCategories: CategoryController.getCategories,
  createCategory: CategoryController.createCategory,
  updateCategory: CategoryController.updateCategory,
  deleteCategory: CategoryController.deleteCategory,
  toggleStatus: CategoryController.toggleStatus
};
