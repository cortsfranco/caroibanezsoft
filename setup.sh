#!/bin/bash

# =====================================================
# Script de Inicialización - Sistema Nutrición Carolina
# =====================================================

set -e  # Exit on error

echo "🚀 Iniciando setup del Sistema de Nutrición..."
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Verificar Node.js
echo "📦 Verificando Node.js..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Error: Node.js no está instalado${NC}"
    echo "Por favor instala Node.js 18+ desde https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Error: Node.js versión 18+ requerida. Versión actual: $(node -v)${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js $(node -v) encontrado${NC}"
echo ""

# 2. Instalar dependencias
echo "📥 Instalando dependencias de npm..."
npm install
echo -e "${GREEN}✓ Dependencias instaladas${NC}"
echo ""

# 3. Verificar archivo .env
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  Archivo .env no encontrado. Copiando desde .env.example...${NC}"
    cp .env.example .env
    echo -e "${YELLOW}📝 IMPORTANTE: Edita el archivo .env con tus credenciales antes de continuar${NC}"
    echo ""
    echo "Necesitas configurar:"
    echo "  - DATABASE_URL (PostgreSQL)"
    echo "  - SESSION_SECRET (genera uno con: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\")"
    echo "  - GOOGLE_API_KEY (opcional, para IA)"
    echo ""
    read -p "¿Quieres continuar con la configuración? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup pausado. Edita .env y ejecuta ./setup.sh de nuevo."
        exit 0
    fi
fi

echo -e "${GREEN}✓ Archivo .env configurado${NC}"
echo ""

# 4. Verificar PostgreSQL
echo "🗄️  Verificando conexión a PostgreSQL..."

# Source .env para obtener DATABASE_URL
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ Error: DATABASE_URL no está configurado en .env${NC}"
    exit 1
fi

# Intentar conectar a PostgreSQL
if command -v psql &> /dev/null; then
    if psql "$DATABASE_URL" -c "SELECT version();" &> /dev/null; then
        echo -e "${GREEN}✓ Conexión a PostgreSQL exitosa${NC}"
    else
        echo -e "${YELLOW}⚠️  No se pudo conectar a PostgreSQL${NC}"
        echo "Asegúrate de que:"
        echo "  1. PostgreSQL está corriendo"
        echo "  2. DATABASE_URL en .env es correcto"
        echo "  3. La base de datos existe"
        echo ""
        read -p "¿Continuar de todas formas? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
else
    echo -e "${YELLOW}⚠️  psql no encontrado. Saltando verificación de PostgreSQL${NC}"
fi

echo ""

# 5. Aplicar esquema de base de datos
echo "🔧 Aplicando esquema de base de datos..."
npm run db:push

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Esquema de base de datos aplicado${NC}"
else
    echo -e "${YELLOW}⚠️  Hubo un problema aplicando el esquema${NC}"
    echo "Puedes intentar manualmente con: npm run db:push"
fi

echo ""

# 6. Crear directorios necesarios
echo "📁 Creando directorios de assets..."
mkdir -p attached_assets/uploads/meals
mkdir -p attached_assets/temp_uploads
mkdir -p attached_assets/generated_images
echo -e "${GREEN}✓ Directorios creados${NC}"
echo ""

# 7. Resumen
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Setup completado exitosamente!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Para iniciar el proyecto:"
echo "  npm run dev"
echo ""
echo "Accede a la aplicación en:"
echo "  http://localhost:5000"
echo ""
echo "Otros comandos útiles:"
echo "  npm run db:studio    - Abrir interfaz visual de base de datos"
echo "  npm run db:generate  - Generar migraciones SQL"
echo "  npm run check        - Verificar tipos TypeScript"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
