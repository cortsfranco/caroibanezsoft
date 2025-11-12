# =====================================================
# Script de Inicialización - Sistema Nutrición Carolina
# Para Windows (PowerShell)
# =====================================================

$ErrorActionPreference = "Stop"
$Host.UI.RawUI.WindowTitle = "Sistema Nutrición Carolina - Inicializando..."

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🚀 Iniciando Sistema de Nutrición" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Función para escribir en color
function Write-Success { param($msg) Write-Host "✓ $msg" -ForegroundColor Green }
function Write-Error-Custom { param($msg) Write-Host "❌ $msg" -ForegroundColor Red }
function Write-Warning-Custom { param($msg) Write-Host "⚠️  $msg" -ForegroundColor Yellow }
function Write-Info { param($msg) Write-Host "📝 $msg" -ForegroundColor Blue }

# Verificar Node.js
Write-Host "📦 Verificando Node.js..." -ForegroundColor White
try {
    $nodeVersion = node -v
    $nodeMajor = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
    
    if ($nodeMajor -lt 18) {
        Write-Error-Custom "Node.js versión 18+ requerida. Versión actual: $nodeVersion"
        Write-Host "Por favor instala Node.js 18+ desde https://nodejs.org" -ForegroundColor Yellow
        Read-Host "Presiona Enter para salir"
        exit 1
    }
    
    Write-Success "Node.js $nodeVersion encontrado"
} catch {
    Write-Error-Custom "Node.js no está instalado"
    Write-Host "Por favor instala Node.js 18+ desde https://nodejs.org" -ForegroundColor Yellow
    Read-Host "Presiona Enter para salir"
    exit 1
}
Write-Host ""

# Verificar archivo .env
if (-not (Test-Path ".env")) {
    Write-Warning-Custom "Archivo .env no encontrado"
    Write-Host "Copiando desde .env.example..." -ForegroundColor White
    Copy-Item ".env.example" ".env"
    Write-Host ""
    Write-Info "IMPORTANTE: Edita el archivo .env con tus credenciales antes de continuar"
    Write-Host ""
    Write-Host "Necesitas configurar:" -ForegroundColor Yellow
    Write-Host "  - DATABASE_URL (PostgreSQL)" -ForegroundColor Yellow
    Write-Host "  - SESSION_SECRET (genera uno con: node -e `"console.log(require('crypto').randomBytes(32).toString('hex'))`")" -ForegroundColor Yellow
    Write-Host "  - GOOGLE_API_KEY (opcional, para IA)" -ForegroundColor Yellow
    Write-Host ""
    
    $continue = Read-Host "¿Continuar de todas formas? (s/n)"
    if ($continue -ne 's' -and $continue -ne 'S') {
        Write-Host "Setup pausado. Edita .env y ejecuta ./start.ps1 de nuevo." -ForegroundColor Yellow
        exit 0
    }
}

Write-Success "Archivo .env configurado"
Write-Host ""

# Verificar e instalar dependencias
if (-not (Test-Path "node_modules")) {
    Write-Host "📥 Instalando dependencias de npm..." -ForegroundColor White
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Error-Custom "Error instalando dependencias"
        Read-Host "Presiona Enter para salir"
        exit 1
    }
    Write-Success "Dependencias instaladas"
    Write-Host ""
} else {
    Write-Success "Dependencias ya instaladas"
    Write-Host ""
}

# Crear directorios necesarios
Write-Host "📁 Creando directorios de assets..." -ForegroundColor White
$directories = @(
    "attached_assets\uploads\meals",
    "attached_assets\temp_uploads",
    "attached_assets\generated_images"
)

foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
}
Write-Success "Directorios creados"
Write-Host ""

# Aplicar esquema de base de datos
Write-Host "🔧 Aplicando esquema de base de datos..." -ForegroundColor White
npm run db:push
if ($LASTEXITCODE -ne 0) {
    Write-Warning-Custom "Hubo un problema aplicando el esquema"
    Write-Host "Puedes intentar manualmente con: npm run db:push" -ForegroundColor Yellow
}
Write-Host ""

# Resumen
Write-Host "========================================" -ForegroundColor Green
Write-Host "✅ Iniciando servidor de desarrollo..." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Accede a la aplicación en:" -ForegroundColor Cyan
Write-Host "  http://localhost:5000" -ForegroundColor White
Write-Host ""
Write-Host "Base de datos visual (en otra terminal):" -ForegroundColor Cyan
Write-Host "  npm run db:studio" -ForegroundColor White
Write-Host "  http://localhost:4983" -ForegroundColor White
Write-Host ""
Write-Host "Presiona Ctrl+C para detener el servidor" -ForegroundColor Yellow
Write-Host ""

# Iniciar el servidor
npm run dev
