import React, { useState, useEffect, useRef } from 'react';
import { getUserCart, removeFromCart, clearCart } from "../../services/cart";
import PaymentModal from './PaymentModal';
import ConfirmModal from "../../components/common/ConfirmModal";
import { processPayment, getCheckoutStatus } from "../../services/paymentService";
import { showToast } from "../../utils/toast";
import './FloatingCart.css';
import {createCheckoutIntent} from '../../utils/checkoutIntent';

const FloatingCart = () => {
  const [isOpen, setIsOpen] = useState(false);
  const cartTrigger = useRef(null), cartPanel = useRef(null);
  useEffect(() => {
    if (!isOpen) return;
    cartPanel.current?.querySelector('.cart-close')?.focus();
    return () => { cartTrigger.current?.focus(); };
  }, [isOpen]);
  function handleCartKeyDown(event) {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setIsOpen(false); }
    if (event.key === 'Tab') {
      const controls = [...event.currentTarget.querySelectorAll('button:not([disabled]),a[href],input:not([disabled])')];
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  }
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [itemCount, setItemCount] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  const [paying,setPaying]=useState(false);
  const [pendingCheckout,setPendingCheckout]=useState(false);
  const inFlight=useRef(false),intent=useRef(null);
  if(!intent.current)intent.current=createCheckoutIntent(sessionStorage);
  const loadCart = async () => {
    const token = localStorage.getItem('token');
    const userId=JSON.parse(localStorage.getItem('user')||'null')?.id;
    const active=intent.current.syncUser(token?userId:null);
    setPendingCheckout(Boolean(active&&!active.confirmed));
    if (!token) {
      setCartItems([]);
      setItemCount(0);
      setIsLoggedIn(false);
      return;
    }

    setIsLoggedIn(true);
    setLoading(true);
    
    try {
      const result = await getUserCart();
      
      // Si el token expiró, getUserCart retornará success: false
      if (!result.success) {
        // Token expirado o error de autenticación
        if (result.message === 'Sesión expirada' || result.message?.includes('autenticación')) {
          console.log('FloatingCart: Token expirado detectado, limpiando estado');
          setCartItems([]);
          setItemCount(0);
          setIsLoggedIn(false);
          return;
        }
      }
      
      if (result.success && result.cart) {
        setCartItems(result.cart);
        setItemCount(result.cart.reduce((sum, item) => sum + item.quantity, 0));
      }
    } catch (error) {
      console.error('Error en loadCart:', error);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    loadCart();
    
    // Recargar carrito cada 60 segundos (antes era 15s y causaba parpadeo)
    const interval = setInterval(loadCart, 60000);
    
    // Escuchar cambios en el localStorage (logout)
    const handleStorageChange = (e) => {
      if (e.key === 'token' || e.key === 'user' || e.key === null) {
        // Token eliminado o localStorage limpiado
        loadCart();
      }
    };
    
    // Escuchar evento personalizado de logout
    const handleLogout = () => {
      intent.current.suspend();setPendingCheckout(Boolean(intent.current.current()&&!intent.current.current().confirmed));setShowPayment(false);
      setIsLoggedIn(false);
      setCartItems([]);
      setItemCount(0);
      setIsOpen(false);
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('logout', handleLogout);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('logout', handleLogout);
    };
  }, []);

  const toggleCart = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      loadCart();
    }
  };

  // Si no está logueado, no mostrar el botón flotante
  if (!isLoggedIn) {
    return null;
  }

  // Cálculos - IVA ya incluido en el precio
  const subtotal = cartItems.reduce((sum, item) => sum + parseFloat(item.subtotal), 0);
  const envio = subtotal > 50000 ? 0 : 3000; // Envío gratis sobre ₡50,000
  const total = subtotal + envio;

  const handleCheckout = () => {
    if(intent.current.current()?.confirmed)intent.current.clear();
    setShowPayment(true);
  };

  const handleRemoveItem = async (productId) => {
    const result = await removeFromCart(null, productId);
    if (result.success) {
      showToast('Producto eliminado del carrito', 'success');
      loadCart();
    } else {
      showToast(result.message || 'Error al eliminar producto', 'error');
    }
  };

  const handleClearCart = async () => {
    setShowConfirmClear(true);
  };

  const confirmClearCart = async () => {
    const result = await clearCart();
    if (result.success) {
      showToast('Carrito vaciado correctamente', 'success');
      loadCart();
    } else {
      showToast(result.message || 'Error al vaciar carrito', 'error');
    }
    setShowConfirmClear(false);
  };

  const inspectIntent=async()=>{
    const active=intent.current.current();if(!active)return;
    const wasUncertain=!active.confirmed;
    const result=await getCheckoutStatus(active.key);
    if(intent.current.current()?.key!==active.key||JSON.parse(localStorage.getItem('user')||'null')?.id!==active.userId)return;
    if(result.success){intent.current.confirm();setPendingCheckout(false);if(wasUncertain){setShowPayment(false);loadCart();}showToast(result.completion==='complete'?'Compra simulada confirmada; documentos y avisos completados.':'Compra simulada confirmada; hay documentos o correos pendientes, fallidos o inciertos. No repita la compra.',result.completion==='complete'?'success':'warning');}
    else showToast('Resultado aún no confirmado. No inicie otra compra con una clave nueva.','warning');
    return result;
  };
  const handlePaymentSuccess = async (paymentData) => {
    if(inFlight.current)return;
    const userId=JSON.parse(localStorage.getItem('user')||'null')?.id;
    if(!Number.isSafeInteger(userId))return;
    let active;
    try{active=intent.current.begin(userId,{...paymentData,cartItems,subtotal,envio,total});}
    catch(error){showToast(error.message,'warning');return;}
    if(active.confirmed){await inspectIntent();return;}
    inFlight.current=true;setPaying(true);setPendingCheckout(true);
    try{
      const result=await processPayment(active.body,active.key);
      // Discard a late response if logout/account switch occurred while it was in flight.
      if(JSON.parse(localStorage.getItem('user')||'null')?.id!==userId||intent.current.current()?.key!==active.key)return;
      if(result.success){
        intent.current.confirm();setPendingCheckout(false);setShowPayment(false);setIsOpen(false);setCartItems([]);setItemCount(0);
        showToast('Compra simulada registrada. No hubo cobro. Documentos y correos se consultan por separado.','success');
        await inspectIntent();loadCart();
      }else{intent.current.rejected(result.httpStatus,result.code);setPendingCheckout(Boolean(intent.current.current()));showToast(result.message||'No se confirmó la compra','warning');}
    }finally{inFlight.current=false;setPaying(false);}
  };

  return (
    <>
      {intent.current.current() && <button type="button" onClick={inspectIntent}>Consultar estado de la compra simulada</button>}
      {/* Botón flotante del carrito */}
      <button type="button" ref={cartTrigger} className="floating-cart-button" onClick={toggleCart} aria-label="Abrir carrito de compras" aria-expanded={isOpen} aria-controls="shopping-cart-panel" aria-haspopup="dialog">
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
          className="cart-icon"
        >
          <circle cx="9" cy="21" r="1"/>
          <circle cx="20" cy="21" r="1"/>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
        </svg>
        {itemCount > 0 && (
          <span className="cart-badge">{itemCount}</span>
        )}
      </button>

      {/* Panel del carrito */}
      {isOpen && (
        <>
          <div className="cart-overlay" onClick={toggleCart}></div>
          <div ref={cartPanel} id="shopping-cart-panel" className="cart-panel" role="dialog" aria-modal="true" aria-label="Carrito de compras" onKeyDown={handleCartKeyDown}>
            <div className="cart-header">
              <h2>Carrito de Compras</h2>
              <button className="cart-close" aria-label="Cerrar carrito" onClick={toggleCart}>×</button>
            </div>

            <div className="cart-content">
              {loading ? (
                <div className="cart-loading">Cargando...</div>
              ) : cartItems.length === 0 ? (
                <div className="cart-empty">
                  <p>Tu carrito está vacío</p>
                </div>
              ) : (
                <>
                  <div className="cart-items">
                    {cartItems.map((item) => (
                      <div key={item.id} className="cart-item">
                        {/* Imagen del producto */}
                        <div className={`cart-item-image ${item.gender === 'mujer' ? 'women-placeholder' : 'men-placeholder'}`}>
                          {item.product_name}
                        </div>

                        {/* Información del producto */}
                        <div className="cart-item-info">
                          <h3 className="cart-item-name">{item.product_name}</h3>
                          <p className="cart-item-category">{item.category}</p>
                          {item.description && (
                            <p className="cart-item-description">{item.description}</p>
                          )}
                          <div className="cart-item-details">
                            <span className="cart-item-detail">Cantidad: {item.quantity}</span>
                          </div>
                        </div>

                        {/* Precios */}
                        <div className="cart-item-price">
                          <span className="cart-item-unit-price">₡{item.price.toLocaleString('es-CR')}</span>
                          <span className="cart-item-subtotal">₡{parseFloat(item.subtotal).toLocaleString('es-CR')}</span>
                        </div>

                        {/* Botón eliminar */}
                        <button 
                          className="cart-item-remove"
                          onClick={() => handleRemoveItem(item.id)}
                          title="Eliminar producto"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>

                  <button className="cart-clear-button" onClick={handleClearCart}>
                    Vaciar carrito
                  </button>

                  <div className="cart-summary">
                    <div className="cart-summary-row">
                      <span>Monto (IVA incluido):</span>
                      <span>₡{subtotal.toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="cart-summary-row">
                      <span>Envío:</span>
                      <span>{envio === 0 ? 'GRATIS' : `₡${envio.toLocaleString('es-CR')}`}</span>
                    </div>
                    <div className="cart-summary-divider"></div>
                    <div className="cart-summary-row cart-summary-total">
                      <span>Total:</span>
                      <span>₡{total.toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  <button className="cart-checkout-button" disabled={paying} onClick={handleCheckout}>
                    Pagar
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* Modal de pago simulado */}
      <PaymentModal
          submitting={paying}
          pending={pendingCheckout}
          onInspect={inspectIntent}
          onCorrect={() => {if(intent.current.correct()){setPendingCheckout(false);showToast('Puede corregir la solicitud y confirmar una nueva intención.','info');}else showToast('Resultado incierto; consulte el estado y no genere otra compra.','warning');}}
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        total={total}
        onPaymentSuccess={handlePaymentSuccess}
      />

      {/* Modal de confirmación para vaciar carrito */}
      <ConfirmModal
        isOpen={showConfirmClear}
        onClose={() => setShowConfirmClear(false)}
        onConfirm={confirmClearCart}
        title="¿Vaciar carrito?"
        message="Se eliminarán todos los productos del carrito"
        confirmText="Sí, vaciar"
        cancelText="Cancelar"
        danger={true}
      />
    </>
  );
};

export default FloatingCart;
