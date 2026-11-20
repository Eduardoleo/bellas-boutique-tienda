import React, { useState, useEffect, useRef } from 'react';
import { searchKnowledge, generateProductResponse } from "../../utils/knowledgeBase";
import { API_URL } from '../../app/config';
import './AIChatBot.css';

const AIChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [needsHumanSupport, setNeedsHumanSupport] = useState(false);
  const [isConnectedToHuman, setIsConnectedToHuman] = useState(false);
  const [salaId, setSalaId] = useState(null);
  const [learningData, setLearningData] = useState(() => {
    // Cargar datos de aprendizaje del localStorage
    const saved = localStorage.getItem('chatbot_learning');
    return saved ? JSON.parse(saved) : {};
  });
  const messagesEndRef = useRef(null);
  const pollInterval = useRef(null);

  // Diccionario de sinónimos y lenguaje natural
  const synonymDictionary = {
    // Productos
    'pantalon': ['pantalones', 'pants', 'jeans', 'vaqueros', 'mezclilla'],
    'camiseta': ['camisetas', 'camisa', 'camisas', 'playera', 'playeras', 'polo', 'polos', 'blusa', 'blusas'],
    'sudadera': ['sudaderas', 'sueter', 'sueteres', 'hoodie', 'hoodies', 'buzo', 'buzos', 'chompa', 'chompas'],
    'vestido': ['vestidos', 'dress', 'dresses'],
    'zapato': ['zapatos', 'shoes', 'calzado', 'tenis', 'zapatilla', 'zapatillas'],
    'abrigo': ['abrigos', 'chaqueta', 'chaquetas', 'jacket', 'jackets', 'chamarra', 'chamarras'],
    'accesorio': ['accesorios', 'complemento', 'complementos'],
    'bolso': ['bolsos', 'bolsa', 'bolsas', 'cartera', 'carteras', 'mochila', 'mochilas'],
    'top': ['tops', 'crop', 'crops'],
    'body': ['bodies', 'bodys'],
    'traje': ['trajes', 'suit', 'suits', 'formal'],
    
    // Atributos
    'precio': ['precios', 'costo', 'costos', 'valor', 'cuanto', 'cuánto', 'vale'],
    'color': ['colores', 'tonalidad', 'tonalidades'],
    'stock': ['disponible', 'disponibles', 'hay', 'tienen', 'existencia', 'inventario'],
    'talla': ['tallas', 'tamaño', 'tamaños', 'medida', 'medidas', 'size'],
    
    // Acciones
    'comprar': ['compra', 'adquirir', 'conseguir', 'obtener', 'pedir'],
    'buscar': ['busca', 'encontrar', 'ver', 'mostrar', 'quiero'],
    'ayuda': ['ayudar', 'ayudame', 'ayúdame', 'soporte', 'asistencia'],
  };

  // Normalizar texto para mejor comprensión
  const normalizeText = (text) => {
    return text
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remover acentos
      .replace(/[^\w\s]/g, ' ') // Remover puntuación
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Expandir consulta con sinónimos
  const expandQuery = (text) => {
    const normalized = normalizeText(text);
    const words = normalized.split(' ');
    let expandedTerms = new Set();

    words.forEach(word => {
      expandedTerms.add(word);
      // Buscar sinónimos
      for (const [key, synonyms] of Object.entries(synonymDictionary)) {
        if (synonyms.includes(word) || key === word) {
          expandedTerms.add(key);
          synonyms.forEach(syn => expandedTerms.add(syn));
        }
      }
    });

    return Array.from(expandedTerms);
  };

  // Guardar interacción para aprendizaje
  const saveInteraction = (query, response, wasHelpful = true) => {
    const normalized = normalizeText(query);
    const newLearning = {
      ...learningData,
      [normalized]: {
        response,
        count: (learningData[normalized]?.count || 0) + 1,
        lastUsed: new Date().toISOString(),
        helpful: wasHelpful
      }
    };
    setLearningData(newLearning);
    localStorage.setItem('chatbot_learning', JSON.stringify(newLearning));
  };

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Mensaje de bienvenida del bot
      setMessages([{
        id: 1,
        text: '¡Hola! Soy el asistente virtual de Bellas Boutique. Puedo ayudarte con:\n\n• Información de productos, precios y stock\n• Disponibilidad de colores y tallas\n• Preguntas frecuentes\n• Estado de pedidos\n• Y mucho más!\n\n¿En qué puedo ayudarte hoy?',
        sender: 'bot',
        timestamp: new Date()
      }]);
    }
  }, [isOpen, messages.length]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Polling para mensajes de soporte humano
  useEffect(() => {
    if (isConnectedToHuman && salaId) {
      pollInterval.current = setInterval(() => {
        loadHumanMessages();
      }, 3000);

      return () => {
        if (pollInterval.current) {
          clearInterval(pollInterval.current);
        }
      };
    }
  }, [isConnectedToHuman, salaId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadHumanMessages = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${API_URL}/support/chat/${salaId}/mensajes`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        const humanMessages = data.mensajes
          .filter(msg => msg.user_id !== JSON.parse(localStorage.getItem('user')).id)
          .map(msg => ({
            id: msg.id,
            text: msg.mensaje,
            sender: 'human',
            timestamp: new Date(msg.fecha),
            senderName: msg.user_name
          }));
        
        setMessages(prev => {
          const newMessages = [...prev];
          humanMessages.forEach(hMsg => {
            if (!newMessages.find(m => m.id === hMsg.id)) {
              newMessages.push(hMsg);
            }
          });
          return newMessages;
        });
      }
    } catch (error) {
      console.error('Error al cargar mensajes humanos:', error);
    }
  };

  const connectToHumanSupport = async () => {
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (!userData || !token) {
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: 'Para conectarte con un agente humano, necesitas iniciar sesión primero. ¿Deseas ir a la página de inicio de sesión?',
        sender: 'bot',
        timestamp: new Date()
      }]);
      return;
    }

    const parsedUser = JSON.parse(userData);
    const sala = `chat_${parsedUser.id}_${Date.now()}`;
    setSalaId(sala);
    setIsConnectedToHuman(true);
    setNeedsHumanSupport(false);

    setMessages(prev => [...prev, {
      id: Date.now(),
      text: 'Te estoy conectando con un agente humano. Por favor espera un momento...',
      sender: 'bot',
      timestamp: new Date()
    }]);

    // Enviar mensaje inicial al sistema de soporte
    try {
      await fetch(`${API_URL}/support/chat/mensaje`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sala_id: sala,
          mensaje: 'Usuario solicitó conexión con agente humano desde el chatbot'
        })
      });
    } catch (error) {
      console.error('Error al conectar con soporte:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');

    if (isConnectedToHuman) {
      // Enviar al sistema de soporte humano
      try {
        const token = localStorage.getItem('token');
        await fetch(`${API_URL}/support/chat/mensaje`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sala_id: salaId,
            mensaje: inputMessage
          })
        });
      } catch (error) {
        console.error('Error al enviar mensaje:', error);
      }
    } else {
      // Responder con IA
      setIsTyping(true);
      setTimeout(async () => {
        const botResponse = await getBotResponse(inputMessage);
        setMessages(prev => [...prev, {
          id: Date.now(),
          text: botResponse,
          sender: 'bot',
          timestamp: new Date()
        }]);
        setIsTyping(false);
      }, 800);
    }
  };

  const getBotResponse = async (userInput) => {
    const input = normalizeText(userInput);
    const inputLower = userInput.toLowerCase();

    // Verificar si ya aprendimos esta consulta
    if (learningData[input] && learningData[input].helpful) {
      return learningData[input].response;
    }

    // Detectar intención de hablar con humano
    if (inputLower.includes('humano') || inputLower.includes('persona') || inputLower.includes('agente') || 
        inputLower.includes('ayuda personal') || inputLower.includes('hablar con alguien') || inputLower.includes('asesor')) {
      setNeedsHumanSupport(true);
      return "¿Deseas hablar con un agente humano?\n\nPuedo conectarte con nuestro equipo de soporte.\n\nHaz clic en el botón \"Hablar con un agente\" que aparecerá abajo.";
    }

    // PRIMERO: Buscar en base de conocimientos local (más rápido y confiable)
    const knowledge = searchKnowledge(userInput);
    
    if (knowledge) {
      let response = '';
      
      if (knowledge.type === 'producto') {
        // Generar respuesta de producto desde conocimientos
        response = generateProductResponse(knowledge, userInput);
        
        // Intentar enriquecer con datos reales de BD (opcional, no crítico)
        try {
          const searchTerms = knowledge.nombre;
          const bdResponse = await fetch(`${API_URL}/catalog/chatbot/search?q=${encodeURIComponent(searchTerms)}`);
          const bdData = await bdResponse.json();
          
          if (bdData.success && bdData.productos && bdData.productos.length > 0) {
            response += '\n\n**Productos disponibles ahora:**\n';
            bdData.productos.slice(0, 2).forEach(prod => {
              response += `\n• **${prod.nombre}**`;
              response += `\n  Precio: ₡${prod.precio.toLocaleString()}`;
              response += `\n  Stock: ${prod.stock_quantity > 0 ? prod.stock_quantity + ' disponibles' : 'Agotado'}`;
            });
          }
        } catch (error) {
          // No importa si falla la BD, ya tenemos respuesta de conocimientos
          console.log('BD opcional no disponible, usando solo conocimientos');
        }
        
        saveInteraction(userInput, response, true);
        return response;
      }
      
      if (knowledge.type === 'faq') {
        response = knowledge.respuesta;
        saveInteraction(userInput, response, true);
        return response;
      }
      
      if (knowledge.type === 'conversacion') {
        return knowledge.respuesta;
      }
    }

    // SEGUNDO: Si no encontró en conocimientos, intentar BD (para productos específicos)
    const expandedTerms = expandQuery(userInput);
    const productKeywords = ['pantalon', 'jeans', 'camiseta', 'sudadera', 'vestido', 'zapato', 
                            'abrigo', 'accesorio', 'bolso', 'top', 'body', 'traje'];
    const hasProductKeyword = expandedTerms.some(term => productKeywords.includes(term));

    if (hasProductKeyword || inputLower.includes('precio') || inputLower.includes('stock') || inputLower.includes('color')) {
      try {
        const searchTerms = expandedTerms.filter(term => 
          productKeywords.includes(term) || 
          ['mujer', 'hombre', 'rojo', 'azul', 'negro', 'blanco'].includes(term)
        );
        
        const searchQuery = searchTerms.length > 0 ? searchTerms.join(' ') : userInput;
        
        const response = await fetch(`${API_URL}/catalog/chatbot/search?q=${encodeURIComponent(searchQuery)}`);
        const data = await response.json();
        
        if (data.success && data.productos && data.productos.length > 0) {
          let responseText = '**Productos encontrados:**\n\n';
          
          data.productos.slice(0, 3).forEach(prod => {
            responseText += `• **${prod.nombre}**\n`;
            responseText += `  Precio: ₡${prod.precio.toLocaleString()}\n`;
            if (prod.colores) {
              responseText += `  Colores: ${prod.colores}\n`;
            }
            responseText += `  Stock: ${prod.stock_quantity > 0 ? prod.stock_quantity + ' disponibles' : 'Agotado'}\n\n`;
          });
          
          if (data.productos.length > 3) {
            responseText += `_Y ${data.productos.length - 3} productos más..._\n\n`;
          }
          
          responseText += '¿Necesitas más detalles?';
          
          saveInteraction(userInput, responseText, true);
          return responseText;
        }
      } catch (error) {
        console.error('Error BD:', error);
        // Continuar con respuesta por defecto en lugar de fallar
      }
    }

    // TERCERO: Respuesta inteligente por defecto
    return `Entiendo que preguntas sobre **"${userInput}"**\n\nPuedo ayudarte con:\n\n• **Vestidos** - Elegantes y casuales\n• **Jeans** - Para mujer y hombre\n• **Camisetas** - Variedad de colores\n• **Sudaderas** - Cómodas y cálidas\n• **Zapatos** - Deportivos y casuales\n• **Bolsos** - Modernos y prácticos\n• **Accesorios** - Complementa tu look\n\n**Info general:** Envíos, pagos, devoluciones\n**Soporte:** Habla con un agente humano\n\n¿Qué te gustaría saber?`;
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Botón flotante */}
      <button 
        className={`chatbot-toggle ${isOpen ? 'hidden' : ''}`}
        type="button" tabIndex={isOpen ? -1 : 0} aria-expanded={isOpen} aria-controls="floating-support-window"
        onClick={() => setIsOpen(true)}
        aria-label="Abrir chat"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" fill="currentColor"/>
          <circle cx="12" cy="11" r="1" fill="white"/>
          <circle cx="8" cy="11" r="1" fill="white"/>
          <circle cx="16" cy="11" r="1" fill="white"/>
        </svg>
      </button>

      {/* Ventana del chat */}
      {isOpen && (
        <div className="chatbot-window" id="floating-support-window">
          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-header-info">
              <div className="chatbot-avatar">
                {isConnectedToHuman ? 'H' : 'A'}
              </div>
              <div>
                <h3>{isConnectedToHuman ? 'Agente de Soporte' : 'Asistente Virtual'}</h3>
                <span className="chatbot-status">
                  <span className="status-dot"></span>
                  en línea
                </span>
              </div>
            </div>
            <button 
              className="chatbot-close"
              onClick={() => setIsOpen(false)}
              aria-label="Cerrar chat"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="chatbot-messages">
            {messages.map(message => (
              <div 
                key={message.id} 
                className={`chatbot-message ${message.sender}`}
              >
                {message.sender !== 'user' && (
                  <div className="message-avatar">
                    {message.sender === 'bot' ? 'A' : 'H'}
                  </div>
                )}
                <div className="message-bubble">
                  {message.text}
                  <span className="message-time">
                    {message.timestamp.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="chatbot-message bot">
                <div className="message-avatar">A</div>
                <div className="message-bubble typing">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
            
            {needsHumanSupport && !isConnectedToHuman && (
              <div className="human-support-prompt">
                <button 
                  className="connect-human-btn"
                  onClick={connectToHumanSupport}
                >
                  Hablar con un agente
                </button>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="chatbot-input-container">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Escribe tu mensaje..."
              className="chatbot-input"
            />
            <button 
              onClick={handleSendMessage}
              className="chatbot-send"
              disabled={!inputMessage.trim()}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" fill="currentColor"/>
              </svg>
            </button>
          </div>

          {isConnectedToHuman && (
            <div className="human-support-indicator">
              Conectado con agente humano
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default AIChatBot;
