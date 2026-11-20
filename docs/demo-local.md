# Demo local ficticia y reproducible

Solo para recorrido supervisado. Sin cobros, envíos físicos ni destinatarios reales. No habilita producción ni demo pública.

## Requisitos y límites

Se verificó con Node 22.14.0 y npm 10.9.2 en Windows. Tener instaladas las dependencias del proyecto, server y client según sus lockfiles. Esta etapa reutiliza las existentes y no ejecuta npm install/ci. Una instalación limpia de dependencias requiere un ensayo/autorización separado.

La preparación copia **solo código/activos permitidos** a un runtime temporal, omitiendo .env, SQLite, facturas, directorios ocultos y node_modules; reutiliza las dependencias mediante enlaces de directorio. Por eso se arranca desde los comandos demo siguientes, nunca desde el runtime con npm start directo. Vite usa caché dentro de la demo. Se necesita espacio y permiso para crear enlaces y los hard links del inicializador BB-06.

No se necesita ningún archivo SQL con datos ni seedFAQs, createAdmin, unlockAdmin, addShippingColumns, recreate-db ni migradores heredados. No ejecutarlos para este recorrido. El seed-demo anterior sigue disponible, pero solo contiene catálogo mínimo y no se combina con este procedimiento.

## 1. Crear una demo NUEVA

Desde la raíz del repositorio, en PowerShell:

```powershell
$demoRoot = Join-Path ([IO.Path]::GetTempPath()) ('boutique-demo-' + [guid]::NewGuid())
$env:BB_SQLITE_PATH = Join-Path $demoRoot 'demo.sqlite'
# NO crear $demoRoot manualmente: debe ser un destino totalmente inexistente.
npm.cmd --prefix server run demo:prepare
if ($LASTEXITCODE -ne 0) { throw 'Preparación rechazada. No arrancar ni reutilizar ese destino.' }
```

BB_SQLITE_PATH es obligatoria, absoluta, normalizada y con archivo demo.sqlite en un hijo directo del temporal del usuario llamado boutique-demo-UUID. Se rechazan rutas relativas/ambiguas, carpetas ya existentes, bases históricas, symlinks y archivos reemplazados. Los launchers normales también rechazan una preparación incompleta. La preparación no elimina ni sobrescribe un destino, incluso si un intento previo quedó incompleto. Un marcador comprueba identidad de archivo antes de arrancar; sustituir SQLite por otro archivo invalida el marcador y se rechaza antes de abrir SQLite.

El comando crea esquema nuevo, seis productos, cuatro categorías y cuatro cuentas, conversaciones/FAQ, dos compras simuladas con historial/envío y PDF/XML reales de datos ficticios. Usa el checkout existente mediante HTTP loopback, no inserta compras artificiales ni modifica sus reglas. Quedan carritos de ejemplo para continuar comprando. Confirma efectos antes de finalizar y detiene el backend de preparación.

En el directorio externo quedan:

- demo.sqlite: únicamente la base nueva ficticia, con sus sidecars cuando proceda.
- demo.json: marcador de tipo/estado e identidad de archivo, sin contraseñas.
- demo-private.json: contraseñas aleatorias y secretos JWT/HMAC exclusivos; **abrir solo en editor privado**, nunca imprimir, subir, copiar al repo o capturar en pantalla.
- mail/: buzón de recuperación opcional, vacío al preparar.
- runtime/: snapshot de código sin .env ni facturas privadas; los nuevos documentos se generan dentro de este runtime, nunca en el repositorio fuente.

La carpeta y archivos privados solicitan permisos 0700/0600 donde se soporta. En Windows comprobar que las ACL del temporal sean privadas; no usar carpetas compartidas/sincronizadas. Las contraseñas no son fijas ni se documentan públicamente. No usar credenciales personales.

## 2. Backend (terminal A)

Conservar el mismo BB_SQLITE_PATH explícito del paso 1; si se abre otra terminal, asignar la ruta conocida de ESA demo (no una nueva).

```powershell
$env:BB_DEMO_API_PORT = '4100'
$env:BB_DEMO_WEB_PORT = '5173'
$env:BB_DEMO_RECOVERY_LOCAL = '0' # apagado por defecto
npm.cmd --prefix server run demo:server
```

El launcher valida marcador/destino antes de abrir SQLite, carga secretos de demo-private.json, fija BB_DEMO_ISOLATED=1 y BB_DEMO_DATABASE=1 y no lee .env. El backend solo escucha en 127.0.0.1. EMAIL_USER/EMAIL_PASS/sender quedan vacíos y se bloquea adicionalmente createTransport de Nodemailer. Ningún transporte SMTP real puede crearse en este proceso. Los correos de compra se registran failed, no succeeded; el GET de checkout informa partial aunque factura y envío SQLite estén creados. Es el estado correcto, no una invitación a recomprar.

