# Sistema de Nutrición con IA - Arquitectura e Implementación

## 📋 Estado Actual del Proyecto

### ✅ Funcionalidades Implementadas

1. **Gestión de Pacientes**
   - CRUD completo con optimistic locking
   - Importación/exportación Excel
   - Agrupación de pacientes
   - Workflow explícito (editar → guardar → cancelar)

2. **Mediciones Antropométricas**
   - Sistema completo ISAK 2 (5 componentes - D. Kerr 1988)
   - Redirección automática a perfil después de guardar
   - Histórico con gráficas de evolución
   - Cálculos automáticos de IMC y composición corporal

3. **Dashboard por Grupos**
   - Estadísticas agregadas por grupos
   - Gráficas comparativas (peso, IMC, pacientes, mediciones)
   - Tendencias temporales mensuales

4. **Asignación de Dietas**
   - Sistema de asignación de dietas a pacientes
   - Fechas de inicio/fin
   - Notas personalizadas

### 🆕 Nuevos Campos Agregados al Paciente

#### Actividad Física
- `exercisesRegularly` (boolean): Si hace ejercicio regularmente
- `sportType` (text): Tipo de deporte/actividad (ej: "Fútbol", "Gimnasio", "Natación")
- `exerciseDays` (text): Días que entrena (ej: "Lunes, Miércoles, Viernes")
- `exerciseSchedule` (text): Horarios (ej: "18:00-19:30")

#### Preferencias Dietarias
- `isVegetarian` (boolean): Si es vegetariano
- `isVegan` (boolean): Si es vegano
- `foodAllergies` (text): Alergias alimentarias
- `foodDislikes` (text): Alimentos que no le gustan
- `medicalConditions` (text): Condiciones médicas relevantes (diabetes, hipertensión, etc.)
- `medications` (text): Medicamentos actuales

---

## 🚨 PROBLEMA CRÍTICO: Base de Datos Deshabilitada

**Estado:** La base de datos Neon está actualmente deshabilitada.

**Error:**
```
ERROR: The endpoint has been disabled. Enable it using Neon API and retry.
```

