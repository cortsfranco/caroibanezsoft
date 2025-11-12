# 📐 Arquitectura del Sistema de Nutrición Carolina Ibáñez

## 📋 Índice

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Stack Tecnológico](#2-stack-tecnológico)
3. [Arquitectura del Sistema](#3-arquitectura-del-sistema)
4. [Modelo de Datos](#4-modelo-de-datos)
5. [Funcionalidades Principales](#5-funcionalidades-principales)
6. [Cambios Recientes (Últimas 2 Semanas)](#6-cambios-recientes-últimas-2-semanas)
7. [Estado Actual del Proyecto](#7-estado-actual-del-proyecto)
8. [Problemas Conocidos](#8-problemas-conocidos)
9. [Próximos Pasos](#9-próximos-pasos)
10. [Guía para Desarrolladores](#10-guía-para-desarrolladores)

---

## 1. Resumen Ejecutivo

### ¿Qué es este sistema?

**Sistema de Nutrición Carolina Ibáñez** es una plataforma integral de gestión nutricional diseñada específicamente para nutricionistas profesionales. Permite:

- 📊 **Gestión completa de pacientes** con datos demográficos, objetivos nutricionales, preferencias alimentarias y condiciones médicas
- 📏 **Mediciones antropométricas ISAK 2** con cálculos automáticos de composición corporal
- 🍽️ **Catálogo de comidas** con información nutricional, imágenes y gestión de tags
- 📅 **Planes semanales de dietas** con asignación a pacientes
- 🤖 **Generación de dietas con IA** usando LangChain + Azure OpenAI
- 📑 **Reportes profesionales en PDF** con gráficos y análisis detallados
- 📤 **Importación/Exportación Excel** para datos masivos
- 🔄 **Sincronización en tiempo real** vía WebSockets

### ¿Para quién?

Nutricionistas profesionales que necesitan:

- Gestionar múltiples pacientes
- Realizar seguimiento de mediciones antropométricas precisas
- Crear planes nutricionales personalizados
- Generar reportes profesionales
- Trabajar con datos en tiempo real

---

## 2. Stack Tecnológico

### Frontend

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| React | 18 | Framework UI principal |
| TypeScript | Latest | Tipado estático |
| Vite | Latest | Build tool + HMR |
| Wouter | Latest | Routing ligero (alternativa a React Router) |
| TanStack Query (React Query) | v5 | Estado del servidor + caché |
| React Hook Form | Latest | Gestión de formularios |
| Zod | Latest | Validación de esquemas |
| Tailwind CSS | Latest | Estilos utilitarios |
| shadcn/ui | Latest | Componentes UI (estilo "New York") |
| Radix UI | Latest | Primitivos UI accesibles |
| Recharts | Latest | Gráficos y visualizaciones |
| Tremor React | Latest | Componentes de dashboards |
| Lucide React | Latest | Iconos |

### Backend

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| Node.js | 18+ | Runtime JavaScript |
| Express.js | Latest | Servidor HTTP + API REST |
| TypeScript | Latest | Tipado estático |
| tsx | Latest | Ejecutor de TypeScript en desarrollo |
| esbuild | Latest | Bundler de producción |
| WebSocket (ws) | Latest | Comunicación en tiempo real |
| Passport.js | Latest | Autenticación (preparado, no implementado) |
| Express Session | Latest | Gestión de sesiones |

### Base de Datos

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| PostgreSQL | 14+ | Base de datos principal |
| Neon | Latest | Hosting serverless de PostgreSQL |
| Drizzle ORM | Latest | ORM type-safe |
| Drizzle Kit | Latest | Migraciones y sincronización de esquema |

### AI/ML

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| LangChain | Latest | Framework de IA |
| LangGraph | Latest | Orquestación de flujos de IA |
| Azure OpenAI | GPT-4 | Generación de dietas con IA |
| Google Gemini 2.5 Flash | Latest | Generación de imágenes de comidas |

### Utilidades

| Tecnología | Propósito |
|------------|-----------|
| xlsx (SheetJS) | Importación/Exportación Excel |
| jsPDF | Generación de PDF |
| jsPDF AutoTable | Tablas en PDF |
| Chart.js | Gráficos para reportes |
| html2canvas | Captura de gráficos para PDF |
| multer | Upload de archivos |
| date-fns | Manipulación de fechas |

---

## 3. Arquitectura del Sistema

### 3.1 Arquitectura General

```
┌────────────────────────────────────────────────────────────┐
│                     NAVEGADOR                              │
│  ┌─────────────────────────────────────────────────────┐  │
│  │   FRONTEND (React SPA)                              │  │
│  │   - Vite Dev Server (HMR)                           │  │
│  │   - TanStack Query (Estado servidor)                │  │
│  │   - Wouter (Routing)                                │  │
│  │   - shadcn/ui + Tailwind CSS                        │  │
│  │   - WebSocket Client (Real-time)                    │  │
│  └─────────────┬───────────────────────────────────────┘  │
└────────────────┼──────────────────────────────────────────┘
                 │
                 │ HTTP/HTTPS + WebSocket
                 │
┌────────────────▼──────────────────────────────────────────┐
│              EXPRESS.JS SERVER                            │
│  ┌───────────────────────────────────────────────────┐   │
│  │  API REST (/api/*)                                │   │
│  │  - Patients, Measurements, Diets, Meals, etc.     │   │
│  │  - Validación Zod                                 │   │
│  │  - Optimistic Locking (version fields)            │   │
│  └───────────────────────────────────────────────────┘   │
│  ┌───────────────────────────────────────────────────┐   │
│  │  WebSocket Manager                                │   │
│  │  - Broadcasts de cambios                          │   │
│  │  - Invalidación de caché en clientes              │   │
│  └───────────────────────────────────────────────────┘   │
│  ┌───────────────────────────────────────────────────┐   │
│  │  Services                                          │   │
│  │  - measurement-calculations.ts (ISAK 2)            │   │
│  │  - image-service.ts (Upload/AI generation)         │   │
│  │  - diet-ai-service.ts (LangGraph)                  │   │
│  │  - report-service.ts (PDF generation)              │   │
│  └───────────────────────────────────────────────────┘   │
│  ┌───────────────────────────────────────────────────┐   │
│  │  Storage Layer (DbStorage)                         │   │
│  │  - Drizzle ORM                                     │   │
│  │  - CRUD operations                                 │   │
│  └───────────────────┬───────────────────────────────┘   │
└────────────────────────┼─────────────────────────────────┘
                         │
                         │ PostgreSQL Protocol
                         │
┌────────────────────────▼─────────────────────────────────┐
│         POSTGRESQL DATABASE (Neon Serverless)            │
│  ┌───────────────────────────────────────────────────┐   │
│  │  18 Tablas:                                       │   │
│  │  - patients, patient_groups, group_memberships    │   │
│  │  - measurements, measurement_calculations          │   │
│  │  - diets, diet_assignments, diet_templates         │   │
│  │  - diet_generations                                │   │
│  │  - weekly_diet_plans, weekly_plan_assignments      │   │
│  │  - weekly_plan_meals                               │   │
│  │  - meals, meal_tags                                │   │
│  │  - reports                                         │   │
│  └───────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│            SERVICIOS EXTERNOS                             │
│  - Azure OpenAI (Generación de dietas)                    │
│  - Google Gemini 2.5 (Generación de imágenes)             │
└──────────────────────────────────────────────────────────┘
```

### 3.2 Flujo de Datos

#### Flujo Típico de Lectura:

1. Frontend hace request HTTP GET `/api/patients`
2. TanStack Query maneja caché
3. Express route valida autenticación
4. DbStorage.getPatients() consulta Drizzle ORM
5. PostgreSQL retorna datos
6. Express serializa JSON
7. TanStack Query cachea respuesta
8. React renderiza UI

#### Flujo Típico de Escritura (con WebSocket):

1. Frontend hace POST `/api/patients` con datos
2. Express valida con Zod schema
3. DbStorage.createPatient() inserta en DB
4. PostgreSQL retorna paciente creado
5. Express retorna respuesta HTTP
6. WebSocket Manager broadcasts `"patient:created"`
7. TODOS los clientes conectados reciben broadcast
8. TanStack Query invalida caché automáticamente
9. UI se actualiza en TODOS los clientes

### 3.3 Arquitectura Frontend

```
client/src/
├── App.tsx                      # Root + Router + SidebarProvider
├── pages/                       # Páginas (routes)
│   ├── dashboard.tsx            # Dashboard principal
│   ├── patients.tsx             # Lista de pacientes
│   ├── patient-profile.tsx      # Perfil individual
│   ├── measurements.tsx         # Mediciones
│   ├── groups.tsx               # Grupos de pacientes
│   ├── diets.tsx                # Planes nutricionales
│   ├── weekly-diet-planner.tsx  # Planificador semanal
│   ├── meal-catalog.tsx         # Catálogo de comidas
│   ├── diet-library.tsx         # Biblioteca de dietas
│   └── reports.tsx              # Reportes
├── components/
│   ├── ui/                      # shadcn/ui components
│   ├── app-sidebar.tsx          # Sidebar navigation
│   ├── patients-table.tsx       # Tabla con select + bulk delete
│   ├── measurement-edit-dialog.tsx  # Editar mediciones
│   └── ...
├── lib/
│   ├── queryClient.ts           # TanStack Query config
│   └── utils.ts                 # Utilidades
└── hooks/
    ├── use-toast.ts             # Toast notifications
    └── use-websocket.ts         # WebSocket hook
```

### 3.4 Arquitectura Backend

```
server/
├── index.ts                     # Entry point
├── routes.ts                    # Todas las rutas API
├── db.ts                        # Drizzle DB instance
├── storage.ts                   # Interface IStorage + DbStorage
├── websocket.ts                 # WebSocket manager
├── vite.ts                      # Vite middleware
└── services/
    ├── measurement-calculations.ts  # Cálculos ISAK 2
    ├── image-service.ts         # Upload + AI image gen
    ├── diet-ai-service.ts       # LangGraph workflow
    ├── diet-ai-service-simple.ts    # Simple AI calls
    └── report-service.ts        # PDF generation
```

---

## 4. Modelo de Datos

### 4.1 Diagrama de Relaciones

```
┌──────────────────┐         ┌──────────────────────┐
│  patient_groups  │────┬────│ group_memberships    │
│  - id (PK)       │    │    │  - id (PK)           │
│  - name          │    │    │  - patient_id (FK)   │
│  - description   │    │    │  - group_id (FK)     │
│  - color         │    │    └──────────────────────┘
└──────────────────┘    │              │
                        │              │
                        │    ┌─────────▼──────────┐
                        └────│   patients         │
                             │   - id (PK)        │◄───────────┐
                             │   - name           │            │
                             │   - email          │            │
                             │   - phone          │            │
                             │   - birthDate      │            │
                             │   - gender         │            │
                             │   - objective      │            │
                             │   - exerciseDays   │            │
                             │   - isVegetarian   │            │
                             │   - foodAllergies  │            │
                             │   - ...            │            │
                             └────────┬───────────┘            │
                                      │                        │
                      ┌───────────────┼────────────────┐       │
                      │               │                │       │
         ┌────────────▼──────┐  ┌─────▼────────┐  ┌───▼────────────┐
         │   measurements     │  │   diets      │  │  reports       │
         │   - id (PK)        │  │   - id (PK)  │  │  - id (PK)     │
         │   - patient_id(FK) │  │   - patient  │  │  - patient_id  │
         │   - weight         │  │   - ...      │  │  - ...         │
         │   - height         │  └──────────────┘  └────────────────┘
         │   - triceps ───────┼──┐
         │   - biceps ────────┼──┤  Fórmula Durnin & Womersley
         │   - subscapular ───┼──┤  (4 pliegues)
         │   - suprailiac ────┼──┘
         │   - ...            │
         └────────┬───────────┘
                  │
                  │ 1:1
                  │
         ┌────────▼─────────────────┐
         │ measurement_calculations │
         │  - id (PK)               │
         │  - measurement_id (FK)   │
         │  - bmi ◄─────────────────┼── weight / (height/100)²
         │  - sumOf4Skinfolds ◄─────┼── triceps+biceps+subscapular+suprailiac
         │  - sumOf6Skinfolds       │
         │  - bodyFatPercentage ◄───┼── Durnin & Womersley formula
         │  - leanMass              │
         │  - fatMass               │
         │  - ...                   │
         └──────────────────────────┘

┌────────────────────┐
│   meals            │
│   - id (PK)        │
│   - name           │
│   - category       │◄── Desayuno, Almuerzo, Cena, Snack
│   - ingredients    │
│   - preparationMin │
│   - calories       │
│   - protein        │
│   - carbs          │
│   - fats           │
│   - imageUrl ◄─────┼── Upload manual o AI generada
│   - ...            │
└─────────┬──────────┘
          │
          │ M:N
          │
┌─────────▼──────────┐
│   meal_tags        │
│   - id (PK)        │
│   - meal_id (FK)   │
│   - tag            │◄── vegetariano, vegano, sin_gluten, etc.
└────────────────────┘

┌───────────────────────┐
│ weekly_diet_plans     │   Template de plan semanal
│  - id (PK)            │
│  - name               │
│  - description        │
└───────┬───────────────┘
        │
        │ 1:N
        │
┌───────▼───────────────────┐
│ weekly_plan_meals         │   Comidas del template
│  - id (PK)                │
│  - plan_id (FK)           │
│  - day_of_week            │◄── 0=Lunes, 6=Domingo
│  - meal_type              │◄── breakfast, lunch, dinner, snack
│  - meal_id (FK) ──────────┼──► meals
│  - portion_size           │
└───────────────────────────┘

┌────────────────────────────┐
│ weekly_plan_assignments    │   Asignación a paciente
│  - id (PK)                 │
│  - patient_id (FK) ────────┼──► patients
│  - plan_id (FK) ───────────┼──► weekly_diet_plans
│  - start_date              │
│  - end_date                │
└────────────────────────────┘

┌────────────────────────┐
│ diet_generations       │   Dietas generadas con IA
│  - id (PK)             │
│  - patient_id (FK)     │
│  - prompt              │
│  - generated_diet      │◄── JSON con estructura completa
│  - status              │◄── pending, completed, error
└────────────────────────┘
```

### 4.2 Tablas Principales (18 tablas)

#### 4.2.1 Gestión de Pacientes

**patients** - Datos demográficos y preferencias

- Campos clave: `name`, `email`, `phone`, `birthDate`, `gender`, `objective`
- Actividad: `exercisesRegularly`, `sportType`, `exerciseDays`, `exerciseSchedule`
- Preferencias: `isVegetarian`, `isVegan`, `foodAllergies`, `foodDislikes`
- Médico: `medicalConditions`, `medications`
- Optimistic locking: `version` field

**patient_groups** - Grupos para organizar pacientes

- Campos: `name`, `description`, `color` (hex)
- Uso: Clasificar pacientes por tipo, objetivo, etc.

**group_memberships** - Relación M:N entre patients y groups

- Campos: `patientId`, `groupId`

#### 4.2.2 Mediciones Antropométricas (ISAK 2)

**measurements** - 34 campos de mediciones corporales

- Básicas: `weight`, `height`, `seatedHeight`
- Diámetros (6): `biacromial`, `thoraxTransverse`, `biiliocristideo`, `humeral`, `femoral`, etc.
- Perímetros (10): `head`, `relaxedArm`, `flexedArm`, `forearm`, `thoraxCirc`, `waist`, `hip`, `thigh`, `calf`, etc.
- Pliegues cutáneos (8):
  - `triceps` ✅ (Durnin & Womersley)
  - `biceps` ✅ (Durnin & Womersley) ← NUEVO
  - `subscapular` ✅ (Durnin & Womersley)
  - `suprailiac` ✅ (Durnin & Womersley) ← NUEVO
  - `supraspinal`
  - `abdominal`
  - `thighSkinfold`
  - `calfSkinfold`

**measurement_calculations** - Cálculos automáticos (1:1 con measurements)

- `bmi`: Índice de masa corporal
- `sumOf4Skinfolds`: triceps + biceps + subscapular + suprailiac ← NUEVO
- `sumOf6Skinfolds`: suma de 6 pliegues (legacy)
- `bodyFatPercentage`: Usando fórmula Durnin & Womersley ← CORREGIDO
- `leanMass`: Masa magra
- `fatMass`: Masa grasa
- Índices adicionales: `muscleMassIndex`, `boneIndex`, `skeletalMuscle`, etc.

#### 4.2.3 Catálogo de Comidas

**meals** - Base de datos de comidas

- Identificación: `name`, `category` (breakfast, lunch, dinner, snack)
- Nutricional: `calories`, `protein`, `carbs`, `fats`, `fiber`, `sodium`
- Preparación: `ingredients`, `preparationSteps`, `preparationMinutes`
- Multimedia: `imageUrl` ← Puede ser upload manual o generada con IA
- Metadata: `servingSize`, `isActive`

**meal_tags** - Tags M:N para filtrado

- Tags: vegetariano, vegano, sin_gluten, sin_lactosa, alto_en_proteina, bajo_en_carbohidratos, etc.

#### 4.2.4 Planes Nutricionales

**diets** - Planes nutricionales asignados

- Campos: `patientId`, `name`, `description`, `startDate`, `endDate`, `dailyCalories`, `dailyProtein`, `dailyCarbs`, `dailyFats`

**diet_assignments** - Asignación de dietas a pacientes

- Relación: `dietId`, `patientId`

**diet_templates** - Templates reutilizables

- Campos: `name`, `description`, `dailyCalories`, `mealsPerDay`

**diet_generations** - Dietas generadas con IA

- Campos: `patientId`, `prompt`, `generatedDiet` (JSON), `status` (pending/completed/error)
- Proceso: LangGraph workflow usando Azure OpenAI

#### 4.2.5 Planificador Semanal

**weekly_diet_plans** - Templates de planes semanales

- Campos: `name`, `description`, `notes`

**weekly_plan_meals** - Comidas específicas del plan

- Campos: `planId`, `dayOfWeek` (0-6), `mealType` (breakfast/lunch/dinner/snack), `mealId`, `portionSize`

**weekly_plan_assignments** - Asignación a pacientes

- Campos: `patientId`, `planId`, `startDate`, `endDate`

#### 4.2.6 Reportes

**reports** - Reportes generados en PDF

- Campos: `patientId`, `reportType`, `generatedPdf` (URL), `createdAt`

---

## 5. Funcionalidades Principales

### 5.1 Dashboard

**Ubicación:** `client/src/pages/dashboard.tsx`

**Funcionalidad:**

- Cards con métricas clave: total pacientes, mediciones este mes, dietas activas
- Gráficos de tendencias (usando Recharts)
- Accesos rápidos a funciones principales

**Tecnologías:** Tremor React components, Recharts, TanStack Query

### 5.2 Gestión de Pacientes

**Ubicación:** `client/src/pages/patients.tsx`, `patient-profile.tsx`

**Funcionalidad:**

- Lista de pacientes con búsqueda, filtros por grupo, ordenamiento
- Selección múltiple (checkbox en cada fila + select-all)
- Eliminación en lote con confirmación
- Perfil individual:
  - Datos demográficos
  - Historial de mediciones con gráficos
  - Dietas asignadas
  - Reportes generados
  - Notas

**Características especiales:**

- Checkbox indeterminado cuando algunos (no todos) están seleccionados ← CORREGIDO
- Optimistic locking con `version` field
- WebSocket real-time updates

**Endpoints API:**

- `GET /api/patients` - Lista paginada
- `GET /api/patients/:id` - Detalle
- `POST /api/patients` - Crear
- `PATCH /api/patients/:id` - Actualizar
- `DELETE /api/patients/:id` - Eliminar uno
- `POST /api/patients/bulk-delete` - Eliminar múltiples

### 5.3 Grupos de Pacientes

**Ubicación:** `client/src/pages/groups.tsx`

**Funcionalidad:**

- Crear grupos con nombre, descripción y color
- Asignar pacientes a múltiples grupos
- Filtrar pacientes por grupo
- Vista de grupo con todos sus miembros

**Modelo de datos:** M:N via `group_memberships`

### 5.4 Mediciones Antropométricas (ISAK 2)

**Ubicación:** `client/src/pages/measurements.tsx`, `client/src/components/measurement-edit-dialog.tsx`

**Funcionalidad:**

- Formulario completo con todos los campos ISAK 2
- Cálculos automáticos:
  - BMI
  - Suma de 4 pliegues (Durnin & Womersley) ← NUEVO
  - Suma de 6 pliegues (legacy)
  - Porcentaje de grasa corporal ← CORREGIDO (ahora usa 4 pliegues)
  - Masa magra
  - Masa grasa
  - Índices musculares
- Historial con gráficos de evolución temporal
- Validación client-side con cálculos en vivo
- Sincronización server-side al guardar

**Servicio backend:** `server/services/measurement-calculations.ts`

**Fórmulas implementadas:**

```typescript
// BMI
bmi = weight / (height/100)²

// Suma de 4 pliegues (Durnin & Womersley)
sumOf4 = triceps + biceps + subscapular + suprailiac

// Densidad corporal (Durnin & Womersley)
density = c - (m × log10(sumOf4))
// Donde c y m dependen de edad y sexo

// Porcentaje de grasa (Siri)
bodyFat% = ((4.95 / density) - 4.50) × 100

// Masa grasa
fatMass = weight × (bodyFat% / 100)

// Masa magra
leanMass = weight - fatMass
```

**Endpoints API:**

- `GET /api/measurements/patient/:patientId` - Historial
- `POST /api/measurements` - Crear medición
- `PATCH /api/measurements/:id` - Actualizar
- `DELETE /api/measurements/:id` - Eliminar

### 5.5 Catálogo de Comidas

**Ubicación:** `client/src/pages/meal-catalog.tsx`

**Funcionalidad:**

- CRUD completo de comidas
- Filtrado por categoría (desayuno, almuerzo, cena, snack)
- Búsqueda por nombre/ingredientes
- Tags (vegetariano, vegano, sin gluten, etc.)
- Gestión de imágenes:
  - Upload manual (drag & drop o click)
  - Generación con IA (Google Gemini 2.5 Flash Image)
  - Cambiar imagen (nueva opción) ← NUEVO
  - Borrar imagen (nueva opción) ← NUEVO
- Vista grid con cards responsive
- Información nutricional completa

**Servicio backend:** `server/services/image-service.ts`

**Endpoints API:**

- `GET /api/meals` - Lista completa
- `POST /api/meals` - Crear comida
- `PATCH /api/meals/:id` - Actualizar
- `DELETE /api/meals/:id` - Eliminar
- `POST /api/meals/:id/generate-image` - Generar imagen con IA
- `POST /api/meals/:id/upload-image` - Subir imagen manual
- `DELETE /api/meals/:id/image` - Borrar imagen ← NUEVO

**Características especiales:**

- Botones condicionales:
  - Si `imageUrl` existe: muestra "Change Image" y "Delete Image"
  - Si `imageUrl` es null: muestra "Upload Image" y "Generate with AI"
- Generación de IA usa Google Gemini con prompt optimizado para comida
- Validación de tipos de archivo (jpg, png, webp)
- Límite de tamaño: 5MB

### 5.6 Planificador Semanal de Dietas

**Ubicación:** `client/src/pages/weekly-diet-planner.tsx`

**Funcionalidad:**

- Crear templates de planes semanales
- Grid 7x4 (7 días × 4 tipos de comida)
- Asignar comidas de meal catalog a cada celda
- Asignar plan a pacientes con fechas inicio/fin
- Visualizar plan asignado
- Exportar a PDF con diseño profesional

**Arquitectura:**

- Template: `weekly_diet_plans` (reutilizable)
- Meals del template: `weekly_plan_meals`
- Asignación: `weekly_plan_assignments` (instancia específica para paciente)

**Endpoints API:**

- `GET /api/weekly-diet-plans` - Lista de templates
- `POST /api/weekly-diet-plans` - Crear template
- `POST /api/weekly-diet-plans/:id/assign` - Asignar a paciente
- `GET /api/weekly-diet-plans/patient/:patientId` - Plan asignado

### 5.7 Generación de Dietas con IA

**Ubicación:** Backend en `server/services/diet-ai-service.ts`

**Funcionalidad:**

- Input: Datos del paciente (objetivo, alergias, preferencias, mediciones, ejercicio)
- Proceso: LangGraph state machine con múltiples pasos
  1. Gather context: Recopilar info del paciente
  2. Analyze: Analizar necesidades nutricionales
  3. Select template: Elegir template apropiado
  4. Generate: Generar plan detallado con GPT-4
  5. Validate: Validar estructura con Zod
- Output: Plan nutricional completo en formato JSON

**Tecnologías:**

- LangChain + LangGraph
- Azure OpenAI (GPT-4)
- Zod para validación de output estructurado

**Estado:** Implementado backend, pendiente UI completa

### 5.8 Reportes en PDF

**Ubicación:** `server/services/report-service.ts`, `client/src/pages/reports.tsx`

**Funcionalidad:**

- Generación automática de reportes profesionales
- Contenido:
  - Datos del paciente
  - Mediciones actuales vs históricas
  - Gráficos de evolución (Chart.js → canvas → imagen en PDF)
  - Composición corporal
  - Plan nutricional actual
  - Recomendaciones
- Diseño: Profesional con logo, headers, footers
- Formato: A4, multipage

**Tecnologías:**

- jsPDF
- jsPDF AutoTable
- Chart.js (para gráficos)
- html2canvas (para capturar gráficos)

**Endpoints API:**

- `POST /api/reports/generate` - Generar nuevo reporte
- `GET /api/reports/patient/:patientId` - Reportes del paciente

### 5.9 Importación/Exportación Excel

**Ubicación:** Funcionalidad pendiente de implementar completamente

**Funcionalidad planificada:**

- Exportar pacientes a Excel
- Exportar mediciones históricas
- Importar pacientes desde Excel (bulk)
- Importar comidas desde Excel

**Tecnología:** XLSX (SheetJS)

### 5.10 Sincronización en Tiempo Real (WebSocket)

**Ubicación:** `server/websocket.ts`, `client/src/hooks/use-websocket.ts`

**Funcionalidad:**

- Broadcasts automáticos cuando hay cambios en:
  - Pacientes
  - Mediciones
  - Dietas
  - Comidas
- Invalidación automática de caché en TanStack Query
- Actualizaciones en vivo en todos los clientes conectados

**Implementación:**

```typescript
// Backend
wsManager.broadcast('patient:updated', patientData);

// Frontend
useWebSocket((message) => {
  if (message.type.startsWith('patient:')) {
    queryClient.invalidateQueries({ queryKey: ['/api/patients'] });
  }
});
```

---

## 6. Cambios Recientes (Últimas 2 Semanas)

### 6.1 Corrección Crítica: Cálculo de Grasa Corporal ISAK 2

**Problema:** El sistema usaba incorrectamente la fórmula de 6 pliegues para calcular grasa corporal.

**Solución:** Implementación correcta de la fórmula de Durnin & Womersley (4 pliegues)

**Cambios:**

- Schema actualizado:
  - Agregado campo `biceps` a `measurements`
  - Agregado campo `suprailiac` a `measurements`
  - Agregado campo `sumOf4Skinfolds` a `measurement_calculations`
- Backend corregido:
  - Función `calculateSum4Skinfolds()` creada
  - Función `calculateBodyFatPercentage()` ahora usa 4 pliegues
  - Fórmula Durnin & Womersley implementada correctamente
- Frontend actualizado:
  - Campos `biceps` y `suprailiac` agregados a formulario
  - Cálculos client-side corregidos
  - Validación actualizada

**Archivos modificados:**

- `shared/schema.ts`
- `server/services/measurement-calculations.ts`
- `client/src/components/measurement-edit-dialog.tsx`

**Migración:** Pendiente aplicar a base de datos (`db:push`)

### 6.2 Sistema de Gestión de Imágenes de Comidas

**Problema:** Solo se podía subir o generar imágenes, no había opción para cambiar o borrar.

**Solución:** Sistema completo de CRUD de imágenes

**Cambios:**

- Nuevo endpoint DELETE:
  - `DELETE /api/meals/:id/image`
- UI mejorada:
  - Botones condicionales basados en `imageUrl`
  - Si existe imagen: "Change Image" + "Delete Image"
  - Si no existe: "Upload Image" + "Generate with AI"
  - Confirmación antes de borrar
- Backend:
  - Limpieza de archivos físicos al borrar
  - Actualización de DB (set `imageUrl` = null)

**Archivos modificados:**

- `server/routes.ts` (nuevo endpoint)
- `server/services/image-service.ts` (lógica de borrado)
- `client/src/pages/meal-catalog.tsx` (UI condicional)

### 6.3 Selección Múltiple y Eliminación en Lote

**Funcionalidad:** Seleccionar múltiples pacientes y eliminarlos a la vez

**Cambios:**

- Checkbox en cada fila con estado controlado
- Checkbox "select-all" con estado indeterminado ← CORREGIDO
- Botón de eliminación en lote con contador
- Confirmación con diálogo
- Endpoint nuevo:
  - `POST /api/patients/bulk-delete`
  - Body: `{ patientIds: string[] }`

**Archivos modificados:**

- `client/src/pages/patients.tsx`
- `client/src/components/patients-table.tsx`
- `server/routes.ts`

### 6.4 Corrección de Bugs

- **Checkbox indeterminado:** Ahora funciona correctamente cuando algunos (no todos) pacientes están seleccionados
- **Mensaje de error de IA:** Corregido de "OPENAI_API_KEY" a "GOOGLE_API_KEY" para generación de imágenes
- **Inicialización de sortedAndFilteredPatients:** Corregido error cuando `patients` es `undefined`

**Commits relevantes (últimas 2 semanas):**

- `cad36d6` Add a visual representation of nutritional data
- `66c1fc8` Add user profile information and metrics tracking
- `eb64ade` Add new graphic asset for the system
- `acaecda` Improve local development setup and documentation
- `0777abd` Add database structure for managing patient diets and exercises
- `f191860` pre cursor ai
- `ba016b9` Add functions for real-time patient data calculation and classification
- `4670a9b` Add multi-select and bulk delete functionality to patient tables
- `7a87bd8` Add new body composition and ratio calculations to the system
- `5fc2491` Add PDF generation for weekly diet plans and improve table sorting

### 6.5 Documentación para Desarrollo Local

**Archivos creados:**

- `README.md` - Documentación general del proyecto
- `INSTRUCCIONES_LOCALES.md` - Guía paso a paso para setup local
- `LOCAL_SETUP.md` - Documentación detallada de configuración local
- `setup.sh` - Script de inicialización automática
- `env.example` - Template de variables de entorno actualizado

**Objetivo:** Facilitar que cualquier desarrollador pueda clonar el proyecto y ejecutarlo localmente

---

## 7. Estado Actual del Proyecto

### 7.1 ✅ Funcionalidades Completas

- ✅ Gestión de pacientes (CRUD completo)
- ✅ Grupos de pacientes (CRUD + asignación M:N)
- ✅ Mediciones antropométricas ISAK 2 (formulario completo)
- ✅ Cálculos automáticos con fórmula Durnin & Womersley correcta
- ✅ Catálogo de comidas (CRUD completo)
- ✅ Gestión de imágenes de comidas (upload, AI, cambiar, borrar)
- ✅ Tags de comidas
- ✅ Planificador semanal (templates)
- ✅ Asignación de planes a pacientes
- ✅ Generación de reportes PDF
- ✅ Dashboard con métricas
- ✅ WebSocket real-time sync
- ✅ Selección múltiple + eliminación en lote
- ✅ Optimistic locking (version fields)
- ✅ Validación Zod (frontend + backend)

### 7.2 🚧 Funcionalidades Parcialmente Implementadas

#### 🚧 Generación de dietas con IA:

- ✅ Backend completo (LangGraph workflow)
- ❌ UI frontend pendiente

#### 🚧 Importación/Exportación Excel:

- ✅ Librerías instaladas (XLSX)
- ❌ Endpoints y UI pendientes

#### 🚧 Autenticación de usuarios:

- ✅ Passport.js configurado
- ❌ Flujo de login/registro pendiente
- ❌ Roles y permisos pendientes

### 7.3 ❌ Funcionalidades Pendientes

- ❌ Edición de mediciones existentes:
  - Componente `MeasurementEditDialog` creado
  - Pendiente integrar en UI
- ❌ Gráficos de evolución:
  - Biblioteca instalada (Recharts)
  - Pendiente implementar visualizaciones detalladas
- ❌ Notificaciones:
  - Twilio configurado para WhatsApp (pendiente integración)
  - Resend para emails (pendiente integración)
- ❌ Exportación masiva de reportes
- ❌ Backup automático de base de datos
- ❌ Tests automatizados:
  - Framework no configurado
  - Sin tests unitarios ni E2E

---

## 8. Problemas Conocidos

### 8.1 🔴 CRÍTICO: Base de Datos Frozen (Neon)

**Problema:** El endpoint de Neon PostgreSQL está deshabilitado/frozen

**Síntoma:**

```
error: The endpoint has been disabled. Enable it using Neon API and retry.
```

**Impacto:**

- ❌ No se puede aplicar el esquema actualizado (`npm run db:push`)
- ❌ No se puede ejecutar la aplicación con base de datos real
- ❌ Migraciones pendientes

**Soluciones posibles:**

- Opción A: Habilitar el endpoint de Neon desde el panel de Replit Database
- Opción B: Actualizar `DATABASE_URL` en Secrets con nuevo endpoint
- Opción C: Crear nueva base de datos PostgreSQL (local o en Neon)

**Estado:** BLOQUEANTE - Debe resolverse antes de continuar desarrollo

### 8.2 🟡 Git Commit/Push Bloqueado

**Problema:** No se pueden hacer commits desde terminal en Replit

**Síntoma:**

```
fatal: Unable to create '.git/index.lock': File exists
remote: Invalid username or token
```

**Solución:** Usar la interfaz gráfica de Replit (pestaña "Version Control")

**Estado:** WORKAROUND disponible

### 8.3 🟡 Migraciones Pendientes

**Problema:** Esquema actualizado no aplicado a base de datos

**Cambios pendientes:**

- Campo `biceps` en `measurements`
- Campo `suprailiac` en `measurements`
- Campo `sumOf4Skinfolds` en `measurement_calculations`

**Solución:** Ejecutar `npm run db:push` una vez que DB esté activa

**Estado:** BLOQUEADO por 8.1

### 8.4 🟢 Warnings Menores

- WebSocket client warning en consola (puerto undefined en dev)
- PostCSS warning sobre `from` option
- Ninguno afecta funcionalidad

---

## 9. Próximos Pasos

### 9.1 Inmediatos (Resolver Blockers)

1. **Habilitar base de datos Neon**
   - Ir a panel Database en Replit
   - Hacer clic en "Unpause database"
   - Actualizar `DATABASE_URL` en Secrets si es necesario

2. **Aplicar migraciones**
   - `npm run db:push`

3. **Verificar aplicación**
   - `npm run dev`

4. **Commit cambios pendientes**
   - Usar interfaz de Version Control en Replit
   - Mensaje: "feat: ISAK 2 fixes + imagen management + bulk operations"

### 9.2 Corto Plazo (Próximas 1-2 semanas)

1. **Completar UI de generación de dietas con IA**
   - Crear página frontend
   - Formulario de input (objetivo, restricciones)
   - Visualización de dieta generada
   - Guardado en DB

2. **Implementar edición de mediciones**
   - Integrar `MeasurementEditDialog`
   - Agregar botón "Edit" en historial
   - Validación de permisos

3. **Gráficos de evolución mejorados**
   - Peso vs tiempo
   - Grasa corporal vs tiempo
   - Comparación múltiples mediciones

4. **Backfill de datos existentes**
   - Migración para recalcular `sumOf4Skinfolds`
   - Recalcular `bodyFatPercentage` con fórmula correcta

### 9.3 Mediano Plazo (Próximas 3-4 semanas)

1. **Importación/Exportación Excel**
   - Endpoint de export pacientes
   - Endpoint de import pacientes (bulk)
   - UI con drag & drop

2. **Autenticación completa**
   - Login/Registro
   - Recuperación de contraseña
   - Sesiones persistentes

3. **Roles y permisos**
   - Admin vs Nutricionista vs Paciente
   - Control de acceso granular

4. **Notificaciones**
   - Integrar Twilio (WhatsApp)
   - Integrar Resend (Email)
   - Recordatorios de citas
   - Alertas de nuevas mediciones

### 9.4 Largo Plazo (Próximos 2-3 meses)

1. **Móvil responsivo**
   - Optimizar UI para tablets/móviles
   - PWA (Progressive Web App)

2. **Tests automatizados**
   - Unit tests (Jest + React Testing Library)
   - E2E tests (Playwright)
   - CI/CD pipeline

3. **Backup y recuperación**
   - Backup automático de DB
   - Punto de restauración

4. **Multitenancy**
   - Soporte para múltiples nutricionistas
   - Aislamiento de datos
   - Facturación por uso

---

## 10. Guía para Desarrolladores

### 10.1 Setup del Entorno

#### En Replit (Cloud):

- Database ya configurada (PostgreSQL vía Neon)
- Secrets ya configurados (`DATABASE_URL`, `SESSION_SECRET`, `GOOGLE_API_KEY`)
- Workflow "Start application" ya configurado
- Simplemente hacer clic en "Run"

#### En Local:

Ver documento `LOCAL_SETUP.md` completo.

**Resumen:**

```bash
# 1. Clonar repo
git clone <repo-url>
cd <proyecto>

# 2. Instalar dependencias
npm install

# 3. Configurar .env
cp env.example .env
# Editar .env con tus valores

# 4. Aplicar esquema DB
npm run db:push

# 5. Iniciar dev server
npm run dev

# 6. Abrir browser
# http://localhost:5000
```

### 10.2 Comandos Útiles

```bash
# Desarrollo
npm run dev              # Iniciar app (frontend + backend)
npm run check            # Verificar errores TypeScript
npm run build            # Build para producción
npm start                # Ejecutar build de producción

# Base de Datos
npm run db:push          # Aplicar cambios de esquema
npm run db:generate      # Generar migraciones SQL
npm run db:studio        # Abrir Drizzle Studio (GUI)

# Git (desde interfaz de Replit)
# Version Control → Commit & Push
```

### 10.3 Estructura de Archivos

```
proyecto/
├── client/                   # Frontend React
│   └── src/
│       ├── App.tsx           # Root + Router
│       ├── pages/            # Páginas (routes)
│       ├── components/       # Componentes reutilizables
│       │   └── ui/           # shadcn/ui components
│       ├── lib/              # Utilidades
│       └── hooks/            # Custom hooks
├── server/                   # Backend Express
│   ├── index.ts              # Entry point
│   ├── routes.ts             # API endpoints
│   ├── db.ts                 # Drizzle instance
│   ├── storage.ts            # Data access layer
│   ├── websocket.ts          # WebSocket manager
│   └── services/             # Business logic
├── shared/                   # Código compartido
│   └── schema.ts             # Database schemas + Zod
├── attached_assets/          # Assets estáticos
│   ├── uploads/              # Uploads de usuarios
│   ├── generated_images/     # Imágenes de IA
│   └── temp_uploads/         # Temporales
├── migrations/               # Migraciones SQL
├── package.json              # Dependencias
├── tsconfig.json             # Config TypeScript
├── vite.config.ts            # Config Vite
├── tailwind.config.ts        # Config Tailwind
├── drizzle.config.ts         # Config Drizzle
├── README.md                 # Docs generales
├── LOCAL_SETUP.md            # Setup local
└── ARQUITECTURA_SISTEMA.md   # Este documento
```

### 10.4 Convenciones de Código

#### TypeScript

- Estricto: `strict: true` en `tsconfig`
- Tipado explícito en parámetros de funciones
- Interfaces para objetos complejos
- Types para unions/primitivos

#### React

- Componentes funcionales exclusivamente
- Hooks para estado y efectos
- Props con TypeScript interfaces
- No usar `React.FC` (deprecated)

#### Naming

- Archivos: `kebab-case` (`patient-profile.tsx`)
- Componentes: `PascalCase` (`PatientProfile`)
- Funciones: `camelCase` (`calculateBMI`)
- Constantes: `UPPER_SNAKE_CASE` (`MAX_FILE_SIZE`)
- Types: `PascalCase` (`InsertPatient`)

#### Imports

Orden:
1. React/Third-party
2. `@/` paths (internos)
3. Relative imports

Aliases configurados:
- `@/` → `client/src/`
- `@assets/` → `attached_assets/`
- `@shared/` → `shared/`

#### Validación

- Zod para todos los schemas
- Validación client + server (DRY con shared schemas)
- Mensajes de error en español

#### Base de Datos

- Drizzle ORM exclusivamente
- NO SQL raw (excepto migraciones complejas)
- Transactions para operaciones múltiples
- Optimistic locking con `version` field

#### API

- RESTful endpoints
- JSON request/response
- HTTP status codes correctos:
  - `200`: Success
  - `201`: Created
  - `400`: Bad Request (validación)
  - `404`: Not Found
  - `500`: Server Error
- Error handling consistente

### 10.5 Debugging

#### Frontend

- Browser DevTools
  - Console → Errors
  - Network → API calls
  - React DevTools → Component tree

#### Backend

- Terminal logs
  ```bash
  npm run dev
  ```
  - Buscar errores en rojo
- Database Studio
  ```bash
  npm run db:studio
  ```
  - Ver/editar datos directamente

#### WebSocket

- Browser Console
  - Buscar: `WebSocket connection opened/closed`
  - Verificar broadcasts recibidos

### 10.6 Deployment

#### Replit (Automático)

1. Hacer commit de cambios
2. Click en "Publish" button
3. Replit maneja build + deploy automáticamente

#### Manual (producción)

```bash
# 1. Build
npm run build

# 2. Set environment variables
export DATABASE_URL=...
export SESSION_SECRET=...
export NODE_ENV=production

# 3. Run
npm start
```

### 10.7 Contribuyendo

1. Crear branch para feature
2. Commits descriptivos en español
3. Probar localmente antes de push
4. Actualizar documentación si es necesario
5. Merge a main después de review

---

## 📞 Contacto y Recursos

### Documentación Adicional

- `README.md` - Overview del proyecto
- `LOCAL_SETUP.md` - Setup local paso a paso
- `INSTRUCCIONES_LOCALES.md` - Guía alternativa de setup
- `replit.md` - Estado del proyecto (actualizado automáticamente)
- `NUTRITION_AI_ARCHITECTURE.md` - Arquitectura del sistema de IA

### Tecnologías Clave

- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [TanStack Query](https://tanstack.com/query)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [LangChain](https://www.langchain.com/)

### Estado del Proyecto

- **Versión:** 1.0.0-beta
- **Última actualización:** Noviembre 2024
- **Estado:** En desarrollo activo
- **Licencia:** MIT

---

## 🏁 Conclusión

Este es un sistema completo y profesional de gestión nutricional con arquitectura moderna y escalable. El código está bien organizado, utiliza las mejores prácticas de la industria y está preparado para crecer.

### Puntos fuertes:

- ✅ Tipado estático completo (TypeScript)
- ✅ Validación robusta (Zod)
- ✅ Real-time sync (WebSockets)
- ✅ UI profesional (shadcn/ui)
- ✅ Cálculos científicos correctos (ISAK 2)
- ✅ Arquitectura escalable

### Áreas de mejora:

- ⚠️ Resolver base de datos frozen
- ⚠️ Completar autenticación
- ⚠️ Agregar tests
- ⚠️ Mejorar documentación de código

Con la resolución del problema de base de datos frozen, el proyecto estará listo para continuar desarrollo de features avanzadas.

¡Buena suerte en el desarrollo! 🚀