El guard de aislamiento y bind loopback no cambia el arranque ordinario sin esa bandera. No cambiar esos flags para abrir acceso público.

## 3. React (terminal B)

Desde la raíz del repositorio, asignar el mismo BB_SQLITE_PATH y puertos:

```powershell
# $env:BB_SQLITE_PATH = <ruta absoluta de la demo ya preparada>
$env:BB_DEMO_API_PORT = '4100'
$env:BB_DEMO_WEB_PORT = '5173'
npm.cmd --prefix server run demo:client
```

Abrir http://127.0.0.1:5173. El script configura VITE_API_URL=http://127.0.0.1:4100 sin editar archivos, elimina VITE_* heredadas de su proceso y sirve el snapshot de React. Si se cambian puertos, hacerlo igual en ambas terminales y reiniciar los launchers. No exportar secretos como VITE_*.

Vite solo escucha en loopback, con una CSP local que permite red propia/API/HMR loopback y bloquea orígenes externos. Las imágenes de productos/portada son SVG locales originales CC0-1.0 (ver client/public/demo/LICENSE.md). No se descargan fotos, fuentes ni recursos de terceros para el recorrido. Esta CSP es de desarrollo; no certifica una configuración de publicación.

## 4. Cuentas ficticias (sin publicar contraseñas)

| Cuenta | Rol | Uso |
|---|---|---|
| client-a@boutique.example.test | Cliente | Compra/carrito/chat propios |
| client-b@boutique.example.test | Cliente | Aislamiento y rechazo de recursos ajenos |
| admin@boutique.example.test | Administrador | Administración privada del responsable |
| support@boutique.example.test | Vendedor | Atención autorizada de salas |

Obtener la contraseña generada del archivo privado en un editor local. No compartir cuentas administrativas ni usar correos personales. Direcciones “Zona DEMO sin dirección real”, teléfonos de ceros y nombres genéricos son ficticios. No hay tarjetas guardadas reales; en el formulario simulado usar solo datos claramente ficticios (número de ceros/CVV de ceros), nunca una tarjeta personal. No hay cobro ni pasarela bancaria.

## 5. Recuperación opcional sin SMTP

Detener el backend con Ctrl+C y reiniciarlo con BB_DEMO_RECOVERY_LOCAL=1. El launcher fija BB_RECOVERY_TRANSPORT=local y BB_RECOVERY_INBOX_DIR al mail/ externo. Solicitar recuperación en React; el responsable abre el mensaje JSON en editor privado, copia el token al formulario /reset-password y establece una contraseña ficticia nueva. No existe endpoint de buzón ni token en respuesta HTTP/logs.

La respuesta de solicitud no confirma cuenta ni entrega; los tokens conservan 15 minutos/uso único y el reset revoca sesiones. Ningún correo real se envía. Sin modo local, recuperación devuelve aceptación genérica sin generar token. Cerrar el editor y no capturar esos mensajes en evidencia pública.

## 6. Reiniciar con los mismos datos o desde cero

- **Conservar datos:** Ctrl+C en ambos servidores, volver a ejecutar demo:server y demo:client con el mismo BB_SQLITE_PATH. Mantiene compras, stock, claves de idempotencia y JWT/HMAC. Las contraseñas cambiadas por recuperación no vuelven al valor inicial del archivo de provisión.
- **Desde cero:** detener ambos, generar OTRO UUID y BB_SQLITE_PATH nuevo y repetir demo:prepare. Mantener la carpeta anterior intacta. No hay reset destructivo ni opción force. No reutilizar init-db sobre una base existente.
- Si se modifica código fuente, el snapshot existente no se actualiza: preparar otra demo nueva. No reemplazar archivos SQLite dentro de una demo para “restaurar”.

La eliminación de una carpeta anterior es una operación separada: confirmar primero su destino exacto y que no esté en uso. No se incluye ningún comando automático de borrado de bases existentes.

## Verificación automatizada y limitaciones

`npm test`: conserva las 128 pruebas y añade demo-environment.test.cjs. Solo temporales creados por tests; nunca la base original. Comprueba esquema/integridad, preparación repetida en destinos nuevos, rechazo del existente/reemplazado, permisos, compras/documentos, stock, replay, recuperación y reinicio. También arranca Vite y comprueba HTTP/CSP/activos locales. `npm --prefix client run build` valida compilación.

