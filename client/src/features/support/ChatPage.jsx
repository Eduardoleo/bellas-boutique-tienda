import { API_URL } from '../../app/config';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '../../utils/toast';
import './ChatPage.css';

const ChatPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [salaId, setSalaId] = useState(null);
  const messagesEndRef = useRef(null);
  const refresh = useRef(async () => {});
  const sendingRef = useRef(false);
  const support = ['Administrador', 'Vendedor'].includes(user?.rol);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const stored = localStorage.getItem('user');
    if (!token || !stored) { navigate('/login'); return; }
    const currentUser = JSON.parse(stored);
    setUser(currentUser);
    const staff = ['Administrador', 'Vendedor'].includes(currentUser.rol);
    const controller = new AbortController();
    let disposed = false;
    async function start() {
      try {
        // Only the server determines which rooms are authorized for this account.
        const response = await fetch(API_URL + '/support/chat/salas', {
          method: staff ? 'GET' : 'POST',
          headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
          ...(staff ? {} : { body: '{}' }), signal: controller.signal
        });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error('Chat no disponible');
        if (disposed) return;
        if (staff) {
          if (!Array.isArray(data.salas)) throw new Error('Chat no disponible');
          setRooms(data.salas);
          setSalaId(data.salas[0]?.sala_id || null);
        } else setSalaId(data.sala_id);
      } catch {
        if (!disposed) toast.error('No se pudo abrir el chat');
      } finally { if (!disposed) setLoading(false); }
    }
    start();
    return () => { disposed = true; controller.abort(); };
  }, [navigate]);

  useEffect(() => {
    setMessages([]);
    if (!salaId || !user) return;
    const controller = new AbortController();
    let disposed = false, busy = false;
    const headers = { Authorization: 'Bearer ' + localStorage.getItem('token') };
    async function load() {
      if (busy || disposed) return;
      busy = true;
      try {
        const response = await fetch(API_URL + '/support/chat/' + encodeURIComponent(salaId) + '/mensajes', { headers, signal: controller.signal });
        const data = await response.json();
        if (!response.ok || !data.success || !Array.isArray(data.mensajes)) throw new Error('Chat no disponible');
        if (disposed) return;
        setMessages(data.mensajes);
        // Reading another room or changing browser tabs must not mark its messages.
        if (document.visibilityState === 'visible') {
          const marked = await fetch(API_URL + '/support/chat/' + encodeURIComponent(salaId) + '/leer', { method: 'PUT', headers, signal: controller.signal });
          if (!marked.ok) throw new Error('Lectura no disponible');
          if (!disposed) setRooms(current => current.map(room => room.sala_id === salaId ? { ...room, mensajes_no_leidos: 0 } : room));
        }
      } catch {
        if (!disposed) { setMessages([]); toast.error('No se pudo cargar la conversación'); }
      } finally { busy = false; if (!disposed) setLoading(false); }
    }
    refresh.current = load;
    load();
    const interval = setInterval(load, 3000);
    const visible = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', visible);
    return () => {
      disposed = true; controller.abort(); clearInterval(interval);
      document.removeEventListener('visibilitychange', visible);
      refresh.current = async () => {};
    };
  }, [salaId, user?.id]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [messages]);

  async function handleSendMessage(event) {
    event.preventDefault();
    if (!salaId || !newMessage.trim() || sendingRef.current) return;
    sendingRef.current = true; setSending(true);
    try {
      const response = await fetch(API_URL + '/support/chat/mensaje', {
        method: 'POST', headers: { Authorization: 'Bearer ' + localStorage.getItem('token'), 'Content-Type': 'application/json' },
        body: JSON.stringify({ sala_id: salaId, mensaje: newMessage })
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error('Mensaje no disponible');
      setNewMessage('');
      await refresh.current();
    } catch { toast.error('No se pudo enviar el mensaje'); }
    finally { sendingRef.current = false; setSending(false); }
  }

  if (!user) return <div className="chat-loading">Cargando chat…</div>;
  return <div className="chat-page"><div className="chat-container">
    <div className="chat-header"><button onClick={() => navigate('/')} className="back-btn">Volver</button><h2>Chat de soporte</h2>
      <div className="chat-status"><span className="status-indicator"/><span>en línea</span></div></div>
    {support && <div className="chat-room-picker"><label htmlFor="support-room">Conversación autorizada</label>
      <select id="support-room" value={salaId || ''} disabled={sending || rooms.length === 0}
        onChange={event => { setMessages([]); setNewMessage(''); setSalaId(event.target.value); }}>
        {rooms.length === 0 && <option value="">No hay conversaciones disponibles</option>}
        {rooms.map(room => <option key={room.sala_id} value={room.sala_id}>Sala {room.sala_id} · {room.mensajes_no_leidos} sin leer</option>)}
      </select></div>}
    <div className="chat-messages" aria-busy={loading}>
      {loading ? <p role="status">Cargando conversación…</p> : messages.length === 0 ? <div className="no-messages"><p>No hay mensajes aún</p><p className="no-messages-subtitle">Inicia una conversación ficticia con soporte</p></div> :
        messages.map(message => <div key={message.id} className={'message ' + (message.user_id === user.id ? 'own-message' : 'other-message')}>
          <div className="message-header"><span className="message-sender">{message.usuario_nombre}</span><span className="message-time">{new Date(message.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
          <div className="message-content">{message.mensaje}</div></div>)}
      <div ref={messagesEndRef}/></div>
    <form onSubmit={handleSendMessage} className="chat-input-form"><input type="text" aria-label="Mensaje de soporte" value={newMessage} disabled={sending || !salaId} onChange={event => setNewMessage(event.target.value)} placeholder="Escribe tu mensaje…" className="chat-input"/>
      <button type="submit" className="send-btn" disabled={sending || !salaId}>{sending ? 'Enviando…' : 'Enviar'}</button></form>
  </div></div>;
};
export default ChatPage;
