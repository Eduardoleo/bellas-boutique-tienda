import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserData, updateUserData, getPurchaseHistory, resendInvoice, downloadInvoiceDocument } from "../../services/users";
import { getPaymentMethods, deletePaymentMethod, setDefaultPaymentMethod } from "../../services/paymentMethods";
import { toast } from "../../utils/toast";
import { logout } from "../../utils/authHandler";
import ConfirmModal from "../../components/common/ConfirmModal";
import './Profile.css';
import {validPhone,phoneMessage} from '../../utils/contactValidation';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [showAddCard, setShowAddCard] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState({ show: false, cardId: null });
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      navigate('/login');
      return;
    }

    const userData = JSON.parse(storedUser);
    setUser(userData);
    setEditData(userData);

    // Solo cargar historial y métodos de pago para clientes
    if (userData.rol === 'Cliente') {
      loadPurchaseHistory();
      loadPaymentMethods();
    }
  }, [navigate]);

  const loadPurchaseHistory = async () => {
    try {
      const result = await getPurchaseHistory();
      if (result.success) {
        setPurchases(result.purchases);
      }
    } catch (error) {
      console.error('Error al cargar historial:', error);
    }
  };

  const loadPaymentMethods = async () => {
    try {
      const methods = await getPaymentMethods();
      setPaymentMethods(methods);
    } catch (error) {
      console.error('Error al cargar métodos de pago:', error);
    }
  };

  const handleLogout = () => {
    logout();
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async () => {
    if(!validPhone(editData.phone)){toast.error(phoneMessage);return;}
    try {
      const result = await updateUserData(user.id, editData);
      if (result.success) {
        const updatedUser = { ...editData, id: user.id };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setIsEditing(false);
        toast.success('Datos actualizados correctamente');
      } else {
        toast.error(result.message || 'Error al actualizar datos');
      }
    } catch (error) {
      toast.error('Error al actualizar datos');
    }
  };

  const handleCancel = () => {
    setEditData(user);
    setIsEditing(false);
  };

  const handleChange = (e) => {
    setEditData({
      ...editData,
      [e.target.name]: e.target.value
    });
  };

  const handleResendInvoice = async (purchaseId) => {
    try {
      const result = await resendInvoice(purchaseId);
      if (result.success) {
        toast.success('Factura reenviada a su correo electrónico');
      } else {
        toast.error(result.message || 'Error al reenviar factura');
      }
    } catch (error) {
      console.error('Error al reenviar factura:', error);
      toast.error('Error al reenviar factura');
    }
  };

  const handleDeleteCard = async (cardId) => {
    setConfirmDelete({ show: true, cardId });
  };

  const confirmDeleteCard = async () => {
    const { cardId } = confirmDelete;
    
    try {
      const result = await deletePaymentMethod(cardId);
      if (result.success) {
        toast.success('Tarjeta eliminada correctamente');
        loadPaymentMethods();
      } else {
        toast.error(result.message || 'Error al eliminar tarjeta');
      }
    } catch (error) {
      console.error('Error al eliminar tarjeta:', error);
      toast.error('Error al eliminar tarjeta');
    }
  };

  const handleSetDefaultCard = async (cardId) => {
    try {
      const result = await setDefaultPaymentMethod(cardId);
      if (result.success) {
        toast.success('Tarjeta predeterminada actualizada');
        loadPaymentMethods();
      } else {
        toast.error(result.message || 'Error al actualizar tarjeta');
      }
    } catch (error) {
      console.error('Error al actualizar tarjeta:', error);
      toast.error('Error al actualizar tarjeta');
    }
  };

  const maskCardNumber = (lastFour) => {
    return `•••• •••• •••• ${lastFour}`;
  };

  if (!user) return null;

  return (
    <div className="profile-page">
      <div className="profile-container">
        <div className="profile-header">
          <h2>Mi Perfil</h2>
          <button onClick={handleLogout} className="logout-btn">Cerrar Sesión</button>
        </div>

        {/* Panel de Administración */}
        {(user.rol === 'Administrador' || user.rol === 'Vendedor') && (
          <div className="admin-panel">
            <h3>Panel de Administración</h3>
            <p className="admin-role">Rol: <strong>{user.rol}</strong></p>
            <div className="admin-actions">
              <button className="admin-btn" onClick={() => navigate('/admin/users')}>
                Gestionar Usuarios
              </button>
              <button className="admin-btn" onClick={() => navigate('/admin/products')}>
                Gestionar Productos
              </button>
              <button className="admin-btn" onClick={() => navigate('/admin/categories')}>
                Gestionar Categorías
              </button>
              <button className="admin-btn" onClick={() => navigate('/admin/orders')}>
                Gestionar Pedidos
              </button>
              <button className="admin-btn" onClick={() => navigate('/admin/reports')}>
                Reportes
              </button>
              {user.rol === 'Administrador' && (
                <>
                  <button className="admin-btn" onClick={() => navigate('/admin/support')}>
                    Soporte
                  </button>
                  <button className="admin-btn" onClick={() => navigate('/admin/settings')}>
                    Configuración
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        <div className="profile-section">
          <h3>Información Personal</h3>
          {isEditing ? (
            <div className="profile-form">
              <div className="form-group">
                <label>Nombre:</label>
                <input
                  type="text"
                  name="name"
                  value={editData.name || ''}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label>Email:</label>
                <input
                  type="email"
                  name="email"
                  value={editData.email || ''}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label>Teléfono:</label>
                <input
                  type="tel"
                  name="phone" maxLength={24}
                  value={editData.phone || ''}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label>Dirección:</label>
                <input
                  type="text"
                  name="address"
                  value={editData.address || ''}
                  onChange={handleChange}
                />
              </div>
              <div className="edit-buttons">
                <button onClick={handleSave} className="save-btn">Guardar</button>
                <button onClick={handleCancel} className="cancel-btn">Cancelar</button>
              </div>
            </div>
          ) : (
            <div className="profile-info">
              <p><strong>Nombre:</strong> {user.name}</p>
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Teléfono:</strong> {user.phone || 'No especificado'}</p>
              <p><strong>Dirección:</strong> {user.address || 'No especificada'}</p>
              <button onClick={handleEdit} className="edit-btn">Editar información</button>
            </div>
          )}
        </div>

        {user.rol === 'Cliente' && (
          <>
            <div className="profile-section">
              <div className="section-header">
                <h3>Datos de Pago</h3>
                <button 
                  onClick={() => setShowAddCard(!showAddCard)} 
                  className="add-card-btn"
                >
                  {showAddCard ? 'Cancelar' : 'Agregar Tarjeta'}
                </button>
              </div>

              {showAddCard && (
                <div className="add-card-form">
                  <p className="info-message">
                    Para agregar una nueva tarjeta, realiza una compra y marca la opción "Guardar esta tarjeta para futuras compras"
                  </p>
                </div>
              )}

              {paymentMethods.length > 0 ? (
                <div className="payment-methods-list">
                  {paymentMethods.map((method) => (
                    <div key={method.id} className={`payment-card ${method.is_default ? 'default' : ''}`}>
                      <div className="card-info">
                        <div className="card-type">
                          {method.card_type === 'Visa' && 'Visa'}
                          {method.card_type === 'Mastercard' && 'Mastercard'}
                          {method.card_type === 'Amex' && 'American Express'}
                          {!['Visa', 'Mastercard', 'Amex'].includes(method.card_type) && method.card_type}
                        </div>
                        <div className="card-number">{maskCardNumber(method.card_last_four)}</div>
                        <div className="card-holder">{method.card_holder_name}</div>
                        <div className="card-expiry">Vence: {method.expiry_month}/{method.expiry_year}</div>
                        {method.is_default && <span className="default-badge">Predeterminada</span>}
                      </div>
                      <div className="card-actions">
                        {!method.is_default && (
                          <button 
                            onClick={() => handleSetDefaultCard(method.id)}
                            className="default-btn"
                            title="Establecer como predeterminada"
                          >
                            Predeterminada
                          </button>
                        )}
                        <button 
                          onClick={() => handleDeleteCard(method.id)}
                          className="delete-btn"
                          title="Eliminar tarjeta"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-payment-methods">
                  No tienes tarjetas guardadas. Las tarjetas se guardan al realizar una compra marcando la opción correspondiente.
                </p>
              )}
            </div>

            <div className="profile-section">
              <h3>Historial de Compras</h3>
              {purchases.length > 0 ? (
                <div className="purchase-history">
                  <table className="purchase-table">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Consecutivo</th>
                        <th>Productos</th>
                        <th>Total</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchases.map((purchase, index) => {
                        const fecha = new Date(purchase.fecha).toLocaleDateString('es-CR', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        });
                        const invoiceName = /^[A-Za-z0-9_-]+$/.test(purchase.consecutivo || '') ? `factura_${purchase.consecutivo}` : null;
                        const documents = invoiceName ? [['pdf',purchase.has_invoice_pdf],['xml',purchase.has_invoice_xml]].filter(([,available])=>available).map(([extension])=>({filename:`${invoiceName}.${extension}`,label:extension.toUpperCase()})) : [];
                        
                        return (
                          <tr key={index}>
                            <td>{fecha}</td>
                            <td>{purchase.consecutivo || 'N/A'}</td>
                            <td>{purchase.cantidad_productos} productos</td>
                            <td>₡{purchase.total.toLocaleString('es-CR', { minimumFractionDigits: 2 })}</td>
                            <td>
                              {purchase.tracking_number ? (
                                <a 
                                  href={`/tracking/${purchase.tracking_number}`}
                                  className="tracking-link"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  Ver Estado
                                </a>
                              ) : (
                                <span className="no-tracking">Sin seguimiento</span>
                              )}
                            </td>
                            <td>
                              <div className="invoice-actions">
                                {documents.length ? (
                                  <>
                                    {documents.map(({filename,label})=><button key={filename} type="button" className="pdf-button" onClick={async () => {
                                      let url;
                                      try { const blob=await downloadInvoiceDocument(filename);url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=filename;link.click(); }
                                      catch { toast.error('No se pudo descargar la factura'); }
                                      finally { if(url)setTimeout(()=>URL.revokeObjectURL(url),1000); }
                                    }}>Descargar {label}</button>)}
                                    <button
                                      onClick={() => handleResendInvoice(purchase.id)}
                                      className="resend-button"
                                      title="Reenviar factura por correo"
                                    >
                                      Reenviar Comprobante
                                    </button>
                                  </>
                                ) : (
                                  <span className="no-invoice">No disponible</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="no-purchases">No tienes compras registradas</p>
              )}
            </div>
          </>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmDelete.show}
        onClose={() => setConfirmDelete({ show: false, cardId: null })}
        onConfirm={confirmDeleteCard}
        title="¿Eliminar tarjeta?"
        message="Esta acción no se puede deshacer"
        confirmText="Eliminar"
        cancelText="Cancelar"
        danger={true}
      />
    </div>
  );
};

export default Profile;
