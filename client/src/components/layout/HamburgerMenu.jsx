import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './HamburgerMenu.css';

const HamburgerMenu = ({ isOpen, onClose, onGenderSelect, onCategorySelect }) => {
  const [selectedGender, setSelectedGender] = useState('mujer');
  const navigate = useNavigate();
  const panel=useRef(null);
  useEffect(()=>{if(!isOpen)return;const previous=document.activeElement,overflow=document.body.style.overflow;document.body.style.overflow='hidden';panel.current?.querySelector('button')?.focus();const keys=e=>{if(e.key==='Escape'){e.preventDefault();onClose()}if(e.key==='Tab'){const buttons=[...panel.current.querySelectorAll('button')];const first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}};document.addEventListener('keydown',keys);return()=>{document.removeEventListener('keydown',keys);document.body.style.overflow=overflow;previous?.focus()};},[isOpen]);

  const handleGenderClick = (gender) => {
    setSelectedGender(gender);
  };

  const handleCategoryClick = (category) => {
    if (onCategorySelect) {
      onCategorySelect(category, selectedGender);
    }
    onClose();
  };

  const womenCategories = [
    'Vestidos',
    'Jeans',
    'Camisetas',
    'Tops',
    'Bodies',
    'Abrigos',
    'Sudaderas',
    'Zapatos',
    'Bolsos',
    'Accesorios'
  ];

  const menCategories = [
    'Camisetas',
    'Jeans',
    'Trajes',
    'Sudaderas',
    'Abrigos',
    'Zapatos',
    'Bolsos',
    'Accesorios'
  ];

  const categories = selectedGender === 'mujer' ? womenCategories : menCategories;

  if (!isOpen) return null;

  return (
    <div className="hamburger-menu-overlay" onClick={onClose}>
      <div ref={panel} id="boutique-menu" role="dialog" aria-modal="true" aria-label="Navegación" className="hamburger-menu" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" aria-label="Cerrar menú" onClick={onClose}>&times;</button>
        
        <div className="gender-selector">
          <button
            className={`gender-btn ${selectedGender === 'hombre' ? 'active' : ''}`}
            onClick={() => handleGenderClick('hombre')}
          >
            Hombre
          </button>
          <button
            className={`gender-btn ${selectedGender === 'mujer' ? 'active' : ''}`}
            onClick={() => handleGenderClick('mujer')}
          >
            Mujer
          </button>
        </div>

        <div className="category-filters" key={selectedGender}>
          <h3>Categorías</h3>
          {categories.map((category) => (
            <button
              key={category}
              className="category-btn"
              onClick={() => handleCategoryClick(category)}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="menu-footer">
          <button 
            className="footer-link-btn" 
            onClick={() => { navigate('/faq'); onClose(); }}
          >
            Preguntas frecuentes
          </button>
          <button 
            className="footer-link-btn" 
            onClick={() => { navigate('/encuesta'); onClose(); }}
          >
            Encuesta
          </button>
          <button 
            className="footer-link-btn" 
            onClick={() => { navigate('/sugerencias'); onClose(); }}
          >
            Sugerencias
          </button>
        </div>
      </div>
    </div>
  );
};

export default HamburgerMenu;
