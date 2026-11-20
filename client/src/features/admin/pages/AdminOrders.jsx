import { API_URL } from '../../../app/config';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from "../../../utils/toast";
import './AdminOrders.css';

const AdminOrders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    search: ''
  });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch(`${API_URL}/reports/purchases`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }

      const data = await response.json();
      if (data.success) {
        setOrders(data.purchases);
      }
    } catch (error) {
      console.error('Error al cargar pedidos:', error);
      toast.error('Error al cargar pedidos');
    } finally {
      setLoading(false);
    }
  };

  const viewOrderDetails = async (orderId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/reports/purchases/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setSelectedOrder(data.purchase);
        setShowModal(true);
      }
    } catch (error) {
      console.error('Error al cargar detalles del pedido:', error);
      toast.error('Error al cargar detalles del pedido');
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/reports/purchases/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Estado del pedido actualizado');
        fetchOrders();
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder({...selectedOrder, status: newStatus});
        }
      }
    } catch (error) {
      console.error('Error al actualizar estado:', error);
      toast.error('Error al actualizar estado del pedido');
    }
  };

  const updateShippingStatus = async (orderId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      
      // Actualizar optimísticamente el estado local primero
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { ...order, shipping_status: newStatus }
            : order
        )
      );

      const response = await fetch(`${API_URL}/reports/purchases/${orderId}/shipping-status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Estado de envío actualizado');
        // Refrescar desde el servidor para confirmar
        await fetchOrders();
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder({...selectedOrder, shipping_status: newStatus});
        }
      } else {
        // Si falla, revertir el cambio optimista
        await fetchOrders();
        toast.error(data.message || 'Error al actualizar estado de envío');
      }
    } catch (error) {
      console.error('Error al actualizar estado de envío:', error);
      // Revertir el cambio optimista
      await fetchOrders();
      toast.error('Error al actualizar estado de envío');
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchStatus = !filters.status || (order.shipping_status || 'central') === filters.status;
    const matchSearch = !filters.search || 
      order.id.toString().includes(filters.search) ||
      order.user_email.toLowerCase().includes(filters.search.toLowerCase()) ||
      order.user_name.toLowerCase().includes(filters.search.toLowerCase());
    
    return matchStatus && matchSearch;
  });

  if (loading) {
    return <div className="admin-loading">Cargando pedidos...</div>;
  }

  return (
    <div className="admin-orders-page">
      <div className="admin-orders-container">
        <div className="admin-orders-header">
          <button onClick={() => navigate('/profile')} className="back-btn">Volver</button>
          <h2>Gestión de pedidos</h2>
        </div>

        <div className="filters-section">
          <input
            type="text"
            placeholder="Buscar por ID, email o nombre..."
            value={filters.search}
            onChange={(e) => setFilters({...filters, search: e.target.value})}
            className="search-input"
          />
          
          <select
            value={filters.status}
            onChange={(e) => setFilters({...filters, status: e.target.value})}
            className="filter-select"
          >
            <option value="">Todos los estados</option>
            <option value="central">En Central</option>
            <option value="en_mensajero">En Mensajero</option>
            <option value="en_camino">En Camino</option>
            <option value="entregado">Entregado</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>

        <div className="orders-stats">
          <div className="stat-card">
            <span className="stat-number">{orders.length}</span>
            <span className="stat-label">Total pedidos</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{orders.filter(o => (o.shipping_status || 'central') === 'entregado').length}</span>
            <span className="stat-label">Completados</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{orders.filter(o => (o.shipping_status || 'central') === 'central').length}</span>
            <span className="stat-label">Pendientes</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">₡{orders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0).toFixed(2)}</span>
            <span className="stat-label">Ingresos totales</span>
          </div>
        </div>

        <div className="orders-table-container">
          <table className="orders-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Cliente</th>
                <th>Email</th>
                <th>Total</th>
                <th>Método de pago</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(order => (
                <tr key={order.id}>
                  <td>#{order.id}</td>
                  <td>{order.user_name}</td>
                  <td>{order.user_email}</td>
                  <td className="order-total">₡{parseFloat(order.total_amount).toFixed(2)}</td>
                  <td>
                    <span className="payment-badge">
                      {order.payment_method || 'n/a'}
                    </span>
                  </td>
                  <td>
                    <select
                      value={order.shipping_status || 'central'}
                      onChange={(e) => updateShippingStatus(order.id, e.target.value)}
                      className={`status-select ${order.shipping_status || 'central'}`}
                      disabled={order.shipping_status === 'entregado' || order.shipping_status === 'cancelado'}
                    >
                      <option value="central">En Central</option>
                      <option value="en_mensajero">En Mensajero</option>
                      <option value="en_camino">En Camino</option>
                      <option value="entregado">Entregado</option>
                      <option value="cancelado">Cancelado</option>
                    </select>
                  </td>
                  <td>{new Date(order.created_at).toLocaleDateString()}</td>
                  <td>
                    <button
                      onClick={() => viewOrderDetails(order.id)}
                      className="action-btn view-btn"
                    >
                      Ver detalles
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && selectedOrder && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content order-details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Detalles del pedido #{selectedOrder.id}</h3>
              <button onClick={() => setShowModal(false)} className="close-modal-btn">×</button>
            </div>
            <div className="order-details">
              <div className="detail-section">
                <h4>Información del cliente</h4>
                <p><strong>Nombre:</strong> {selectedOrder.user_name}</p>
                <p><strong>Email:</strong> {selectedOrder.user_email}</p>
                <p><strong>Teléfono:</strong> {selectedOrder.user_phone || 'N/A'}</p>
                <p><strong>Dirección:</strong> {selectedOrder.user_address || 'N/A'}</p>
              </div>
              <div className="detail-section">
                <h4>Información del pedido</h4>
                <p><strong>Fecha:</strong> {new Date(selectedOrder.created_at).toLocaleString()}</p>
                <p><strong>Método de pago:</strong> {selectedOrder.payment_method || 'N/A'}</p>
                <p><strong>Estado de envío:</strong> 
                  <select
                    value={selectedOrder.shipping_status || 'central'}
                    onChange={(e) => updateShippingStatus(selectedOrder.id, e.target.value)}
                    className={`status-badge ${selectedOrder.shipping_status || 'central'}`}
                    disabled={selectedOrder.shipping_status === 'entregado' || selectedOrder.shipping_status === 'cancelado'}
                  >
                    <option value="central">En Central</option>
                    <option value="en_mensajero">En Mensajero</option>
                    <option value="en_camino">En Camino</option>
                    <option value="entregado">Entregado</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </p>
                {selectedOrder.tracking_number && (
                  <p><strong>Número de rastreo:</strong> {selectedOrder.tracking_number}</p>
                )}
              </div>
              <div className="detail-section">
                <h4>Productos</h4>
                <div className="order-items">
                  {selectedOrder.items && selectedOrder.items.map((item, index) => (
                    <div key={index} className="order-item">
                      <img src={item.image_url} alt={item.name} className="item-image" />
                      <div className="item-info">
                        <p className="item-name">{item.producto_nombre}</p>
                        <p className="item-details">Cantidad: {item.quantity} × ₡{parseFloat(item.price).toFixed(2)}</p>
                        <p className="item-total">Subtotal: ₡{(item.quantity * parseFloat(item.price)).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="detail-section order-total-section">
                <h4>Total del pedido</h4>
                <p className="total-amount">₡{parseFloat(selectedOrder.total_amount).toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrders;
