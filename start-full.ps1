# =====================================================
# Script de Inicialización COMPLETA (PowerShell)
# Inicia Frontend, Backend y Database Studio
# en ventanas separadas
# =====================================================

$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🚀 Sistema Nutrición Carolina" -ForegroundColor Cyan
Write-Host "   Launcher Completo" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Iniciando servicios en ventanas separadas..." -ForegroundColor White
Write-Host ""

# Verificar Node.js
try {
    $nodeVersion = node -v
    Write-Host "✓ Node.js $nodeVersion encontrado" -ForegroundColor Green
} catch {
    Write-Host "❌ ERROR: Node.js no está instalado" -ForegroundColor Red
    Write-Host "Por favor instala Node.js 18+ desde https://nodejs.org" -ForegroundColor Yellow
    Read-Host "Presiona Enter para salir"
    exit 1
}

# Verificar .env
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  Archivo .env no encontrado. Copiando desde .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host ""
    Write-Host "📝 IMPORTANTE: Edita el archivo .env antes de continuar" -ForegroundColor Blue
    Read-Host "Presiona Enter cuando esté configurado"
}

# Crear directorios
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

# Instalar dependencias si no existen
if (-not (Test-Path "node_modules")) {
    Write-Host "📥 Instalando dependencias..." -ForegroundColor White
    npm install
}

# Aplicar esquema de base de datos
Write-Host "🔧 Aplicando esquema de base de datos..." -ForegroundColor White
npm run db:push

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Iniciando servicios..." -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Iniciar servidor principal (Frontend + Backend)
Write-Host "1️⃣  Iniciando Frontend + Backend en nueva ventana..." -ForegroundColor White
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev; Write-Host 'Presiona Enter para cerrar...'; Read-Host" -WindowStyle Normal
Start-Sleep -Seconds 2

# 2. Iniciar Drizzle Studio (Database GUI)
Write-Host "2️⃣  Iniciando Database Studio en nueva ventana..." -ForegroundColor White
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run db:studio; Write-Host 'Presiona Enter para cerrar...'; Read-Host" -WindowStyle Normal
Start-Sleep -Seconds 2

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "✅ Todos los servicios iniciados!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Servicios disponibles:" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Frontend + Backend:" -ForegroundColor White
Write-Host "   http://localhost:5000" -ForegroundColor Yellow
Write-Host ""
Write-Host "   Database Studio:" -ForegroundColor White
Write-Host "   http://localhost:4983" -ForegroundColor Yellow
Write-Host ""
Write-Host "⚠️  Para detener todo, cierra todas las ventanas PowerShell" -ForegroundColor Yellow
Write-Host "    o presiona Ctrl+C en cada una" -ForegroundColor Yellow
Write-Host ""
Write-Host "📝 Este launcher se cerrará en 10 segundos..." -ForegroundColor Blue

Start-Sleep -Seconds 10
