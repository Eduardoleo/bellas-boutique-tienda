# Bellas Boutique - Propuesta Comercial y Estrategia de Produccion

**Caso de estudio:** [en español](https://eduardoleo.github.io/proyectos/bellas-boutique/) · [in English](https://eduardoleo.github.io/en/projects/bellas-boutique/)

## 1) Resumen Ejecutivo
Bellas Boutique es una plataforma de comercio electronico fullstack para venta de ropa y accesorios, construida con React + Node.js + Express + SQLite, con enfoque en:

- Venta en linea con carrito y checkout
- Gestion administrativa (reportes, inventario, pedidos)
- Facturacion automatizada (PDF/XML)
- Seguimiento de envios
- Soporte al cliente (FAQ, encuestas, sugerencias y chat)
- Asistente conversacional para autoservicio

Este documento esta orientado a presentarlo a un cliente final y definir como operarlo en produccion de forma profesional.

---

## 2) Que se le vende al cliente

### Producto principal
Una tienda en linea lista para operar, con panel administrativo y procesos clave digitalizados.

### Valor de negocio
- Reduce tiempo operativo con automatizaciones (facturas, reportes, alertas de stock)
- Mejora experiencia de cliente (chatbot, tracking, soporte)
- Centraliza ventas, productos, usuarios y pedidos en una sola plataforma
- Permite control de roles (Administrador, Vendedor, Cliente)

### Modulos incluidos
- Autenticacion y autorizacion con JWT
- Catalogo por categorias y genero
- Carrito y proceso de compra
- Metodos de pago guardados
- Facturacion y envio de comprobantes
- Tracking de pedidos
- Reporteria operativa y comercial
- Soporte (FAQ + encuestas + sugerencias + chat)
- Chatbot con base de conocimiento local

---

## 3) Alcance Tecnico Actual (estado real del proyecto)

### Frontend
- React 18 + Vite
- Ruteo con react-router-dom
- Configurable por variable VITE_API_URL

### Backend
- Node.js + Express
- API REST modular (auth, users, cart, catalog, payments, tracking, support, reports, categories)
- Seguridad base: validaciones, sanitizacion, JWT, rate limiting en memoria
- Cron jobs para tareas operativas (reportes y limpieza)

### Base de datos
- SQLite con esquema amplio:
  - usuarios, productos, stock, carrito, compras, facturas, pagos guardados, envios
  - bitacora e intentos de login
  - encuestas y sugerencias

### Integraciones implementadas
- Generacion de PDF para factura
- Generacion de XML de factura
- Envio de correo (Nodemailer)

Nota comercial importante: el flujo de pago existe a nivel de plataforma, pero para produccion empresarial se recomienda integrar pasarela certificada (ej: Stripe, BAC, Tilopay, etc.) y no procesar datos sensibles de tarjeta de forma directa en backend propio.

---

## 4) Entregables para el cliente

- Plataforma web ecommerce (frontend + backend)
- Base de datos inicial y scripts de inicializacion
- Manual tecnico de despliegue
- Manual operativo para equipo de negocio
- Capacitacion inicial (administracion y soporte)
- Soporte de post-implementacion (segun plan contratado)

---

## 5) Requerimientos para Produccion

### Infraestructura minima (MVP)
- 1 servidor Linux (Ubuntu 22.04 recomendado)
- 2 vCPU
- 4 GB RAM
- 40-80 GB SSD
- Dominio y DNS
- Certificado SSL (Lets Encrypt)

### Software base
- Node.js 20 LTS
- NPM 10+
- PM2 (process manager)
- Nginx (reverse proxy)
- Git

### Variables y secretos
Se deben definir como minimo:
- PORT
- JWT_SECRET
- EMAIL_USER
- EMAIL_PASS
- VITE_API_URL (frontend build)

Nunca almacenar secretos en el repositorio.

---

## 6) Estrategia recomendada de puesta en produccion

### Enfoque por fases

### Fase 1 - Preproduccion (staging)
- Clonar el proyecto en servidor de pruebas
- Configurar variables de entorno reales de staging
- Probar: login, compra, factura, correo, tracking, reportes
- Validar rendimiento inicial y flujo de errores

### Fase 2 - Produccion controlada
- Publicar con dominio oficial + SSL
- Monitoreo diario la primera semana
- Correccion rapida de incidencias
- Activar respaldos automaticos y rotacion de logs

### Fase 3 - Escalamiento
- Separar frontend y backend en servicios independientes
- Migrar de SQLite a PostgreSQL/MySQL cuando suba el trafico
- Agregar Redis para rate limit/sesiones/colas
- Implementar CI/CD completo

### Flujo tecnico de deployment (recomendado)
1. Compilar frontend (Vite build)
2. Levantar backend con PM2
3. Publicar frontend estatico via Nginx
4. Exponer backend por Nginx en /api
5. Activar HTTPS
6. Ejecutar smoke tests
7. Habilitar monitoreo y alertas

---

## 7) Operacion y mantenimiento

### Mantenimiento correctivo
- Correccion de errores funcionales y tecnicos
- Atencion de incidentes por prioridad (SLA)

### Mantenimiento preventivo
- Actualizacion de dependencias
- Revision de logs y seguridad
- Verificacion de respaldos y restauracion
- Reindexacion/limpieza operativa de datos historicos

### Mantenimiento evolutivo
- Nuevas funcionalidades por iteraciones
- Mejoras de UX y conversion
- Integraciones externas (pasarela pago, ERP, CRM)

### Propuesta de SLA (ejemplo)
- Critico (caida total): respuesta 1-2 horas
- Alto (checkout o login afectado): respuesta 4 horas
- Medio (modulo secundario): respuesta 1 dia habil
- Bajo (ajustes menores): respuesta 2-5 dias habiles

---

## 8) Seguridad y cumplimiento (recomendaciones)

Para venderlo de forma empresarial, incluir:
- Politica de contrasenas y rotacion de secretos
- Restriccion CORS por dominio en produccion
- WAF basico o reglas anti-bot
- Backups diarios + backup semanal externo
- Politica de retencion de logs
- Integracion con pasarela certificada PCI para tarjetas

---

## 9) Riesgos y mitigacion

- SQLite en alta concurrencia
  - Mitigacion: migracion planificada a PostgreSQL

- Rate limiting en memoria
  - Mitigacion: mover a Redis para ambientes con multiples instancias

- Dependencia de correo SMTP simple
  - Mitigacion: usar proveedor transaccional (SendGrid, SES, Mailgun)

- Pago sin gateway certificada
  - Mitigacion: integrar pasarela externa antes de escalar comercialmente

---

## 10) Modelo de venta sugerido (para presentar al cliente)

### Opcion A - Implementacion base
Incluye instalacion, configuracion, capacitacion y salida a produccion inicial.

### Opcion B - Implementacion + soporte mensual
Incluye opcion A + mesa de ayuda + mantenimiento preventivo + reportes de salud.

### Opcion C - Implementacion + evolucion continua
Incluye opcion B + backlog mensual de mejoras y optimizacion comercial.

Esto permite vender no solo el desarrollo, sino un servicio continuo de valor.

---

## 11) Roadmap recomendado (90 dias)

- Semana 1-2: hardening tecnico (secrets, CORS, SSL, backups)
- Semana 3-4: staging y pruebas integrales
- Semana 5: go-live controlado
- Semana 6-8: estabilizacion y optimizacion
- Semana 9-12: nuevas mejoras de negocio

---

## 12) Guia rapida para correr localmente

### Requisitos
- Node.js 20+
- NPM 10+

### Instalación y arranque seguro

Requisitos: Node.js 20+ y dependencias compatibles con el lockfile. Instalar paquetes
solo al preparar un entorno propio, con autorización; esta implementación reutilizó
las dependencias existentes y no ejecutó npm install/ci.

Desde la raíz del proyecto (PowerShell):

```powershell
npm.cmd ci
npm.cmd --prefix server ci
npm.cmd --prefix client ci
# Copiar la plantilla solo si .env no existe; no sobrescribir configuración propia.
if (-not (Test-Path -LiteralPath .env)) { Copy-Item -LiteralPath .env.example -Destination .env }
# Configurar JWT_SECRET con un valor propio fuera del código.
# Elegir un archivo NUEVO en un directorio existente y descartable:
$demoFolder = Join-Path ([IO.Path]::GetTempPath()) ('boutique-demo-' + [guid]::NewGuid())
New-Item -ItemType Directory -Path $demoFolder | Out-Null
$env:BB_SQLITE_PATH = Join-Path $demoFolder 'demo.sqlite'
npm.cmd run init-db
if ($LASTEXITCODE -ne 0) { throw 'Inicialización rechazada; no continuar.' }
npm.cmd run check-db
if ($LASTEXITCODE -ne 0) { throw 'Base no válida; no arrancar.' }
# Opcional: catálogo ficticio, sin cuentas. Solo sobre la base demo vacía anterior.
$env:BB_DEMO_DATABASE = '1'
npm.cmd run seed-demo
$env:BB_DEMO_DATABASE = '0'
npm.cmd run dev
```

Para una base ya existente, omitir init-db y seed-demo: seleccionar BB_SQLITE_PATH,
ejecutar check-db y arrancar. No se eliminan ni migran bases durante el arranque.
La API no escucha hasta que SQLite abre correctamente y se verifica el esquema.
Si falta la base o está incompleta, devuelve error de proceso; no crea un archivo vacío.
check-db es de solo lectura, no una certificación de integridad funcional completa.

Frontend: http://localhost:5173. Backend: http://localhost:4000 (o PORT configurado).
run_all.bat solo verifica SQLite y llama npm run dev; no instala dependencias,
no mata procesos, no inicializa ni resetea bases. No se ejecutó el BAT en las pruebas.

### Rutas y variables (BB-08)

- BB_SQLITE_PATH: ruta absoluta o relativa a server/, independiente del cwd.
  Valor predeterminado: server/database.sqlite. No admite URI ni :memory:.
- Esquema fijo: server/database/schema.sql. No depende de la computadora.
- Entorno: variables del proceso tienen prioridad; después server/.env y luego
  .env de la raíz. Un .env en el directorio de ejecución externo no se carga.
- Todos los scripts SQLite comparten el mismo resolvedor. Mantenimiento abre
  solo bases existentes; diagnóstico usa modo de solo lectura donde corresponde.
- init-db rechaza base, directorio o sidecars SQLite ya existentes. El padre
  debe existir; publicación mediante enlace físico sin reemplazo requiere soporte
  del sistema de archivos. No hay fallback que sobrescriba.

Comandos equivalentes de backend desde la raíz: npm --prefix server run init-db,
npm --prefix server run check-db, npm --prefix server start y npm --prefix server test.
Desde server/: npm run init-db, npm run check-db, npm start y npm test.
Desde otro directorio: node /ruta/al/proyecto/server/scripts/initDatabase.js y
node /ruta/al/proyecto/server/server.js, conservando BB_SQLITE_PATH en el entorno.

### Migraciones separadas

npm run migrate ejecuta únicamente el script aditivo heredado de columnas de envío
sobre una base existente. No se ejecuta durante init-db, check-db ni arranque;
requiere respaldo y revisión del propietario antes de usarlo sobre datos conservados.
Esta fase no cambió schema.sql, no añadió migraciones y no ejecutó
migraciones sobre la base del proyecto. Se verificó el script solo con fixtures temporales.


---

## 13) Siguiente paso comercial

Antes de una venta formal, se recomienda preparar:
- Demo funcional con datos de prueba
- Cotizacion por paquete (A/B/C)
- Acuerdo de niveles de servicio (SLA)
- Plan de evolucion de 3 meses

Con esto, el proyecto se presenta como una solucion profesional, mantenible y escalable, no solo como una aplicacion academica.

## Equipo y contribuciones

Proyecto desarrollado en equipo de 3 estudiantes en la UIA (curso Diseño Humano-Computadora, 2025).

**Mi contribución:** desarrollo principal: base de datos, back end y front end. Proyecto académico en equipo; los compañeros contribuyeron con correcciones puntuales.

## Derechos

© 2025–2026 Eduardo León Hernández. Todos los derechos reservados (ver [LICENSE](LICENSE)).
El código se publica como muestra de trabajo: se puede ver y evaluar, pero no copiar,
modificar, distribuir ni reutilizar sin permiso escrito.

## Estado de esta copia

Copia de trabajo con remoto configurado. Correcciones locales sin push en esta fase.
Arranque HTTP y pruebas de seguridad verificados con bases temporales; no todos los flujos.
Usar .env.example como referencia y configurar las variables del servidor. Los scripts createAdmin y generateHash requieren DEMO_ADMIN_PASSWORD y solo deben usarse con una base de prueba. No imprimen contrasenas. No se ejecutaron scripts SQL ni de reseteo.


## Correcciones locales de seguridad

BB-01: el registro público crea solo Cliente. BB-02: recuperación mediante token
hashed, vencimiento y uso único; no devuelve ni cambia contraseñas al solicitar.
Sin EMAIL_USER/EMAIL_PASS no se envía correo; la respuesta no promete entrega.
La interfaz de reset aún no está implementada; el endpoint es POST /api/auth/reset-password.
BB-03: precios y totales vienen del servidor. Se conserva envío gratis solo si
subtotal > 50000; en otro caso, 3000, según la regla anterior de FloatingCart.
BB-04: enteros positivos, agregación de duplicados y descuento condicionado;
checkout se serializa por proceso. Concurrencia entre procesos sigue por verificar.
BB-05: descargas exigen autenticación, propietario y nombre de archivo válido.
BB-07: cliente usa Vite con scripts de dev/build/preview.
BB-09: pago simulado, estado simulated; no hay pasarela ni cobro real.

Pruebas locales: `npm test` desde la raíz o `npm --prefix server test`.
BB-06: init-db crea solo esquema en un destino nuevo y nunca sobrescribe una base.
recreate-db está bloqueado; seed-demo es una operación explícita sobre una base demo vacía.
No se tocó database.sqlite ni se enviaron correos reales.
Ramas locales encadenadas, una por hallazgo; PR remotos pendientes de aprobar push.


### Evidencia y limitaciones de estas ramas

Seis pruebas automáticas aprobadas: rol público fijo, recuperación con token
(uso único y expiración), cotización del servidor, cantidades, checkout concurrente
en SQLite temporal, autorización HTTP de facturas. El build
del cliente por `npm run build` pasó. Correo, PDF y envíos se simularon en las
pruebas de compra: no se enviaron mensajes ni se valida aquí su entrega/generación.
La recuperación por API está implementada; formulario de reset, envío real y
revocación inmediata de sesiones existentes siguen pendientes. Concurrencia con
otras escrituras y entre procesos no está verificada. No usar tarjetas reales.

## Inicialización segura (BB-06)

init-db solo crea el esquema existente, sin modificarlo y sin cargar datos.
Una base existente, incluso vacía, se rechaza con código 1 y se conserva íntegra.
Se construye SQLite en un archivo temporal del mismo directorio y se publica mediante
enlace físico exclusivo; si el destino aparece durante la ejecución, no se reemplaza.
El directorio padre debe existir y el sistema de archivos debe soportar enlaces físicos.
No hay flags force/reset/overwrite. recreate-db siempre falla sin abrir una base.

Los datos demo se cargan por separado con seed-demo, BB_DEMO_DATABASE=1 y
BB_SQLITE_PATH explícita. Solo admite una base inicializada sin datos y añade un
catálogo ficticio mínimo; no crea cuentas ni contraseñas. La semilla demo se genera
desde cero en código: no hay archivos SQL con datos ni hashes de contraseñas.
Migrar una base existente es otra operación:
requiere revisión y respaldo; init-db y seed-demo no migran ni resetean.

Pruebas: npm test desde la raíz o npm --prefix server test. Solo usan bases temporales.

BB-08: rutas compartidas, conexión sin creación implícita, validación antes de escuchar
y check-db de solo lectura. Las pruebas nuevas verifican init/check/HTTP desde raíz,
server y un directorio externo. El esquema y el frontend permanecen intactos.

## Errores y registros del backend (BB-10)

Los fallos inesperados retornan HTTP 500 con success=false, un mensaje fijo,
code=INTERNAL_ERROR y errorId. Los errores de negocio tipados conservan códigos
400/404/409; autenticación distingue 401/403. JSON inválido retorna 400 y cuerpos
excesivos 413. X-Request-Id lo genera el servidor; no se confía en un ID del cliente.

Los logs del backend operativo contienen eventos, identificadores aleatorios y
metadatos técnicos permitidos. No imprimen errores completos, SQL, stack traces,
request bodies, cookies, tokens, correos ni IP. Los scripts administrativos conservan
sus registros heredados y requieren una revisión separada; no se cambiaron en BB-10.

SQLite comparte una cola por conexión. Las operaciones de varias escrituras y sus
bitácoras usan transacciones esperadas; los modelos llamados dentro de una transacción
se incorporan a ella. Si rollback falla, la conexión queda bloqueada para nuevas
operaciones por esta capa y requiere intervención/reinicio; no se informa éxito.
La cola de un proceso no certifica concurrencia entre procesos independientes.

Después de registrar una compra simulada, los efectos de envío, PDF/XML o correo
pueden fallar: desde RF-07/08 el POST conserva un snapshot estable de confirmación
con completion=partial y warnings=[EFFECTS_PENDING]; el GET de checkout muestra efectos actuales. No repetir la compra para reintentar esos efectos. email_sent solo se marca
cuando el envío de correo de factura terminó correctamente. No hay outbox/reintentos
persistentes nuevos. Recuperación de contraseña devuelve 500 ante fallo inesperado
de SQLite/entrega, en lugar de un 202 falso; la cuenta ausente y el correo deshabilitado
mantienen la respuesta genérica prevista.

Pruebas: npm test desde la raíz. Se conservan las 21 anteriores y se agregan casos
negativos de BB-10 con SQLite en memoria, archivos temporales y HTTP local. Las
pruebas nuevas sustituyen SMTP/PDF y cron; no envían correo ni usan la base existente.
La fixture de BB-01 añade solo un stub de la frontera transaccional; sus aserciones
de roles se conservan. El total verificado y los límites están en el reporte BB-10.

## Seguridad P0 (RF-01 a RF-04)

El backend valida sesión activa y estado/rol vigentes para cada petición. JWT mantiene Bearer y token en login/refresh; expira en 10 minutos. El identificador aleatorio sid se almacena solo como hash en sesiones.token. Refresh conserva la familia de sesión: tokens anteriores de esa familia siguen válidos hasta su expiración, pero logout, suspensión y reset la revocan íntegramente. Un nuevo login conserva la política anterior de una sesión activa por cuenta. Claims de rol antiguos no conceden permisos.

El reset mantiene POST /api/auth/reset-password y 200/400. Cambia contraseña, consume todos los tokens pendientes del usuario y revoca todas sus sesiones en una transacción. Refresh revalida dentro de la transacción; una renovación anterior al reset queda revocada cuando este confirma.

Chat: POST /api/support/chat/salas con {} crea sala del usuario autenticado y devuelve {success,sala_id}. Los identificadores ya no se inventan en frontend. Administrador y Vendedor pueden listar, leer, responder y marcar todas las salas; Cliente solo salas con owner_id propio. Mensajes no crean pertenencia. Las respuestas anteriores de mensajes/salas se conservan. Sala ajena o inexistente devuelve 404.

GET /api/tracking/:trackingNumber sigue siendo público y retorna solo seguimiento, estado, fechas e historial de estado/fecha. No expone destinatario, teléfono, dirección, mensajero ni notas/historial privado. GET /api/tracking/:trackingNumber/private requiere sesión y propietario real de la compra (otro usuario 404). La página pública muestra únicamente estados; la API privada no añade acceso administrativo implícito.

### Instalación y actualización

Una instalación nueva con init-db contiene salas_chat. Una base anterior requiere actualización explícita antes del arranque: la validación falla cerrada si falta la tabla. No ejecutar init-db sobre una base existente.

1. Detener escritores y respaldar de forma consistente. Probar primero sobre una copia desechable separada, nunca sobre la base original del proyecto durante verificaciones.
2. Desde la raíz, establecer BB_SQLITE_PATH al archivo de esa copia existente y ejecutar node server/scripts/migrateSecurityP0.js --confirm-security-p0. El destino y la confirmación son obligatorios; la operación es transaccional e idempotente. No usar el comando migrate heredado para esta actualización.
3. Ejecutar npm run check-db con el mismo destino explícito y luego probar login/refresh/logout. La actualización invalida sesiones de formato antiguo y reemplaza sus JWT por hashes legacy:; todos los usuarios afectados deben iniciar sesión de nuevo.
4. Usuarios, compras y mensajes permanecen. Las salas antiguas quedan con owner_id NULL: solo Administrador/Vendedor pueden atenderlas. No se infiere dueño a partir de mensajes susceptibles de contaminación. La asignación histórica necesita revisión fuera de esta entrega; ningún script la automatiza. Repetir el migrador no revoca sesiones nuevas ni reasigna salas.

No restaurar solo el esquema para volver a código antiguo: ese código interpretaría hashes como JWT y no aporta la protección P0. Usar respaldo consistente en un procedimiento revisado. No se añadieron dependencias ni cambiaron precios, stock o pago simulado.

Pruebas: npm test. Los casos P0 usan SQLite temporal y HTTP real; SMTP/cron se sustituyen, sin credenciales ni base reales. Incluyen dos clientes, Administrador, Vendedor, carreras entre procesos, recuperación, propiedad de facturas y preservación al actualizar. RF-05 a RF-14 siguen pendientes y esta entrega no habilita una demo pública.

## Checkout único e idempotente (RF-07/RF-08)

POST /api/payments/process requiere Bearer vigente e Idempotency-Key UUID v4. El body
es el del pago simulado actual. El usuario proviene de la sesión, no del body. Clave
y contenido iguales devuelven el mismo POST 200 confirmado. Otra solicitud con esa
clave devuelve 409 IDEMPOTENCY_KEY_CONFLICT, incluso si la compra anterior falló.
Cada cuenta tiene su propio espacio de claves. Precio/IVA/envío/stock mantienen las
reglas previas; catálogo y stock se validan dentro de la transacción.

La fila ready vincula contenido sin reservar inventario ni impedir retry del mismo
body. Compra, items, stock, ventas, movimientos, factura, plan de efectos y snapshot
committed se confirman juntos. Error previo al commit deja ready reintentable. Un
replay confirmado precede a cotización/tarjeta mutable y no ejecuta efectos otra vez.
No se purgan registros confirmados automáticamente. SQLite busy/locked comprobado
devuelve 503 CHECKOUT_BUSY y Retry-After: 1; repetir con la misma clave y body.

El POST 200 conserva success/paymentStatus=simulated/IDs/consecutivo y un snapshot
inicial completion=partial, trackingNumber=null, warnings=[EFFECTS_PENDING].
GET /api/payments/checkouts/:key, autenticado y privado por cuenta, devuelve
confirmation estable, effects actuales, completion y trackingNumber actual.
Otro usuario o clave aún no confirmada recibe 404. Un 404 durante petición en vuelo
NO autoriza crear una intención nueva: consultar después/reintentar el mismo body.

Efectos: guardar metadata de método opcional, crear shipment, generar PDF/XML, correo
de envío y correo de factura. Shipment es único por purchase_id; estado y escritura
SQLite se agrupan. Archivos temporales se publican solo tras terminar ambos; paths
se registran después. Un fallo no declara archivo generado ni revierte compra.
SMTP requiere aceptación explícita del destinatario para succeeded/email_sent.
Error o respuesta incierta no se reenvía automáticamente. Running persistido se
muestra como unknown; puede corresponder a trabajo en curso o a proceso caído.
No hay recuperación automática avanzada: pendientes necesitan revisión separada.

POST /api/cart/checkout requiere autenticación y siempre devuelve 410
CHECKOUT_ENDPOINT_RETIRED sin escribir. El helper antiguo y método interno fallan
cerrados. CRUD de carrito, historial y detalles siguen disponibles.

### Configuración y actualización segura

BB_CHECKOUT_HASH_SECRET es obligatorio, exclusivo del servidor y de al menos
32 bytes aleatorios. Generarlo y guardarlo localmente sin publicarlo/registrarlo;
no existe valor de ejemplo que deba copiarse. No usar JWT_SECRET para esta función.
Mantenerlo estable con los respaldos. La huella HMAC versionada no persiste el body
ni PAN/CVV. Rotar ese secreto requiere un procedimiento posterior aprobado para
comparar registros existentes; no borrar claves para resolver conflictos.

Instalación nueva: init-db seguro añade checkout_requests y checkout_effects
(27 tablas de aplicación). Base anterior: respaldo consistente y escritores
detenidos; ensayar primero en copia desechable separada con BB_SQLITE_PATH explícito.
Desde la raíz: npm --prefix server run migrate-checkout -- --confirm-checkout.
Luego npm run check-db con el mismo destino y arrancar con el secreto configurado.
Migrador idempotente y transaccional; no crea claves para compras históricas ni
cambia importes/estados previos. No ejecutar sobre la base original del proyecto
en verificaciones. Arranque falla cerrado si faltan tablas/columnas o secreto.
Las FK conservan relaciones confirmadas: borrar cuentas/compras con registros de
checkout requiere una política explícita posterior, no limpieza accidental.

El frontend guarda solo userId/clave/confirmación no sensible en sessionStorage;
body congelado únicamente en memoria. Doble clic se bloquea y retry reutiliza
solicitud/clave. Timeout incierto no crea otra clave. Después de recarga se consulta
el estado; sin body en memoria no se reenvía el formulario automáticamente. Cambio
de usuario limpia la intención y descarta respuestas tardías de la anterior.
Una corrección de solicitud con error previo confirmado necesita acción explícita;
no se limpia automáticamente ante 409 de conflicto/timeout/500. El pago sigue siendo
simulado; documentos/correos pendientes se distinguen de compra registrada.

Pruebas: npm test. Se mantienen los 83 casos previos (fixtures adaptadas a clave y
esquema; rollback secundario trasladado al motor principal con falla SQL real).
Se añaden HTTP multiproceso, muerte antes/después de commit, replay, migración,
privacidad y pruebas de intención frontend, todo con destinos y datos ficticios.
RF-06, RF-09 avanzado y RF-11 a RF-14 continúan pendientes.

## RF-06: respuestas públicas de autenticación

Login rechazado por correo desconocido, contraseña incorrecta o cuenta inactiva
retorna 401, code INVALID_CREDENTIALS y el mismo mensaje genérico. El éxito
conserva token/user y la revalidación transaccional de sesión/estado. Se realiza
bcrypt también cuando no existe la cuenta; no se promete tiempo constante.

POST /api/auth/forgot-password conserva 202 y el mensaje genérico. Significa
solicitud aceptada, no correo entregado. La búsqueda de cuenta y la entrega se
procesan asincrónicamente dentro del proceso, sin colas externas. SMTP fallido
se registra mediante safeLogger y se elimina el token correspondiente cuando
SQLite está disponible. Fallos posteriores de procesamiento también se registran;
fallos de validación o preflight global de almacenamiento siguen siendo 400/500.
No se devuelve token ni estado de correo al cliente. Un cierre del proceso puede
interrumpir entregas pendientes: no existe recuperación durable ni garantía de
entrega. Repetir recuperación es posible bajo el rate limiter vigente.

Tokens: hash, 15 minutos y uso único. Reset conserva revocación de sesiones y
consumo de otros tokens pendientes en la misma transacción. Sin cambio de esquema
ni migración para RF-06. Pruebas: npm test; usuarios/SQLite/SMTP ficticios.


## Etapa 1 — RF-12, RF-13 y API (demo local supervisada)

Los servicios y componentes usan client/src/app/config.js: VITE_API_URL es el
ORIGEN/prefijo del backend, sin /api (ejemplo ficticio: http://localhost:4100).
Se normaliza la barra final; el valor predeterminado es http://localhost:4000.
Se conserva el prefijo /api de todas las rutas. No hay proxy Vite alternativo que
compita con esa configuración. Para cambiar sin editar código, en la terminal
del cliente: $env:VITE_API_URL='http://localhost:4100'; npm --prefix client run dev.
El backend debe usar PORT=4100 en su propia terminal y una base demo nueva.
Vite requiere reiniciar el servidor/recompilar al cambiar la variable.
client/.env.example es plantilla pública; no se modificó ningún .env real.
Nunca introducir JWT_SECRET, BB_CHECKOUT_HASH_SECRET ni credenciales SMTP en VITE_*.

El historial mantiene sus campos legítimos, reemplaza pdf_path/xml_path por
has_invoice_pdf/has_invoice_xml (0/1). Perfil descarga PDF/XML con Bearer mediante
fetch/blob; no se transmite JWT en query ni se expone la ruta física del servidor.
GET /api/users/invoice/factura_<consecutivo>.pdf y .xml exige el propietario;
las rutas internas de generación/adjuntos siguen privadas. Los indicadores señalan
paths registrados: no garantizan que un archivo borrado externamente siga disponible.

Recuperación: /login -> /forgot-password -> /reset-password -> /login.
La solicitud conserva 202 genérico (sin token ni confirmación de cuenta/correo);
se pega el token del transporte ficticio y se introduce/confirmar nueva contraseña.
Vence en 15 minutos, es de un uso y reset revoca sesiones/tokens anteriores.
Campos sensibles solo en memoria del componente, sin persistencia de recuperación.

### Buzón ficticio privado, opcional y apagado por defecto

Solo en la terminal del backend de la COPIA DEMO, antes de arrancar:

```powershell
# Carpeta NUEVA, externa al repositorio y NO servida por HTTP:
$demoInbox = Join-Path ([IO.Path]::GetTempPath()) ('boutique-mail-' + [guid]::NewGuid())
New-Item -ItemType Directory -Path $demoInbox | Out-Null
$env:BB_RECOVERY_TRANSPORT = 'local'
$env:BB_RECOVERY_INBOX_DIR = $demoInbox
$env:BB_DEMO_DATABASE = '1'
# BB_SQLITE_PATH debe apuntar a la base ficticia previamente preparada.
# Configurar JWT_SECRET y BB_CHECKOUT_HASH_SECRET sintéticos en esa terminal.
# Sin EMAIL_USER/EMAIL_PASS; no configurar SMTP real para la demo.
npm --prefix server start
```

Cada mensaje JSON privado contiene destinatario ficticio, token y ruta de reset;
solo el responsable local lo abre en un editor para copiar el token al formulario.
No hay endpoint de buzón, no se imprime token/path en logs ni se copia al repositorio.
No poner mensajes en capturas, enlaces públicos ni Git; retirar únicamente esa
carpeta propia tras la demo. Evitar carpetas compartidas/sincronizadas. El archivo
se crea exclusivo con modo 0600 donde el SO lo soporte; en Windows revisar ACL del
directorio privado. Directorio absoluto existente, no symlink, externo al proyecto.
Sin BB_RECOVERY_TRANSPORT, rige SMTP previo (solo si se configura); para garantizar
cero correo real dejar EMAIL_USER/EMAIL_PASS vacíos o elegir local explícitamente.
El transporte ficticio es solo para recuperación: no simula todos los correos de
compra. Para probarlos, usar los fixtures internos; no añadir credenciales reales.
No se añaden endpoints para obtener tokens.

Pruebas: npm test conserva los 119 casos previos y suma stage1.test.cjs. Se requieren
las dependencias ya previstas de server y client (esbuild de Vite se reutiliza para
probar servicios compilados con origen alternativo). SMTP/SQLite/datos son ficticios.
Los tests de handlers con hooks simulados no sustituyen navegador ni accesibilidad.
La aprobación de demo completa requiere revisión visual real de escritorio/móvil.
No RF-09/RF-11/RF-14, cambio de registro, integración Git ni despliegue en esta etapa.

## Etapa 2 — demo ficticia reproducible

La guía vigente de preparación y arranque local es [docs/demo-local.md](docs/demo-local.md).
Usa únicamente un SQLite nuevo explícito en un directorio temporal inexistente.
Comandos: npm --prefix server run demo:prepare, demo:server y demo:client.
No usa scripts administrativos heredados ni lee .env; conserva datos al reiniciar.
Desde cero significa OTRO UUID/directorio, nunca reset destructivo de la base previa.
Cuentas/secretos aleatorios solo en archivo privado externo; SMTP bloqueado, correo
de compra failed y recuperación opcional local apagada por defecto. No es tienda real.
Activos SVG locales originales CC0-1.0; revisión visual pendiente, no demo pública.