**Solución Necesaria:**
1. Acceder al panel de Neon (https://neon.tech)
2. Habilitar el endpoint de la base de datos
3. Ejecutar `npm run db:push --force` para sincronizar el schema actualizado

**Nota:** Todos los cambios de schema están en el código. Una vez habilitada la BD, se sincronizarán automáticamente.

---

## 🤖 ARQUITECTURA PROPUESTA: Generación de Dietas con IA

### 1. Integración con Azure OpenAI / OpenAI GPT

#### Configuración Inicial

```bash
# Instalar SDK de OpenAI
npm install openai

# Variables de entorno necesarias
AZURE_OPENAI_API_KEY=tu_api_key
AZURE_OPENAI_ENDPOINT=https://tu-recurso.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4
```

#### Flujo de Generación de Dietas

```
┌─────────────────┐
│  Datos del      │
│  Paciente       │
│  - Mediciones   │
│  - Objetivos    │
│  - Alergias     │
│  - Actividad    │
└────────┬────────┘
         │
         v
┌─────────────────┐
│  Procesador     │
│  de Contexto    │
│  (Backend)      │
└────────┬────────┘
         │
         v
┌─────────────────┐
│  Prompt         │
│  Engineering    │
│  + Templates    │
│  de Carolina    │
└────────┬────────┘
         │
         v
┌─────────────────┐
│  Azure OpenAI   │
│  GPT-4          │
└────────┬────────┘
         │
         v
┌─────────────────┐
│  Plan Dietario  │
│  Personalizado  │
└────────┬────────┘
         │
         v
┌─────────────────┐
│  Revisión de    │
│  Carolina       │
│  (Opcional)     │
└────────┬────────┘
         │
         v
┌─────────────────┐
│  Dieta          │
│  Aprobada       │
│  y Asignada     │
└─────────────────┘
```

### 2. Estructura de Datos para IA

#### Contexto que se enviará a GPT-4

```typescript
interface DietGenerationContext {
  patient: {
    id: string;
    name: string;
    age: number;
    gender: string;
    
    // Mediciones más recientes
    latestMeasurements: {
      weight: number;
      height: number;
      bmi: number;
      bodyFat: number;
      muscleMass: number;
      // ... otros datos antropométricos
    };
    
    // Objetivos
    objective: "pérdida" | "ganancia" | "mantenimiento";
    
    // Actividad física
    physicalActivity: {
      exercisesRegularly: boolean;
      sportType: string;
      exerciseDays: string;
      schedule: string;
      intensityLevel: "bajo" | "moderado" | "alto";
    };
    
    // Preferencias y restricciones
    dietaryPreferences: {
      isVegetarian: boolean;
      isVegan: boolean;
      foodAllergies: string[];
      foodDislikes: string[];
    };
    
    // Condiciones médicas
    medical: {
      conditions: string[];
      medications: string[];
    };
  };
  
  // Templates y estándares de Carolina
  nutritionistGuidelines: {
    baseCalories: number;
    macroRatios: {
      protein: number;
      carbs: number;
      fats: number;
    };
    mealStructure: {
      breakfast: string;
      midMorningSnack: string;
      lunch: string;
      afternoonSnack: string;
      dinner: string;
    };
    // Ejemplos de planes previos que funcionaron
    successfulPlans: SuccessfulDietPlan[];
  };
}
```

### 3. Implementación Backend

#### Servicio de Generación de Dietas

```typescript
// server/services/diet-ai-generator.ts
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  baseURL: process.env.AZURE_OPENAI_ENDPOINT,
});

export async function generateDietPlan(context: DietGenerationContext) {
  const systemPrompt = `
Eres una asistente nutricional experta que trabaja con Carolina Ibáñez, 
nutricionista licenciada. Tu tarea es generar planes dietarios personalizados 
basados en los estándares y metodologías que Carolina ha establecido.

IMPORTANTE:
- Usa solo alimentos disponibles en Chile
- Respeta todas las restricciones alimentarias del paciente
- Ajusta calorías según nivel de actividad física
- Incluye horarios específicos para cada comida
- Considera las mediciones antropométricas ISAK 2
- Sigue los estándares de Carolina para distribución de macronutrientes
  `;

  const userPrompt = `
Genera un plan dietario completo para:

DATOS DEL PACIENTE:
- Nombre: ${context.patient.name}
- Edad: ${context.patient.age} años
- Género: ${context.patient.gender}
- Peso actual: ${context.patient.latestMeasurements.weight} kg
- Talla: ${context.patient.latestMeasurements.height} cm
- IMC: ${context.patient.latestMeasurements.bmi}
- Objetivo: ${context.patient.objective}

ACTIVIDAD FÍSICA:
${context.patient.physicalActivity.exercisesRegularly 
  ? `- Deporte: ${context.patient.physicalActivity.sportType}
- Días: ${context.patient.physicalActivity.exerciseDays}
- Horario: ${context.patient.physicalActivity.schedule}`
  : '- No realiza ejercicio regular'}

RESTRICCIONES:
${context.patient.dietaryPreferences.isVegetarian ? '- VEGETARIANO' : ''}
${context.patient.dietaryPreferences.isVegan ? '- VEGANO' : ''}
${context.patient.dietaryPreferences.foodAllergies.length > 0 
  ? `- Alergias: ${context.patient.dietaryPreferences.foodAllergies.join(', ')}` 
  : ''}
${context.patient.dietaryPreferences.foodDislikes.length > 0 
  ? `- No consume: ${context.patient.dietaryPreferences.foodDislikes.join(', ')}` 
  : ''}

CONDICIONES MÉDICAS:
${context.patient.medical.conditions.join(', ')}

ESTÁNDARES DE CAROLINA:
- Calorías base: ${context.nutritionistGuidelines.baseCalories} kcal
- Proteínas: ${context.nutritionistGuidelines.macroRatios.protein}%
- Carbohidratos: ${context.nutritionistGuidelines.macroRatios.carbs}%
- Grasas: ${context.nutritionistGuidelines.macroRatios.fats}%

Por favor genera un plan dietario estructurado con:
1. Calorías totales diarias ajustadas
2. Distribución de macronutrientes
3. 5 comidas diarias con horarios sugeridos
4. Opciones alternativas para cada comida
5. Recomendaciones de hidratación
6. Notas especiales considerando su actividad física
  `;

  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.7,
    max_tokens: 2000,
  });

  return response.choices[0].message.content;
}
```

#### Ruta API

```typescript
// server/routes.ts
router.post("/api/diets/generate", async (req, res) => {
  try {
    const { patientId } = req.body;
    
    // Obtener todos los datos del paciente
    const patient = await storage.getPatient(patientId);
    const latestMeasurement = await storage.getLatestMeasurement(patientId);
    const latestCalculation = await storage.getMeasurementCalculations(latestMeasurement.id);
    
    // Construir contexto
    const context: DietGenerationContext = {
      patient: {
        // ... mapear todos los datos
      },
      nutritionistGuidelines: {
        // Estándares de Carolina (desde configuración o BD)
      }
    };
    
    // Generar dieta con IA
    const generatedDiet = await generateDietPlan(context);
    
    // Guardar como borrador para revisión de Carolina
    const diet = await storage.createDiet({
      name: `Dieta Generada - ${patient.name}`,
      description: generatedDiet,
      isDraft: true,
      generatedByAI: true,
    });
    
    res.json({ diet, needsReview: true });
  } catch (error) {
    console.error("Error generating diet:", error);
    res.status(500).json({ error: "Failed to generate diet" });
  }
});
```

### 4. Entrenamiento y Mejora Continua

#### Base de Conocimiento de Carolina

```typescript
// Tabla para almacenar templates y casos de éxito
export const dietTemplates = pgTable("diet_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  category: text("category"), // "pérdida de peso", "ganancia muscular", etc.
  targetProfile: text("target_profile"), // Descripción del tipo de paciente
  content: text("content").notNull(), // El plan completo
  successRate: decimal("success_rate"), // % de éxito
  timesUsed: integer("times_used").default(0),
  avgWeightChange: decimal("avg_weight_change"), // kg promedio perdidos/ganados
  createdBy: text("created_by"), // "Carolina" o "AI"
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

#### Sistema de Feedback

1. Carolina revisa las dietas generadas por IA
2. Marca como "aprobada" o hace modificaciones
3. El sistema aprende de las modificaciones
4. Se construye una base de datos de planes exitosos
5. Futuros planes se generan basándose en patrones de éxito

### 5. Interfaz de Usuario

#### Botón "Generar Dieta con IA" en Perfil del Paciente

```tsx
<Button onClick={() => generateDietWithAI(patient.id)} variant="default">
  <Sparkles className="h-4 w-4 mr-2" />
  Generar Dieta con IA
</Button>
```

#### Panel de Revisión

- Vista previa de la dieta generada
- Opción de editar/ajustar
- Aprobar y asignar al paciente
- Guardar como template para casos similares

---

## 📝 Próximos Pasos

### Inmediato (después de habilitar BD)
1. ✅ Sync de schema con nuevos campos
2. ⏳ Actualizar formulario de pacientes con campos adicionales
3. ⏳ Probar flujo completo de creación de pacientes

### Corto Plazo (IA)
1. Crear cuenta Azure OpenAI o usar OpenAI directamente
2. Implementar servicio de generación de dietas
3. Crear interfaz de revisión para Carolina
4. Implementar sistema de templates

### Mediano Plazo (Optimización IA)
1. Base de datos de dietas exitosas
2. Sistema de feedback y mejora continua
3. Fine-tuning del modelo con datos de Carolina
4. Análisis de patrones de éxito

---

## 💰 Costos Estimados (Azure OpenAI GPT-4)

- **Por generación de dieta**: ~$0.03 - $0.06 USD
- **100 pacientes/mes**: ~$3 - $6 USD/mes
- **1000 pacientes/mes**: ~$30 - $60 USD/mes

**Alternativa más económica:** GPT-3.5-turbo (~10x más barato)

---

## 🔒 Seguridad y Privacidad

- ✅ Datos de pacientes encriptados en tránsito
- ✅ API keys en variables de entorno
- ✅ No se almacenan datos de pacientes en Azure OpenAI
- ✅ Cumplimiento con regulaciones de privacidad médica
- ⚠️ Revisar GDPR y leyes locales de protección de datos

---

## 📚 Recursos Adicionales

- [Azure OpenAI Documentation](https://learn.microsoft.com/en-us/azure/ai-services/openai/)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [Prompt Engineering Guide](https://www.promptingguide.ai/)

---

**Fecha:** 12 de Noviembre, 2025  
**Autor:** Sistema de Documentación Automática  
**Estado:** Propuesta Arquitectónica - Pendiente de Implementación
