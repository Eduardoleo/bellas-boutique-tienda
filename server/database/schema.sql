-- SCHEMA.SQL
-- Esquema completo de la base de datos Bellas Boutique

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cedula TEXT UNIQUE,
    name TEXT NOT NULL,
    apellidos TEXT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    rol TEXT DEFAULT 'Cliente' CHECK(rol IN ('Administrador', 'Vendedor', 'Cliente')),
    estado TEXT DEFAULT 'Activo' CHECK(estado IN ('Activo', 'Inactivo', 'Suspendido')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de categorías
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    gender TEXT NOT NULL CHECK(gender IN ('mujer', 'hombre')),
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    image_url TEXT,
    description TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, gender)
);

-- Tabla de productos
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    category TEXT NOT NULL,
    gender TEXT NOT NULL CHECK(gender IN ('hombre', 'mujer', 'unisex')),
    proveedor TEXT,
    colors TEXT NOT NULL DEFAULT 'Negro',
    size_type TEXT DEFAULT 'ropa' CHECK(size_type IN ('ropa', 'zapatos', 'accesorios', 'collar', 'ninguno')),
    image_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de stock
CREATE TABLE IF NOT EXISTS stock (
    product_id INTEGER PRIMARY KEY,
    quantity INTEGER NOT NULL DEFAULT 0,
    reserved_quantity INTEGER NOT NULL DEFAULT 0,
    minimum_stock INTEGER DEFAULT 10,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CHECK (quantity >= 0),
    CHECK (reserved_quantity >= 0),
    CHECK (reserved_quantity <= quantity)
);

-- Tabla de carrito
CREATE TABLE IF NOT EXISTS cart (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE(user_id, product_id)
);

-- Tabla de compras
CREATE TABLE IF NOT EXISTS purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    payment_method TEXT,
    status TEXT DEFAULT 'simulated',
    shipping_address TEXT,
    shipping_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabla de items de compra
CREATE TABLE IF NOT EXISTS purchase_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Tabla de movimientos de stock
CREATE TABLE IF NOT EXISTS stock_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    movement_type TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Tabla de facturas
CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    purchase_id INTEGER NOT NULL,
    consecutivo TEXT UNIQUE NOT NULL,
    
    -- Datos del cliente
    cliente_nombre TEXT NOT NULL,
    cliente_identificacion TEXT NOT NULL,
    cliente_direccion TEXT NOT NULL,
    cliente_correo TEXT NOT NULL,
    cliente_telefono TEXT NOT NULL,
    
    -- Montos
    monto_sin_iva DECIMAL(10, 2) NOT NULL,
    monto_con_iva DECIMAL(10, 2) NOT NULL,
    envio DECIMAL(10, 2) NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    cantidad_productos INTEGER NOT NULL,
    
    -- Archivos generados
    pdf_path TEXT,
    xml_path TEXT,
    email_sent BOOLEAN DEFAULT 0,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE
);

-- Tabla de métodos de pago guardados
CREATE TABLE IF NOT EXISTS payment_methods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    card_type TEXT NOT NULL,
    card_last_four TEXT NOT NULL,
    card_holder_name TEXT NOT NULL,
    expiry_month TEXT NOT NULL,
    expiry_year TEXT NOT NULL,
    is_default BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabla de envíos
CREATE TABLE IF NOT EXISTS shipments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_id INTEGER NOT NULL UNIQUE,
    tracking_number TEXT UNIQUE NOT NULL,
    shipping_address TEXT NOT NULL,
    recipient_name TEXT NOT NULL,
    recipient_phone TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'central' CHECK(status IN ('central', 'en_mensajero', 'en_camino', 'entregado', 'cancelado')),
    
    -- Timestamps de cada estado
    central_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    mensajero_at DATETIME,
    en_camino_at DATETIME,
    entregado_at DATETIME,
    
    -- Información adicional
    courier_name TEXT,
    estimated_delivery DATETIME,
    delivery_notes TEXT,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE
);

-- Tabla de historial de cambios de estado de envío
CREATE TABLE IF NOT EXISTS shipment_status_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shipment_id INTEGER NOT NULL,
    status TEXT NOT NULL,
    notes TEXT,
    changed_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE
);

