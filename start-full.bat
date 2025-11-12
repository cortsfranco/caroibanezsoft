@echo off
REM =====================================================
REM Script de Inicialización COMPLETA
REM Inicia Frontend, Backend y Database Studio
REM en ventanas separadas
REM =====================================================

title Sistema Nutrición Carolina - Launcher

echo ========================================
echo 🚀 Sistema Nutrición Carolina
echo    Launcher Completo
echo ========================================
echo.
echo Iniciando servicios en ventanas separadas...
echo.

REM Verificar Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ ERROR: Node.js no está instalado
    echo Por favor instala Node.js 18+ desde https://nodejs.org
    pause
    exit /b 1
)

REM Verificar si existe .env
if not exist .env (
    echo ⚠️  Archivo .env no encontrado. Copiando desde .env.example...
    copy .env.example .env
    echo.
    echo 📝 IMPORTANTE: Edita el archivo .env antes de continuar
    echo Presiona Enter cuando esté configurado...
    pause >nul
)

REM Crear directorios si no existen
if not exist attached_assets\uploads\meals mkdir attached_assets\uploads\meals
if not exist attached_assets\temp_uploads mkdir attached_assets\temp_uploads
if not exist attached_assets\generated_images mkdir attached_assets\generated_images

REM Instalar dependencias si no existen
if not exist node_modules (
    echo 📥 Instalando dependencias...
    call npm install
)

REM Aplicar esquema de base de datos
echo 🔧 Aplicando esquema de base de datos...
call npm run db:push

echo.
echo ========================================
echo Iniciando servicios...
echo ========================================
echo.

REM 1. Iniciar servidor principal (Frontend + Backend)
echo 1️⃣  Iniciando Frontend + Backend en nueva ventana...
start "Nutrición - Frontend + Backend" cmd /k "npm run dev"
timeout /t 2 >nul

REM 2. Iniciar Drizzle Studio (Database GUI)
echo 2️⃣  Iniciando Database Studio en nueva ventana...
start "Nutrición - Database Studio" cmd /k "npm run db:studio"
timeout /t 2 >nul

echo.
echo ========================================
echo ✅ Todos los servicios iniciados!
echo ========================================
echo.
echo 🌐 Servicios disponibles:
echo.
echo   Frontend + Backend:
echo   http://localhost:5000
echo.
echo   Database Studio:
echo   http://localhost:4983
echo.
echo ⚠️  Para detener todo, cierra todas las ventanas CMD
echo     o presiona Ctrl+C en cada una
echo.
echo 📝 Este launcher se cerrará en 10 segundos...
timeout /t 10
