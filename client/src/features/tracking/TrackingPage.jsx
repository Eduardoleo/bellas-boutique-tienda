import { API_URL } from '../../app/config';
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import './TrackingPage.css';

const TrackingPage = () => {
  const { trackingNumber } = useParams();
  const [shipment, setShipment] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadShipmentData();
  }, [trackingNumber]);

  const loadShipmentData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/tracking/${trackingNumber}`);
      const data = await response.json();

      if (data.success) {
        setShipment(data.shipment);
        setHistory(data.history || []);
      } else {
        setError('Número de rastreo no encontrado');
      }
    } catch (error) {
      console.error('Error al cargar información de envío:', error);
      setError('Error al cargar información del envío');
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Pendiente',
      processing: 'Procesando',
      in_transit: 'En tránsito',
      delivered: 'Entregado',
      cancelled: 'Cancelado',
      central: 'En Central',
      en_mensajero: 'Enviado a Mensajero',
      en_camino: 'En Camino',
      entregado: 'Entregado',
      cancelado: 'Cancelado'
    };
    return labels[status] || status;
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending: 'Pendiente',
      processing: 'Procesando',
      in_transit: 'En tránsito',
      delivered: 'Entregado',
      cancelled: 'Cancelado',
      central: 'Central',
      en_mensajero: 'Mensajero',
      en_camino: 'En Camino',
      entregado: 'Entregado',
      cancelado: 'Cancelado'
    };
    return icons[status] || 'Estado';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('es-CR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="tracking-page">
        <div className="tracking-container">
          <div className="loading">Cargando información del envío...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tracking-page">
        <div className="tracking-container">
          <div className="tracking-error">
            <h2>{error}</h2>
            <p>Verifica el número de rastreo e intenta nuevamente</p>
          </div>
        </div>
      </div>
    );
  }

  const statusSteps = ['central', 'en_mensajero', 'en_camino', 'entregado'];
  const currentStepIndex = statusSteps.indexOf(shipment.status);

  return (
    <div className="tracking-page">
      <div className="tracking-container">
        <div className="tracking-header">
          <h1>Rastreo de Envío</h1>
          <p className="tracking-number">Número de rastreo: <strong>{trackingNumber}</strong></p>
        </div>

        <div className="tracking-status-card">
          <div className="status-current">
            <span className="status-icon-text">{getStatusIcon(shipment.status)}</span>
            <div>
              <h2>{getStatusLabel(shipment.status)}</h2>
              {shipment.estimated_delivery && (
                <p className="delivery-estimate">
                  Entrega estimada: {formatDate(shipment.estimated_delivery)}
                </p>
              )}
            </div>
          </div>

          <div className="status-timeline">
            {statusSteps.map((step, index) => {
              const isActive = index <= currentStepIndex;
              const isCurrent = index === currentStepIndex;
              
              return (
                <div key={step} className={`timeline-step ${isActive ? 'active' : ''} ${isCurrent ? 'current' : ''}`}>
                  <div className="timeline-dot">
                    {isActive && <span className="dot-text">{index + 1}</span>}
                  </div>
                  <div className="timeline-content">
                    <h3>{getStatusLabel(step)}</h3>
                    {(() => {
                      const columnMap = {
                        'central': 'central_at',
                        'en_mensajero': 'mensajero_at',
                        'en_camino': 'en_camino_at',
                        'entregado': 'entregado_at'
                      };
                      const column = columnMap[step];
                      return shipment[column] && (
                        <p className="timeline-date">{formatDate(shipment[column])}</p>
                      );
                    })()}
                  </div>
                  {index < statusSteps.length - 1 && <div className="timeline-line"></div>}
                </div>
              );
            })}
          </div>
        </div>

        {history.length > 0 && (
          <div className="tracking-history">
            <h3>Historial de Estados</h3>
            <div className="history-list">
              {history.map((item, index) => (
                <div key={index} className="history-item">
                  <span className="history-icon-text">{getStatusIcon(item.status)}</span>
                  <div className="history-content">
                    <p className="history-status">{getStatusLabel(item.status)}</p>
                    <p className="history-date">{formatDate(item.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackingPage;
