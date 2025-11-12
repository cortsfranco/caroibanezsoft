# Sistema de Nutrición Carolina Ibáñez

Sistema completo de gestión nutricional con seguimiento de pacientes, mediciones antropométricas ISAK 2, catálogo de comidas, generación de dietas con IA, y reportes automatizados.

## 🚀 Inicio Rápido - Desarrollo Local

### Prerrequisitos
- Node.js 18+ y npm
- PostgreSQL 14+
- Git

### Instalación en Un Solo Paso

```bash
# Clonar el repositorio
git clone <tu-repo-url>
cd <nombre-del-proyecto>

# Ejecutar script de inicialización completo
npm run dev:setup
```

Este script automáticamente:
- Instala todas las dependencias
- Configura la base de datos PostgreSQL
- Aplica el esquema completo
- Inicia frontend y backend en paralelo

### Configuración Manual (Alternativa)

#### 1. Instalar Dependencias
```bash
npm install
```

#### 2. Configurar Base de Datos PostgreSQL

**Opción A: PostgreSQL Local**
```bash
# Crear base de datos
createdb nutricion_carolina

# Configurar variables de entorno
cp .env.example .env
```

Edita `.env` y configura:
```env
DATABASE_URL=postgresql://usuario:contraseña@localhost:5432/nutricion_carolina
SESSION_SECRET=tu-secreto-aleatorio-aqui
GOOGLE_API_KEY=tu-api-key-de-google-gemini (opcional para IA)
```

