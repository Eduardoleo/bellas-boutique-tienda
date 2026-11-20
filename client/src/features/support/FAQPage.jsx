import { API_URL } from '../../app/config';
import React, { useState, useEffect } from 'react';
import './FAQPage.css';

const FAQPage = () => {
  const [selectedCategory, setSelectedCategory] = useState('todas');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [faqsData, setFaqsData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFAQs();
  }, []);

  const fetchFAQs = async () => {
    try {
      const response = await fetch(`${API_URL}/support/faqs`);
      const data = await response.json();
      
      if (response.ok && data.success) {
        // Filtrar solo FAQs activas y ordenar
        const activeFAQs = data.faqs
          .filter(faq => faq.activo)
          .sort((a, b) => a.orden - b.orden);
        setFaqsData(activeFAQs);
      }
    } catch (error) {
      console.error('Error al cargar FAQs:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['todas', ...new Set(faqsData.map(faq => faq.categoria))];

  const filteredFAQs = faqsData.filter(faq => {
    const matchCategory = selectedCategory === 'todas' || faq.categoria === selectedCategory;
    const matchSearch = !searchTerm || 
      faq.pregunta.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.respuesta.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.categoria.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchCategory && matchSearch;
  });

  const toggleFAQ = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="faq-page">
      <div className="faq-hero">
        <h1>Preguntas Frecuentes</h1>
        <p>Encuentra respuestas rápidas a las consultas más comunes</p>
      </div>

      <div className="faq-container">
        <div className="faq-search-section">
          <div className="search-wrapper">
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Buscar en preguntas frecuentes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="faq-search"
            />
          </div>
        </div>

        <div className="faq-categories">
          {categories.map(category => (
            <button
              key={category}
              className={`category-btn ${selectedCategory === category ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category)}
            >
              <span className="category-label">{category}</span>
            </button>
          ))}
        </div>

        <div className="faqs-list">
          {filteredFAQs.length === 0 ? (
            <div className="no-results">
              <h3>No se encontraron resultados</h3>
              <p>Intenta con otros términos de búsqueda o selecciona una categoría diferente</p>
            </div>
          ) : (
            <div className="faq-count">
              <p>Mostrando {filteredFAQs.length} {filteredFAQs.length === 1 ? 'pregunta' : 'preguntas'}</p>
            </div>
          )}

          {filteredFAQs.map(faq => (
            <div key={faq.id} className={`faq-item ${expandedId === faq.id ? 'expanded' : ''}`}>
              <button className="faq-question" onClick={() => toggleFAQ(faq.id)}>
                <div className="faq-question-content">
                  <span className="faq-category-tag">{faq.categoria}</span>
                  <h3>{faq.pregunta}</h3>
                </div>
                <span className="faq-toggle-icon">
                  {expandedId === faq.id ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 15l-6-6-6 6"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 9l6 6 6-6"/>
                    </svg>
                  )}
                </span>
              </button>
              
              <div className={`faq-answer ${expandedId === faq.id ? 'show' : ''}`}>
                <div className="faq-answer-content">
                  <p>{faq.respuesta}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredFAQs.length > 0 && (
          <div className="faq-footer">
            <div className="faq-cta">
              <h3>¿No encontraste lo que buscabas?</h3>
              <p>Nuestro equipo de soporte está listo para ayudarte</p>
              <div className="faq-cta-buttons">
                <button className="cta-btn cta-btn-primary" onClick={() => window.location.href = '/'}>
                  Chatbot 24/7
                </button>
                <button className="cta-btn cta-btn-secondary" onClick={() => window.location.href = 'mailto:soporte@bellasboutique.com'}>
                  Enviar correo
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FAQPage;
