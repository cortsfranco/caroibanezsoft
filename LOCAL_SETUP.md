# 🏠 Configuración Local - Sistema de Nutrición

## 📋 Requisitos Previos

- **Node.js** v18 o superior
- **PostgreSQL** v14 o superior
- **Git** (para clonar el proyecto)

## 🚀 Pasos para Configuración Local

### 1. Clonar el Repositorio

```bash
git clone <url-del-repositorio>
cd nutrition-system
```

### 2. Instalar Dependencias

```bash
npm install
```

### 3. Configurar Base de Datos PostgreSQL

#### Opción A: PostgreSQL Local

1. **Instalar PostgreSQL** (si no lo tienes):
   - macOS: `brew install postgresql@14`
   - Ubuntu: `sudo apt install postgresql postgresql-contrib`
   - Windows: Descargar desde https://www.postgresql.org/download/

2. **Iniciar PostgreSQL**:
   ```bash
   # macOS
   brew services start postgresql@14
   
   # Ubuntu
   sudo systemctl start postgresql
   ```

3. **Crear base de datos**:
   ```bash
   # Conectarse a PostgreSQL
   psql postgres
   
   # Crear base de datos
   CREATE DATABASE nutrition_db;
   
   # Crear usuario (opcional)
   CREATE USER nutrition_user WITH PASSWORD 'tu_password';
   GRANT ALL PRIVILEGES ON DATABASE nutrition_db TO nutrition_user;
   
   # Salir
   \q
   ```

#### Opción B: Usar Base de Datos de Replit (desde local)

Puedes conectarte a la misma base de datos PostgreSQL de Replit desde tu máquina local:

1. En Replit, ve a **Database** en el panel izquierdo
2. Copia el **External Connection String** (formato: `postgresql://...@...neon.tech/...`)
3. Úsalo como `DATABASE_URL` en tu `.env`

### 4. Configurar Variables de Entorno

1. **Copiar plantilla**:
   ```bash
   cp .env.local.template .env
   ```

2. **Editar `.env`** con tus valores:

   **Para PostgreSQL Local:**
   ```env
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nutrition_db
   PGHOST=localhost
   PGPORT=5432
   PGUSER=postgres
   PGPASSWORD=postgres
   PGDATABASE=nutrition_db
   SESSION_SECRET=tu-secret-generado-con-openssl
   NODE_ENV=development
   PORT=5000
   ```

   **Para Replit DB (remoto):**
   ```env
   DATABASE_URL=postgresql://[usuario]:[password]@[host].neon.tech/[dbname]?sslmode=require
   SESSION_SECRET=mismo-secret-de-replit-o-generar-nuevo
   NODE_ENV=development
   PORT=5000
   ```

3. **Generar SESSION_SECRET** (opcional):
   ```bash
   openssl rand -base64 32
   ```

### 5. Migrar el Schema de Base de Datos

El proyecto usa **Drizzle ORM** para gestión de schema.

#### Si usas PostgreSQL Local (nueva BD vacía):

```bash
# Push del schema completo a tu BD local
npm run db:push
```

Este comando creará todas las tablas automáticamente basándose en `shared/schema.ts`.

#### Si usas Replit DB (ya tiene datos):

No necesitas hacer nada, ya tiene el schema y los datos sincronizados.

#### Verificar las tablas creadas:

```bash
# Conectarse a PostgreSQL
psql nutrition_db

# Ver todas las tablas
\dt

# Deberías ver:
# - patients
# - patient_groups
# - group_memberships
# - measurements
# - measurement_calculations
# - diets
# - reports

# Salir
\q
```

### 6. Ejecutar el Proyecto

```bash
npm run dev
```

El servidor estará corriendo en:
- **Frontend + Backend**: http://localhost:5000

### 7. Verificar que Todo Funciona

1. Abre http://localhost:5000 en tu navegador
2. Deberías ver el dashboard
3. Verifica la consola del navegador (F12) - no debería haber errores de WebSocket
4. Verifica la terminal - debería mostrar:
   ```
   WebSocket server initialized
   [express] serving on port 5000
   ```

## 📁 Archivos Importantes

- **`shared/schema.ts`**: Schema de base de datos (Drizzle ORM)
- **`drizzle.config.ts`**: Configuración de Drizzle
- **`server/index.ts`**: Servidor Express principal
- **`server/routes.ts`**: Rutas API REST
- **`server/db-storage.ts`**: Implementación de storage con PostgreSQL
- **`server/websocket.ts`**: Servidor WebSocket para sync en tiempo real

## 🔧 Scripts Disponibles

