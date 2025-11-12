import { ChatOpenAI } from "@langchain/openai";
import type { IStorage } from "../storage";
import type { Patient, DietTemplate, Measurement } from "@shared/schema";

export interface DietGenerationRequest {
  patientId: string;
  goal: string;
  durationWeeks: number;
  preferences?: string;
}

export interface DietGenerationResult {
  generationId: string;
  status: 'draft' | 'approved' | 'rejected';
  weeklyPlan: any;
}

export class SimpleDietAiService {
  private storage: IStorage;
  private llm: ChatOpenAI | null = null;

  constructor(storage: IStorage) {
    this.storage = storage;
    
    if (process.env.AZURE_OPENAI_API_KEY && 
        process.env.AZURE_OPENAI_ENDPOINT && 
        process.env.AZURE_OPENAI_DEPLOYMENT) {
      this.llm = new ChatOpenAI({
        openAIApiKey: process.env.AZURE_OPENAI_API_KEY,
        configuration: {
          baseURL: process.env.AZURE_OPENAI_ENDPOINT,
        },
        modelName: process.env.AZURE_OPENAI_DEPLOYMENT,
        temperature: 0.7,
      });
    }
  }

  async generateDiet(request: DietGenerationRequest): Promise<DietGenerationResult> {
    const patient = await this.storage.getPatient(request.patientId);
    if (!patient) {
      throw new Error('Patient not found');
    }

    const measurements = await this.storage.getMeasurementsByPatient(request.patientId);
    const templates = await this.storage.getDietTemplates();

    const generation = await this.storage.createDietGeneration({
      patientId: request.patientId,
      templateId: null,
      goal: request.goal,
      durationWeeks: request.durationWeeks,
      preferences: request.preferences || null,
      inputContext: {},
      promptHash: null,
      aiModel: this.llm ? 'azure-openai' : 'manual',
      promptTokens: null,
      completionTokens: null,
      generationTimeMs: null,
      rawResponse: null,
      weeklyPlan: {},
      validationErrors: null,
      status: 'draft',
      reviewerNotes: null,
      reviewedAt: null,
    });

    let weeklyPlan: any;

    if (this.llm && templates.length > 0) {
      weeklyPlan = await this.generateWithAI(patient, measurements, templates, request);
      
      await this.storage.updateDietGeneration(generation.id, {
        weeklyPlan,
        status: 'draft',
      });

      await this.persistMealsAndExercises(generation.id, weeklyPlan);
    } else {
      weeklyPlan = this.generateMockPlan(patient, request);
      
      await this.storage.updateDietGeneration(generation.id, {
        weeklyPlan,
        status: 'draft',
      });

      await this.persistMealsAndExercises(generation.id, weeklyPlan);
    }

    return {
      generationId: generation.id,
      status: 'draft',
      weeklyPlan,
    };
  }

  private async generateWithAI(
    patient: Patient, 
    measurements: Measurement[], 
    templates: DietTemplate[], 
    request: DietGenerationRequest
  ): Promise<any> {
    if (!this.llm) {
      return this.generateMockPlan(patient, request);
    }

    const latestMeasurement = measurements[0];
    const templateExamples = templates
      .slice(0, 3)
      .map(t => t.content || '')
      .filter(c => c.length > 0)
      .join('\n\n---\n\n');

    const prompt = `Eres la nutricionista Carolina Ibáñez. Genera un plan nutricional semanal personalizado.

PACIENTE:
- Nombre: ${patient.name}
- Edad: ${patient.birthDate ? Math.floor((Date.now() - new Date(patient.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 'N/A'}
- Peso: ${latestMeasurement?.weight || 'N/A'} kg
- Altura: ${latestMeasurement?.height || 'N/A'} cm
- Deporte: ${patient.sportType || 'N/A'}
- Días de entrenamiento: ${patient.exerciseDays || 'N/A'}
- Horarios: ${patient.exerciseSchedule || 'N/A'}
- Objetivo: ${request.goal}
- Vegetariano: ${patient.isVegetarian ? 'Sí' : 'No'}
- Vegano: ${patient.isVegan ? 'Sí' : 'No'}
- Alergias: ${patient.foodAllergies || 'Ninguna'}
- Disgustos: ${patient.foodDislikes || 'Ninguno'}

EJEMPLOS DE TUS PLANES:
${templateExamples}

INSTRUCCIONES:
1. Crea un plan de 7 días (Lunes a Domingo)
2. 4 comidas diarias: Desayuno (9:00), Almuerzo (13:30), Merienda (variable), Cena (variable)
3. Adapta horarios de merienda según entrenamientos
4. Incluye pre/post entreno cuando corresponda
5. Especifica cantidades en gramos
6. Respeta restricciones alimentarias y alergias
7. Alinea comidas con horarios de entrenamiento

Devuelve JSON con esta estructura:
{
  "days": [
    {
      "dayOfWeek": 1,
      "dayName": "Lunes",
      "meals": [
        {
          "type": "breakfast",
          "name": "Café con leche + tostadas",
          "description": "Descripción detallada",
          "ingredients": ["ingrediente1", "ingrediente2"],
          "calories": 450,
          "protein": 25,
          "carbs": 50,
          "fats": 12,
          "suggestedTime": "09:00"
        }
      ],
      "exercises": [
        {
          "type": "Funcional",
          "startTime": "21:00",
          "duration": 60,
          "notes": "Hidratación durante"
        }
      ]
    }
  ]
}`;

    const response = await this.llm.invoke(prompt);
    
    try {
      const content = response.content as string;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Error parsing AI response:', error);
    }

    return this.generateMockPlan(patient, request);
  }

