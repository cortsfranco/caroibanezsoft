# Sistema de Nutrición Carolina Ibáñez - Estado del Proyecto

## Resumen Ejecutivo
Sistema de gestión nutricional personalizado que reemplaza el flujo de trabajo manual con Excel de Carolina. Actualmente **70-75% funcional** para uso productivo.

---

## ✅ COMPLETAMENTE FUNCIONAL

### 1. Gestión de Pacientes
- ✅ CRUD completo (crear, editar, eliminar, ver)
- ✅ Datos personales y bioquímicos
- ✅ Preferencias alimentarias (vegetariano, vegano)
- ✅ Alergias y condiciones médicas
- ✅ **Datos de ejercicio**: tipo de deporte, días de entrenamiento, horarios
- ✅ Organización por grupos personalizados
- ✅ Perfil individual con historial
- ✅ Sample data: 3 pacientes de ejemplo

### 2. Grupos de Pacientes
- ✅ CRUD completo con colores personalizables
- ✅ **Selector de color** con preview en tiempo real
- ✅ Gradientes y badges con colores dinámicos
- ✅ Membresías many-to-many
- ✅ Sample data: 3 grupos (Gimnasia, Consultorio, Pérdida de Peso)

### 3. Mediciones Antropométricas (ISAK 2)
- ✅ **Cálculo automático de IMC** con clasificación
- ✅ 5 componentes D. Kerr 1988
- ✅ Pliegues cutáneos (6 pliegues estándar)
- ✅ Perímetros y diámetros
- ✅ **Suma automática de 6 pliegues**
- ✅ Historial completo por paciente
- ✅ Gráficos de evolución
- ✅ Optimistic locking (control de versiones)

### 4. Reportes PDF Profesionales
- ✅ **Header colorido con gradiente** (teal/green)
- ✅ Logo Carolina Ibáñez
- ✅ **Clasificación IMC con colores semáforo** (verde/naranja/rojo)
- ✅ Tablas organizadas con datos antropométricos
- ✅ **Suma de 6 pliegues destacada** (color naranja)
- ✅ **Recomendaciones personalizadas** por categoría IMC
- ✅ Footer con datos de contacto
- ✅ Generación automática y almacenamiento
- ✅ Acceso HTTP a PDFs generados

### 5. Catálogo de Comidas
- ✅ **CRUD completo** (crear, editar, eliminar, listar)
- ✅ Datos nutricionales: calorías, proteínas, carbos, grasas, fibra
- ✅ Categorización flexible (desayuno, almuerzo, cena, snack, etc.)
- ✅ **Sistema de etiquetas editable** con CRUD completo
- ✅ Filtros por categoría, búsqueda y tags
- ✅ **Upload de imágenes** (multer)
- ✅ **Generación de imágenes con IA** (OpenAI DALL-E)
- ✅ Ingredientes con porciones
- ✅ Instrucciones de preparación
- ✅ Filtros dietary (vegetariano, vegano, sin gluten, sin lácteos)
- ✅ Sample data: 26 comidas con datos completos

### 6. Dashboard & Analytics
- ✅ Métricas en tiempo real
- ✅ Gráficos de evolución
- ✅ Estadísticas por grupo
- ✅ Vista general del consultorio

### 7. Sistema Técnico
- ✅ Real-time sync con WebSockets
- ✅ PostgreSQL (Neon) con Drizzle ORM
- ✅ Optimistic locking en todas las entidades
- ✅ Excel import/export (SheetJS)
- ✅ TypeScript end-to-end
- ✅ React Query para caching inteligente
- ✅ Validación con Zod
- ✅ UI moderna con Radix + shadcn

---

## ⚠️ PARCIALMENTE IMPLEMENTADO

### 8. Biblioteca de Dietas
- ⚠️ CRUD básico funcional
- ⚠️ Asignación a pacientes con fechas
- ❌ **Generación con IA** (LangGraph integrado pero no conectado al UI)
- ❌ **Templates reutilizables** (schema existe, UI no)

