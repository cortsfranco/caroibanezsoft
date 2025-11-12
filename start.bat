@echo off
REM =====================================================
REM Script de Inicialización - Sistema Nutrición Carolina
REM Para Windows (CMD/PowerShell)
REM =====================================================

title Sistema Nutrición Carolina - Inicializando...

echo ========================================
echo 🚀 Iniciando Sistema de Nutrición
echo ========================================
echo.

REM Verificar Node.js
echo 📦 Verificando Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ ERROR: Node.js no está instalado
    echo Por favor instala Node.js 18+ desde https://nodejs.org
    pause
    exit /b 1
)

for /f "tokens=1 delims=." %%a in ('node -v') do set NODE_MAJOR=%%a
set NODE_MAJOR=%NODE_MAJOR:v=%
if %NODE_MAJOR% lss 18 (
    echo ❌ ERROR: Node.js versión 18+ requerida
    echo Versión actual: 
    node -v
    pause
    exit /b 1
)

echo ✓ Node.js encontrado
node -v
echo.

REM Verificar si existe .env
if not exist .env (
    echo ⚠️  Archivo .env no encontrado
    echo Copiando desde .env.example...
    copy .env.example .env
    echo.
    echo 📝 IMPORTANTE: Edita el archivo .env con tus credenciales
    echo.
    echo Presiona Enter cuando hayas configurado .env...
    pause >nul
)

REM Verificar si node_modules existe
if not exist node_modules (
    echo 📥 Instalando dependencias de npm...
    call npm install
    if %errorlevel% neq 0 (
        echo ❌ Error instalando dependencias
        pause
        exit /b 1
    )
    echo ✓ Dependencias instaladas
    echo.
) else (
    echo ✓ Dependencias ya instaladas
    echo.
)

REM Crear directorios necesarios
echo 📁 Creando directorios de assets...
if not exist attached_assets\\uploads\meals mkdir attached_assets\\uploads\meals
if not exist attached_assets\temp_uploads mkdir attached_assets\temp_uploads
if not exist attached_assets\generated_images mkdir attached_assets\generated_images
echo ✓ Directorios creados
echo.

REM Aplicar esquema de base de datos
echo 🔧 Aplicando esquema de base de datos...
call npm run db:push
if %errorlevel% neq 0 (
    echo ⚠️  Advertencia: Hubo un problema aplicando el esquema
    echo Puedes intentar manualmente con: npm run db:push
    echo.
)
echo.

REM Iniciar el servidor
echo ========================================
echo ✅ Iniciando servidor de desarrollo...
echo ========================================
echo.
echo Frontend + Backend: http://localhost:5000
echo.
echo Presiona Ctrl+C para detener el servidor
echo.

call npm run de