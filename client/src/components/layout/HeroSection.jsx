import React from 'react';
import { useNavigate } from 'react-router-dom';
import './HeroSection.css';

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <div className="hero-section">
      <div className="hero-container" onClick={() => navigate('/catalog-women')}>
        <div className="hero-image women-section">
          <div className="hero-overlay">
            <h2>COLECCIÓN MUJER</h2>
            <p>Descubre las últimas tendencias</p>
          </div>
        </div>
      </div>

      <div className="hero-container" onClick={() => navigate('/catalog-men')}>
        <div className="hero-image men-section">
          <div className="hero-overlay">
            <h2>COLECCIÓN HOMBRE</h2>
            <p>Estilo y elegancia</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
