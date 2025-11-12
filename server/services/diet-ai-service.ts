import { AzureChatOpenAI } from "@langchain/openai";
import { StateGraph, Annotation, END } from "@langchain/langgraph";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { Patient, Measurement, DietTemplate } from "@shared/schema";
import type { IStorage } from "../storage";

// State interface for LangGraph workflow
interface DietGenerationState {
  // Input
  patientId: string;
  patient?: Patient;
  latestMeasurement?: Measurement;
  measurementHistory?: Measurement[];
  selectedTemplates?: DietTemplate[];
  
  // Processing
  context?: string;
  prompt?: string;
  
  // AI Generation
  llmResponse?: string;
  structuredPlan?: any;
  
  // Validation
  validationErrors?: string[];
  
  // Output
  generationId?: string;
  success: boolean;
  error?: string;
}

// Structured output schema for diet plan
const MealSchema = z.object({
  name: z.string().describe("Nombre de la comida"),
  description: z.string().describe("Descripción detallada y preparación"),
  ingredients: z.array(z.object({
    name: z.string(),
    quantity: z.number(),
    unit: z.string(),
  })).describe("Lista de ingredientes con cantidades"),
  calories: z.number().describe("Calorías totales"),
  protein: z.number().describe("Proteínas en gramos"),
  carbs: z.number().describe("Carbohidratos en gramos"),
  fats: z.number().describe("Grasas en gramos"),
  suggestedTime: z.string().describe("Hora sugerida (HH:MM)"),
});

const DayPlanSchema = z.object({
  dayOfWeek: z.number().min(1).max(7).describe("Día de la semana (1-7)"),
  breakfast: MealSchema,
  morningSnack: MealSchema.optional(),
  lunch: MealSchema,
  afternoonSnack: MealSchema.optional(),
  dinner: MealSchema,
  eveningSnack: MealSchema.optional(),
});

const ExerciseBlockSchema = z.object({
  dayOfWeek: z.number().min(1).max(7),
  startTime: z.string().describe("Hora de inicio (HH:MM)"),
  duration: z.number().describe("Duración en minutos"),
  exerciseType: z.string().describe("Tipo de ejercicio"),
  description: z.string().describe("Descripción del ejercicio"),
  intensity: z.enum(["baja", "moderada", "alta"]),
  preWorkoutMeal: z.string().optional(),
  postWorkoutMeal: z.string().optional(),
  hydrationNotes: z.string().optional(),
});

const WeeklyDietPlanSchema = z.object({
  weekPlan: z.array(DayPlanSchema).length(7).describe("Plan semanal de 7 días"),
  exerciseBlocks: z.array(ExerciseBlockSchema).describe("Bloques de ejercicio programados"),
  generalNotes: z.string().describe("Notas generales y recomendaciones"),
  targetDailyCalories: z.number().describe("Objetivo calórico diario"),
  targetMacros: z.object({
    protein: z.number().describe("Porcentaje de proteínas"),
    carbs: z.number().describe("Porcentaje de carbohidratos"),
    fats: z.number().describe("Porcentaje de grasas"),
  }),
});

export class DietAiService {
  private llm: AzureChatOpenAI;
  private storage: IStorage;
  private graph: any;

  constructor(storage: IStorage) {
    this.storage = storage;
    
    // Initialize Azure OpenAI LLM
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4";
    
    if (!apiKey || !endpoint || !deployment) {
      console.warn("⚠️  Azure OpenAI credentials not configured. Diet AI generation will not work.");
      console.warn("   Please set AZURE_OPENAI_API_KEY, AZURE_OPENAI_ENDPOINT, and AZURE_OPENAI_DEPLOYMENT");
    }
    
    this.llm = new AzureChatOpenAI({
      azure: {
        apiKey: apiKey,
        endpoint: endpoint,
        deploymentName: deployment,
        apiVersion: "2024-05-01-preview",
      },
      temperature: 0.7,
      model: "gpt-4",
    });

    // Build LangGraph workflow
    this.graph = this.buildWorkflow();
  }

