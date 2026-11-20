import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getWomenCatalog, getMenCatalog } from "../../services/catalog";
import './CategoryProducts.css';

const CategoryProducts = () => {
  const { category } = useParams();
  const location = useLocation();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Detectar género desde la URL
  const gender = location.pathname.includes('/catalog-women/') ? 'women' : 'men';

  useEffect(() => {
    loadProducts();
  }, [category]);

  const loadProducts = async () => {
    setLoading(true);
    const result = gender === 'women' 
      ? await getWomenCatalog() 
      : await getMenCatalog();
    
    if (result.success) {
      // Filtrar productos por categoría
      const filtered = result.products.filter(p => p.category === category);
      setProducts(filtered);
    }
    setLoading(false);
  };

  const handleAddToCart = async (productId) => {
    // Navegar a la página de detalles del producto
    navigate(`/product/${productId}`);
  };

  if (loading) {
    return <div className="products-page"><p>Cargando productos...</p></div>;
  }

  return (
    <div className="products-page">
      <div className="products-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          Volver
        </button>
        <h2>{category}</h2>
        <p>Colección {gender === 'women' ? 'Mujer' : 'Hombre'}</p>
      </div>

      <div className="products-grid">
        {products.map((product) => (
          <div 
            key={product.id} 
            className="product-card"
            onClick={() => navigate(`/product/${product.id}`)}
          >
            <div className="product-image">
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} />
              ) : (
                <div className={`placeholder-image ${gender === 'women' ? 'women-placeholder' : 'men-placeholder'}`}>
                  {product.name}
                </div>
              )}
            </div>
            <div className="product-details">
              <h3>{product.name}</h3>
              <p className="product-description">{product.description}</p>
              <div className="product-colors">
                <span className="colors-label">Colores disponibles:</span>
                <div className="color-list">
                  {product.colors && product.colors.split(',').map((color, index) => (
                    <span key={index} className="color-tag">{color.trim()}</span>
                  ))}
                </div>
              </div>
              <p className="product-price">₡{product.price.toLocaleString('es-CR')}</p>
            </div>
          </div>
        ))}
      </div>

      {products.length === 0 && (
        <div className="no-products">
          <p>No hay productos disponibles en esta categoria</p>
        </div>
      )}
    </div>
  );
};

export default CategoryProducts;
