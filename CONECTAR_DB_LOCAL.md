# 🔌 Conectar a la Base de Datos desde Windows

## ✅ La Base de Datos YA ESTÁ FUNCIONANDO

Tu base de datos Neon (PostgreSQL en la nube) ya tiene **todas las 18 tablas** creadas y funcionando.

La ventaja de Neon es que **NO necesitas instalar PostgreSQL localmente** - puedes conectarte desde Windows directamente a la nube.

---

## 🚀 Configuración en Windows (2 minutos)

### Paso 1: Copiar Credenciales

En tu archivo `.env` local (en tu computadora Windows), copia estas credenciales:

```env
# ============================================
# BASE DE DATOS POSTGRESQL (NEON CLOUD)
# ============================================

DATABASE_URL=postgresql://neondb_owner:npg_8t3LgXhBoQV@ep-billowing-frog-ahnc1wss.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require

# Variables individuales (se extraen de DATABASE_URL)
PGHOST=ep-billowing-frog-ahnc1wss.c-3.us-east-1.aws.neon.tech
PGPORT=5432
PGUSER=neondb_owner
PGPASSWORD=npg_8t3LgXhBoQV
PGDATABASE=neondb

# ============================================
# SESIÓN (genera uno nuevo para local)
# ============================================

SESSION_SECRET=tu-secreto-local-diferente-al-de-replit

# ============================================
# GOOGLE GEMINI (opcional - para IA)
# ============================================

GOOGLE_API_KEY=tu-api-key-aqui

# ============================================
# MODO DE DESARROLLO
# ============================================

NODE_ENV=development
PORT=5000
```

### Paso 2: Iniciar la Aplicación

Desde tu terminal en Windows:

```cmd
dev.bat
```

O si instalaste cross-env:
```cmd
npm run dev
```

**¡YA ESTÁ!** Tu aplicación en Windows se conectará a la misma base de datos que Replit.

---

## 🌐 Ventajas de Esta Configuración

### ✅ **Base de Datos Compartida**
- Trabajas en Windows → Datos se guardan en la nube
- Trabajas en Replit → Ves los mismos datos
- Todo sincronizado automáticamente

### ✅ **Sin Instalación de PostgreSQL**
- No necesitas instalar PostgreSQL en Windows
- Neon maneja todo (backups, actualizaciones, seguridad)

### ✅ **Datos Persistentes**
- Los datos NO se pierden al cerrar tu PC
- Accesibles desde cualquier lugar

---

## 🔧 Comandos Útiles

### Ver Datos (Database Studio)
```cmd
npm run db:studio
```
Abre: http://localhost:4983

Aquí puedes:
- Ver todas las tablas
- Editar datos directamente
- Ejecutar queries SQL

### Verificar Conexión
```cmd
psql "postgresql://neondb_owner:npg_8t3LgXhBoQV@ep-billowing-frog-ahnc1wss.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require" -c "SELECT version();"
```

Si no tienes `psql` instalado, no te preocupes - la aplicación se conectará igual.

---

## 📊 Estado de las Tablas (18 tablas)

Todas creadas y funcionando:

1. ✅ **patients** - Pacientes con toda su info
2. ✅ **patient_groups** - Grupos de pacientes
3. ✅ **group_memberships** - Relación M:N
4. ✅ **measurements** - Mediciones ISAK 2 (34 campos)
5. ✅ **measurement_calculations** - Cálculos automáticos (BMI, grasa corporal, etc.)
6. ✅ **meals** - Catálogo de comidas
7. ✅ **meal_tags** - Tags (vegetariano, vegano, etc.)
8. ✅ **meal_tag_assignments** - Relación M:N
9. ✅ **diets** - Planes nutricionales
10. ✅ **diet_assignments** - Asignación de dietas
11. ✅ **diet_templates** - Templates reutilizables
12. ✅ **diet_meal_plans** - Comidas específicas de dietas
13. ✅ **diet_exercise_blocks** - Bloques de ejercicio
14. ✅ **diet_generations** - Dietas generadas con IA
15. ✅ **weekly_diet_plans** - Planes semanales
16. ✅ **weekly_plan_assignments** - Asignación de planes semanales
17. ✅ **weekly_plan_meals** - Comidas del plan semanal
18. ✅ **reports** - Reportes PDF generados

---

## 🎯 Prueba Rápida

1. **Ejecuta la app** en Windows:
   ```cmd
   dev.bat
   ```

2. **Abre el navegador**:
   ```
   http://localhost:5000
   ```

3. **Crea un paciente** desde la UI

4. **Ve a Replit** - Verás el mismo paciente ahí!

5. **Crea un paciente en Replit** - Lo verás en Windows!

**Todo funciona en tiempo real gracias a WebSockets.** 🚀

---

## 💡 Tips Pro

### Usar Misma DB en Equipo
Si trabajas con otros desarrolladores, todos pueden usar estas mismas credenciales y compartir la base de datos.

### Usar DB Local (Opcional)
Si prefieres trabajar offline, puedes:
1. Instalar PostgreSQL localmente
2. Cambiar DATABASE_URL en .env local
3. Ejecutar `npm run db:push` para crear las tablas

Pero **NO es necesario** - Neon funciona perfecto desde Windows.

### Backups
Neon hace backups automáticos. Puedes restaurar en la interfaz de Replit (Database → Settings → Restore).

---

## ⚠️ Importante

### NO compartas las credenciales públicamente
El `DATABASE_URL` tiene el password. Mantenlo privado.

### Diferentes Secrets para Replit vs Local
- **SESSION_SECRET**: Usa uno diferente en local vs Replit
- **GOOGLE_API_KEY**: Puedes usar el mismo o diferente

---

## ✅ Checklist de Verificación

- [ ] Archivo `.env` creado en Windows
- [ ] DATABASE_URL copiado correctamente
- [ ] SESSION_SECRET generado (nuevo, diferente)
- [ ] Dependencias instaladas (`npm install`)
- [ ] Aplicación corriendo (`dev.bat`)
- [ ] Navegador abierto en http://localhost:5000
- [ ] Puedes crear un paciente sin errores

**¡Ahora estás listo para desarrollar en Windows con base de datos en la nube! 🎉**