  private buildWorkflow() {
    // Define state annotation for LangGraph v0.2+
    const GraphAnnotation = Annotation.Root({
      patientId: Annotation<string>(),
      patient: Annotation<Patient | undefined>(),
      latestMeasurement: Annotation<Measurement | undefined>(),
      measurementHistory: Annotation<Measurement[] | undefined>(),
      selectedTemplates: Annotation<DietTemplate[] | undefined>(),
      context: Annotation<string | undefined>(),
      prompt: Annotation<string | undefined>(),
      llmResponse: Annotation<string | undefined>(),
      structuredPlan: Annotation<any | undefined>(),
      validationErrors: Annotation<string[] | undefined>(),
      generationId: Annotation<string | undefined>(),
      success: Annotation<boolean>(),
      error: Annotation<string | undefined>(),
    });

    const workflow = new StateGraph(GraphAnnotation);

    // Node 1: Load patient context
    workflow.addNode("loadContext", async (state) => {
      console.log("📊 Loading patient context...");
      
      const patient = await this.storage.getPatient(state.patientId);
      if (!patient) {
        return { ...state, success: false, error: "Patient not found" };
      }

      const measurements = await this.storage.getMeasurementsByPatient(state.patientId);
      const latestMeasurement = measurements.length > 0 ? measurements[0] : undefined;
      
      return {
        ...state,
        patient,
        latestMeasurement,
        measurementHistory: measurements.slice(0, 5), // Last 5 measurements
      };
    });

    // Node 2: Fetch matching diet templates
    workflow.addNode("fetchTemplates", async (state) => {
      console.log("📚 Fetching matching diet templates...");
      
      const templates = await this.storage.getDietTemplates();
      
      // Filter templates based on patient objective
      const matchingTemplates = templates.filter(t => 
        t.objective === state.patient?.objective && t.isActive
      ).slice(0, 3); // Top 3 templates
      
      return {
        ...state,
        selectedTemplates: matchingTemplates,
      };
    });

    // Node 3: Compose AI prompt
    workflow.addNode("composePrompt", async (state) => {
      console.log("✍️  Composing AI prompt...");
      
      const context = this.buildPatientContext(state);
      const prompt = this.buildPrompt(state, context);
      
      return {
        ...state,
        context,
        prompt,
      };
    });

    // Node 4: Call Azure OpenAI
    workflow.addNode("azureCompletion", async (state) => {
      console.log("🤖 Calling Azure OpenAI for diet generation...");
      
      const startTime = Date.now();
      
      try {
        const structuredLlm = this.llm.withStructuredOutput(WeeklyDietPlanSchema);
        const response = await structuredLlm.invoke(state.prompt!);
        
        const generationTime = Date.now() - startTime;
        
        return {
          ...state,
          structuredPlan: response,
          llmResponse: JSON.stringify(response, null, 2),
        };
      } catch (error: any) {
        console.error("❌ Azure OpenAI error:", error);
        return {
          ...state,
          success: false,
          error: `AI generation failed: ${error.message}`,
        };
      }
    });

    // Node 5: Validate generated plan
    workflow.addNode("validatePlan", async (state) => {
      console.log("✅ Validating generated diet plan...");
      
      const errors: string[] = [];
      const plan = state.structuredPlan;
      
      if (!plan) {
        errors.push("No plan generated");
        return { ...state, validationErrors: errors };
      }

      // Validate allergies
      if (state.patient?.foodAllergies) {
        const allergies = state.patient.foodAllergies.toLowerCase();
        const planText = JSON.stringify(plan).toLowerCase();
        
        // Simple check - should be more sophisticated in production
        if (allergies.includes("maní") && planText.includes("maní")) {
          errors.push("Plan contains allergen: maní");
        }
        if (allergies.includes("mariscos") && planText.includes("mariscos")) {
          errors.push("Plan contains allergen: mariscos");
        }
      }

      // Validate vegetarian/vegan preferences
      if (state.patient?.isVegetarian || state.patient?.isVegan) {
        const planText = JSON.stringify(plan).toLowerCase();
        const meatKeywords = ["pollo", "carne", "pescado", "cerdo"];
        
        for (const keyword of meatKeywords) {
          if (planText.includes(keyword)) {
            errors.push(`Plan contains non-vegetarian ingredient: ${keyword}`);
          }
        }
      }

      // Validate calorie ranges (basic check)
      const targetCalories = plan.targetDailyCalories;
      if (targetCalories < 1200 || targetCalories > 4000) {
        errors.push(`Target calories out of safe range: ${targetCalories}`);
      }

      return {
        ...state,
        validationErrors: errors,
      };
    });

    // Node 6: Persist draft
    workflow.addNode("persistDraft", async (state) => {
      console.log("💾 Persisting draft diet plan...");
      
      try {
        const generation = await this.storage.createDietGeneration({
          patientId: state.patientId,
          templateId: state.selectedTemplates?.[0]?.id || null,
          inputContext: {
            patient: state.patient,
            latestMeasurement: state.latestMeasurement,
            measurementHistory: state.measurementHistory,
          },
          promptHash: this.hashString(state.prompt || ""),
          model: "gpt-4",
          tokensUsed: null, // Would need to track from actual API response
          generationTimeMs: null,
          rawResponse: state.llmResponse || "",
          structuredPlan: state.structuredPlan,
          validationErrors: state.validationErrors || [],
          reviewStatus: state.validationErrors && state.validationErrors.length > 0 ? "pending" : "approved",
          reviewerNotes: null,
          reviewedAt: null,
        });

        // Save individual meal plans
        if (state.structuredPlan?.weekPlan) {
          for (const day of state.structuredPlan.weekPlan) {
            const meals = [
              { type: "breakfast", data: day.breakfast },
              { type: "lunch", data: day.lunch },
              { type: "dinner", data: day.dinner },
              ...(day.morningSnack ? [{ type: "snack", data: day.morningSnack }] : []),
              ...(day.afternoonSnack ? [{ type: "snack", data: day.afternoonSnack }] : []),
              ...(day.eveningSnack ? [{ type: "snack", data: day.eveningSnack }] : []),
            ];

            let mealOrder = 0;
            for (const meal of meals) {
              await this.storage.createDietMealPlan({
                generationId: generation.id,
                dayOfWeek: day.dayOfWeek,
                mealType: meal.type,
                mealOrder: mealOrder++,
                name: meal.data.name,
                description: meal.data.description,
                ingredients: meal.data.ingredients,
                calories: meal.data.calories,
                protein: meal.data.protein,
                carbs: meal.data.carbs,
                fats: meal.data.fats,
                suggestedTime: meal.data.suggestedTime,
                notes: null,
              });
            }
          }
        }

        // Save exercise blocks
        if (state.structuredPlan?.exerciseBlocks) {
          for (const exercise of state.structuredPlan.exerciseBlocks) {
            await this.storage.createDietExerciseBlock({
              generationId: generation.id,
              dayOfWeek: exercise.dayOfWeek,
              startTime: exercise.startTime,
              duration: exercise.duration,
              exerciseType: exercise.exerciseType,
              description: exercise.description,
              intensity: exercise.intensity,
              preWorkoutMeal: exercise.preWorkoutMeal || null,
              postWorkoutMeal: exercise.postWorkoutMeal || null,
              hydrationNotes: exercise.hydrationNotes || null,
              notes: null,
            });
          }
        }

        return {
          ...state,
          generationId: generation.id,
          success: true,
        };
      } catch (error: any) {
        console.error("❌ Error persisting draft:", error);
        return {
          ...state,
          success: false,
          error: `Failed to save diet plan: ${error.message}`,
        };
      }
    });

    // Define workflow edges
    workflow.setEntryPoint("loadContext");
    workflow.addEdge("loadContext", "fetchTemplates");
    workflow.addEdge("fetchTemplates", "composePrompt");
    workflow.addEdge("composePrompt", "azureCompletion");
    workflow.addEdge("azureCompletion", "validatePlan");
    workflow.addEdge("validatePlan", "persistDraft");
    workflow.addEdge("persistDraft", END);

    return workflow.compile();
  }

