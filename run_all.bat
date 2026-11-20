@echo off
setlocal
cd /d "%~dp0"
if not exist "server\node_modules\" (
    echo ERROR: Faltan dependencias del servidor. Consulte README; este script no instala paquetes.
    exit /b 1
)
if not exist "client\node_modules\" (
    echo ERROR: Faltan dependencias del cliente. Consulte README; este script no instala paquetes.
    exit /b 1
)
node server\scripts\checkDatabase.js
if errorlevel 1 (
    echo ERROR: Revise BB_SQLITE_PATH. Use init-db por separado solo para un destino nuevo.
    exit /b 1
)
call npm run dev
exit /b %errorlevel%
