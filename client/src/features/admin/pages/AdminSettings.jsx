import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from "../../../utils/toast";
import './AdminSettings.css';

const AdminSettings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  // Estado para configuraciones de tema
  const [theme, setTheme] = useState({
    primaryColor: '#64D7DB',
    secondaryColor: '#5ac5c9',
    accentColor: '#ff6b9d',
    fontFamily: 'Inter, system-ui, sans-serif'
  });

  // Estado para configuraciones de correo
  const [emailConfig, setEmailConfig] = useState({
    smtpHost: 'smtp.gmail.com',
    smtpPort: '587',
    smtpUser: 'info@bellasboutique.cr',
    smtpPassword: '',
    fromName: 'Bellas Boutique',
    fromEmail: 'info@bellasboutique.cr',
    replyToEmail: 'support@bellasboutique.cr'
  });

  // Estado para mensajes personalizados
  const [messages, setMessages] = useState({
    welcomeMessage: '¡Bienvenido a Bellas Boutique! Encuentra la moda que buscas.',
    orderConfirmation: 'Gracias por tu compra. Tu pedido ha sido confirmado.',
    shippingNotification: 'Tu pedido está en camino. Pronto lo recibirás.',
    lowStockAlert: 'Producto con stock bajo. ¡Apresúrate antes de que se agote!',
    outOfStockMessage: 'Lo sentimos, este producto está agotado temporalmente.',
    footerText: '© 2025 Bellas Boutique. Todos los derechos reservados.'
  });

  useEffect(() => {
    // Cargar configuraciones guardadas
    const savedTheme = localStorage.getItem('adminTheme');
    const savedEmailConfig = localStorage.getItem('adminEmailConfig');
    const savedMessages = localStorage.getItem('adminMessages');

    if (savedTheme) setTheme(JSON.parse(savedTheme));
    if (savedEmailConfig) setEmailConfig(JSON.parse(savedEmailConfig));
    if (savedMessages) setMessages(JSON.parse(savedMessages));
  }, []);

  const handleThemeChange = (e) => {
    const { name, value } = e.target;
    setTheme(prev => ({ ...prev, [name]: value }));
  };

  const handleEmailChange = (e) => {
    const { name, value } = e.target;
    setEmailConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleMessageChange = (e) => {
    const { name, value } = e.target;
    setMessages(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setLoading(true);
    
    try {
      // Guardar en localStorage (en producción esto iría al backend)
      localStorage.setItem('adminTheme', JSON.stringify(theme));
      localStorage.setItem('adminEmailConfig', JSON.stringify(emailConfig));
      localStorage.setItem('adminMessages', JSON.stringify(messages));
      
      // Aplicar tema inmediatamente
      document.documentElement.style.setProperty('--primary-color', theme.primaryColor);
      document.documentElement.style.setProperty('--secondary-color', theme.secondaryColor);
      document.documentElement.style.setProperty('--accent-color', theme.accentColor);
      document.documentElement.style.setProperty('--font-family', theme.fontFamily);
      
      toast.success('✅ Configuración guardada exitosamente');
    } catch (error) {
      console.error('Error al guardar configuración:', error);
      toast.error('❌ Error al guardar la configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleResetTheme = () => {
    const defaultTheme = {
      primaryColor: '#64D7DB',
      secondaryColor: '#5ac5c9',
      accentColor: '#ff6b9d',
      fontFamily: 'Inter, system-ui, sans-serif'
    };
    setTheme(defaultTheme);
    toast.success('Tema restablecido a valores predeterminados');
  };

  return (
    <div className="admin-settings-page">
      <div className="admin-settings-container">
        <div className="admin-settings-header">
          <button onClick={() => navigate('/profile')} className="back-btn">
            Volver
          </button>
          <h2>Configuración del Sistema</h2>
        </div>

        <div className="settings-content">
          
          {/* SECCIÓN: TEMA DE LA PÁGINA */}
          <div className="settings-section">
            <div className="section-header">
              <h3>Tema de la Página</h3>
            </div>
            <div className="settings-grid">
              <div className="form-group">
                <label>Color Primario</label>
                <div className="color-input-wrapper">
                  <input
                    type="color"
                    name="primaryColor"
                    value={theme.primaryColor}
                    onChange={handleThemeChange}
                  />
                  <input
                    type="text"
                    value={theme.primaryColor}
                    onChange={(e) => setTheme(prev => ({ ...prev, primaryColor: e.target.value }))}
                    placeholder="#64D7DB"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Color Secundario</label>
                <div className="color-input-wrapper">
                  <input
                    type="color"
                    name="secondaryColor"
                    value={theme.secondaryColor}
                    onChange={handleThemeChange}
                  />
                  <input
                    type="text"
                    value={theme.secondaryColor}
                    onChange={(e) => setTheme(prev => ({ ...prev, secondaryColor: e.target.value }))}
                    placeholder="#5ac5c9"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Color de Acento</label>
                <div className="color-input-wrapper">
                  <input
                    type="color"
                    name="accentColor"
                    value={theme.accentColor}
                    onChange={handleThemeChange}
                  />
                  <input
                    type="text"
                    value={theme.accentColor}
                    onChange={(e) => setTheme(prev => ({ ...prev, accentColor: e.target.value }))}
                    placeholder="#ff6b9d"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Fuente del Sitio</label>
                <select name="fontFamily" value={theme.fontFamily} onChange={handleThemeChange}>
                  <option value="Inter, system-ui, sans-serif">Inter (Moderna)</option>
                  <option value="Roboto, sans-serif">Roboto</option>
                  <option value="Poppins, sans-serif">Poppins</option>
                  <option value="Montserrat, sans-serif">Montserrat</option>
                  <option value="Open Sans, sans-serif">Open Sans</option>
                </select>
              </div>
            </div>
            <button onClick={handleResetTheme} className="reset-theme-btn">
              Restablecer Tema Predeterminado
            </button>
          </div>

          {/* SECCIÓN: CONFIGURACIÓN DE CORREO */}
          <div className="settings-section">
            <div className="section-header">
              <h3>Configuración de Correo Electrónico</h3>
            </div>
            <div className="settings-grid">
              <div className="form-group">
                <label>Servidor SMTP</label>
                <input
                  type="text"
                  name="smtpHost"
                  value={emailConfig.smtpHost}
                  onChange={handleEmailChange}
                  placeholder="smtp.gmail.com"
                />
                <small>Servidor de correo saliente</small>
              </div>

              <div className="form-group">
                <label>Puerto SMTP</label>
                <input
                  type="number"
                  name="smtpPort"
                  value={emailConfig.smtpPort}
                  onChange={handleEmailChange}
                  placeholder="587"
                />
                <small>Puerto del servidor (587 para TLS, 465 para SSL)</small>
              </div>

              <div className="form-group">
                <label>Usuario SMTP</label>
                <input
                  type="email"
                  name="smtpUser"
                  value={emailConfig.smtpUser}
                  onChange={handleEmailChange}
                  placeholder="info@bellasboutique.cr"
                />
              </div>

              <div className="form-group">
                <label>Contraseña SMTP</label>
                <input
                  type="password"
                  name="smtpPassword"
                  value={emailConfig.smtpPassword}
                  onChange={handleEmailChange}
                  placeholder="••••••••"
                />
                <small>Contraseña de aplicación o cuenta</small>
              </div>

              <div className="form-group">
                <label>Nombre del Remitente</label>
                <input
                  type="text"
                  name="fromName"
                  value={emailConfig.fromName}
                  onChange={handleEmailChange}
                  placeholder="Bellas Boutique"
                />
              </div>

              <div className="form-group">
                <label>Email del Remitente</label>
                <input
                  type="email"
                  name="fromEmail"
                  value={emailConfig.fromEmail}
                  onChange={handleEmailChange}
                  placeholder="info@bellasboutique.cr"
                />
              </div>

              <div className="form-group">
                <label>Email de Respuesta</label>
                <input
                  type="email"
                  name="replyToEmail"
                  value={emailConfig.replyToEmail}
                  onChange={handleEmailChange}
                  placeholder="support@bellasboutique.cr"
                />
                <small>Email donde los clientes pueden responder</small>
              </div>
            </div>
          </div>

          {/* SECCIÓN: MENSAJES PERSONALIZADOS */}
          <div className="settings-section">
            <div className="section-header">
              <h3>Mensajes Personalizados</h3>
            </div>
            <div className="messages-grid">
              <div className="form-group">
                <label>Mensaje de Bienvenida</label>
                <textarea
                  name="welcomeMessage"
                  value={messages.welcomeMessage}
                  onChange={handleMessageChange}
                  rows="2"
                  placeholder="Mensaje que aparece en la página principal"
                />
              </div>

              <div className="form-group">
                <label>Confirmación de Pedido</label>
                <textarea
                  name="orderConfirmation"
                  value={messages.orderConfirmation}
                  onChange={handleMessageChange}
                  rows="2"
                  placeholder="Mensaje al confirmar un pedido"
                />
              </div>

              <div className="form-group">
                <label>Notificación de Envío</label>
                <textarea
                  name="shippingNotification"
                  value={messages.shippingNotification}
                  onChange={handleMessageChange}
                  rows="2"
                  placeholder="Mensaje cuando el pedido está en camino"
                />
              </div>

              <div className="form-group">
                <label>Alerta de Stock Bajo</label>
                <textarea
                  name="lowStockAlert"
                  value={messages.lowStockAlert}
                  onChange={handleMessageChange}
                  rows="2"
                  placeholder="Mensaje cuando hay pocas unidades disponibles"
                />
              </div>

              <div className="form-group">
                <label>Producto Agotado</label>
                <textarea
                  name="outOfStockMessage"
                  value={messages.outOfStockMessage}
                  onChange={handleMessageChange}
                  rows="2"
                  placeholder="Mensaje cuando no hay stock disponible"
                />
              </div>

              <div className="form-group">
                <label>Texto del Pie de Página</label>
                <textarea
                  name="footerText"
                  value={messages.footerText}
                  onChange={handleMessageChange}
                  rows="2"
                  placeholder="Texto en el footer del sitio"
                />
              </div>
            </div>
          </div>

        </div>

        {/* BOTÓN DE GUARDAR */}
        <div className="settings-actions">
          <button 
            onClick={handleSave} 
            className="save-btn"
            disabled={loading}
          >
            {loading ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
