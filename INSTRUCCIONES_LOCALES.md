# 🚀 Instrucciones para Desarrollo Local

## Paso 1: Habilitar Base de Datos Neon (EN REPLIT - HACER AHORA)

**IMPORTANTE**: Antes de descargar el proyecto, necesitas habilitar la base de datos:

1. En Replit, ve al panel izquierdo → **"Database"**
2. Verás un mensaje que dice "The endpoint has been disabled"
3. Haz clic en el botón para **habilitar** o **reactivar** el endpoint
4. Espera unos segundos a que se active

Una vez habilitada, yo (el agente) podré:
- Limpiar toda la base de datos
- Aplicar el esquema actualizado con todos los cambios nuevos
- Verificar que todo funcione correctamente

---

## Paso 2: Hacer Commit en Replit (EN REPLIT - HACER AHORA)

Yo no puedo hacer commits de git directamente en Replit, así que necesitas hacerlo tú:

### Opción A: Usar la terminal de Replit
```bash
# Verificar cambios
git status

# Agregar todos los archivos
git add .

# Hacer commit
git commit -m "feat: corrección cálculo grasa corporal ISAK 2 + funcionalidad borrar/cambiar imágenes + mejoras UI"

# Push a tu repositorio
git push
```

### Opción B: Usar la interfaz de Replit
1. Ve a la pestaña "Version Control" en el panel izquierdo
2. Verás todos los archivos modificados
3. Escribe un mensaje de commit
4. Haz clic en "Commit & Push"

---

## Paso 3: Clonar el Proyecto en Tu Computadora

```bash
# Clonar el repositorio
git clone <URL-DE-TU-REPO>
cd <nombre-del-proyecto>
```

---

## Paso 4: Instalar PostgreSQL Localmente

### En Windows:
1. Descarga PostgreSQL desde https://www.postgresql.org/download/windows/
2. Instala con el instalador
3. Durante la instalación, anota la contraseña que configures para el usuario `postgres`

### En macOS:
```bash
# Usando Homebrew
brew install postgresql@14
brew services start postgresql@14
```

### En Linux (Ubuntu/Debian):
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### Crear Base de Datos:
```bash
# Conectar a PostgreSQL
psql -U postgres

# Dentro de psql, crear la base de datos
CREATE DATABASE nutricion_carolina;

# Salir
\q
```

---

## Paso 5: Configurar Variables de Entorno

```bash
# Copiar el archivo de ejemplo
cp .env.example .env
```

Edita el archivo `.env` con tus valores:

```env
# Base de datos LOCAL
DATABASE_URL=postgresql://postgres:tu-contraseña@localhost:5432/nutricion_carolina

# O si prefieres seguir usando Neon (CLOUD):
# DATABASE_URL=<copia la URL de Neon desde Replit>

# Genera un secreto de sesión
# Ejecuta: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET=<pega-el-secreto-generado-aqui>

# OPCIONAL: API Key de Google Gemini (para generar imágenes con IA)
# Obtén una en: https://aistudio.google.com/app/apikey
GOOGLE_API_KEY=

# Modo de desarrollo
NODE_ENV=development
```

---

## Paso 6: Ejecutar el Setup Automático

### Opción A: Script de Setup (Recomendado)
```bash
# En Linux/macOS
./setup.sh

# En Windows (Git Bash)
bash setup.sh
```

Este script automáticamente:
- ✅ Instala dependencias de npm
- ✅ Verifica conexión a PostgreSQL
- ✅ Aplica el esquema completo a la base de datos
- ✅ Crea directorios necesarios
- ✅ Te da un resumen de comandos útiles

### Opción B: Paso a Paso Manual
```bash
# 1. Instalar dependencias
npm install

# 2. Aplicar esquema de base de datos
npm run db:push

# 3. Crear directorios de assets
mkdir -p attached_assets/uploads/meals
mkdir -p attached_assets/temp_uploads
mkdir -p attached_assets/generated_images
```

---

## Paso 7: Iniciar el Proyecto

```bash
npm run dev
```

La aplicación estará disponible en:
- **Frontend + Backend**: http://localhost:5000

---

## 🔧 Acceso a la Base de Datos

### Opción 1: Interfaz Visual - Drizzle Studio (RECOMENDADO)
```bash
npm run db:studio
```
Se abrirá en: http://localhost:4983

Aquí puedes:
- Ver todas las tablas
- Editar datos directamente
- Ejecutar queries
- Ver relaciones entre tablas

### Opción 2: psql (Terminal)
```bash
# Conectar a la base de datos
psql postgresql://postgres:tu-contraseña@localhost:5432/nutricion_carolina

# Comandos útiles:
\dt                  # Listar todas las tablas
\d nombre_tabla      # Ver estructura de una tabla
SELECT * FROM patients LIMIT 5;  # Query de ejemplo
\q                   # Salir
```

### Opción 3: Clientes GUI
- **TablePlus**: https://tableplus.com/ (Mac, Windows, Linux)
- **pgAdmin**: https://www.pgadmin.org/ (Gratis, todas las plataformas)
- **DBeaver**: https://dbeaver.io/ (Gratis, open source)

**Datos de conexión:**
- Host: `localhost`
- Puerto: `5432`
- Database: `nutricion_carolina`
- Usuario: `postgres` (o el que creaste)
- Contraseña: (la que configuraste)

---

## 📊 Estructura de la Base de Datos

### Tablas Principales:

