// Base de conocimientos para el chatbot
// Esta base de datos local reduce la dependencia de consultas a la BD

export const knowledgeBase = {
  // Catálogo de productos con información detallada
  productos: {
    'vestidos': {
      keywords: ['vestido', 'vestidos', 'dress', 'dresses'],
      info: {
        descripcion: 'Vestidos elegantes para toda ocasión',
        rangoPrecio: '₡15,000 - ₡35,000',
        colores: ['Negro', 'Rojo', 'Azul', 'Blanco', 'Rosa', 'Verde'],
        tallas: ['XS', 'S', 'M', 'L', 'XL'],
        generos: ['mujer'],
        categorias: ['Casual', 'Formal', 'Fiesta']
      }
    },
    'jeans': {
      keywords: ['jeans', 'jean', 'pantalon', 'pantalones', 'vaqueros', 'pants', 'mezclilla'],
      info: {
        descripcion: 'Jeans de mezclilla de alta calidad',
        rangoPrecio: '₡18,000 - ₡28,000',
        colores: ['Azul', 'Negro', 'Gris', 'Azul Claro'],
        tallas: ['28', '30', '32', '34', '36', '38'],
        generos: ['mujer', 'hombre'],
        categorias: ['Ajustados', 'Rectos', 'Anchos', 'Rotos']
      }
    },
    'camisetas': {
      keywords: ['camiseta', 'camisetas', 'camisa', 'camisas', 'playera', 'playeras', 'polo', 'blusa', 'blusas', 't-shirt'],
      info: {
        descripcion: 'Camisetas cómodas y versátiles',
        rangoPrecio: '₡8,000 - ₡15,000',
        colores: ['Blanco', 'Negro', 'Gris', 'Azul', 'Rojo', 'Verde', 'Amarillo', 'Rosa'],
        tallas: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
        generos: ['mujer', 'hombre'],
        categorias: ['Básicas', 'Estampadas', 'Polo']
      }
    },
    'sudaderas': {
      keywords: ['sudadera', 'sudaderas', 'sueter', 'sueteres', 'sueta', 'suetas', 'hoodie', 'hoodies', 'buzo', 'buzos', 'chompa'],
      info: {
        descripcion: 'Sudaderas cálidas y cómodas',
        rangoPrecio: '₡15,000 - ₡25,000',
        colores: ['Negro', 'Gris', 'Azul', 'Rojo', 'Verde', 'Blanco'],
        tallas: ['S', 'M', 'L', 'XL', 'XXL'],
        generos: ['mujer', 'hombre'],
        categorias: ['Con capucha', 'Sin capucha', 'Con cierre']
      }
    },
    'zapatos': {
      keywords: ['zapato', 'zapatos', 'tenis', 'zapatilla', 'zapatillas', 'calzado', 'shoes'],
      info: {
        descripcion: 'Calzado para todo tipo de ocasión',
        rangoPrecio: '₡25,000 - ₡45,000',
        colores: ['Negro', 'Blanco', 'Gris', 'Azul', 'Rojo'],
        tallas: ['36', '37', '38', '39', '40', '41', '42', '43', '44'],
        generos: ['mujer', 'hombre'],
        categorias: ['Deportivos', 'Casuales', 'Formales']
      }
    },
    'abrigos': {
      keywords: ['abrigo', 'abrigos', 'chaqueta', 'chaquetas', 'jacket', 'chamarra'],
      info: {
        descripcion: 'Abrigos y chaquetas para clima frío',
        rangoPrecio: '₡30,000 - ₡50,000',
        colores: ['Negro', 'Gris', 'Azul Marino', 'Café', 'Beige'],
        tallas: ['S', 'M', 'L', 'XL'],
        generos: ['mujer', 'hombre'],
        categorias: ['Casual', 'Deportivo', 'Formal']
      }
    },
    'tops': {
      keywords: ['top', 'tops', 'crop', 'crops'],
      info: {
        descripcion: 'Tops y crop tops modernos',
        rangoPrecio: '₡10,000 - ₡18,000',
        colores: ['Negro', 'Blanco', 'Rojo', 'Rosa', 'Azul'],
        tallas: ['XS', 'S', 'M', 'L'],
        generos: ['mujer'],
        categorias: ['Crop', 'Largo', 'Tirantes']
      }
    },
    'bodies': {
      keywords: ['body', 'bodies', 'bodys'],
      info: {
        descripcion: 'Bodies ajustados y elegantes',
        rangoPrecio: '₡12,000 - ₡20,000',
        colores: ['Negro', 'Blanco', 'Nude', 'Rojo'],
        tallas: ['XS', 'S', 'M', 'L'],
        generos: ['mujer'],
        categorias: ['Manga larga', 'Manga corta', 'Sin mangas']
      }
    },
    'bolsos': {
      keywords: ['bolso', 'bolsos', 'bolsa', 'bolsas', 'cartera', 'carteras', 'mochila'],
      info: {
        descripcion: 'Bolsos y accesorios para llevar tus cosas',
        rangoPrecio: '₡15,000 - ₡40,000',
        colores: ['Negro', 'Café', 'Beige', 'Rojo', 'Azul'],
        tallas: ['Único'],
        generos: ['mujer', 'hombre'],
        categorias: ['Mano', 'Hombro', 'Mochila', 'Crossbody']
      }
    },
    'accesorios': {
      keywords: ['accesorio', 'accesorios', 'complemento', 'complementos'],
      info: {
        descripcion: 'Accesorios para completar tu look',
        rangoPrecio: '₡5,000 - ₡15,000',
        colores: ['Variados'],
        tallas: ['Único'],
        generos: ['mujer', 'hombre'],
        categorias: ['Gorras', 'Cinturones', 'Bufandas', 'Joyería']
      }
    },
    'trajes': {
      keywords: ['traje', 'trajes', 'suit', 'formal'],
      info: {
        descripcion: 'Trajes formales para ocasiones especiales',
        rangoPrecio: '₡50,000 - ₡80,000',
        colores: ['Negro', 'Azul Marino', 'Gris', 'Café'],
        tallas: ['S', 'M', 'L', 'XL'],
        generos: ['hombre'],
        categorias: ['Dos piezas', 'Tres piezas', 'Casual']
      }
    }
  },

  // FAQs predefinidas
  faqs: {
    envios: {
      keywords: ['envio', 'envios', 'entrega', 'shipping', 'delivery'],
      respuesta: '**Información de envíos:**\n\nEnvío a todo Costa Rica\nEntregas en 3-5 días hábiles\nRastreo con número de seguimiento\nCosto calculado al finalizar\n\n¿Necesitas rastrear un pedido?'
    },
    pagos: {
      keywords: ['pago', 'pagos', 'pagar', 'tarjeta', 'sinpe', 'metodo'],
      respuesta: '**Métodos de pago:**\n\nTarjetas crédito/débito\nSINPE Móvil\nTransferencia bancaria\n\nTransacciones seguras\n\n¿Necesitas ayuda con tu compra?'
    },
    devoluciones: {
      keywords: ['devolucion', 'devoluciones', 'cambio', 'cambios', 'return'],
      respuesta: '**Política de devoluciones:**\n\n30 días para devoluciones\nProductos sin usar con etiquetas\nContacta soporte\nReembolso en 5-7 días\n\n¿Quieres iniciar una devolución?'
    },
    horarios: {
      keywords: ['horario', 'horarios', 'hora', 'abierto', 'atencion'],
      respuesta: '**Horario de atención:**\n\nLun-Vie: 9:00 AM - 6:00 PM\nSábados: 10:00 AM - 4:00 PM\nDomingos: Cerrado\n\nChatbot 24/7'
    },
    tallas: {
      keywords: ['talla', 'tallas', 'tamaño', 'medida', 'size'],
      respuesta: '**Guía de tallas:**\n\n**Ropa:**\nXS (Extra Pequeño)\nS (Pequeño)\nM (Mediano)\nL (Grande)\nXL (Extra Grande)\nXXL (Doble Extra Grande)\n\n**Zapatos:**\nMujer: 36-40\nHombre: 39-44\n\n¿Necesitas más detalles?'
    },
    cuenta: {
      keywords: ['cuenta', 'registro', 'registrar', 'crear', 'login', 'sesion'],
      respuesta: '**Crear cuenta/Iniciar sesión:**\n\n1. Click en usuario (arriba derecha)\n2. Selecciona "Iniciar Sesión" o "Registrarse"\n3. Completa tus datos\n\n¿Problemas para acceder?'
    },
    contacto: {
      keywords: ['contacto', 'contactar', 'comunicar', 'telefono', 'email', 'correo'],
      respuesta: '**Contáctanos:**\n\nEmail: soporte@bellasboutique.com\nWhatsApp: 8888-8888\nTeléfono: 2222-2222\n\nO usa este chat 24/7'
    }
  },

  // Saludos y despedidas
  conversacion: {
    saludos: {
      keywords: ['hola', 'buenas', 'buenos', 'hey', 'hi', 'hello'],
      respuesta: 'Hola, bienvenido a Bellas Boutique. ¿En qué puedo ayudarte hoy?'
    },
    despedidas: {
      keywords: ['adios', 'bye', 'chao', 'gracias', 'hasta luego'],
      respuesta: 'Hasta pronto, gracias por visitar Bellas Boutique. Vuelve pronto.'
    },
    agradecimientos: {
      keywords: ['gracias', 'thanks', 'thank you', 'muchas gracias'],
      respuesta: 'De nada. ¿Hay algo más en lo que pueda ayudarte?'
    }
  }
};