HTTP/build no prueban renderizado, teclado, móvil o consola de navegador. Los siete criterios pendientes de etapa 1 siguen abiertos hasta revisión manual. SMTP y envíos físicos están deshabilitados/simulados; documentos no se certifican fiscalmente; no se implementa recuperación automática de efectos RF-09 ni endurecimiento general de scripts RF-11. JWT localStorage y política de registro no cambian. Esta demo no se despliega ni integra automáticamente a main.


## Correcciones QA etapa 3B y formatos admitidos

Registro admite identificación y teléfono opcionales. Checkout exige identificación.
No existe selector ni columna de tipo documental: el campo es una referencia académica sin
validación oficial. Se admiten 9–12 dígitos sin separadores, cédula física con patrón
0-0000-0000 y referencias alfanuméricas de 4–20 caracteres (letras ASCII, dígitos, guiones
entre grupos). No se afirma validar pasaportes/DIMEX/NITE ni identidad ante instituciones.
No introducir identificación personal: utilizar referencias ficticias. Perfil no permite
cambiar cédula: se conserva ese contrato. Datos históricos y facturas anteriores no se reescriben.

Teléfono opcional: ocho dígitos locales (también 0000-0000 o 0000 0000) o internacional
con + y 7–15 dígitos, sin separadores. El cero de ejemplo es ficticio; no es validación de línea.
Se rechazan tipos no textuales, caracteres extra y valores excesivos en backend antes de escribir.
La interfaz limita entrada y valida lo mismo; datos heredados largos se ajustan en el perfil.

Las nuevas facturas usan Noto Sans OFL para ₡ y dos decimales en base/IVA/totales del PDF.
El XML y los cálculos de SQLite se conservan; documentos académicos sin validación de Hacienda.
Si una demo preparada precede a este commit, su snapshot no se actualiza solo: no resetear
SQLite. Para futuras sesiones seguir la política de destinos nuevos/autorizados de esta guía.

### Regresión visual opcional sin dependencias productivas

Instalar Playwright solo en un directorio temporal de QA si no está disponible. Con los
servidores de demo iniciados exclusivamente en loopback, configurar BB_QA_CLIENT_URL con
su origen React, BB_QA_PLAYWRIGHT_MODULE con la ruta del módulo instalado y
BB_QA_EVIDENCE_DIR con un directorio temporal privado para resultados. Ejecutar:

    node server/tests/browser/stage3b-ui.cjs

Usa Edge headless real, prueba 1366×768, 390×844, 360×800 y 768×1024, menú táctil/teclado,
ausencia de portada vacía/desbordamiento y bloqueo frontend de contactos inválidos.
No inicia sesión, no hace checkout ni envía recuperación. No sustituye todos los recorridos
de seguridad/negocio. Suite HTTP/unidad: npm --prefix server test; build: npm --prefix client run build.


## Etapa 3C: búsqueda y acceso al carrito

El buscador consulta únicamente /api/catalog/women y /api/catalog/men, igual que el
catálogo público. Enter abre /search?q=...; busca por nombre sin distinguir mayúsculas
y recorta espacios exteriores. Los resultados abren el detalle y una búsqueda sin
coincidencias informa explícitamente. No hay endpoints, filtros avanzados ni tablas nuevos.

El carrito flotante es un botón nativo: Tab, Enter/Espacio para abrir y Escape/botón
Cerrar para cerrar; el foco vuelve al control de apertura. Se conserva su ubicación.
El control flotante de chat conserva semántica nativa y se retira del Tab al ocultarse.

Runner de QA completa: node --test server/tests/browser/stage3c-ui.cjs, en copia aislada,
con BB_QA_PLAYWRIGHT_MODULE y BB_QA_EVIDENCE_DIR apuntando a herramientas/evidencias
temporales. Crea fixtures propios descartables, usa loopback y sustituye SMTP; no usa
la base original ni credenciales personales. No equivale a aprobar casos que fallen.
Administrador y Vendedor seleccionan conversaciones previamente autorizadas por GET
/support/chat/salas. El backend conserva la autorización de cada lectura/escritura;
la selección del frontend no concede permisos. El remitente usa usuario_nombre y los
mensajes se marcan leídos solo cuando la conversación está visible.

Los contadores del rate limiter pertenecen a cada instancia: global 150/minuto y
rutas de autenticación 30/minuto, con sus identificadores y respuestas originales.
El runner completo separa catálogo/compra, soporte y recuperación en fixtures nuevos
para no agotar esos límites por acumular cuatro sesiones y polling simultáneos.
Exige resultados de todos los casos y versión real del navegador; una salida vacía
no aprueba QA. La recuperación incluye 31 consultas de catálogo antes del reset.
No ejecutar QA contra bases originales ni compartir buzones o credenciales del fixture.