### 9. Planificador Semanal (Weekly Diet Planner)
- ⚠️ **Schema completo** en base de datos
- ⚠️ **Backend stubbed** (métodos CRUD sin implementar)
- ❌ **UI drag-and-drop** (página existe pero no funcional)
- ❌ Asignación masiva a grupos
- ❌ Sistema de templates

---

## ❌ FALTANTE / NO IMPLEMENTADO

### 10. Funcionalidades Críticas Faltantes

#### A. Avatar de Pacientes
- ❌ Upload de foto de perfil
- ❌ Visualización en cards y perfil

#### B. Anamnesis Alimentaria
- ❌ Registro de "qué come, a qué hora come"
- ❌ Historial de hábitos alimentarios
- ❌ Notas de consulta

#### C. Generación Rápida de Planes (CRÍTICO)
- ❌ **Armado rápido de 20 planes en 15 min**
- ❌ Interface intuitiva para seleccionar comidas
- ❌ Distribución automática de macros
- ❌ Clonación de planes entre pacientes

#### D. Cálculo de Gasto Calórico
- ❌ Fórmulas automáticas (Harris-Benedict, Mifflin-St Jeor)
- ❌ Factor de actividad
- ❌ Ajuste por objetivo (pérdida/ganancia peso)

---

## 📊 PRIORIDADES PARA USO PRODUCTIVO

### Prioridad 1 - CRÍTICO (Bloquea uso)
1. **Weekly Diet Planner funcional**
   - Implementar métodos CRUD en db-storage.ts
   - Completar UI drag-and-drop
   - Habilitar asignación a grupos/pacientes

2. **Generación rápida de planes**
   - Template system
   - Clonación masiva
   - Distribución automática de macros

### Prioridad 2 - IMPORTANTE (Mejora flujo)
3. **Anamnesis alimentaria**
   - Campo de notas en pacientes
   - Registro de hábitos

4. **Avatar de pacientes**
   - Upload de foto
   - Visualización

### Prioridad 3 - NICE TO HAVE
5. **IA para generación de dietas**
   - Conectar LangGraph al UI
   - Entrenar con datos de Carolina

6. **Cálculo automático de calorías**
   - Fórmulas estándar
   - Ajuste por objetivo

---

## 🔧 ACCIÓN INMEDIATA REQUERIDA

### Para que Carolina pueda usar el sistema HOY:

1. ✅ **Catálogo de comidas** → Ya funcional, probar crear comida
2. ⚠️ **Weekly Planner** → Implementar completamente
3. ⚠️ **Asignación rápida de dietas** → Mejorar flujo

### Estimación de Trabajo Faltante:
- **Weekly Planner completo**: 3-4 horas
- **Sistema de templates**: 2 horas  
- **Anamnesis**: 1 hora
- **Avatar upload**: 1 hora
- **Cálculo calórico**: 2 horas

**Total para MVP usable**: ~8-10 horas de desarrollo

---

## 💡 NOTAS TÉCNICAS

### Sample Data Disponible
- ✅ 3 pacientes con datos completos
- ✅ 3 grupos con colores
- ✅ 26 comidas con valores nutricionales
- ✅ 12 tags organizadas por categoría
- ✅ 3 templates de planes semanales (en DB, no accesibles por UI)

### Comandos Útiles
```bash
# Seed data completo
tsx server/seed-data.ts

# Sincronizar schema DB
npm run db:push

# Desarrollo
npm run dev
```

---

## 🎯 OBJETIVO PRINCIPAL

**"Reemplazar Excel y ganar tiempo: 20 planes en 15 minutos"**

Actualmente el sistema permite:
- ✅ Gestión completa de pacientes
- ✅ Mediciones ISAK 2 automáticas
- ✅ Reportes PDF profesionales
- ✅ Catálogo de comidas robusto
- ❌ **Armado rápido de planes** ← FALTA IMPLEMENTAR

---

Última actualización: 2025-11-12 18:10