// Función para buscar en la base de conocimientos
export const searchKnowledge = (query) => {
  const normalizedQuery = query.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  let bestMatch = null;
  let bestScore = 0;

  // Función para calcular score de coincidencia
  const calculateScore = (keywords) => {
    let score = 0;
    keywords.forEach(keyword => {
      const keywordNorm = keyword.toLowerCase();
      // Coincidencia exacta de palabra completa = +10 puntos
      const wordBoundaryRegex = new RegExp(`\\b${keywordNorm}\\b`);
      if (wordBoundaryRegex.test(normalizedQuery)) {
        score += 10;
      }
      // Coincidencia parcial = +3 puntos
      else if (normalizedQuery.includes(keywordNorm)) {
        score += 3;
      }
    });
    return score;
  };

  // Buscar en conversación (saludos, despedidas, agradecimientos)
  for (const [tipo, data] of Object.entries(knowledgeBase.conversacion)) {
    const score = calculateScore(data.keywords);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = {
        type: 'conversacion',
        subtipo: tipo,
        respuesta: data.respuesta
      };
    }
  }

  // Buscar en FAQs (info de envíos, pagos, contacto, etc.)
  for (const [tema, data] of Object.entries(knowledgeBase.faqs)) {
    const score = calculateScore(data.keywords);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = {
        type: 'faq',
        tema: tema,
        respuesta: data.respuesta
      };
    }
  }

  // Buscar en productos (jeans, sudaderas, vestidos, etc.)
  for (const [producto, data] of Object.entries(knowledgeBase.productos)) {
    const score = calculateScore(data.keywords);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = {
        type: 'producto',
        nombre: producto,
        data: data.info
      };
    }
  }

  // Solo devolver si hay una coincidencia significativa (score mínimo 3)
  return bestScore >= 3 ? bestMatch : null;
};

