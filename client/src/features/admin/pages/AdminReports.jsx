import { API_URL } from '../../../app/config';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from "../../../utils/toast";
import { getCostaRicaDateString } from "../../../utils/dateUtils";
import './AdminReports.css';

// Helper para parsear fechas sin problemas de zona horaria
const parseLocalDate = (dateString) => {
  if (!dateString) return null;
  // Extraer solo la parte de fecha (YYYY-MM-DD) si viene con timestamp
  const datePart = dateString.split(/[T\s]/)[0];
  const [year, month, day] = datePart.split('-');
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = parseLocalDate(dateString);
  if (!date || isNaN(date.getTime())) return 'N/A';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const AdminReports = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reports, setReports] = useState({
    ventas: [],
    intentosLogin: [],
    bitacora: [],
    reportesDiarios: []
  });
  const [activeTab, setActiveTab] = useState('ventas');
  const [filters, setFilters] = useState({
    fechaInicio: '',
    fechaFin: '',
    productId: ''
  });
  const [selectedDate, setSelectedDate] = useState(() => {
    const crDate = getCostaRicaDateString();
    console.log('📅 AdminReports: Fecha inicial de Costa Rica:', crDate);
    return crDate;
  });

  useEffect(() => {
    console.log('🔄 AdminReports: Cargando reportes...');
    fetchReports();
  }, []);

  // Auto-actualizar el reporte del día actual cada 10 segundos
  useEffect(() => {
    if (activeTab !== 'diarios') return;

    const autoRefreshInterval = setInterval(() => {
      const token = localStorage.getItem('token');
      if (!token) return;

      const today = getCostaRicaDateString();
      
      // Generar reporte del día actual silenciosamente
      fetch(`${API_URL}/reports/generar-reporte-diario?fecha=${today}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          // Refrescar solo los reportes diarios sin mostrar toast
          fetchReports();
          console.log(`📊 Reporte del día ${today} actualizado automáticamente`);
        }
      })
      .catch(err => console.error('Error al auto-actualizar reporte:', err));
    }, 10000); // Cada 10 segundos

    return () => clearInterval(autoRefreshInterval);
  }, [activeTab]);

  // Auto-actualizar el reporte de intentos de login
  useEffect(() => {
    if (activeTab !== 'intentos') return;

    const autoRefreshInterval = setInterval(() => {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      console.log('🔄 Auto-actualizando intentos de login...');
      fetchReports(); // Llama a la función que refresca todos los reportes
    }, 5000); // Cada 5 segundos

    return () => clearInterval(autoRefreshInterval);
  }, [activeTab]);

  const fetchReports = async (showToast = false) => {
    try {
      if (showToast) setRefreshing(true);
      
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const cacheBuster = `?_=${new Date().getTime()}`;

      const [ventasRes, intentosRes, bitacoraRes, diariosRes] = await Promise.all([
        fetch(`${API_URL}/reports/ventas${cacheBuster}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_URL}/reports/intentos-login${cacheBuster}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_URL}/reports/bitacora${cacheBuster}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_URL}/reports/reportes-diarios${cacheBuster}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      const ventasData = await ventasRes.json();
      const intentosData = await intentosRes.json();
      const bitacoraData = await bitacoraRes.json();
      const diariosData = await diariosRes.json();

      setReports({
        ventas: ventasData.success ? ventasData.ventas : [],
        intentosLogin: intentosData.success ? intentosData.intentos : [],
        bitacora: bitacoraData.success ? bitacoraData.bitacora : [],
        reportesDiarios: diariosData.success ? diariosData.reportes : []
      });
      
      if (showToast) {
        toast.success('✅ Reportes actualizados correctamente');
      }
    } catch (error) {
      console.error('Error al cargar reportes:', error);
      toast.error('Error al cargar reportes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const generateDailyReport = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_URL}/reports/generar-reporte-diario?fecha=${selectedDate}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        toast.success(`Reporte del ${formatDate(selectedDate)} generado/actualizado exitosamente`);
        fetchReports();
      } else {
        toast.error(data.message || 'Error al generar reporte');
      }
    } catch (error) {
      console.error('Error al generar reporte:', error);
      toast.error('Error al generar reporte diario');
    }
  };

  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) {
      toast.error('No hay datos para exportar');
      return;
    }

    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).map(val => `"${val}"`).join(',')).join('\n');
    const csv = `${headers}\n${rows}`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${getCostaRicaDateString()}.csv`;
    a.click();
  };

  if (loading) {
    return <div className="admin-loading">Cargando reportes...</div>;
  }

  return (
    <div className="admin-reports-page">
      <div className="admin-reports-container">
        <div className="admin-reports-header">
          <button onClick={() => navigate('/profile')} className="back-btn">Volver</button>
          <h2>Reportes y Analítica</h2>
        </div>

        <div className="tabs-container">
          <button
            className={`tab-btn ${activeTab === 'ventas' ? 'active' : ''}`}
            onClick={() => setActiveTab('ventas')}
          >
            Ventas
          </button>
          <button
            className={`tab-btn ${activeTab === 'intentos' ? 'active' : ''}`}
            onClick={() => setActiveTab('intentos')}
          >
            Intentos de login
          </button>
          <button
            className={`tab-btn ${activeTab === 'bitacora' ? 'active' : ''}`}
            onClick={() => setActiveTab('bitacora')}
          >
            Bitácora
          </button>
          <button
            className={`tab-btn ${activeTab === 'diarios' ? 'active' : ''}`}
            onClick={() => setActiveTab('diarios')}
          >
            Reportes diarios
          </button>
        </div>

        {activeTab === 'ventas' && (
          <div className="tab-content">
            <div className="content-header">
              <h3>Historial de ventas</h3>
              <button onClick={() => exportToCSV(reports.ventas, 'ventas')} className="export-btn">
                Exportar CSV
              </button>
            </div>
            <div className="stats-summary">
              <div className="summary-card">
                <span className="summary-label">Total ventas</span>
                <span className="summary-value">{reports.ventas.length}</span>
              </div>
              <div className="summary-card">
                <span className="summary-label">Productos vendidos</span>
                <span className="summary-value">
                  {reports.ventas.reduce((sum, v) => sum + v.cantidad, 0)}
                </span>
              </div>
              <div className="summary-card">
                <span className="summary-label">Ingresos totales</span>
                <span className="summary-value">
                  ₡{(() => {
                    // Obtener purchases únicos y sumar sus totales (incluye productos + envío)
                    const uniquePurchases = {};
                    reports.ventas.forEach(v => {
                      if (v.purchase_id && v.total_amount && !uniquePurchases[v.purchase_id]) {
                        uniquePurchases[v.purchase_id] = parseFloat(v.total_amount);
                      }
                    });
                    const total = Object.values(uniquePurchases).reduce((sum, amt) => sum + amt, 0);
                    return total.toFixed(2);
                  })()}
                </span>
              </div>
            </div>
            <div className="table-container">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>ID venta</th>
                    <th>Pedido</th>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Precio unitario</th>
                    <th>Total</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.ventas.map(venta => (
                    <tr key={venta.id}>
                      <td>#{venta.id}</td>
                      <td>#{venta.purchase_id}</td>
                      <td>{venta.product_name}</td>
                      <td>{venta.cantidad}</td>
                      <td>₡{parseFloat(venta.precio_unitario).toFixed(2)}</td>
                      <td>₡{(venta.cantidad * parseFloat(venta.precio_unitario)).toFixed(2)}</td>
                      <td>{formatDate(venta.fecha_venta)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'intentos' && (
          <div className="tab-content">
            <div className="content-header">
              <h3>Intentos de inicio de sesión</h3>
              <button onClick={() => exportToCSV(reports.intentosLogin, 'intentos_login')} className="export-btn">
                Exportar CSV
              </button>
            </div>
            <div className="stats-summary">
              <div className="summary-card">
                <span className="summary-label">Total intentos</span>
                <span className="summary-value">{reports.intentosLogin.length}</span>
              </div>
              <div className="summary-card success">
                <span className="summary-label">Exitosos</span>
                <span className="summary-value">
                  {reports.intentosLogin.filter(i => i.exitoso).length}
                </span>
              </div>
              <div className="summary-card error">
                <span className="summary-label">Fallidos</span>
                <span className="summary-value">
                  {reports.intentosLogin.filter(i => !i.exitoso).length}
                </span>
              </div>
            </div>
            <div className="table-container">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Email</th>
                    <th>Resultado</th>
                    <th>IP</th>
                    <th>Navegador</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.intentosLogin.map(intento => (
                    <tr key={intento.id}>
                      <td>#{intento.id}</td>
                      <td>{intento.email}</td>
                      <td>
                        <span className={`badge ${intento.exitoso ? 'success' : 'error'}`}>
                          {intento.exitoso ? 'Exitoso' : 'Fallido'}
                        </span>
                      </td>
                      <td>{intento.ip_address || 'N/A'}</td>
                      <td className="user-agent">{intento.user_agent || 'N/A'}</td>
                      <td>{intento.fecha_intento}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'bitacora' && (
          <div className="tab-content">
            <div className="content-header">
              <h3>Bitácora de actividades</h3>
              <button onClick={() => exportToCSV(reports.bitacora, 'bitacora')} className="export-btn">
                Exportar CSV
              </button>
            </div>
            <div className="table-container">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Usuario</th>
                    <th>Acción</th>
                    <th>Tabla</th>
                    <th>Registro ID</th>
                    <th>Descripción</th>
                    <th>IP</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.bitacora.map(log => (
                    <tr key={log.id}>
                      <td>#{log.id}</td>
                      <td>{log.user_name || 'Sistema'}</td>
                      <td>
                        <span className="action-badge">{log.accion}</span>
                      </td>
                      <td>{log.tabla_afectada || 'N/A'}</td>
                      <td>{log.registro_id || 'N/A'}</td>
                      <td className="description">{log.descripcion}</td>
                      <td>{log.ip_address || 'N/A'}</td>
                      <td>{log.fecha}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'diarios' && (
          <div className="tab-content">
            <div className="report-controls-section">
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="date-picker"
                max={getCostaRicaDateString()}
              />
              <button onClick={generateDailyReport} className="generate-btn">
                Generar reporte
              </button>
              <button 
                onClick={() => fetchReports(true)} 
                className="refresh-btn" 
                title="Actualizar reportes"
                disabled={refreshing}
              >
                {refreshing ? 'Actualizando...' : 'Actualizar'}
              </button>
            </div>
            <div className="content-header">
              <h3>Reportes diarios generados</h3>
              <button onClick={() => exportToCSV(reports.reportesDiarios, 'reportes_diarios')} className="export-btn">
                Exportar CSV
              </button>
            </div>
            {reports.reportesDiarios.length === 0 ? (
              <div className="no-data">
                <p>No hay reportes diarios generados</p>
                <button onClick={generateDailyReport} className="generate-btn-secondary">
                  Generar reporte de hoy
                </button>
              </div>
            ) : (
              <div className="daily-reports-grid">
                {reports.reportesDiarios
                  .sort((a, b) => b.fecha.localeCompare(a.fecha))
                  .map((reporte, index) => {
                    const todayDate = getCostaRicaDateString();
                    const isToday = reporte.fecha === todayDate;
                    
                    if (index === 0) {
                      console.log('🔍 Verificando fecha HOY:');
                      console.log('  Reporte fecha:', reporte.fecha);
                      console.log('  Fecha CR hoy:', todayDate);
                      console.log('  ¿Es hoy?:', isToday);
                    }
                    
                    // Parsear fecha como local, no UTC (agregar "T00:00:00" evita problemas de zona horaria)
                    const [year, month, day] = reporte.fecha.split('-');
                    const reportDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                    const displayDate = `${day}/${month}/${year}`;
                    
                    return (
                      <div key={reporte.id} className={`daily-report-card ${isToday ? 'today-report' : ''}`}>
                        <div className="report-date">
                          {displayDate}
                          {isToday && <span className="today-badge">HOY</span>}
                          {index === 0 && !isToday && <span className="recent-badge">MÁS RECIENTE</span>}
                        </div>
                        <div className="report-stats">
                          <div className="report-stat">
                            <span className="stat-label">Productos vendidos</span>
                            <span className="stat-value">{reporte.cantidad_productos_vendidos}</span>
                          </div>
                          <div className="report-stat">
                            <span className="stat-label">Ingresos</span>
                            <span className="stat-value">₡{parseFloat(reporte.ingresos_totales).toFixed(2)}</span>
                          </div>
                        </div>
                        {reporte.productos_stock_bajo && (
                          <div className="stock-warning">
                            <strong>Productos con stock bajo:</strong>
                            <p>{reporte.productos_stock_bajo}</p>
                          </div>
                        )}
                        <div className="report-footer">
                          Generado: {reporte.generado_at || reporte.updated_at ? 
                            new Date(reporte.generado_at || reporte.updated_at).toLocaleString('es-CR', {
                              timeZone: 'America/Costa_Rica',
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                              hour12: false
                            }) : 'N/A'}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminReports;
