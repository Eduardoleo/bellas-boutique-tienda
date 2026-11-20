import { API_URL } from '../../../app/config';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from "../../../utils/toast";
import ConfirmModal from "../../../components/common/ConfirmModal";
import './AdminSupport.css';

const AdminSupport = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('encuestas');
  const [data, setData] = useState({
    encuestas: [],
    sugerencias: [],
    faqs: []
  });
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [formData, setFormData] = useState({});
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedSugerencia, setSelectedSugerencia] = useState(null);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [confirmDelete, setConfirmDelete] = useState({ show: false, faqId: null });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const [encuestasRes, sugerenciasRes, faqsRes] = await Promise.all([
        fetch(`${API_URL}/support/encuestas/all`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_URL}/support/sugerencias/all`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_URL}/support/faqs`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      const encuestasData = await encuestasRes.json();
      const sugerenciasData = await sugerenciasRes.json();
      const faqsData = await faqsRes.json();

      setData({
        encuestas: encuestasData.success ? encuestasData.encuestas : [],
        sugerencias: sugerenciasData.success ? sugerenciasData.sugerencias : [],
        faqs: faqsData.success ? faqsData.faqs : []
      });
    } catch (error) {
      console.error('Error al cargar datos:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFAQ = () => {
    setModalType('createFAQ');
    setFormData({ pregunta: '', respuesta: '', categoria: '', orden: 0 });
    setShowModal(true);
  };

  const handleEditFAQ = (faq) => {
    setModalType('editFAQ');
    setFormData(faq);
    setShowModal(true);
  };

  const handleSaveFAQ = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const url = modalType === 'createFAQ' 
        ? `${API_URL}/support/faqs`
        : `${API_URL}/support/faqs/${formData.id}`;
      
      const method = modalType === 'createFAQ' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (data.success) {
        toast.success(modalType === 'createFAQ' ? 'FAQ creada exitosamente' : 'FAQ actualizada exitosamente');
        setShowModal(false);
        fetchData();
      } else {
        toast.error(data.message || 'Error al guardar FAQ');
      }
    } catch (error) {
      console.error('Error al guardar FAQ:', error);
      toast.error('Error al guardar FAQ');
    }
  };

  const handleDeleteFAQ = async (faqId) => {
    setConfirmDelete({ show: true, faqId });
  };

  const confirmDeleteFAQ = async () => {
    const { faqId } = confirmDelete;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/support/faqs/${faqId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        toast.success('FAQ eliminada exitosamente');
        fetchData();
      }
    } catch (error) {
      console.error('Error al eliminar FAQ:', error);
      toast.error('Error al eliminar FAQ');
    }
  };

  const handleUpdateSugerenciaEstado = async (id, estado, sugerencia) => {
    // Si es rechazo, mostrar modal de motivo
    if (estado === 'Rechazada') {
      setSelectedSugerencia(sugerencia);
      setMotivoRechazo('');
      setShowRejectModal(true);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/support/sugerencias/${id}/estado`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ estado })
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Estado actualizado');
        fetchData();
      }
    } catch (error) {
      console.error('Error al actualizar estado:', error);
      toast.error('Error al actualizar estado');
    }
  };

  const handleConfirmRechazo = async () => {
    if (!motivoRechazo) {
      toast.error('Debe seleccionar un motivo de rechazo');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/support/sugerencias/${selectedSugerencia.id}/rechazar`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ motivo: motivoRechazo })
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Sugerencia rechazada y correo enviado al cliente');
        setShowRejectModal(false);
        setSelectedSugerencia(null);
        setMotivoRechazo('');
        fetchData();
      } else {
        toast.error(data.message || 'Error al rechazar sugerencia');
      }
    } catch (error) {
      console.error('Error al rechazar sugerencia:', error);
      toast.error('Error al rechazar sugerencia');
    }
  };

  if (loading) {
    return <div className="admin-loading">cargando datos...</div>;
  }

  return (
    <div className="admin-support-page">
      <div className="admin-support-container">
        <div className="admin-support-header">
          <button onClick={() => navigate('/profile')} className="back-btn">Volver</button>
          <h2>Gestión de soporte</h2>
        </div>

        <div className="tabs-container">
          <button
            className={`tab-btn ${activeTab === 'encuestas' ? 'active' : ''}`}
            onClick={() => setActiveTab('encuestas')}
          >
            Encuestas
          </button>
          <button
            className={`tab-btn ${activeTab === 'sugerencias' ? 'active' : ''}`}
            onClick={() => setActiveTab('sugerencias')}
          >
            Sugerencias
          </button>
          <button
            className={`tab-btn ${activeTab === 'faqs' ? 'active' : ''}`}
            onClick={() => setActiveTab('faqs')}
          >
            FAQs
          </button>
        </div>

        {activeTab === 'encuestas' && (
          <div className="tab-content">
            <div className="content-header">
              <h3>Encuestas de satisfacción</h3>
            </div>
            <div className="stats-summary">
              <div className="summary-card">
                <span className="summary-label">total encuestas</span>
                <span className="summary-value">{data.encuestas.length}</span>
              </div>
              <div className="summary-card">
                <span className="summary-label">promedio puntuación</span>
                <span className="summary-value">
                  {data.encuestas.length > 0
                    ? (data.encuestas.reduce((sum, e) => sum + e.puntuacion, 0) / data.encuestas.length).toFixed(1)
                    : '0'}
                </span>
              </div>
            </div>
            <div className="encuestas-grid">
              {data.encuestas.map(encuesta => (
                <div key={encuesta.id} className="encuesta-card">
                  <div className="encuesta-header">
                    <span className="encuesta-user">{encuesta.user_name}</span>
                    <span className="encuesta-rating">{'★'.repeat(encuesta.puntuacion)}</span>
                  </div>
                  <p className="encuesta-comment">{encuesta.comentario}</p>
                  <div className="encuesta-footer">
                    <span>{new Date(encuesta.fecha).toLocaleDateString()}</span>
                    {encuesta.purchase_id && <span>pedido #{encuesta.purchase_id}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'sugerencias' && (
          <div className="tab-content">
            <div className="content-header">
              <h3>Sugerencias de usuarios</h3>
            </div>
            <div className="sugerencias-list">
              {data.sugerencias.map(sugerencia => (
                <div key={sugerencia.id} className="sugerencia-card">
                  <div className="sugerencia-header">
                    <h4>{sugerencia.titulo}</h4>
                    <select
                      value={sugerencia.estado}
                      onChange={(e) => handleUpdateSugerenciaEstado(sugerencia.id, e.target.value, sugerencia)}
                      className={`estado-select ${sugerencia.estado.toLowerCase().replace(' ', '-')}`}
                    >
                      <option value="Pendiente">pendiente</option>
                      <option value="En Revision">en revisión</option>
                      <option value="Implementada">implementada</option>
                      <option value="Rechazada">rechazada</option>
                    </select>
                  </div>
                  <p className="sugerencia-description">{sugerencia.descripcion}</p>
                  <div className="sugerencia-footer">
                    <span>por: {sugerencia.user_name}</span>
                    <span>{new Date(sugerencia.fecha).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'faqs' && (
          <div className="tab-content">
            <div className="content-header">
              <h3>Preguntas frecuentes</h3>
              <button onClick={handleCreateFAQ} className="create-btn">Nueva FAQ</button>
            </div>
            <div className="faqs-list">
              {data.faqs.map(faq => (
                <div key={faq.id} className="faq-card">
                  <div className="faq-header">
                    <h4>{faq.pregunta}</h4>
                    <div className="faq-actions">
                      <button onClick={() => handleEditFAQ(faq)} className="edit-btn">Editar</button>
                      <button onClick={() => handleDeleteFAQ(faq.id)} className="delete-btn">Eliminar</button>
                    </div>
                  </div>
                  <p className="faq-answer">{faq.respuesta}</p>
                  <div className="faq-footer">
                    {faq.categoria && <span className="faq-category">{faq.categoria}</span>}
                    <span>orden: {faq.orden}</span>
                    <span className={`faq-status ${faq.activo ? 'active' : 'inactive'}`}>
                      {faq.activo ? 'activa' : 'inactiva'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{modalType === 'createFAQ' ? 'Nueva FAQ' : 'Editar FAQ'}</h3>
              <button onClick={() => setShowModal(false)} className="close-modal-btn">×</button>
            </div>
            <form onSubmit={handleSaveFAQ}>
              <div className="form-group">
                <label>pregunta</label>
                <input
                  type="text"
                  value={formData.pregunta}
                  onChange={(e) => setFormData({...formData, pregunta: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>respuesta</label>
                <textarea
                  value={formData.respuesta}
                  onChange={(e) => setFormData({...formData, respuesta: e.target.value})}
                  rows="4"
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>categoría</label>
                  <input
                    type="text"
                    value={formData.categoria}
                    onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                    placeholder="general, pagos, envíos..."
                  />
                </div>
                <div className="form-group">
                  <label>orden</label>
                  <input
                    type="number"
                    value={formData.orden}
                    onChange={(e) => setFormData({...formData, orden: parseInt(e.target.value)})}
                    min="0"
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowModal(false)} className="cancel-btn">
                  Cancelar
                </button>
                <button type="submit" className="save-btn">
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRejectModal && (
        <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="modal-content reject-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Motivo de rechazo</h3>
              <button onClick={() => setShowRejectModal(false)} className="close-modal-btn">×</button>
            </div>
            <div className="reject-modal-body">
              <p className="reject-info">
                está por rechazar la sugerencia: <strong>"{selectedSugerencia?.titulo}"</strong>
              </p>
              <p className="reject-warning">
                se enviará un correo al cliente explicando el motivo del rechazo.
              </p>
              
              <div className="form-group">
                <label>seleccione el motivo de rechazo</label>
                <select 
                  value={motivoRechazo}
                  onChange={(e) => setMotivoRechazo(e.target.value)}
                  className="motivo-select"
                >
                  <option value="">-- seleccione un motivo --</option>
                  <option value="No se alinea con los objetivos del negocio">No se alinea con los objetivos del negocio</option>
                  <option value="Sugerencia duplicada o ya implementada">Sugerencia duplicada o ya implementada</option>
                  <option value="No es viable técnicamente en este momento">No es viable técnicamente en este momento</option>
                  <option value="Requiere recursos que no están disponibles">Requiere recursos que no están disponibles</option>
                  <option value="No aporta valor significativo a la experiencia del cliente">No aporta valor significativo a la experiencia del cliente</option>
                  <option value="Fuera del alcance de nuestra plataforma">Fuera del alcance de nuestra plataforma</option>
                </select>
              </div>

              {motivoRechazo && (
                <div className="preview-email">
                  <h4>vista previa del correo:</h4>
                  <div className="email-preview">
                    <p><strong>Estimado/a cliente,</strong></p>
                    <p>Gracias por tomarse el tiempo en enviarnos su sugerencia, pero en esta ocasión hemos decidido rechazarla por:</p>
                    <p className="motivo-destacado">"{motivoRechazo}"</p>
                    <p>Saludos,</p>
                    <p><strong>Cordialmente equipo de mejora continua</strong><br/>Bellas Boutique</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="modal-actions">
              <button 
                type="button" 
                onClick={() => setShowRejectModal(false)} 
                className="cancel-btn"
              >
                Cancelar
              </button>
              <button 
                type="button"
                onClick={handleConfirmRechazo}
                className="reject-confirm-btn"
                disabled={!motivoRechazo}
              >
                Rechazar y enviar correo
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmDelete.show}
        onClose={() => setConfirmDelete({ show: false, faqId: null })}
        onConfirm={confirmDeleteFAQ}
        title="¿Eliminar FAQ?"
        message="Esta pregunta frecuente se eliminará permanentemente"
        confirmText="Eliminar"
        cancelText="Cancelar"
        danger={true}
      />
    </div>
  );
};

export default AdminSupport;
