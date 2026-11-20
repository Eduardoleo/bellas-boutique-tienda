# Diseño P0 — antes de implementar
Fecha: 2026-10-14. Base c358f20; 57 pruebas aprobadas en copia aislada.

Chat: tabla salas_chat con owner_id explícito e inmutable. POST /chat/salas crea sala con ID aleatorio desde servidor y dueño autenticado. Administrador/Vendedor vigentes atienden todas; Cliente solo owner_id. Ningún INSERT de mensaje otorga pertenencia. Salas anteriores se preservan con owner_id NULL, disponibles solo para soporte hasta asignación revisada; no inferir dueño de mensajes potencialmente contaminados. Frontend crea sala en servidor, conserva respuestas de mensajes.

Tracking: GET público mantiene success/shipment/history pero DTO por lista permitida de estado y fechas; historia solo status/created_at. GET /:trackingNumber/private requiere sesión y propietario de compra, sin privilegio administrativo implícito. UI pública elimina bloque de datos personales.

Sesiones: JWT contiene sid aleatorio; sesiones.token guarda solo sid:SHA256(sid), nunca JWT. Middleware valida sesión activa y estado/rol actual del usuario. Refresh conserva sid (familia), nuevo jti y exp 10m: logout con cualquier token válido de familia la revoca entera, también ante carrera con refresh. Refresh revalida dentro BEGIN IMMEDIATE. Login revalida credenciales dentro transacción para no reactivar acceso tras reset concurrente. Suspensión revoca sesiones en transacción; rol efectivo se lee siempre de SQLite.

Reset: contraseña, consumo de todos los tokens pendientes del usuario y revocación de sesiones se confirman en una única transacción. Reintento/expiración mantienen contrato 200/400. Refresh/reset entre conexiones se serializan por BEGIN IMMEDIATE.

Actualización: esquema nuevo añade salas_chat; migración explícita, idempotente, destino BB_SQLITE_PATH requerido. Preserva usuarios/compras/mensajes; invalida y reemplaza tokens antiguos por hash para forzar nuevo login. Startup viejo falla cerrado hasta migración. No ejecutar sobre base original. Tests instalan nuevo y actualizan fixture antiguo. Dobles de tests antiguos adaptan sesión vigente sin quitar assertions. No se cambia precio/stock/pago ni RF05–14.
