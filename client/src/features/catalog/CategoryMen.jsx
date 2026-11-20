import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCategories } from "../../services/catalog";
import './CategorySelection.css';

const CategoryMen = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    const result = await getCategories('hombre');
    if (result.success) {
      setCategories(result.categories);
    }
    setLoading(false);
  };

  const handleCategoryClick = (category) => {
    navigate(`/catalog-men/${category}`);
  };

  if (loading) {
    return <div className="category-page"><p>Cargando categorias...</p></div>;
  }

  return (
    <div className="category-page">
      <div className="category-header">
        <h2>Colección Hombre</h2>
        <p>Selecciona una categoria</p>
      </div>

      <div className="category-grid">
        {categories.map((category) => (
          <div 
            key={category.id} 
            className="category-card"
            onClick={() => handleCategoryClick(category.name)}
          >
            <div className="category-image">
              {category.image_url ? (
                <img src={category.image_url} alt={category.name} />
              ) : (
                <div className="placeholder-image men-placeholder">
                  {category.name}
                </div>
              )}
            </div>
            <div className="category-info">
              <h3>{category.name}</h3>
              {category.description && <p className="category-description">{category.description}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryMen;