// Función para generar respuesta de producto
export const generateProductResponse = (productoData, query) => {
  const { nombre, data } = productoData;
  const queryLower = query.toLowerCase();

  let respuesta = `**${nombre.toUpperCase()}**\n\n`;
  respuesta += `${data.descripcion}\n\n`;

  // Detectar intención específica
  if (queryLower.includes('precio') || queryLower.includes('costo') || queryLower.includes('cuanto')) {
    respuesta += `**Rango de precios:** ${data.rangoPrecio}\n\n`;
  }

  if (queryLower.includes('color') || queryLower.includes('colores')) {
    respuesta += `**Colores disponibles:**\n${data.colores.join(', ')}\n\n`;
  }

  if (queryLower.includes('talla') || queryLower.includes('tamaño')) {
    respuesta += `**Tallas disponibles:**\n${data.tallas.join(', ')}\n\n`;
  }

  if (queryLower.includes('stock') || queryLower.includes('disponible') || queryLower.includes('hay')) {
    respuesta += `**Disponibilidad:** Consulta stock actual en nuestro catálogo\n\n`;
  }

  // Si no hay intención específica, mostrar todo
  if (!queryLower.match(/(precio|color|talla|stock|disponible)/)) {
    respuesta += `Precio: ${data.rangoPrecio}\n`;
    respuesta += `Colores: ${data.colores.join(', ')}\n`;
    respuesta += `Tallas: ${data.tallas.join(', ')}\n`;
    respuesta += `Género: ${data.generos.join(', ')}\n\n`;
  }

  respuesta += `¿Quieres ver estos productos en el catálogo o necesitas más información?`;

  return respuesta;
};