1. **patients** - Información de pacientes
   - Campos: name, email, phone, birthDate, gender, objective, medicalConditions, etc.

2. **measurements** - Mediciones antropométricas (ISAK 2)
   - Campos: weight, height, skinfolds (triceps, **biceps**, subscapular, **suprailiac**, etc.)
   - **NUEVO**: Campos biceps y suprailiac para cálculo correcto

3. **measurement_calculations** - Cálculos automáticos
   - Campos: bmi, **sumOf4Skinfolds**, sumOf6Skinfolds, bodyFatPercentage, leanMass, etc.
   - **NUEVO**: sumOf4Skinfolds para fórmula Durnin & Womersley

4. **meals** - Catálogo de comidas
   - Campos: name, category, ingredients, calories, protein, carbs, fats, imageUrl, etc.

5. **patient_groups** - Grupos de pacientes

6. **diets** - Planes nutricionales

7. **weekly_diet_plans** - Planes semanales detallados

8. **diet_generations** - Dietas generadas con IA

---

## 🎯 Características del Sistema

### ✅ Nuevas Funcionalidades (Incluidas en este commit)

1. **Cálculo correcto de grasa corporal**:
   - Ahora usa fórmula de Durnin & Womersley (4 pliegues)
   - Agregados campos `biceps` y `suprailiac`
   - Se calcula y guarda `sumOf4Skinfolds`

2. **Gestión de imágenes de comidas**:
   - ✅ Subir imágenes manualmente
   - ✅ Generar imágenes con IA (Google Gemini)
   - ✅ **NUEVO**: Borrar imágenes
   - ✅ **NUEVO**: Cambiar imágenes

3. **Selección múltiple de pacientes**:
   - ✅ Checkbox en cada fila
   - ✅ Select-all con estado indeterminado
   - ✅ Eliminación en lote

4. **Correcciones**:
   - ✅ Mensaje de error de IA corregido (Google API Key)
   - ✅ Checkbox indeterminado funcional

---

## 🔍 Debugging y Troubleshooting

### Ver logs en tiempo real:
```bash
# El servidor muestra logs en la terminal donde ejecutaste npm run dev
# Busca errores en rojo
```

### Verificar que la base de datos está conectada:
```bash
psql $DATABASE_URL -c "SELECT version();"
```

### Limpiar y reiniciar:
```bash
# Borrar node_modules y reinstalar
rm -rf node_modules package-lock.json
npm install

# Borrar y reaplicar esquema (¡CUIDADO! Borra todos los datos)
npm run db:push --force
```

### Puerto 5000 ya en uso:
```bash
# Linux/macOS
lsof -ti:5000 | xargs kill -9

# Windows (PowerShell)
Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess | Stop-Process -Force
```

---

## 📝 Comandos Útiles

```bash
# Desarrollo
npm run dev              # Iniciar app (frontend + backend)
npm run check            # Verificar errores de TypeScript

# Base de Datos
npm run db:push          # Aplicar cambios de esquema
npm run db:studio        # Abrir interfaz visual
npm run db:generate      # Generar archivos de migración SQL

# Producción
npm run build            # Compilar para producción
npm start                # Ejecutar versión compilada
```

---

## 🌐 Arquitectura del Sistema

```
┌─────────────────────────────────────────────┐
│  NAVEGADOR (http://localhost:5000)         │
│  ┌─────────────────────────────────────┐   │
│  │   React + Vite (Frontend SPA)       │   │
│  │   - TanStack Query (estado server)  │   │
│  │   - Wouter (routing)                │   │
│  │   - shadcn/ui + Tailwind CSS        │   │
│  └─────────────┬───────────────────────┘   │
└────────────────┼───────────────────────────┘
                 │ HTTP/WS
┌────────────────▼───────────────────────────┐
│  EXPRESS SERVER (Node.js)                  │
│  ┌─────────────────────────────────────┐   │
│  │   API REST (/api/*)                 │   │
│  │   - Pacientes, Mediciones, Comidas  │   │
│  │   - WebSocket real-time sync        │   │
│  └─────────────┬───────────────────────┘   │
└────────────────┼───────────────────────────┘
                 │ SQL
┌────────────────▼───────────────────────────┐
│  POSTGRESQL DATABASE                       │
│  - Drizzle ORM                             │
│  - 18 tablas (patients, measurements, etc) │
│  - Cálculos automáticos con triggers       │
└────────────────────────────────────────────┘
```

---

## 🆘 Soporte

Si encuentras problemas:

1. **Verifica logs**: Mira la terminal donde ejecutaste `npm run dev`
2. **Verifica base de datos**: Usa `npm run db:studio` para ver el estado
3. **Revisa README.md**: Hay información adicional allí
4. **Revisa .env**: Asegúrate de que DATABASE_URL y SESSION_SECRET estén configurados

---

## ✅ Checklist Final

Antes de empezar a trabajar localmente, verifica:

- [ ] PostgreSQL instalado y corriendo
- [ ] Base de datos `nutricion_carolina` creada
- [ ] Archivo `.env` configurado con DATABASE_URL y SESSION_SECRET
- [ ] Dependencias instaladas (`npm install`)
- [ ] Esquema aplicado (`npm run db:push`)
- [ ] Servidor corriendo (`npm run dev`)
- [ ] Navegador abierto en http://localhost:5000
- [ ] Drizzle Studio corriendo en http://localhost:4983 (opcional)

**¡Listo para desarrollar!** 🎉
