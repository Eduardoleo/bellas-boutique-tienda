import { API_URL } from '../../../app/config';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminCategories.css';
import ConfirmModal from "../../../components/common/ConfirmModal";

function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [selectedGender, setSelectedGender] = useState('mujer');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    gender: 'mujer',
    display_order: 0,
    is_active: true,
    image_url: '',
    description: ''
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    const filtered = categories.filter(cat => cat.gender === selectedGender);
    setFilteredCategories(filtered.sort((a, b) => a.display_order - b.display_order));
  }, [categories, selectedGender]);

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/categories`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setCategories(data.data);
      }
    } catch (error) {
      console.error('Error al cargar categorías:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const url = editingCategory
        ? `${API_URL}/categories/${editingCategory.id}`
        : `${API_URL}/categories`;
      
      const method = editingCategory ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      
      if (data.success) {
        fetchCategories();
        handleCloseModal();
      } else {
        alert(data.message || 'Error al guardar categoría');
      }
    } catch (error) {
      console.error('Error al guardar categoría:', error);
      alert('Error al guardar categoría');
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/categories/${confirmDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        fetchCategories();
      } else {
        alert(data.message || 'Error al eliminar categoría');
      }
    } catch (error) {
      console.error('Error al eliminar categoría:', error);
      alert('Error al eliminar categoría');
    } finally {
      setConfirmDelete(null);
    }
  };

  const handleToggleStatus = async (category) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/categories/${category.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_active: !category.is_active })
      });

      const data = await response.json();
      
      if (data.success) {
        fetchCategories();
      }
    } catch (error) {
      console.error('Error al cambiar estado:', error);
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      gender: category.gender,
      display_order: category.display_order,
      is_active: category.is_active,
      image_url: category.image_url || '',
      description: category.description || ''
    });
    setImagePreview(category.image_url || null);
    setShowModal(true);
  };

  const handleAdd = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      gender: selectedGender,
      display_order: filteredCategories.length,
      is_active: true,
      image_url: '',
      description: ''
    });
    setImagePreview(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    setImagePreview(null);
    setFormData({
      name: '',
      gender: 'mujer',
      display_order: 0,
      is_active: true,
      image_url: '',
      description: ''
    });
  };

  const handleImageChange = (e) => {
    const value = e.target.value;
    setFormData({ ...formData, image_url: value });
    setImagePreview(value);
  };

  const requestDelete = (category) => {
    setConfirmDelete(category);
  };

  if (loading) {
    return (
      <div className="admin-categories">
        <div className="loading">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="admin-categories">
      <div className="admin-categories-header">
        <button className="back-button" onClick={() => navigate('/profile')}>
          Volver
        </button>
        <h2>Gestión de categorías</h2>
      </div>

      <div className="gender-tabs">
        <button
          className={selectedGender === 'mujer' ? 'active' : ''}
          onClick={() => setSelectedGender('mujer')}
        >
          Mujer
        </button>
        <button
          className={selectedGender === 'hombre' ? 'active' : ''}
          onClick={() => setSelectedGender('hombre')}
        >
          Hombre
        </button>
      </div>

      <div className="categories-actions">
        <button className="add-button" onClick={handleAdd}>
          Nueva categoría
        </button>
      </div>

      <div className="categories-list">
        {filteredCategories.length === 0 ? (
          <p className="no-categories">No hay categorías para este género</p>
        ) : (
          <table className="categories-table">
            <thead>
              <tr>
                <th>Imagen</th>
                <th>Orden</th>
                <th>Nombre</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredCategories.map((category) => (
                <tr key={category.id}>
                  <td>
                    {category.image_url ? (
                      <img src={category.image_url} alt={category.name} className="category-thumbnail" />
                    ) : (
                      <div className="no-image">Sin imagen</div>
                    )}
                  </td>
                  <td>{category.display_order}</td>
                  <td>
                    <div className="category-name-cell">
                      <strong>{category.name}</strong>
                      {category.description && (
                        <small className="category-description">{category.description}</small>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge ${category.is_active ? 'active' : 'inactive'}`}>
                      {category.is_active ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="actions">
                    <button
                      className="btn-edit"
                      onClick={() => handleEdit(category)}
                    >
                      Editar
                    </button>
                    <button
                      className={`btn-toggle ${category.is_active ? 'deactivate' : 'activate'}`}
                      onClick={() => handleToggleStatus(category)}
                    >
                      {category.is_active ? 'Desactivar' : 'Activar'}
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => requestDelete(category)}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{editingCategory ? 'Editar categoría' : 'Nueva categoría'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nombre</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Descripción</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Breve descripción de la categoría (opcional)"
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label>URL de imagen</label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={handleImageChange}
                  placeholder="https://ejemplo.com/imagen.jpg"
                />
                {imagePreview && (
                  <div className="image-preview">
                    <img src={imagePreview} alt="Preview" />
                  </div>
                )}
              </div>
              
              <div className="form-group">
                <label>Género</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  required
                >
                  <option value="mujer">Mujer</option>
                  <option value="hombre">Hombre</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>Orden de visualización</label>
                <input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                  required
                  min="0"
                />
              </div>
              
              <div className="form-group checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  Categoría activa
                </label>
              </div>

              <div className="modal-actions">
                <button type="button" onClick={handleCloseModal} className="btn-cancel">
                  Cancelar
                </button>
                <button type="submit" className="btn-save">
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Eliminar categoría"
        message={`¿Estás seguro de que deseas eliminar la categoría "${confirmDelete?.name}"?`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        danger={true}
      />
    </div>
  );
}

export default AdminCategories;