  private buildPatientContext(state: DietGenerationState): string {
    const { patient, latestMeasurement, measurementHistory } = state;
    
    let context = `PACIENTE: ${patient?.name}\n`;
    context += `Edad: ${patient?.birthDate ? this.calculateAge(patient.birthDate) : "N/A"} años\n`;
    context += `Género: ${patient?.gender || "N/A"}\n`;
    context += `Objetivo: ${patient?.objective || "N/A"}\n\n`;

    if (latestMeasurement) {
      context += `MEDICIONES ACTUALES:\n`;
      context += `Peso: ${latestMeasurement.weight || "N/A"} kg\n`;
      context += `Altura: ${latestMeasurement.height || "N/A"} cm\n`;
      context += `Cintura: ${latestMeasurement.waist || "N/A"} cm\n\n`;
    }

    if (patient?.exercisesRegularly) {
      context += `ACTIVIDAD FÍSICA:\n`;
      context += `Deporte: ${patient.sportType || "N/A"}\n`;
      context += `Días: ${patient.exerciseDays || "N/A"}\n`;
      context += `Horarios: ${patient.exerciseSchedule || "N/A"}\n\n`;
    } else {
      context += `ACTIVIDAD FÍSICA: Sedentario\n\n`;
    }

    context += `PREFERENCIAS DIET ARIAS:\n`;
    if (patient?.isVegetarian) context += `- Vegetariano\n`;
    if (patient?.isVegan) context += `- Vegano\n`;
    if (patient?.foodAllergies) context += `- Alergias: ${patient.foodAllergies}\n`;
    if (patient?.foodDislikes) context += `- No consume: ${patient.foodDislikes}\n`;
    context += `\n`;

    if (patient?.medicalConditions || patient?.medications) {
      context += `INFORMACIÓN MÉDICA:\n`;
      if (patient.medicalConditions) context += `Condiciones: ${patient.medicalConditions}\n`;
      if (patient.medications) context += `Medicamentos: ${patient.medications}\n`;
    }

    return context;
  }

