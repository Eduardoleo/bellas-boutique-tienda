import { API_URL } from '../../../app/config';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from "../../../utils/toast";
import ConfirmModal from "../../../components/common/ConfirmModal";
import './AdminProducts.css';

const AdminProducts = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: '',
    gender: '',
    search: ''
  });
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState({ show: false, productId: null });
  const [selectedProduct, setSelectedProduct] = useState({
    name: '',
    description: '',
    price: '',
    category: 'blusas',
    gender: 'mujer',
    proveedor: '',
    colors: 'Negro',
    size_type: 'ropa',
    image_url: '',
    quantity: 0
  });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_URL}/categories`);
      const data = await response.json();
      if (data.success) {
        setCategories(data.data);
      }
    } catch (error) {
      console.error('Error al cargar categorías:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch(`${API_URL}/catalog/admin/products`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }

      const data = await response.json();
      if (data.success) {
        setProducts(data.products);
      }
    } catch (error) {
      console.error('Error al cargar productos:', error);
      toast.error('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduct = () => {
    setSelectedProduct({
      name: '',
      description: '',
      price: '',
      category: 'blusas',
      gender: 'mujer',
      proveedor: '',
      colors: 'Negro',
      size_type: 'ropa',
      image_url: '',
      quantity: 0
    });
    setIsEditing(false);
    setShowModal(true);
  };

  const handleEditProduct = (product) => {
    setSelectedProduct(product);
    setIsEditing(true);
    setShowModal(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const url = isEditing
        ? `${API_URL}/catalog/admin/products/${selectedProduct.id}`
        : `${API_URL}/catalog/admin/products`;      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(selectedProduct)
      });

      const data = await response.json();
      if (data.success) {
        toast.success(isEditing ? 'Producto actualizado exitosamente' : 'Producto creado exitosamente');
        setShowModal(false);
        fetchProducts();
      } else {
        toast.error(data.message || 'Error al guardar producto');
      }
    } catch (error) {
      console.error('Error al guardar producto:', error);
      toast.error('Error al guardar producto');
    }
  };

  const handleDeleteProduct = async (productId) => {
    setConfirmDelete({ show: true, productId });
  };

  const confirmDeleteProduct = async () => {
    const { productId } = confirmDelete;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/catalog/admin/products/${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Producto eliminado exitosamente');
        fetchProducts();
      } else {
        toast.error(data.message || 'Error al eliminar producto');
      }
    } catch (error) {
      console.error('Error al eliminar producto:', error);
      toast.error('Error al eliminar producto');
    }
  };

  const handleUpdateStock = async (productId, newQuantity) => {
    if (newQuantity < 0) {
      toast.error('La cantidad no puede ser negativa');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/catalog/admin/products/${productId}/stock`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ quantity: newQuantity })
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Stock actualizado exitosamente');
        fetchProducts();
      } else {
        toast.error(data.message || 'Error al actualizar stock');
      }
    } catch (error) {
      console.error('Error al actualizar stock:', error);
      toast.error('Error al actualizar stock');
    }
  };

  const filteredProducts = products.filter(product => {
    const matchCategory = !filters.category || product.category === filters.category;
    const matchGender = !filters.gender || product.gender === filters.gender;
    const matchSearch = !filters.search || 
      product.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      product.description.toLowerCase().includes(filters.search.toLowerCase());
    
    return matchCategory && matchGender && matchSearch;
  });

  if (loading) {
    return <div className="admin-loading">cargando productos...</div>;
  }

  return (
    <div className="admin-products-page">
      <div className="admin-products-container">
        <div className="admin-products-header">
          <button onClick={() => navigate('/profile')} className="back-btn">Volver</button>
          <h2>Gestión de productos</h2>
          <button onClick={handleCreateProduct} className="create-btn">Nuevo producto</button>
        </div>

        <div className="filters-section">
          <input
            type="text"
            placeholder="buscar productos..."
            value={filters.search}
            onChange={(e) => setFilters({...filters, search: e.target.value})}
            className="search-input"
          />
          
          <select
            value={filters.category}
            onChange={(e) => setFilters({...filters, category: e.target.value})}
            className="filter-select"
          >
            <option value="">todas las categorías</option>
            {categories
              .filter((cat, index, self) => 
                index === self.findIndex((c) => c.name === cat.name)
              )
              .sort((a, b) => a.name.localeCompare(b.name))
              .map(cat => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))
            }
          </select>

          <select
            value={filters.gender}
            onChange={(e) => setFilters({...filters, gender: e.target.value})}
            className="filter-select"
          >
            <option value="">todos los géneros</option>
            <option value="mujer">mujer</option>
            <option value="hombre">hombre</option>
            <option value="unisex">unisex</option>
          </select>
        </div>

        <div className="products-stats">
          <div className="stat-card">
            <span className="stat-number">{products.length}</span>
            <span className="stat-label">total productos</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{products.filter(p => p.quantity < 10).length}</span>
            <span className="stat-label">stock bajo</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{products.filter(p => p.quantity === 0).length}</span>
            <span className="stat-label">sin stock</span>
          </div>
        </div>

        <div className="products-grid">
          {filteredProducts.map(product => (
            <div key={product.id} className="product-card">
              <div className="product-image-container">
                <img src={product.image_url} alt={product.name} className="product-image" />
                {product.quantity === 0 && <div className="out-of-stock-badge">sin stock</div>}
                {product.quantity > 0 && product.quantity < 10 && <div className="low-stock-badge">stock bajo</div>}
              </div>
              <div className="product-info">
                <h3>{product.name}</h3>
                <p className="product-description">{product.description}</p>
                <div className="product-details">
                  <span className="product-price">₡{product.price}</span>
                  <span className="product-category">{product.category}</span>
                  <span className="product-gender">{product.gender}</span>
                </div>
                <div className="stock-control">
                  <label>stock: </label>
                  <input
                    type="number"
                    value={product.quantity}
                    onChange={(e) => handleUpdateStock(product.id, parseInt(e.target.value) || 0)}
                    className="stock-input"
                    min="0"
                  />
                </div>
                <div className="product-actions">
                  <button
                    onClick={() => handleEditProduct(product)}
                    className="action-btn edit-btn"
                  >
                    editar
                  </button>
                  <button
                    onClick={() => handleDeleteProduct(product.id)}
                    className="action-btn delete-btn"
                  >
                    eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{isEditing ? 'Editar producto' : 'Nuevo producto'}</h3>
              <button onClick={() => setShowModal(false)} className="close-modal-btn">×</button>
            </div>
            <form onSubmit={handleSaveProduct}>
              <div className="form-group">
                <label>nombre</label>
                <input
                  type="text"
                  value={selectedProduct.name}
                  onChange={(e) => setSelectedProduct({...selectedProduct, name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>descripción</label>
                <textarea
                  value={selectedProduct.description}
                  onChange={(e) => setSelectedProduct({...selectedProduct, description: e.target.value})}
                  rows="3"
                />
              </div>
              <div className="form-group">
                <label>precio</label>
                <input
                  type="number"
                  step="0.01"
                  value={selectedProduct.price}
                  onChange={(e) => setSelectedProduct({...selectedProduct, price: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>url de imagen</label>
                <input
                  type="url"
                  value={selectedProduct.image_url}
                  onChange={(e) => setSelectedProduct({...selectedProduct, image_url: e.target.value})}
                  placeholder="https://ejemplo.com/imagen.jpg"
                />
              </div>
              
              {!isEditing && (
                <>
                  <div className="form-group">
                    <label>stock inicial</label>
                    <input
                      type="number"
                      value={selectedProduct.quantity}
                      onChange={(e) => setSelectedProduct({...selectedProduct, quantity: e.target.value})}
                      required
                      min="0"
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>categoría</label>
                      <select
                        value={selectedProduct.category}
                        onChange={(e) => setSelectedProduct({...selectedProduct, category: e.target.value})}
                        required
                      >
                        <option value="blusas">blusas</option>
                        <option value="pantalones">pantalones</option>
                        <option value="vestidos">vestidos</option>
                        <option value="zapatos">zapatos</option>
                        <option value="accesorios">accesorios</option>
                        <option value="collares">collares</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>género</label>
                      <select
                        value={selectedProduct.gender}
                        onChange={(e) => setSelectedProduct({...selectedProduct, gender: e.target.value})}
                        required
                      >
                        <option value="mujer">mujer</option>
                        <option value="hombre">hombre</option>
                        <option value="unisex">unisex</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>proveedor</label>
                    <input
                      type="text"
                      value={selectedProduct.proveedor}
                      onChange={(e) => setSelectedProduct({...selectedProduct, proveedor: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>colores</label>
                    <input
                      type="text"
                      value={selectedProduct.colors}
                      onChange={(e) => setSelectedProduct({...selectedProduct, colors: e.target.value})}
                      placeholder="Negro, Blanco, Rojo"
                    />
                  </div>
                  <div className="form-group">
                    <label>tipo de talla</label>
                    <select
                      value={selectedProduct.size_type}
                      onChange={(e) => setSelectedProduct({...selectedProduct, size_type: e.target.value})}
                    >
                      <option value="ropa">ropa</option>
                      <option value="zapatos">zapatos</option>
                      <option value="accesorios">accesorios</option>
                      <option value="collar">collar</option>
                      <option value="ninguno">ninguno</option>
                    </select>
                  </div>
                </>
              )}
              
              <div className="modal-actions">
                <button type="button" onClick={() => setShowModal(false)} className="cancel-btn">
                  Cancelar
                </button>
                <button type="submit" className="save-btn">
                  {isEditing ? 'Guardar cambios' : 'Crear producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmDelete.show}
        onClose={() => setConfirmDelete({ show: false, productId: null })}
        onConfirm={confirmDeleteProduct}
        title="¿Eliminar producto?"
        message="Este producto se eliminará permanentemente del catálogo"
        confirmText="Eliminar"
        cancelText="Cancelar"
        danger={true}
      />
    </div>
  );
};

export default AdminProducts;