-- Indices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_gender ON products(gender);
CREATE INDEX IF NOT EXISTS idx_cart_user ON cart(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_user ON purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase ON purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_consecutivo ON invoices(consecutivo);
CREATE INDEX IF NOT EXISTS idx_payment_methods_user ON payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_shipments_purchase ON shipments(purchase_id);
CREATE INDEX IF NOT EXISTS idx_shipments_tracking ON shipments(tracking_number);
CREATE INDEX IF NOT EXISTS idx_shipment_history_shipment ON shipment_status_history(shipment_id);

-- Trigger para actualizar updated_at en users
CREATE TRIGGER IF NOT EXISTS update_users_timestamp
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger para actualizar updated_at en cart
CREATE TRIGGER IF NOT EXISTS update_cart_timestamp
AFTER UPDATE ON cart
FOR EACH ROW
BEGIN
    UPDATE cart SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger para actualizar last_updated en stock
CREATE TRIGGER IF NOT EXISTS update_stock_timestamp
AFTER UPDATE ON stock
FOR EACH ROW
BEGIN
    UPDATE stock SET last_updated = CURRENT_TIMESTAMP WHERE product_id = NEW.product_id;
END;

-- Trigger para prevenir stock negativo
CREATE TRIGGER IF NOT EXISTS prevent_negative_stock
BEFORE UPDATE ON stock
FOR EACH ROW
WHEN NEW.quantity < 0
BEGIN
    SELECT RAISE(ABORT, 'El stock no puede ser negativo');
END;

-- Trigger para actualizar updated_at en shipments
CREATE TRIGGER IF NOT EXISTS update_shipments_timestamp
AFTER UPDATE ON shipments
FOR EACH ROW
BEGIN
    UPDATE shipments SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger para registrar cambios de estado en historial
CREATE TRIGGER IF NOT EXISTS log_shipment_status_change
AFTER UPDATE OF status ON shipments
FOR EACH ROW
WHEN NEW.status != OLD.status
BEGIN
    INSERT INTO shipment_status_history (shipment_id, status, notes, changed_by)
    VALUES (NEW.id, NEW.status, 'Estado actualizado', 'system');
    
    UPDATE shipments SET
        mensajero_at = CASE WHEN NEW.status = 'en_mensajero' THEN CURRENT_TIMESTAMP ELSE mensajero_at END,
        en_camino_at = CASE WHEN NEW.status = 'en_camino' THEN CURRENT_TIMESTAMP ELSE en_camino_at END,
        entregado_at = CASE WHEN NEW.status = 'entregado' THEN CURRENT_TIMESTAMP ELSE entregado_at END
    WHERE id = NEW.id;
END;

-- ========================================
-- NUEVAS TABLAS PARA REQUERIMIENTOS
-- ========================================

-- Tabla de Clientes (extendida de users)
CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabla de IntentosLogin
CREATE TABLE IF NOT EXISTS intentos_login (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    exitoso BOOLEAN NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    fecha_intento DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Ventas (registro detallado)
CREATE TABLE IF NOT EXISTS ventas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    cantidad INTEGER NOT NULL,
    precio_unitario DECIMAL(10, 2) NOT NULL,
    fecha_venta DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Tabla de Encuestas
CREATE TABLE IF NOT EXISTS encuestas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    purchase_id INTEGER,
    puntuacion INTEGER NOT NULL CHECK(puntuacion >= 1 AND puntuacion <= 5),
    comentario TEXT,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE SET NULL
);

-- Tabla de Sugerencias
CREATE TABLE IF NOT EXISTS sugerencias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    titulo TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    estado TEXT DEFAULT 'Pendiente' CHECK(estado IN ('Pendiente', 'En Revision', 'Implementada', 'Rechazada')),
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabla de Preguntas Frecuentes
CREATE TABLE IF NOT EXISTS preguntas_frecuentes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pregunta TEXT NOT NULL,
    respuesta TEXT NOT NULL,
    categoria TEXT,
    orden INTEGER DEFAULT 0,
    activo BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Chat en Línea
CREATE TABLE IF NOT EXISTS mensajes_chat (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sala_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    mensaje TEXT NOT NULL,
    tipo TEXT DEFAULT 'texto' CHECK(tipo IN ('texto', 'imagen', 'archivo')),
    leido BOOLEAN DEFAULT 0,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabla de Bitácora de Actividades
CREATE TABLE IF NOT EXISTS bitacora (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    accion TEXT NOT NULL,
    tabla_afectada TEXT,
    registro_id INTEGER,
    descripcion TEXT,
    ip_address TEXT,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Tabla de Reportes Diarios
CREATE TABLE IF NOT EXISTS reportes_diarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha DATE NOT NULL UNIQUE,
    cantidad_productos_vendidos INTEGER DEFAULT 0,
    ingresos_totales DECIMAL(10, 2) DEFAULT 0,
    productos_stock_bajo TEXT,
    generado_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Recuperación de Contraseñas
CREATE TABLE IF NOT EXISTS recuperacion_password (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    nueva_password TEXT,
    usado BOOLEAN DEFAULT 0,
    fecha_expiracion DATETIME NOT NULL,
    fecha_solicitud DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabla de Sesiones Activas
CREATE TABLE IF NOT EXISTS sesiones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    ultimo_acceso DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    user_agent TEXT,
    activa BOOLEAN DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabla de FAQs
CREATE TABLE IF NOT EXISTS faqs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pregunta TEXT NOT NULL,
    respuesta TEXT NOT NULL,
    categoria TEXT NOT NULL,
    orden INTEGER DEFAULT 0,
    activo BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Índices adicionales
CREATE INDEX IF NOT EXISTS idx_categories_gender ON categories(gender);
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active);
CREATE INDEX IF NOT EXISTS idx_clientes_user ON clientes(user_id);
CREATE INDEX IF NOT EXISTS idx_intentos_email ON intentos_login(email);
CREATE INDEX IF NOT EXISTS idx_intentos_fecha ON intentos_login(fecha_intento);
CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas(fecha_venta);
CREATE INDEX IF NOT EXISTS idx_ventas_producto ON ventas(product_id);
CREATE INDEX IF NOT EXISTS idx_encuestas_user ON encuestas(user_id);
CREATE INDEX IF NOT EXISTS idx_sugerencias_user ON sugerencias(user_id);
CREATE INDEX IF NOT EXISTS idx_mensajes_sala ON mensajes_chat(sala_id);
CREATE INDEX IF NOT EXISTS idx_mensajes_user ON mensajes_chat(user_id);
CREATE INDEX IF NOT EXISTS idx_bitacora_user ON bitacora(user_id);
CREATE INDEX IF NOT EXISTS idx_bitacora_fecha ON bitacora(fecha);
CREATE INDEX IF NOT EXISTS idx_recuperacion_token ON recuperacion_password(token);
CREATE INDEX IF NOT EXISTS idx_sesiones_token ON sesiones(token);
CREATE INDEX IF NOT EXISTS idx_sesiones_user ON sesiones(user_id);
CREATE INDEX IF NOT EXISTS idx_faqs_categoria ON faqs(categoria);
CREATE INDEX IF NOT EXISTS idx_faqs_activo ON faqs(activo);

-- P0: ownership independent of messages.
CREATE TABLE IF NOT EXISTS salas_chat (sala_id TEXT PRIMARY KEY, owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);

CREATE TABLE IF NOT EXISTS checkout_requests (
 user_id INTEGER NOT NULL REFERENCES users(id),
 idempotency_key TEXT NOT NULL,
 fingerprint_version INTEGER NOT NULL DEFAULT 1 CHECK(fingerprint_version=1),
 request_hash TEXT NOT NULL CHECK(length(request_hash)=64),
 state TEXT NOT NULL DEFAULT 'ready' CHECK(state IN ('ready','committed')),
 purchase_id INTEGER UNIQUE REFERENCES purchases(id) ON DELETE RESTRICT,
 response_status INTEGER,
 response_json TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(user_id,idempotency_key),
 CHECK((state='ready' AND purchase_id IS NULL AND response_status IS NULL AND response_json IS NULL) OR (state='committed' AND purchase_id IS NOT NULL AND response_status=200 AND response_json IS NOT NULL))
);
CREATE TABLE IF NOT EXISTS checkout_effects (
 purchase_id INTEGER PRIMARY KEY REFERENCES purchases(id) ON DELETE RESTRICT,
 save_method TEXT NOT NULL CHECK(save_method IN ('pending','running','succeeded','failed','unknown','not_required')),
 shipment TEXT NOT NULL DEFAULT 'pending' CHECK(shipment IN ('pending','running','succeeded','failed','unknown','not_required')),
 invoice_files TEXT NOT NULL DEFAULT 'pending' CHECK(invoice_files IN ('pending','running','succeeded','failed','unknown','not_required')),
 shipping_email TEXT NOT NULL DEFAULT 'pending' CHECK(shipping_email IN ('pending','running','succeeded','failed','unknown','not_required')),
 invoice_email TEXT NOT NULL DEFAULT 'pending' CHECK(invoice_email IN ('pending','running','succeeded','failed','unknown','not_required')),
 metadata_json TEXT NOT NULL,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