  private buildPrompt(state: DietGenerationState, context: string): string {
    let prompt = `Eres Carolina Ibáñez, una nutricionista profesional licenciada con amplia experiencia en nutrición deportiva y planes alimenticios personalizados.\n\n`;
    
    prompt += `INFORMACIÓN DEL PACIENTE:\n${context}\n`;
    
    if (state.selectedTemplates && state.selectedTemplates.length > 0) {
      prompt += `\nEJEMPLOS DE DIETAS EXITOSAS (tus plantillas):\n`;
      state.selectedTemplates.forEach((template, idx) => {
        prompt += `\nPlantilla ${idx + 1}: ${template.name}\n`;
        prompt += `Descripción: ${template.description || "N/A"}\n`;
        if (template.sampleMeals) {
          prompt += `Ejemplos: ${JSON.stringify(template.sampleMeals).slice(0, 200)}...\n`;
        }
      });
    }

    prompt += `\nINSTRUCCIONES:\n`;
    prompt += `1. Crea un plan nutricional COMPLETO para una semana (7 días)\n`;
    prompt += `2. Incluye desayuno, almuerzo, cena y colaciones cuando sea necesario\n`;
    prompt += `3. Cada comida debe tener:\n`;
    prompt += `   - Nombre atractivo\n`;
    prompt += `   - Descripción detallada de preparación\n`;
    prompt += `   - Ingredientes con cantidades exactas\n`;
    prompt += `   - Información nutricional (calorías, proteínas, carbohidratos, grasas)\n`;
    prompt += `   - Hora sugerida para consumir\n`;
    prompt += `4. Respeta ESTRICTAMENTE las preferencias dietarias y alergias del paciente\n`;
    prompt += `5. Alinea el plan con el objetivo del paciente (${state.patient?.objective})\n`;
    prompt += `6. Si el paciente hace ejercicio, programa bloques de ejercicio con:\n`;
    prompt += `   - Tipo de ejercicio\n`;
    prompt += `   - Horario y duración\n`;
    prompt += `   - Comidas pre y post entrenamiento\n`;
    prompt += `   - Notas de hidratación\n`;
    prompt += `7. Calcula el objetivo calórico diario apropiado\n`;
    prompt += `8. Define la distribución de macronutrientes (% proteínas, carbohidratos, grasas)\n\n`;
    
    prompt += `IMPORTANTE: Usa ingredientes y recetas típicas de Chile. Sé específico, práctico y profesional.\n`;

    return prompt;
  }

  private calculateAge(birthDate: Date): number {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  // Public method to generate diet for a patient
  async generateDiet(patientId: string): Promise<{ success: boolean; generationId?: string; error?: string }> {
    console.log(`\n🚀 Starting diet generation for patient ${patientId}\n`);
    
    const initialState: DietGenerationState = {
      patientId,
      success: false,
    };

    try {
      const result = await this.graph.invoke(initialState);
      
      if (result.success) {
        console.log(`\n✅ Diet generation completed successfully!`);
        console.log(`   Generation ID: ${result.generationId}`);
        if (result.validationErrors && result.validationErrors.length > 0) {
          console.log(`   ⚠️  Validation warnings: ${result.validationErrors.join(", ")}`);
        }
      } else {
        console.error(`\n❌ Diet generation failed: ${result.error}`);
      }

      return {
        success: result.success,
        generationId: result.generationId,
        error: result.error,
      };
    } catch (error: any) {
      console.error(`\n❌ Unexpected error in diet generation:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
