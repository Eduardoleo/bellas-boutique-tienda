import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getWomenCatalog, getMenCatalog } from "../../services/catalog";
import { addToCart } from "../../services/cart";
import { toast } from "../../utils/toast";
import './ProductDetail.css';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [allProducts, setAllProducts] = useState([]);
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    loadProduct();
  }, [id]);

  const loadProduct = async () => {
    setLoading(true);
    
    // Intentar buscar en ambos catálogos
    let result = await getWomenCatalog();
    let foundProduct = result.products?.find(p => p.id === parseInt(id));
    let allProds = result.products || [];
    
    if (!foundProduct) {
      result = await getMenCatalog();
      foundProduct = result.products?.find(p => p.id === parseInt(id));
      allProds = result.products || [];
    }
    
    if (foundProduct) {
      setProduct(foundProduct);
      setAllProducts(allProds);
      // Seleccionar el primer color por defecto
      if (foundProduct.colors) {
        const colors = foundProduct.colors.split(',');
        setSelectedColor(colors[0].trim());
      }
      // Cargar recomendaciones
      loadRecommendations(foundProduct, allProds);
    }
    
    setLoading(false);
  };

  const getComplementaryCategories = (category) => {
    const categoryMap = {
      // Mujeres
      'Vestidos': ['Bolsos', 'Zapatos', 'Accesorios', 'Abrigos'],
      'Jeans': ['Camisetas', 'Tops', 'Sudaderas', 'Zapatos', 'Bolsos'],
      'Tops': ['Jeans', 'Zapatos', 'Bolsos', 'Accesorios'],
      'Bodies': ['Jeans', 'Zapatos', 'Bolsos', 'Accesorios'],
      'Abrigos': ['Vestidos', 'Jeans', 'Camisetas', 'Zapatos', 'Bolsos'],
      'Sudaderas': ['Jeans', 'Zapatos', 'Bolsos', 'Accesorios'],
      'Zapatos': ['Vestidos', 'Jeans', 'Camisetas', 'Bolsos', 'Accesorios'],
      'Bolsos': ['Vestidos', 'Jeans', 'Camisetas', 'Zapatos', 'Accesorios'],
      'Accesorios': ['Vestidos', 'Jeans', 'Camisetas', 'Zapatos', 'Bolsos'],
      
      // Hombres y Mujeres (Camisetas es para ambos)
      'Camisetas': ['Jeans', 'Trajes', 'Zapatos', 'Bolsos', 'Accesorios', 'Abrigos', 'Sudaderas'],
      'Trajes': ['Zapatos', 'Bolsos', 'Accesorios', 'Abrigos', 'Camisetas']
    };
    
    return categoryMap[category] || [];
  };

  const loadRecommendations = (currentProduct, products) => {
    const complementaryCategories = getComplementaryCategories(currentProduct.category);
    
    console.log('Producto actual:', currentProduct);
    console.log('Categorías complementarias:', complementaryCategories);
    console.log('Todos los productos:', products);
    
    // Filtrar productos del mismo género y de categorías complementarias
    const recommended = products.filter(p => {
      const sameGender = p.gender === currentProduct.gender;
      const isComplementary = complementaryCategories.includes(p.category);
      const notSameProduct = p.id !== currentProduct.id;
      
      console.log(`Producto ${p.name}: género=${sameGender}, complementaria=${isComplementary}, diferente=${notSameProduct}`);
      
      return notSameProduct && sameGender && isComplementary;
    });
    
    console.log('Productos recomendados:', recommended);
    
    // Tomar máximo 4 productos aleatorios
    const shuffled = recommended.sort(() => 0.5 - Math.random());
    setRecommendations(shuffled.slice(0, 4));
  };

  const handleAddToCart = async () => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      toast.warning('Para agregar al carrito debes tener una cuenta. Por favor inicia sesión o regístrate.');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
      return;
    }

    if (!selectedColor) {
      toast.warning('Por favor selecciona un color');
      return;
    }

    if (needsSize && !selectedSize) {
      toast.warning('Por favor selecciona una talla');
      return;
    }

    // Validar stock disponible
    if (!product.available_quantity || product.available_quantity < 1) {
      toast.error('Producto sin stock disponible');
      return;
    }

    console.log('Agregando al carrito:', product.id);
    const result = await addToCart(product.id, 1);
    console.log('Resultado:', result);
    
    if (result.success) {
      toast.success(`${product.name} agregado al carrito`);
    } else {
      toast.error(result.message || 'Error al agregar al carrito');
    }
  };

  if (loading) {
    return <div className="product-detail-page"><p>Cargando producto...</p></div>;
  }

  if (!product) {
    return (
      <div className="product-detail-page">
        <p>Producto no encontrado</p>
        <button onClick={() => navigate(-1)} className="back-button">Volver</button>
      </div>
    );
  }

  const colors = product.colors ? product.colors.split(',').map(c => c.trim()) : [];
  
  // Determinar las medidas según el tipo de producto
  const getSizes = () => {
    switch(product.size_type) {
      case 'zapatos':
        // Tallas USA para zapatos
        if (product.gender === 'mujer') {
          return ['5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10'];
        } else {
          return ['7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12'];
        }
      case 'collar':
        // Centímetros para collares
        return ['40 cm', '45 cm', '50 cm', '55 cm', '60 cm'];
      case 'accesorios':
      case 'ninguno':
        // Sin tallas para accesorios y bolsos
        return [];
      case 'ropa':
      default:
        // Tallas de ropa estándar
        return ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
    }
  };
  
  const sizes = getSizes();
  const needsSize = sizes.length > 0;

  return (
    <div className="product-detail-page">
      <button className="back-button" onClick={() => navigate(-1)}>
        Volver
      </button>

      <div className="product-detail-container">
        <div className="product-image-section">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="product-main-image" />
          ) : (
            <div className={`product-image-placeholder ${product.gender === 'mujer' ? 'women-placeholder' : 'men-placeholder'}`}>
              {product.name}
            </div>
          )}
        </div>

        <div className="product-info-section">
          <h1 className="product-title">{product.name}</h1>
          <p className="product-description">{product.description}</p>
          <p className="product-price">₡{product.price.toLocaleString('es-CR')}</p>

          <div className="product-options">
            <div className="option-group">
              <label>Colores disponibles:</label>
              <div className="color-options">
                {colors.map((color) => (
                  <button
                    key={color}
                    className={`color-option ${selectedColor === color ? 'active' : ''}`}
                    onClick={() => setSelectedColor(color)}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>

            {needsSize && (
              <div className="option-group">
                <label>
                  {product.size_type === 'zapatos' ? 'Talla USA:' : 
                   product.size_type === 'collar' ? 'Longitud:' : 
                   'Tallas disponibles:'}
                </label>
                <div className="size-options">
                  {sizes.map((size) => (
                    <button
                      key={size}
                      className={`size-option ${selectedSize === size ? 'active' : ''}`}
                      onClick={() => setSelectedSize(size)}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Indicador de stock */}
          <div className="stock-indicator">
            {product.available_quantity > 0 ? (
              <span className="in-stock">Disponible</span>
            ) : (
              <span className="out-of-stock">Sin stock</span>
            )}
          </div>

          <button 
            className="add-to-cart-button-detail" 
            onClick={handleAddToCart}
            disabled={!product.available_quantity || product.available_quantity < 1}
          >
            {product.available_quantity > 0 ? 'Agregar al carrito' : 'Sin stock'}
          </button>
        </div>
      </div>

      {/* Sección de recomendaciones */}
      {recommendations.length > 0 && (
        <div className="recommendations-section">
          <h2 className="recommendations-title">Completa Tu Outfit</h2>
          <div className="recommendations-grid">
            {recommendations.map((item) => (
              <div 
                key={item.id} 
                className="recommendation-card"
                onClick={() => {
                  navigate(`/product/${item.id}`);
                  window.scrollTo(0, 0);
                }}
              >
                <div className="recommendation-image">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} />
                  ) : (
                    <div className={`${item.gender === 'mujer' ? 'women-placeholder' : 'men-placeholder'}`}>
                      {item.name}
                    </div>
                  )}
                </div>
                <div className="recommendation-info">
                  <h3 className="recommendation-name">{item.name}</h3>
                  <p className="recommendation-category">{item.category}</p>
                  <p className="recommendation-price">₡{item.price.toLocaleString('es-CR')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetail;
