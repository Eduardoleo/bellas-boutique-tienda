import React, { useState, useEffect } from 'react';
import './PaymentModal.css';
import {validIdentification,identificationMessage} from '../../utils/contactValidation';
import { getPaymentMethods } from "../../services/paymentMethods";

const PaymentModal = ({ isOpen, onClose, total, onPaymentSuccess, submitting=false, pending=false, onInspect, onCorrect }) => {
  const [formData, setFormData] = useState({
    cardNumber: '',
    cardName: '',
    expiryDate: '',
    cvv: '',
    identificacion: '',
    shippingAddress: '',
    useProfileAddress: true,
    savePaymentMethod: false
  });

  const [errors, setErrors] = useState({});
  const [savedCards, setSavedCards] = useState([]);
  const [useExistingCard, setUseExistingCard] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState('');

  // Cargar métodos de pago guardados
  useEffect(() => {
    if (isOpen) {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      // Verificar si la dirección parece ser un email (no es una dirección válida)
      const isEmail = user.address && user.address.includes('@') && user.address.includes('.');
      
      if (user.address && !isEmail) {
        setFormData(prev => ({ ...prev, shippingAddress: user.address }));
      } else {
        // Si no hay dirección o es un email, forzar a que ingrese una
        setFormData(prev => ({ ...prev, useProfileAddress: false, shippingAddress: '' }));
      }
      
      loadSavedCards();
    }
  }, [isOpen]);

  const loadSavedCards = async () => {
    try {
      const methods = await getPaymentMethods();
      setSavedCards(methods);
    } catch (error) {
      console.error('Error al cargar tarjetas:', error);
    }
  };

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    let formattedValue = value;

    // Formatear número de tarjeta
    if (name === 'cardNumber') {
      formattedValue = value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
      if (formattedValue.replace(/\s/g, '').length > 16) return;
    }

    // Formatear fecha de expiración
    if (name === 'expiryDate') {
      formattedValue = value.replace(/\D/g, '');
      if (formattedValue.length >= 2) {
        formattedValue = formattedValue.slice(0, 2) + '/' + formattedValue.slice(2, 4);
      }
      if (formattedValue.length > 5) return;
    }

    // Formatear CVV
    if (name === 'cvv') {
      formattedValue = value.replace(/\D/g, '');
      if (formattedValue.length > 3) return;
    }

    setFormData({ ...formData, [name]: formattedValue });
    setErrors({ ...errors, [name]: '' });
  };

  const validateForm = () => {
    const newErrors = {};

    // Si se usa tarjeta existente, solo validar que esté seleccionada
    if (useExistingCard) {
      if (!selectedCardId) {
        newErrors.selectedCard = 'Seleccione una tarjeta';
      }
      if (!validIdentification(formData.identificacion,{required:true})) {
        newErrors.identificacion = identificationMessage;
      }
    } else {
      // Validar campos de nueva tarjeta
      if (!formData.cardNumber || formData.cardNumber.replace(/\s/g, '').length !== 16) {
        newErrors.cardNumber = 'Número de tarjeta inválido';
      }

      if (!formData.cardName || formData.cardName.length < 3) {
        newErrors.cardName = 'Nombre requerido';
      }

      if (!formData.expiryDate || formData.expiryDate.length !== 5) {
        newErrors.expiryDate = 'Fecha inválida (MM/YY)';
      }

      if (!formData.cvv || formData.cvv.length !== 3) {
        newErrors.cvv = 'CVV inválido';
      }

      if (!validIdentification(formData.identificacion,{required:true})) {
        newErrors.identificacion = identificationMessage;
      }
    }

    // Validar dirección de envío si no usa la del perfil
    if (!formData.useProfileAddress && (!formData.shippingAddress || formData.shippingAddress.trim().length < 10)) {
      newErrors.shippingAddress = 'Ingrese una dirección de envío válida';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if(submitting)return;
    if(pending){await onPaymentSuccess({});return;}

    if (!validateForm()) {
      return;
    }

    // Determinar la dirección de envío
    let finalShippingAddress = formData.shippingAddress;
    
    if (formData.useProfileAddress) {
      const userAddress = (JSON.parse(localStorage.getItem('user') || '{}')).address;
      // Verificar que no sea un email
      if (userAddress && !userAddress.includes('@')) {
        finalShippingAddress = userAddress;
      } else {
        // Si la dirección del perfil es un email, forzar a usar la del formulario
        finalShippingAddress = formData.shippingAddress;
      }
    }

    // Incluir dirección de envío y datos de pago
    const paymentData = {
      ...formData,
      shipping_address: finalShippingAddress,
      useExistingCard: useExistingCard,
      savedCardId: useExistingCard ? selectedCardId : null
    };

    await onPaymentSuccess(paymentData);
  };

  return (
    <>
      <div className="payment-overlay" onClick={onClose}></div>
      <div className="payment-modal">
        <div className="payment-header">
          <h2>Datos de Pago</h2>
          <button className="payment-close" onClick={onClose}>×</button>
        </div>

        <p role="note">Pago simulado: usa solo datos ficticios. No se realiza ningún cobro.</p>
        <form className="payment-form" onSubmit={handleSubmit}>
          <fieldset disabled={submitting||pending} style={{border:0,padding:0,margin:0,minWidth:0}}>
          <div className="payment-section">
            <h3>Información de la Tarjeta</h3>
            
            {savedCards.length > 0 && (
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={useExistingCard}
                    onChange={(e) => setUseExistingCard(e.target.checked)}
                  />
                  {' '}Usar tarjeta guardada
                </label>
                
                {useExistingCard && (
                  <>
                    <select
                      value={selectedCardId}
                      onChange={(e) => {
                        setSelectedCardId(e.target.value);
                        setErrors({ ...errors, selectedCard: '' });
                      }}
                      className={`saved-card-select ${errors.selectedCard ? 'error' : ''}`}
                    >
                      <option value="">Seleccionar tarjeta...</option>
                      {savedCards.map(card => (
                        <option key={card.id} value={card.id}>
                          {card.card_type} •••• {card.card_last_four} - {card.card_holder_name}
                        </option>
                      ))}
                    </select>
                    {errors.selectedCard && <span className="error-message">{errors.selectedCard}</span>}
                  </>
                )}
              </div>
            )}
            
            {!useExistingCard && (
              <>
                <div className="form-group">
                  <label>Número de Tarjeta</label>
                  <input
                    type="text"
                    name="cardNumber"
                    value={formData.cardNumber}
                    onChange={handleChange}
                    placeholder="1234 5678 9012 3456"
                    className={errors.cardNumber ? 'error' : ''}
                  />
                  {errors.cardNumber && <span className="error-message">{errors.cardNumber}</span>}
                </div>

                <div className="form-group">
                  <label>Nombre en la Tarjeta</label>
                  <input
                    type="text"
                    name="cardName"
                    value={formData.cardName}
                    onChange={handleChange}
                    placeholder="JUAN PEREZ"
                    className={errors.cardName ? 'error' : ''}
                  />
                  {errors.cardName && <span className="error-message">{errors.cardName}</span>}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Fecha de Expiración</label>
                    <input
                      type="text"
                      name="expiryDate"
                      value={formData.expiryDate}
                      onChange={handleChange}
                      placeholder="MM/YY"
                      className={errors.expiryDate ? 'error' : ''}
                    />
                    {errors.expiryDate && <span className="error-message">{errors.expiryDate}</span>}
                  </div>

                  <div className="form-group">
                    <label>CVV</label>
                    <input
                      type="text"
                      name="cvv"
                      value={formData.cvv}
                      onChange={handleChange}
                      placeholder="123"
                      className={errors.cvv ? 'error' : ''}
                    />
                    {errors.cvv && <span className="error-message">{errors.cvv}</span>}
                  </div>
                </div>
                
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.savePaymentMethod}
                      onChange={(e) => setFormData({ ...formData, savePaymentMethod: e.target.checked })}
                    />
                    {' '}Guardar esta tarjeta para futuras compras
                  </label>
                </div>
              </>
            )}
          </div>

          <div className="payment-section">
            <h3>Dirección de Envío</h3>
            
            {(() => {
              const user = JSON.parse(localStorage.getItem('user') || '{}');
              const isEmail = user.address && user.address.includes('@');
              
              if (isEmail) {
                return (
                  <div className="warning-note">
                    <p>Tu perfil no tiene una dirección de envío válida. Por favor, ingresa la dirección donde deseas recibir tu pedido.</p>
                  </div>
                );
              }
              return null;
            })()}
            
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={formData.useProfileAddress}
                  onChange={(e) => setFormData({ ...formData, useProfileAddress: e.target.checked })}
                  disabled={(() => {
                    const user = JSON.parse(localStorage.getItem('user') || '{}');
                    return user.address && user.address.includes('@');
                  })()}
                />
                {' '}Usar dirección de mi perfil
              </label>
            </div>
            
            {!formData.useProfileAddress && (
              <div className="form-group">
                <label>Dirección de Envío</label>
                <textarea
                  name="shippingAddress"
                  value={formData.shippingAddress}
                  onChange={handleChange}
                  placeholder="Ingrese la dirección completa para el envío (provincia, cantón, distrito, señas exactas)"
                  rows="3"
                  className={errors.shippingAddress ? 'error' : ''}
                />
                {errors.shippingAddress && <span className="error-message">{errors.shippingAddress}</span>}
              </div>
            )}
          </div>

          <div className="payment-section">
            <h3>Información de Identificación</h3>
            
            <div className="form-group">
              <label>Cédula o Identificación</label>
              <input
                type="text"
                name="identificacion" maxLength={20}
                value={formData.identificacion}
                onChange={handleChange}
                placeholder="1-2345-6789"
                className={errors.identificacion ? 'error' : ''}
              />
              {errors.identificacion && <span className="error-message">{errors.identificacion}</span>}
            </div>

            <div className="info-note">
              <p>Los demás datos de facturación se tomarán de tu perfil</p>
            </div>
          </div>

          <div className="payment-total">
            <span>Total a Pagar:</span>
            <span className="payment-amount">₡{total.toLocaleString('es-CR', { minimumFractionDigits: 2 })}</span>
          </div>

          </fieldset>
          {pending && <p role="status">Se conserva la compra anterior. Reintentar usa la misma solicitud; no crea una compra nueva.</p>}
          {pending && <button type="button" disabled={submitting} onClick={onInspect}>Consultar estado</button>}
          {pending && <button type="button" disabled={submitting} onClick={onCorrect}>Corregir solicitud rechazada</button>}
          <button type="submit" disabled={submitting} className="payment-submit-button">
            {submitting ? 'Procesando compra simulada…' : pending ? 'Reintentar misma compra' : 'Confirmar pago simulado'}
          </button>
        </form>
      </div>
    </>
  );
};

export default PaymentModal;
