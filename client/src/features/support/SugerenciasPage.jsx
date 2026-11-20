import { API_URL } from '../../app/config';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from "../../utils/toast";
import './SugerenciasPage.css';

const SugerenciasPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    categoria: 'general'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const token = localStorage.getItem('token');
    if (!token) {
      toast.warning('Debes iniciar sesión para enviar sugerencias');
      navigate('/login');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/support/sugerencias`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        toast.success('✅ ¡Gracias por tu sugerencia! La revisaremos pronto.');
        setFormData({ titulo: '', descripcion: '', categoria: 'general' });
        setTimeout(() => navigate('/'), 2000);
      } else {
        toast.error(data.message || 'Error al enviar sugerencia');
      }
    } catch (error) {
      console.error('Error al enviar sugerencia:', error);
      toast.error('Error al enviar sugerencia');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="sugerencias-page">
      <div className="sugerencias-container">
        <div className="sugerencias-header">
          <button onClick={() => navigate('/')} className="back-btn">
            Volver
          </button>
          <h1>Enviar Sugerencia</h1>
          <p className="sugerencias-subtitle">
            Tus ideas nos ayudan a mejorar. ¡Comparte tu sugerencia con nosotros!
          </p>
        </div>

        <form onSubmit={handleSubmit} className="sugerencias-form">
          <div className="form-group">
            <label>Categoría</label>
            <select
              name="categoria"
              value={formData.categoria}
              onChange={handleChange}
              required
            >
              <option value="general">General</option>
              <option value="productos">Productos</option>
              <option value="envios">Envíos</option>
              <option value="pagos">Pagos</option>
              <option value="interfaz">Interfaz del Sitio</option>
              <option value="servicio">Servicio al Cliente</option>
              <option value="otro">Otro</option>
            </select>
          </div>

          <div className="form-group">
            <label>Título de la Sugerencia</label>
            <input
              type="text"
              name="titulo"
              value={formData.titulo}
              onChange={handleChange}
              placeholder="Resume tu sugerencia en pocas palabras"
              maxLength="100"
              required
            />
            <small>{formData.titulo.length}/100 caracteres</small>
          </div>

          <div className="form-group">
            <label>Descripción Detallada</label>
            <textarea
              name="descripcion"
              value={formData.descripcion}
              onChange={handleChange}
              placeholder="Explica tu sugerencia con el mayor detalle posible..."
              rows="8"
              maxLength="1000"
              required
            />
            <small>{formData.descripcion.length}/1000 caracteres</small>
          </div>

          <div className="tips-box">
            <p>
              <strong>Consejos para una buena sugerencia:</strong>
            </p>
            <ul>
              <li>Sé específico sobre qué te gustaría mejorar</li>
              <li>Explica cómo tu sugerencia beneficiaría a otros usuarios</li>
              <li>Si es posible, da ejemplos concretos</li>
            </ul>
          </div>

          <div className="form-actions">
            <button 
              type="button" 
              onClick={() => navigate('/')} 
              className="cancel-btn"
              disabled={loading}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="submit-btn"
              disabled={loading}
            >
              {loading ? '⏳ Enviando...' : '✉️ Enviar Sugerencia'}
            </button>
          </div>
        </form>

        <div className="sugerencias-info">
          <h3>¿Qué pasa después?</h3>
          <div className="info-steps">
            <div className="step">
              <span className="step-number">1</span>
              <div className="step-content">
                <h4>Revisión</h4>
                <p>Nuestro equipo revisará tu sugerencia</p>
              </div>
            </div>
            <div className="step">
              <span className="step-number">2</span>
              <div className="step-content">
                <h4>Evaluación</h4>
                <p>Analizamos su viabilidad e impacto</p>
              </div>
            </div>
            <div className="step">
              <span className="step-number">3</span>
              <div className="step-content">
                <h4>Implementación</h4>
                <p>Si es aprobada, la implementamos</p>
              </div>
            </div>
            <div className="step">
              <span className="step-number">4</span>
              <div className="step-content">
                <h4>Notificación</h4>
                <p>Te avisamos sobre el estado</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SugerenciasPage;
