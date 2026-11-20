import { API_URL } from '../../app/config';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from "../../utils/toast";
import { logout as handleLogout } from "../../utils/authHandler";
import './SessionManager.css';

const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutos - TIEMPO MÁXIMO DE INACTIVIDAD
const WARNING_TIME = 4 * 60 * 1000; // Advertencia a los 4 minutos
const FINAL_WARNING_TIME = 4 * 60 * 1000 + 50 * 1000; // Modal a los 4:50 (10 seg antes de cerrar)
const REFRESH_COOLDOWN = 2000; // No renovar token más de una vez cada 2 segundos

export const SessionManager = ({ children }) => {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [countdown, setCountdown] = useState(10);
  
  const lastActivityRef = useRef(Date.now());
  const lastRefreshRef = useRef(0); // Timestamp del último refresh
  const refreshingRef = useRef(false); // Flag para evitar llamadas simultáneas
  const warningTimeoutRef = useRef(null);
  const modalTimeoutRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const warningShownRef = useRef(false);
  const checkIntervalRef = useRef(null);

  const logout = useCallback(() => {
    const token = localStorage.getItem('token');
    if (token) {
      console.log('❌ SessionManager: Cerrando sesión por inactividad');
      
      // Limpiar todos los timers
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
      if (modalTimeoutRef.current) clearTimeout(modalTimeoutRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
      
      setShowModal(false);
      toast.warning('Sesión cerrada por inactividad');
      handleLogout();
      navigate('/login');
    }
  }, [navigate]);

  // Renovar token en segundo plano (sin bloquear UI)
  const refreshTokenInBackground = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Evitar llamadas simultáneas
    if (refreshingRef.current) {
      console.log('⏳ SessionManager: Refresh ya en progreso, omitiendo...');
      return;
    }

    // Verificar cooldown (no refresh más de una vez cada 2 segundos)
    const now = Date.now();
    if (now - lastRefreshRef.current < REFRESH_COOLDOWN) {
      console.log('⏱️ SessionManager: Cooldown activo, omitiendo refresh');
      return;
    }

    refreshingRef.current = true;
    lastRefreshRef.current = now;

    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.token) {
          localStorage.setItem('token', data.token);
          console.log('🔄 SessionManager: Token renovado exitosamente');
        }
      }
    } catch (error) {
      console.error('❌ SessionManager: Error al renovar token:', error);
    } finally {
      refreshingRef.current = false;
    }
  }, []);

  const resetTimer = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    lastActivityRef.current = Date.now();
    warningShownRef.current = false;
    setShowModal(false);
    setCountdown(10);
    
    // Limpiar timers de advertencia/modal si existen
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    if (modalTimeoutRef.current) clearTimeout(modalTimeoutRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    
    // Renovar token en el backend para mantener la sesión activa
    refreshTokenInBackground();
  }, [refreshTokenInBackground]);

  const handleContinueSession = useCallback(() => {
    console.log('✅ SessionManager: Usuario extendió la sesión');
    resetTimer();
    toast.success('Sesión extendida');
  }, [resetTimer]);

  const handleCancelSession = useCallback(() => {
    console.log('🚪 SessionManager: Usuario cerró sesión manualmente');
    logout();
  }, [logout]);

  // Detectar actividad del usuario
  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

    const handleActivity = () => {
      resetTimer();
    };

    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    console.log('👂 SessionManager: Escuchando eventos de actividad del usuario');

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [resetTimer]);

  // Sistema de verificación continua de inactividad
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('🔓 SessionManager: No hay token, no se iniciará el monitor');
      return;
    }

    console.log('🚀 SessionManager: Iniciando monitor de inactividad');

    // Verificar cada segundo el tiempo de inactividad
    checkIntervalRef.current = setInterval(() => {
      const currentToken = localStorage.getItem('token');
      if (!currentToken) {
        console.log('🔓 SessionManager: Token eliminado, deteniendo monitor');
        if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
        return;
      }

      const inactiveTime = Date.now() - lastActivityRef.current;
      
      // Advertencia a los 4 minutos (solo una vez)
      if (inactiveTime >= WARNING_TIME && !warningShownRef.current) {
        console.log('⚠️ SessionManager: 4 minutos de inactividad - Mostrando advertencia');
        toast.warning('⚠️ Tu sesión se cerrará en 1 minuto por inactividad', { duration: 10000 });
        warningShownRef.current = true;
      }

      // Modal a los 4:50 minutos
      if (inactiveTime >= FINAL_WARNING_TIME && !showModal) {
        console.log('🚨 SessionManager: 4:50 minutos de inactividad - Mostrando modal');
        setShowModal(true);
        setCountdown(10);
        
        // Countdown de 10 segundos
        let remainingTime = 10;
        countdownIntervalRef.current = setInterval(() => {
          remainingTime -= 1;
          setCountdown(remainingTime);
          console.log(`⏰ SessionManager: Modal countdown = ${remainingTime} segundos`);
          
          if (remainingTime <= 0) {
            clearInterval(countdownIntervalRef.current);
            logout();
          }
        }, 1000);
      }

      // Cierre automático a los 5 minutos (por si el modal falla)
      if (inactiveTime >= INACTIVITY_TIMEOUT) {
        console.log('⏰ SessionManager: 5 minutos completos - Cerrando sesión');
        logout();
      }
    }, 10000); // Verificar cada 10 segundos

    return () => {
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
      if (modalTimeoutRef.current) clearTimeout(modalTimeoutRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [showModal, logout]);

  return (
    <>
      {children}
      
      {showModal && (
        <div className="session-modal-overlay">
          <div className="session-modal">
            <div className="session-modal-header">
              <div className="session-modal-icon-circle">
                <svg className="session-modal-clock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="12" cy="12" r="10" strokeWidth="2"/>
                  <path d="M12 6v6l4 2" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <h2>Sesión por expirar</h2>
            </div>
            <p className="session-modal-message">
              Tu sesión se cerrará por inactividad en
            </p>
            <div className="session-modal-countdown">
              <span className="countdown-number">{countdown}</span>
              <span className="countdown-label">segundos</span>
            </div>
            <div className="session-modal-buttons">
              <button 
                className="session-modal-btn session-modal-btn-continue"
                onClick={handleContinueSession}
              >
                Continuar sesión
              </button>
              <button 
                className="session-modal-btn session-modal-btn-logout"
                onClick={handleCancelSession}
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SessionManager;
