import { pgTable, text, integer, decimal, timestamp, uuid, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Patient Groups Table
export const patientGroups = pgTable("patient_groups", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPatientGroupSchema = createInsertSchema(patientGroups).omit({
  id: true,
  version: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPatientGroup = z.infer<typeof insertPatientGroupSchema>;
export type PatientGroup = typeof patientGroups.$inferSelect;

// Patients Table
export const patients = pgTable("patients", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  birthDate: timestamp("birth_date"),
  gender: text("gender"), // "M", "F", "Other"
  objective: text("objective"), // "pérdida", "ganancia", "mantenimiento"
  notes: text("notes"),
  
  // Activity & Lifestyle
  exercisesRegularly: boolean("exercises_regularly").default(false),
  sportType: text("sport_type"), // Tipo de deporte/actividad
  exerciseDays: text("exercise_days"), // Días que entrena (ej: "Lunes, Miércoles, Viernes")
  exerciseSchedule: text("exercise_schedule"), // Horarios (ej: "18:00-19:30")
  
  // Dietary Preferences
  isVegetarian: boolean("is_vegetarian").default(false),
  isVegan: boolean("is_vegan").default(false),
  foodAllergies: text("food_allergies"), // Alergias alimentarias
  foodDislikes: text("food_dislikes"), // Alimentos que no le gustan
  medicalConditions: text("medical_conditions"), // Condiciones médicas relevantes
  medications: text("medications"), // Medicamentos actuales
  
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPatientSchema = createInsertSchema(patients).omit({
  id: true,
  version: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  birthDate: z.string().nullable().optional().transform(val => val ? new Date(val) : null),
});
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type Patient = typeof patients.$inferSelect;

// Group Memberships Table (Many-to-Many relationship)
export const groupMemberships = pgTable("group_memberships", {
  id: uuid("id").defaultRandom().primaryKey(),
  patientId: uuid("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  groupId: uuid("group_id").notNull().references(() => patientGroups.id, { onDelete: "cascade" }),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertGroupMembershipSchema = createInsertSchema(groupMemberships).omit({
  id: true,
  version: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertGroupMembership = z.infer<typeof insertGroupMembershipSchema>;
export type GroupMembership = typeof groupMemberships.$inferSelect;

// Measurements Table (Anthropometric data - ISAK 2)
export const measurements = pgTable("measurements", {
  id: uuid("id").defaultRandom().primaryKey(),
  patientId: uuid("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  measurementDate: timestamp("measurement_date").notNull(),
  
  // Basic measurements
  weight: decimal("weight", { precision: 5, scale: 2 }), // kg
  height: decimal("height", { precision: 5, scale: 2 }), // cm
  seatedHeight: decimal("seated_height", { precision: 5, scale: 2 }), // cm
  
  // Diameters (Diámetros)
  biacromial: decimal("biacromial", { precision: 5, scale: 2 }), // cm
  thoraxTransverse: decimal("thorax_transverse", { precision: 5, scale: 2 }), // cm
  thoraxAnteroposterior: decimal("thorax_anteroposterior", { precision: 5, scale: 2 }), // cm
  biiliocristideo: decimal("biiliocristideo", { precision: 5, scale: 2 }), // cm
  humeral: decimal("humeral", { precision: 5, scale: 2 }), // cm (biepicondilar)
  femoral: decimal("femoral", { precision: 5, scale: 2 }), // cm (biepicondilar)
  
  // Perimeters (Perímetros)
  head: decimal("head", { precision: 5, scale: 2 }), // cm
  relaxedArm: decimal("relaxed_arm", { precision: 5, scale: 2 }), // cm
  flexedArm: decimal("flexed_arm", { precision: 5, scale: 2 }), // cm
  forearm: decimal("forearm", { precision: 5, scale: 2 }), // cm
  thoraxCirc: decimal("thorax_circ", { precision: 5, scale: 2 }), // cm
  waist: decimal("waist", { precision: 5, scale: 2 }), // cm
  hip: decimal("hip", { precision: 5, scale: 2 }), // cm
  thighSuperior: decimal("thigh_superior", { precision: 5, scale: 2 }), // cm
  thighMedial: decimal("thigh_medial", { precision: 5, scale: 2 }), // cm
  calf: decimal("calf", { precision: 5, scale: 2 }), // cm
  
  // Skinfolds (Pliegues Cutáneos)
  triceps: decimal("triceps", { precision: 5, scale: 2 }), // mm
  subscapular: decimal("subscapular", { precision: 5, scale: 2 }), // mm
  supraspinal: decimal("supraspinal", { precision: 5, scale: 2 }), // mm
  abdominal: decimal("abdominal", { precision: 5, scale: 2 }), // mm
  thighSkinfold: decimal("thigh_skinfold", { precision: 5, scale: 2 }), // mm
  calfSkinfold: decimal("calf_skinfold", { precision: 5, scale: 2 }), // mm
  
  notes: text("notes"),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertMeasurementSchema = createInsertSchema(measurements).omit({
  id: true,
  version: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  measurementDate: z.string().transform(val => new Date(val)),
});
export type InsertMeasurement = z.infer<typeof insertMeasurementSchema>;
export type Measurement = typeof measurements.$inferSelect;

// Measurement Calculations Table (ISAK 2 - 5 Component Fractionation D. Kerr 1988)
export const measurementCalculations = pgTable("measurement_calculations", {
  id: uuid("id").defaultRandom().primaryKey(),
  measurementId: uuid("measurement_id").notNull().references(() => measurements.id, { onDelete: "cascade" }),
  
  // Body Mass Index
  bmi: decimal("bmi", { precision: 5, scale: 2 }),
  
  // 5 Component Fractionation (kg and %)
  skinMassKg: decimal("skin_mass_kg", { precision: 6, scale: 3 }),
  skinMassPercent: decimal("skin_mass_percent", { precision: 5, scale: 2 }),
  adiposeMassKg: decimal("adipose_mass_kg", { precision: 6, scale: 3 }),
  adiposeMassPercent: decimal("adipose_mass_percent", { precision: 5, scale: 2 }),
  muscleMassKg: decimal("muscle_mass_kg", { precision: 6, scale: 3 }),
  muscleMassPercent: decimal("muscle_mass_percent", { precision: 5, scale: 2 }),
  boneMassKg: decimal("bone_mass_kg", { precision: 6, scale: 3 }),
  boneMassPercent: decimal("bone_mass_percent", { precision: 5, scale: 2 }),
  residualMassKg: decimal("residual_mass_kg", { precision: 6, scale: 3 }),
  residualMassPercent: decimal("residual_mass_percent", { precision: 5, scale: 2 }),
  
  // Additional calculations
  sumOf6Skinfolds: decimal("sum_of_6_skinfolds", { precision: 6, scale: 2 }), // mm
  
  // Somatotype (Heath-Carter)
  endomorphy: decimal("endomorphy", { precision: 4, scale: 2 }),
  mesomorphy: decimal("mesomorphy", { precision: 4, scale: 2 }),
  ectomorphy: decimal("ectomorphy", { precision: 4, scale: 2 }),
  
  // Z-scores for comparison
  weightZScore: decimal("weight_z_score", { precision: 5, scale: 2 }),
  heightZScore: decimal("height_z_score", { precision: 5, scale: 2 }),
  bmiZScore: decimal("bmi_z_score", { precision: 5, scale: 2 }),
  
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertMeasurementCalculationSchema = createInsertSchema(measurementCalculations).omit({
  id: true,
  version: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertMeasurementCalculation = z.infer<typeof insertMeasurementCalculationSchema>;
export type MeasurementCalculation = typeof measurementCalculations.$inferSelect;

// Diets Table
export const diets = pgTable("diets", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  calories: integer("calories").notNull(),
  protein: integer("protein").notNull(), // g
  carbs: integer("carbs").notNull(), // g
  fats: integer("fats").notNull(), // g
  tags: text("tags").array(),
  mealPlan: text("meal_plan"), // JSON string with detailed meal plan
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDietSchema = createInsertSchema(diets).omit({
  id: true,
  version: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDiet = z.infer<typeof insertDietSchema>;
export type Diet = typeof diets.$inferSelect;

// Reports Table
export const reports = pgTable("reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  patientId: uuid("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  measurementId: uuid("measurement_id").notNull().references(() => measurements.id, { onDelete: "cascade" }),
  pdfUrl: text("pdf_url"), // URL to stored PDF file
  status: text("status").notNull().default("pending"), // "pending", "generated", "sent"
  sentVia: text("sent_via").array(), // ["email", "whatsapp"]
  sentAt: timestamp("sent_at"),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertReportSchema = createInsertSchema(reports).omit({
  id: true,
  version: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  sentAt: z.string().nullable().optional().transform(val => val ? new Date(val) : null),
});
export type InsertReport = z.infer<typeof insertReportSchema>;
export type Report = typeof reports.$inferSelect;

// Diet Assignments Table (Many-to-Many relationship between patients and diets)
export const dietAssignments = pgTable("diet_assignments", {
  id: uuid("id").defaultRandom().primaryKey(),
  patientId: uuid("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  dietId: uuid("diet_id").notNull().references(() => diets.id, { onDelete: "cascade" }),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDietAssignmentSchema = createInsertSchema(dietAssignments).omit({
  id: true,
  version: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startDate: z.string().transform(val => new Date(val)),
  endDate: z.string().nullable().optional().transform(val => val ? new Date(val) : null),
});
export type InsertDietAssignment = z.infer<typeof insertDietAssignmentSchema>;
export type DietAssignment = typeof dietAssignments.$inferSelect;

// ===================================
// AI DIET GENERATION SYSTEM TABLES
// ===================================

// Diet Templates Table (Carolina's curated examples)
export const dietTemplates = pgTable("diet_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(), // Template name (e.g., "Pérdida de Peso - Bajo Carbohidratos")
  description: text("description"),
  objective: text("objective"), // "pérdida", "ganancia", "mantenimiento"
  
  // Carolina's actual diet plan content (for AI prompt examples)
  content: text("content"), // Full text of Carolina's weekly plan examples
  
  // Nutritional guidelines
  targetCalories: integer("target_calories"), // Daily calorie target
  macros: jsonb("macros"), // { protein: 30, carbs: 40, fats: 30 } (percentages)
  
  // Diet structure and examples
  mealStructure: jsonb("meal_structure"), // { breakfast: {...}, lunch: {...}, dinner: {...}, snacks: [...] }
  sampleMeals: jsonb("sample_meals"), // Array of meal examples with recipes
  restrictions: jsonb("restrictions"), // { vegetarian: false, vegan: false, allergies: [] }
  
  // Metadata
  tags: text("tags").array(), // ["bajo-carbohidratos", "alto-proteina", "vegetariano"]
  isActive: boolean("is_active").notNull().default(true),
  successRate: integer("success_rate"), // 0-100, based on patient outcomes
  
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDietTemplateSchema = createInsertSchema(dietTemplates).omit({
  id: true,
  version: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDietTemplate = z.infer<typeof insertDietTemplateSchema>;
export type DietTemplate = typeof dietTemplates.$inferSelect;

// Diet Generations Table (AI generation metadata and audit log)
export const dietGenerations = pgTable("diet_generations", {
  id: uuid("id").defaultRandom().primaryKey(),
  patientId: uuid("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  templateId: uuid("template_id").references(() => dietTemplates.id),
  
  // Business metadata
  goal: text("goal").notNull(), // "Pérdida de peso", "Ganancia muscular", etc.
  durationWeeks: integer("duration_weeks").notNull().default(4),
  preferences: text("preferences"), // Additional dietary preferences/notes
  
  // Generation input context
  inputContext: jsonb("input_context"), // Patient data snapshot used for generation
  promptHash: text("prompt_hash"), // Hash of the prompt for deduplication
  
  // AI generation metadata
  aiModel: text("ai_model").notNull(), // "gpt-4", "azure-openai", "manual"
  promptTokens: integer("prompt_tokens"),
  completionTokens: integer("completion_tokens"),
  generationTimeMs: integer("generation_time_ms"),
  
  // Generation output
  rawResponse: text("raw_response"), // Full LLM response
  weeklyPlan: jsonb("weekly_plan"), // Parsed and validated weekly meal plan
  
  // Validation and review
  validationErrors: jsonb("validation_errors"), // Array of validation issues
  status: text("status").notNull().default("draft"), // "draft", "approved", "rejected"
  reviewerNotes: text("reviewer_notes"),
  reviewedAt: timestamp("reviewed_at"),
  
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDietGenerationSchema = createInsertSchema(dietGenerations).omit({
  id: true,
  version: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  reviewedAt: z.string().nullable().optional().transform(val => val ? new Date(val) : null),
});
export type InsertDietGeneration = z.infer<typeof insertDietGenerationSchema>;
export type DietGeneration = typeof dietGenerations.$inferSelect;

// Diet Meal Plans Table (Detailed daily meal schedules)
export const dietMealPlans = pgTable("diet_meal_plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  generationId: uuid("generation_id").notNull().references(() => dietGenerations.id, { onDelete: "cascade" }),
  
  // Day and meal slot
  dayOfWeek: integer("day_of_week").notNull(), // 1-7 (Monday-Sunday)
  mealType: text("meal_type").notNull(), // "breakfast", "lunch", "dinner", "snack"
  mealOrder: integer("meal_order").notNull(), // Order within the day
  
  // Meal details
  name: text("name").notNull(), // "Avena con Frutas y Almendras"
  description: text("description"), // Detailed recipe/instructions
  ingredients: jsonb("ingredients"), // Array of { name, quantity, unit }
  
  // Nutritional info
  calories: integer("calories"),
  protein: decimal("protein", { precision: 5, scale: 2 }), // grams
  carbs: decimal("carbs", { precision: 5, scale: 2 }), // grams
  fats: decimal("fats", { precision: 5, scale: 2 }), // grams
  
  // Timing
  suggestedTime: text("suggested_time"), // "07:00", "12:30"
  
  notes: text("notes"),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDietMealPlanSchema = createInsertSchema(dietMealPlans).omit({
  id: true,
  version: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDietMealPlan = z.infer<typeof insertDietMealPlanSchema>;
export type DietMealPlan = typeof dietMealPlans.$inferSelect;

// Diet Exercise Blocks Table (Exercise schedules aligned with meal plans)
export const dietExerciseBlocks = pgTable("diet_exercise_blocks", {
  id: uuid("id").defaultRandom().primaryKey(),
  generationId: uuid("generation_id").notNull().references(() => dietGenerations.id, { onDelete: "cascade" }),
  
  // Schedule
  dayOfWeek: integer("day_of_week").notNull(), // 1-7 (Monday-Sunday)
  startTime: text("start_time").notNull(), // "18:00"
  durationMinutes: integer("duration_minutes"), // Exercise duration in minutes
  
  // Exercise details
  exerciseType: text("exercise_type").notNull(), // "Cardio", "Fuerza", "HIIT", etc.
  description: text("description"),
  intensity: text("intensity"), // "baja", "moderada", "alta"
  
  // Recommendations
  preWorkoutMeal: text("pre_workout_meal"), // Reference to meal or description
  postWorkoutMeal: text("post_workout_meal"),
  hydrationNotes: text("hydration_notes"),
  
  notes: text("notes"),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDietExerciseBlockSchema = createInsertSchema(dietExerciseBlocks).omit({
  id: true,
  version: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDietExerciseBlock = z.infer<typeof insertDietExerciseBlockSchema>;
export type DietExerciseBlock = typeof dietExerciseBlocks.$inferSelect;

// ============================================================================
// MEAL CATALOG SYSTEM - Carolina's Pre-loaded Meals
// ============================================================================

// Meals Table (Individual meal catalog - Carolina's time-saving database)
export const meals = pgTable("meals", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(), // "Omelette de 1 huevo + 1 clara"
  description: text("description"), // Detailed preparation instructions
  category: text("category").notNull(), // "breakfast", "lunch", "dinner", "snack", "pre-workout", "post-workout"
  
  // Ingredients with portions
  ingredients: jsonb("ingredients"), // [{ name: "Huevo", quantity: 1, unit: "unidad" }, ...]
  portionSize: text("portion_size"), // "1 porción", "180gr", "½ taza"
  
  // Macronutrients
  calories: integer("calories"),
  protein: decimal("protein", { precision: 5, scale: 2 }), // grams
  carbs: decimal("carbs", { precision: 5, scale: 2 }), // grams
  fats: decimal("fats", { precision: 5, scale: 2 }), // grams
  fiber: decimal("fiber", { precision: 5, scale: 2 }), // grams
  
  // Preparation
  prepTime: integer("prep_time"), // minutes
  cookTime: integer("cook_time"), // minutes
  instructions: text("instructions"),
  
  // Metadata for filtering
  isVegetarian: boolean("is_vegetarian").default(false),
  isVegan: boolean("is_vegan").default(false),
  isGlutenFree: boolean("is_gluten_free").default(false),
  isDairyFree: boolean("is_dairy_free").default(false),
  
  // Image
  imageUrl: text("image_url"), // URL to uploaded or AI-generated image
  
  notes: text("notes"),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertMealSchema = createInsertSchema(meals).omit({
  id: true,
  version: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertMeal = z.infer<typeof insertMealSchema>;
export type Meal = typeof meals.$inferSelect;

// Meal Tags Table (For filtering: group, sport, objective, timing)
export const mealTags = pgTable("meal_tags", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(), // "Gimnasia", "Running", "Post-entreno", "Alto-proteína"
  category: text("category").notNull(), // "group", "sport", "objective", "timing", "dietary"
  description: text("description"),
  color: text("color"), // Hex color for UI display
  
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertMealTagSchema = createInsertSchema(mealTags).omit({
  id: true,
  version: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertMealTag = z.infer<typeof insertMealTagSchema>;
export type MealTag = typeof mealTags.$inferSelect;

// Meal Tag Assignments (Many-to-Many)
export const mealTagAssignments = pgTable("meal_tag_assignments", {
  id: uuid("id").defaultRandom().primaryKey(),
  mealId: uuid("meal_id").notNull().references(() => meals.id, { onDelete: "cascade" }),
  tagId: uuid("tag_id").notNull().references(() => mealTags.id, { onDelete: "cascade" }),
  
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertMealTagAssignmentSchema = createInsertSchema(mealTagAssignments).omit({
  id: true,
  version: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertMealTagAssignment = z.infer<typeof insertMealTagAssignmentSchema>;
export type MealTagAssignment = typeof mealTagAssignments.$inferSelect;

// ============================================================================
// WEEKLY DIET PLAN SYSTEM - Carolina's Fast Diet Assignment
// ============================================================================

// Weekly Diet Plans Table (Templates reusables para asignación masiva)
export const weeklyDietPlans = pgTable("weekly_diet_plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  
  // Plan metadata
  name: text("name").notNull(), // "Plan Running Septiembre 2024"
  description: text("description"),
  isTemplate: boolean("is_template").notNull().default(true), // Templates vs instances
  goal: text("goal"), // "Aumento masa muscular", "Pérdida peso"
  
  // Nutritional targets
  dailyCalories: integer("daily_calories"),
  proteinGrams: decimal("protein_grams", { precision: 5, scale: 2 }),
  carbsGrams: decimal("carbs_grams", { precision: 5, scale: 2 }),
  fatsGrams: decimal("fats_grams", { precision: 5, scale: 2 }),
  
  notes: text("notes"),
  
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertWeeklyDietPlanSchema = createInsertSchema(weeklyDietPlans).omit({
  id: true,
  version: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertWeeklyDietPlan = z.infer<typeof insertWeeklyDietPlanSchema>;
export type WeeklyDietPlan = typeof weeklyDietPlans.$inferSelect;

// Weekly Plan Assignments (Many-to-Many: plans -> groups/patients)
export const weeklyPlanAssignments = pgTable("weekly_plan_assignments", {
  id: uuid("id").defaultRandom().primaryKey(),
  planId: uuid("plan_id").notNull().references(() => weeklyDietPlans.id, { onDelete: "cascade" }),
  
  // Target: group OR patient (at least one must be set)
  groupId: uuid("group_id").references(() => patientGroups.id, { onDelete: "cascade" }),
  patientId: uuid("patient_id").references(() => patients.id, { onDelete: "cascade" }),
  
  // Assignment metadata
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  status: text("status").notNull().default("active"), // "active", "paused", "completed"
  assignmentNotes: text("assignment_notes"),
  
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertWeeklyPlanAssignmentSchema = createInsertSchema(weeklyPlanAssignments).omit({
  id: true,
  version: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startDate: z.string().nullable().optional().transform(val => val ? new Date(val) : null),
  endDate: z.string().nullable().optional().transform(val => val ? new Date(val) : null),
}).refine(data => {
  const hasGroup = Boolean(data.groupId);
  const hasPatient = Boolean(data.patientId);
  return (hasGroup && !hasPatient) || (!hasGroup && hasPatient);
}, {
  message: "Exactly one of groupId or patientId must be provided, not both",
});
export type InsertWeeklyPlanAssignment = z.infer<typeof insertWeeklyPlanAssignmentSchema>;
export type WeeklyPlanAssignment = typeof weeklyPlanAssignments.$inferSelect;

// Weekly Plan Meals Table (Individual slots in the 7x4 grid)
export const weeklyPlanMeals = pgTable("weekly_plan_meals", {
  id: uuid("id").defaultRandom().primaryKey(),
  planId: uuid("plan_id").notNull().references(() => weeklyDietPlans.id, { onDelete: "cascade" }),
  mealId: uuid("meal_id").references(() => meals.id, { onDelete: "set null" }), // Can be null for custom entries
  
  // Grid position
  dayOfWeek: integer("day_of_week").notNull(), // 1=Monday, 7=Sunday
  mealSlot: text("meal_slot").notNull(), // "breakfast", "lunch", "snack", "dinner"
  slotOrder: integer("slot_order").default(1), // For multiple snacks
  
  // Custom meal override (if mealId is null)
  customName: text("custom_name"),
  customDescription: text("custom_description"),
  customCalories: integer("custom_calories"),
  customProtein: decimal("custom_protein", { precision: 5, scale: 2 }),
  customCarbs: decimal("custom_carbs", { precision: 5, scale: 2 }),
  customFats: decimal("custom_fats", { precision: 5, scale: 2 }),
  
  // Timing
  suggestedTime: text("suggested_time"), // "09:00", "13:30", "21:00"
  linkedToExercise: boolean("linked_to_exercise").default(false), // Pre/post workout flag
  
  notes: text("notes"),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertWeeklyPlanMealSchema = createInsertSchema(weeklyPlanMeals).omit({
  id: true,
  version: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertWeeklyPlanMeal = z.infer<typeof insertWeeklyPlanMealSchema>;
export type WeeklyPlanMeal = typeof weeklyPlanMeals.$inferSelect;