**Opción B: Usar Neon PostgreSQL (Cloud)**
1. Crea una cuenta en [Neon](https://neon.tech)
2. Crea un nuevo proyecto
3. Copia la URL de conexión
4. Pégala en `DATABASE_URL` en tu archivo `.env`

#### 3. Aplicar Esquema de Base de Datos
```bash
npm run db:push
```

#### 4. Iniciar el Proyecto
```bash
npm run dev
```

Esto inicia:
- **Backend (Express)**: http://localhost:5000
- **Frontend (Vite)**: http://localhost:5000 (mismo puerto, proxy configurado)

## 📁 Estructura del Proyecto

```
.
├── client/               # Frontend React + Vite
│   ├── src/
│   │   ├── components/  # Componentes reutilizables
│   │   ├── pages/       # Páginas de la aplicación
│   │   ├── lib/         # Utilidades y configuración
│   │   └── App.tsx      # Punto de entrada
│   └── index.html
├── server/              # Backend Express + TypeScript
│   ├── routes.ts        # Endpoints API REST
│   ├── db-storage.ts    # Capa de acceso a datos (Drizzle ORM)
│   ├── services/        # Servicios (cálculos, imágenes, IA)
│   └── index.ts         # Servidor Express
├── shared/
│   └── schema.ts        # Esquema de base de datos compartido
├── attached_assets/     # Archivos subidos (imágenes, reportes)
└── migrations/          # Migraciones SQL generadas

```

## 🗄️ Acceso a la Base de Datos

### Opción 1: psql (CLI)
```bash
psql $DATABASE_URL

# O si es local:
psql -U usuario -d nutricion_carolina
```

### Opción 2: Cliente GUI
- **pgAdmin**: https://www.pgadmin.org/
- **TablePlus**: https://tableplus.com/
- **DBeaver**: https://dbeaver.io/

**Credenciales de conexión:**
- Host: Ver `PGHOST` en `.env`
- Puerto: Ver `PGPORT` en `.env` (generalmente 5432)
- Database: Ver `PGDATABASE` en `.env`
- Usuario: Ver `PGUSER` en `.env`
- Contraseña: Ver `PGPASSWORD` en `.env`

### Opción 3: Drizzle Studio (Recomendado)
```bash
npm run db:studio
```
Abre una interfaz visual en http://localhost:4983

## 🔑 Variables de Entorno Necesarias

Crea un archivo `.env` en la raíz con:

```env
# Base de datos (REQUERIDO)
DATABASE_URL=postgresql://usuario:contraseña@host:puerto/database

# Sesiones (REQUERIDO)
SESSION_SECRET=genera-un-secreto-aleatorio-seguro-aqui

# IA - Generación de Imágenes (OPCIONAL)
GOOGLE_API_KEY=tu-api-key-de-google-gemini-flash-image

# Desarrollo
NODE_ENV=development
```

### Generar SESSION_SECRET
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Obtener GOOGLE_API_KEY (para generación de imágenes IA)
1. Ve a [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Crea una API Key
3. Copia y pega en `.env`

## 📡 Endpoints API Principales

### Pacientes
- `GET /api/patients` - Listar todos los pacientes
- `POST /api/patients` - Crear paciente
- `PATCH /api/patients/:id` - Actualizar paciente
- `DELETE /api/patients/:id` - Eliminar paciente

### Mediciones
- `GET /api/patients/:id/measurements` - Mediciones de un paciente
- `POST /api/patients/:id/measurements` - Nueva medición
- `PATCH /api/measurements/:id` - Actualizar medición

### Comidas
- `GET /api/meals` - Listar comidas
- `POST /api/meals` - Crear comida
- `POST /api/meals/:id/upload-image` - Subir imagen
- `POST /api/meals/:id/generate-image` - Generar imagen con IA
- `DELETE /api/meals/:id/image` - Borrar imagen

### Grupos
- `GET /api/groups` - Listar grupos de pacientes
- `POST /api/groups` - Crear grupo

## 🛠️ Scripts Disponibles

```bash
# Desarrollo
npm run dev              # Iniciar frontend + backend
npm run dev:setup        # Setup completo (instalar + DB + iniciar)

# Base de Datos
npm run db:push          # Aplicar cambios de esquema
npm run db:studio        # Abrir Drizzle Studio (GUI)
npm run db:generate      # Generar migraciones SQL

# Producción
npm run build            # Compilar frontend + backend
npm start                # Iniciar en producción

# Testing
npm test                 # Ejecutar tests (si existen)
```

## 🏗️ Tecnologías Principales

### Frontend
- **React 18** - UI Library
- **Vite** - Build tool y dev server
- **Wouter** - Routing ligero
- **TanStack Query** - Server state management
- **Tailwind CSS** - Styling
- **shadcn/ui** - Componentes UI
- **Radix UI** - Primitivas accesibles

### Backend
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **Drizzle ORM** - Database ORM
- **PostgreSQL (Neon)** - Base de datos
- **WebSockets** - Real-time sync
- **Multer** - File uploads

### IA & Servicios
- **Google Gemini 2.5 Flash** - Generación de imágenes
- **LangChain + LangGraph** - Orquestación de IA para dietas

## 📊 Características Principales

### ✅ Gestión de Pacientes
- CRUD completo con validación optimista
- Agrupación de pacientes
- Campos personalizables (objetivos, preferencias, condiciones médicas)
- Selección múltiple y eliminación en lote

### ✅ Mediciones Antropométricas (ISAK 2)
- **Cálculo correcto de grasa corporal**: Usa fórmula de Durnin & Womersley con 4 pliegues (triceps, biceps, subscapular, suprailiac)
- Cálculo automático de BMI
- Suma de 4 y 6 pliegues
- Cálculos de masa magra
- Ratio cintura/cadera
- Historial con gráficos

### ✅ Catálogo de Comidas
- Información nutricional completa
- **Subir imágenes** manualmente
- **Generar imágenes con IA** (Google Gemini)
- **Borrar y cambiar imágenes**
- Filtros por categoría y etiquetas
- Ingredientes estructurados

### ✅ Generación de Dietas con IA
- Planes personalizados con LangChain
- Plantillas reutilizables
- Validación automática
- Asignación a pacientes

### ✅ Reportes
- Generación automática en PDF
- Exportación a Excel
- Gráficos de progreso

### ✅ Sincronización en Tiempo Real
- WebSockets para actualizaciones instantáneas
- Múltiples usuarios simultáneos
- Invalidación de caché automática

## 🐛 Troubleshooting

### Error: "The endpoint has been disabled"
La base de datos Neon está suspendida por inactividad. Soluciones:
1. Hacer cualquier query para reactivarla
2. Esperar 5 minutos y reintentar
3. Verificar que `DATABASE_URL` sea correcto

### Error: "Port 5000 already in use"
```bash
# Linux/Mac
lsof -ti:5000 | xargs kill -9

# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### Error: "Cannot find module"
```bash
rm -rf node_modules package-lock.json
npm install
```

### Base de datos vacía después de `db:push`
Esto es normal si la base de datos es nueva. El esquema se aplica pero sin datos.

## 📝 Cambios Recientes (Nov 2024)

### Correcciones Críticas
- ✅ **Fórmula de grasa corporal corregida**: Ahora usa Durnin & Womersley (4 pliegues) correctamente
- ✅ Agregados campos `biceps` y `suprailiac` a mediciones
- ✅ Agregado campo `sumOf4Skinfolds` a cálculos
- ✅ Mensaje de error de IA corregido (Google API Key)

### Nuevas Funcionalidades
- ✅ **Borrar imágenes** de comidas
- ✅ **Cambiar imágenes** de comidas
- ✅ **Selección múltiple** de pacientes
- ✅ **Eliminación en lote** de pacientes
- ✅ Checkbox indeterminado para select-all

## 📄 Licencia

Propiedad de Carolina Ibáñez - Sistema de Nutrición Profesional

## 👤 Contacto

Para soporte o consultas sobre el sistema, contactar a Carolina Ibáñez.
