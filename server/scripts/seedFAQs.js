const { openScriptDatabase } = require('../src/config/scriptDatabase');
const path = require('path');

const db = openScriptDatabase((err) => {
  if (err) {
    console.error('Error al conectar a la base de datos:', err);
    process.exit(1);
  }
  console.log('Conectado a la base de datos');
});

const faqs = [
  // Pedidos y Envíos
  {
    pregunta: '¿Cuál es el tiempo de entrega de mi pedido?',
    respuesta: 'Los pedidos se entregan en un plazo de 3 a 5 días hábiles dentro del área metropolitana. Para zonas rurales, el tiempo puede extenderse de 5 a 7 días hábiles. Recibirás un número de seguimiento para rastrear tu pedido en tiempo real.',
    categoria: 'Pedidos y Envíos',
    orden: 1
  },
  {
    pregunta: '¿Cuánto cuesta el envío?',
    respuesta: 'El costo del envío se calcula automáticamente al finalizar tu compra según tu ubicación. ¡Ofrecemos envío GRATIS en compras superiores a ₡50,000! Los envíos estándar dentro del área metropolitana tienen un costo aproximado de ₡3,000.',
    categoria: 'Pedidos y Envíos',
    orden: 2
  },
  {
    pregunta: '¿Puedo rastrear mi pedido?',
    respuesta: 'Sí, absolutamente. Una vez que tu pedido sea despachado, recibirás un correo electrónico con tu número de seguimiento. Puedes rastrear tu pedido en tiempo real desde tu perfil en la sección "Mis Pedidos" o utilizando el número de seguimiento en nuestra página de rastreo.',
    categoria: 'Pedidos y Envíos',
    orden: 3
  },
  {
    pregunta: '¿Realizan envíos a todo Costa Rica?',
    respuesta: 'Sí, realizamos envíos a todas las provincias de Costa Rica. Los tiempos de entrega pueden variar según la zona. Zonas urbanas: 3-5 días hábiles. Zonas rurales: 5-7 días hábiles.',
    categoria: 'Pedidos y Envíos',
    orden: 4
  },

  // Pagos
  {
    pregunta: '¿Qué métodos de pago aceptan?',
    respuesta: 'Aceptamos múltiples formas de pago para tu comodidad: Tarjetas de crédito y débito (Visa, Mastercard, American Express), SINPE Móvil, y transferencias bancarias. Todas las transacciones están protegidas con encriptación SSL de nivel bancario.',
    categoria: 'Pagos',
    orden: 5
  },
  {
    pregunta: '¿Es seguro pagar en línea?',
    respuesta: 'Completamente seguro. Utilizamos tecnología de encriptación SSL de nivel bancario para proteger toda tu información. Nunca almacenamos datos completos de tarjetas de crédito. Todas las transacciones son procesadas a través de pasarelas de pago certificadas y seguras.',
    categoria: 'Pagos',
    orden: 6
  },
  {
    pregunta: '¿Puedo pagar contra entrega?',
    respuesta: 'Actualmente no ofrecemos pago contra entrega. Todos los pagos deben realizarse en línea al momento de completar tu pedido. Esto nos permite procesar y despachar tu orden de manera más rápida y eficiente.',
    categoria: 'Pagos',
    orden: 7
  },
  {
    pregunta: '¿Recibiré factura electrónica?',
    respuesta: 'Sí, todas las compras generan factura electrónica automáticamente. La recibirás en tu correo electrónico inmediatamente después de completar tu compra. También puedes descargar tus facturas desde tu perfil en la sección "Mis Compras".',
    categoria: 'Pagos',
    orden: 8
  },

  // Devoluciones y Cambios
  {
    pregunta: '¿Cuál es su política de devoluciones?',
    respuesta: 'Tienes 30 días desde la fecha de recepción para solicitar una devolución o cambio. Los productos deben estar sin usar, con etiquetas originales y en su empaque. Para iniciar el proceso, contacta a nuestro equipo de soporte con tu número de pedido.',
    categoria: 'Devoluciones',
    orden: 9
  },
  {
    pregunta: '¿Cómo hago un cambio de talla o color?',
    respuesta: 'Para cambios de talla o color, contacta a soporte dentro de los 30 días posteriores a tu compra. Verificaremos disponibilidad del producto deseado y coordinaremos el intercambio. El envío del nuevo producto es gratuito, solo pagas el retorno del artículo original.',
    categoria: 'Devoluciones',
    orden: 10
  },
  {
    pregunta: '¿Cuánto tarda el reembolso?',
    respuesta: 'Una vez recibido y verificado el producto devuelto, procesamos el reembolso en un plazo de 2-3 días hábiles. El tiempo para que los fondos aparezcan en tu cuenta depende de tu banco, generalmente de 5 a 7 días hábiles adicionales.',
    categoria: 'Devoluciones',
    orden: 11
  },

  // Productos
  {
    pregunta: '¿Cómo sé qué talla elegir?',
    respuesta: 'Cada producto incluye una guía de tallas detallada en su página. Recomendamos medir una prenda similar que te quede bien y comparar con nuestras medidas. Si tienes dudas, nuestro chatbot puede ayudarte o contacta a soporte para asesoría personalizada.',
    categoria: 'Productos',
    orden: 12
  },
  {
    pregunta: '¿Los colores son exactos a los de la foto?',
    respuesta: 'Hacemos nuestro mejor esfuerzo para mostrar colores precisos, pero pueden variar ligeramente debido a la configuración de tu pantalla. Si tienes dudas sobre un color específico, contáctanos y te enviaremos información más detallada.',
    categoria: 'Productos',
    orden: 13
  },
  {
    pregunta: '¿Cuándo reponen stock de productos agotados?',
    respuesta: 'Reponemos nuestro inventario regularmente. Si un producto está agotado, puedes suscribirte a notificaciones en su página para recibir un correo cuando vuelva a estar disponible. Generalmente reponemos en 1-2 semanas.',
    categoria: 'Productos',
    orden: 14
  },

  // Cuenta y Seguridad
  {
    pregunta: '¿Cómo creo una cuenta?',
    respuesta: 'Crear una cuenta es muy sencillo: haz clic en "Iniciar Sesión" en la esquina superior derecha, luego en "Registrarse". Completa el formulario con tu información y listo. Con una cuenta puedes rastrear pedidos, guardar direcciones y acceder a ofertas exclusivas.',
    categoria: 'Cuenta',
    orden: 15
  },
  {
    pregunta: '¿Olvidé mi contraseña, qué hago?',
    respuesta: 'En la página de inicio de sesión, haz clic en "¿Olvidaste tu contraseña?". Ingresa tu correo electrónico registrado y te enviaremos un enlace para restablecer tu contraseña de forma segura.',
    categoria: 'Cuenta',
    orden: 16
  },
  {
    pregunta: '¿Mis datos personales están seguros?',
    respuesta: 'Absolutamente. Tomamos la seguridad de tus datos muy en serio. Toda tu información personal está encriptada y almacenada de forma segura. Nunca compartimos tus datos con terceros sin tu consentimiento. Cumplimos con todas las regulaciones de protección de datos.',
    categoria: 'Cuenta',
    orden: 17
  }
];

console.log('Insertando FAQs en la base de datos...');

db.serialize(() => {
  // Limpiar FAQs existentes (opcional)
  db.run('DELETE FROM faqs', (err) => {
    if (err) {
      console.error('Error al limpiar FAQs:', err);
      return;
    }
    console.log('FAQs anteriores eliminadas');
  });

  // Insertar nuevas FAQs
  const stmt = db.prepare('INSERT INTO faqs (pregunta, respuesta, categoria, orden, activo) VALUES (?, ?, ?, ?, 1)');

  let insertCount = 0;
  faqs.forEach((faq) => {
    stmt.run([faq.pregunta, faq.respuesta, faq.categoria, faq.orden], (err) => {
      if (err) {
        console.error('Error al insertar FAQ:', err);
      } else {
        insertCount++;
        console.log(`✓ FAQ ${insertCount}/${faqs.length}: ${faq.pregunta.substring(0, 50)}...`);
      }
    });
  });

  stmt.finalize(() => {
    console.log(`\n✅ ${insertCount} FAQs insertadas exitosamente`);
    db.close();
  });
});