```bash
# Desarrollo (hot reload)
npm run dev

# Build para producción
npm run build

# Ejecutar en producción
npm start

# Push schema a BD (sin migraciones)
npm run db:push

# Push forzado (útil si hay conflictos)
npm run db:push -- --force

# Generar migraciones SQL (opcional)
npm run db:generate

# Abrir Drizzle Studio (GUI para BD)
npm run db:studio
```

## 🐛 Troubleshooting

### Error: "DATABASE_URL not found"

- Verifica que `.env` existe y tiene `DATABASE_URL` configurado
- Reinicia el servidor después de crear/modificar `.env`

### Error: "Connection refused" al conectar PostgreSQL

- Verifica que PostgreSQL está corriendo: `pg_isready`
- Verifica el puerto: `psql -l` (debería listar bases de datos)

### Error: "relation does not exist"

- Ejecuta `npm run db:push` para crear las tablas
- O ejecuta `npm run db:push -- --force` si hay conflictos

### WebSocket error en consola del navegador

- El error de `wss://localhost:undefined` es del HMR de Vite, no afecta el sistema
- El WebSocket personalizado funciona en `/ws` con protocolo automático

## 📊 Estructura de la Base de Datos

```
patients (pacientes)
├── id: serial PRIMARY KEY
├── name: varchar
├── email: varchar
├── phone: varchar
├── birth_date: date
├── gender: varchar
├── version: integer (optimistic locking)
├── created_at: timestamp
└── updated_at: timestamp

patient_groups (grupos)
├── id: serial PRIMARY KEY
├── name: varchar
├── color: varchar
├── version: integer
├── created_at: timestamp
└── updated_at: timestamp

group_memberships (asignaciones)
├── id: serial PRIMARY KEY
├── patient_id: serial → patients.id
├── group_id: serial → patient_groups.id
├── version: integer
├── created_at: timestamp
└── updated_at: timestamp

measurements (mediciones)
├── id: serial PRIMARY KEY
├── patient_id: serial → patients.id
├── measurement_date: timestamp
├── weight_kg: numeric
├── height_cm: numeric
├── [35+ campos antropométricos ISAK]
├── version: integer
├── created_at: timestamp
└── updated_at: timestamp

measurement_calculations (cálculos ISAK 2)
├── id: serial PRIMARY KEY
├── measurement_id: serial → measurements.id
├── [resultados fraccionamiento 5 componentes]
├── version: integer
├── created_at: timestamp
└── updated_at: timestamp

diets (biblioteca de dietas)
├── id: serial PRIMARY KEY
├── name: varchar
├── description: text
├── meal_plan: jsonb
├── version: integer
├── created_at: timestamp
└── updated_at: timestamp

reports (informes generados)
├── id: serial PRIMARY KEY
├── patient_id: serial → patients.id
├── report_type: varchar
├── content: jsonb
├── sent_via: varchar
├── version: integer
├── created_at: timestamp
└── updated_at: timestamp
```

## 🔐 Optimistic Locking

El sistema usa **optimistic locking** en todas las tablas:

- Cada registro tiene un campo `version` que empieza en 1
- Al actualizar, debes enviar el `version` actual en el body
- Si otro usuario actualizó antes, recibes HTTP 409 (conflict)
- El frontend maneja conflictos automáticamente con TanStack Query

Ejemplo de actualización:

```typescript
// GET primero para obtener version
const patient = await fetch('/api/patients/1').then(r => r.json());
// { id: 1, name: "Juan", version: 3 }

// PATCH con version
const response = await fetch('/api/patients/1', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    version: 3,  // ← Obligatorio!
    name: "Juan Pérez"
  })
});

// Si otro usuario actualizó antes → HTTP 409
// Si éxito → { id: 1, name: "Juan Pérez", version: 4 }
```

## 🌐 WebSocket Real-Time Sync

El sistema usa WebSocket para sincronización automática:

- Conecta automáticamente en `ws://localhost:5000/ws`
- Reconexión automática con exponential backoff
- Broadcasts después de cada CREATE/UPDATE/DELETE
- Invalida cache de TanStack Query automáticamente

No necesitas código adicional - ya está todo configurado.

## ✅ Próximos Pasos

Una vez que el sistema local esté corriendo:

1. ✅ Verificar sincronización en tiempo real (abrir 2 pestañas)
2. ⏳ Implementar gestión de grupos (renombrar, asignar pacientes)
3. ⏳ Implementar formulario único de mediciones ISAK 2
4. ⏳ Configurar Twilio para WhatsApp
5. ⏳ Configurar Resend para Email
6. ⏳ Implementar generación de informes PDF

## 🆘 Soporte

Si tienes problemas, verifica:
1. Logs del servidor en la terminal
2. Consola del navegador (F12 → Console)
3. Network tab para ver requests fallidos
4. Verifica que PostgreSQL está corriendo y accesible
