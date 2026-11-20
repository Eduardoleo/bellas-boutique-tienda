import { API_URL } from '../../app/config';
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from "../../utils/toast";
import './EncuestaPage.css';

const EncuestaPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const purchaseId = searchParams.get('purchase');
  
  const [loading, setLoading] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [purchaseDetails, setPurchaseDetails] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      toast.warning('Debes iniciar sesión para responder la encuesta');
      navigate('/login');
      return;
    }

    if (purchaseId) {
      fetchPurchaseDetails();
    }
  }, [purchaseId]);

  const fetchPurchaseDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/users/purchases`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        const purchase = data.purchases.find(p => p.id === parseInt(purchaseId));
        setPurchaseDetails(purchase);
      }
    } catch (error) {
      console.error('Error al cargar detalles:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (rating === 0) {
      toast.warning('Por favor selecciona una puntuación');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      toast.warning('Debes iniciar sesión');
      navigate('/login');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/support/encuestas`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          puntuacion: rating,
          comentario: comment,
          purchase_id: purchaseId ? parseInt(purchaseId) : null
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('✅ ¡Gracias por tu opinión! Tu feedback nos ayuda a mejorar.');
        setTimeout(() => navigate('/profile'), 2000);
      } else {
        toast.error(data.message || 'Error al enviar encuesta');
      }
    } catch (error) {
      console.error('Error al enviar encuesta:', error);
      toast.error('Error al enviar encuesta');
    } finally {
      setLoading(false);
    }
  };

  const getRatingLabel = (stars) => {
    const labels = {
      1: 'Muy insatisfecho',
      2: 'Insatisfecho',
      3: 'Neutral',
      4: 'Satisfecho',
      5: 'Muy satisfecho'
    };
    return labels[stars] || '';
  };

  return (
    <div className="encuesta-page">
      <div className="encuesta-container">
        <button onClick={() => navigate('/profile')} className="back-btn-top">
          Volver
        </button>
        
        <div className="encuesta-header">
          <h1>Encuesta de Satisfacción</h1>
          <p className="encuesta-subtitle">
            Tu opinión es muy importante para nosotros
          </p>
        </div>

        {purchaseDetails && (
          <div className="purchase-info">
            <h3>Sobre tu pedido #{purchaseDetails.id}</h3>
            <p>Fecha: {new Date(purchaseDetails.fecha).toLocaleDateString()}</p>
            <p>Total: ₡{parseFloat(purchaseDetails.total).toLocaleString()}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="encuesta-form">
          <div className="rating-section">
            <h2>¿Cómo calificarías tu experiencia?</h2>
            <div className="stars-container">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={`star-btn ${star <= (hoveredRating || rating) ? 'active' : ''}`}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                >
                  ★
                </button>
              ))}
            </div>
            {(hoveredRating || rating) > 0 && (
              <p className="rating-label">
                {getRatingLabel(hoveredRating || rating)}
              </p>
            )}
          </div>

          <div className="comment-section">
            <label>Cuéntanos más sobre tu experiencia (opcional)</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="¿Qué te gustó? ¿Qué podríamos mejorar?"
              rows="6"
              maxLength="500"
            />
            <small>{comment.length}/500 caracteres</small>
          </div>

          <div className="questions-info">
            <h3>Nos gustaría saber sobre:</h3>
            <ul>
              <li>✓ Calidad de los productos</li>
              <li>✓ Tiempo de entrega</li>
              <li>✓ Atención al cliente</li>
              <li>✓ Facilidad de navegación del sitio</li>
              <li>✓ Proceso de compra</li>
            </ul>
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="cancel-btn"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="submit-btn"
              disabled={loading || rating === 0}
            >
              {loading ? 'Enviando...' : 'Enviar encuesta'}
            </button>
          </div>
        </form>

        <div className="privacy-note">
          <p>
            Tu respuesta es confidencial y se utilizará únicamente para mejorar nuestros servicios.
          </p>
        </div>
      </div>
    </div>
  );
};

export default EncuestaPage;