  private generateMockPlan(patient: Patient, request: DietGenerationRequest): any {
    return {
      days: Array.from({ length: 7 }, (_, i) => ({
        dayOfWeek: i + 1,
        dayName: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'][i],
        meals: [
          {
            type: 'breakfast',
            name: 'Café con leche descremada + tostadas integrales',
            description: 'Café con leche 200cc + 2 tostadas integrales con queso untable descremado',
            ingredients: ['Leche descremada 200cc', 'Café', 'Pan integral 2 rebanadas', 'Queso untable light 30g'],
            calories: 350,
            protein: 18,
            carbs: 45,
            fats: 8,
            suggestedTime: '09:00'
          },
          {
            type: 'lunch',
            name: 'Carne + ensalada + fruta',
            description: 'Carne roja magra con ensalada mixta y fruta de estación',
            ingredients: ['Carne roja 180g', 'Ensalada mixta 1 plato', 'Aceite de oliva 1 cdta', 'Fruta 1 unidad'],
            calories: 520,
            protein: 42,
            carbs: 35,
            fats: 18,
            suggestedTime: '13:30'
          },
          {
            type: 'snack',
            name: 'Yogurt + granola',
            description: 'Yogurt descremado con granola y frutas',
            ingredients: ['Yogurt descremado 200cc', 'Granola 30g', 'Frutas mixtas'],
            calories: 280,
            protein: 12,
            carbs: 42,
            fats: 6,
            suggestedTime: '17:00'
          },
          {
            type: 'dinner',
            name: 'Pollo + vegetales + arroz integral',
            description: 'Suprema de pollo al horno con vegetales y arroz integral',
            ingredients: ['Pollo 150g', 'Vegetales mixtos 1 plato', 'Arroz integral 100g cocido'],
            calories: 480,
            protein: 38,
            carbs: 52,
            fats: 10,
            suggestedTime: '20:30'
          }
        ],
        exercises: i % 2 === 0 ? [
          {
            type: patient.sportType || 'Entrenamiento',
            startTime: '21:00',
            duration: 60,
            notes: 'Hidratación adecuada'
          }
        ] : []
      }))
    };
  }

  private async persistMealsAndExercises(generationId: string, weeklyPlan: any): Promise<void> {
    if (!weeklyPlan || !weeklyPlan.days) {
      return;
    }

    for (const day of weeklyPlan.days) {
      if (day.meals) {
        let mealOrder = 0;
        for (const meal of day.meals) {
          await this.storage.createDietMealPlan({
            generationId,
            dayOfWeek: day.dayOfWeek,
            mealType: meal.type,
            mealOrder: mealOrder++,
            name: meal.name,
            description: meal.description,
            ingredients: meal.ingredients,
            calories: meal.calories,
            protein: meal.protein,
            carbs: meal.carbs,
            fats: meal.fats,
            suggestedTime: meal.suggestedTime,
            notes: null,
          });
        }
      }

      if (day.exercises) {
        for (const exercise of day.exercises) {
          await this.storage.createDietExerciseBlock({
            generationId,
            dayOfWeek: day.dayOfWeek,
            startTime: exercise.startTime,
            durationMinutes: exercise.duration,
            exerciseType: exercise.type,
            description: null,
            intensity: null,
            preWorkoutMeal: null,
            postWorkoutMeal: null,
            hydrationNotes: null,
            notes: exercise.notes || null,
          });
        }
      }
    }
  }
}
