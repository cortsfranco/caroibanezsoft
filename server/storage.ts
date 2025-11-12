import type {
  Patient,
  InsertPatient,
  PatientGroup,
  InsertPatientGroup,
  GroupMembership,
  InsertGroupMembership,
  Measurement,
  InsertMeasurement,
  MeasurementCalculation,
  InsertMeasurementCalculation,
  Diet,
  InsertDiet,
  DietAssignment,
  InsertDietAssignment,
  Report,
  InsertReport,
  DietTemplate,
  InsertDietTemplate,
  DietGeneration,
  InsertDietGeneration,
  DietMealPlan,
  InsertDietMealPlan,
  DietExerciseBlock,
  InsertDietExerciseBlock,
  Meal,
  InsertMeal,
  MealTag,
  InsertMealTag,
  MealTagAssignment,
  InsertMealTagAssignment,
  WeeklyDietPlan,
  InsertWeeklyDietPlan,
  WeeklyPlanMeal,
  InsertWeeklyPlanMeal,
} from "@shared/schema";

export class VersionConflictError extends Error {
  constructor(message: string = "Version conflict - record was modified by another user") {
    super(message);
    this.name = "VersionConflictError";
  }
}

export type PatientProfile = {
  patient: Patient;
  groups: PatientGroup[];
  latestMeasurement: Measurement | null;
  measurementCount: number;
};

export type GroupStatistics = {
  groupId: string;
  groupName: string;
  patientCount: number;
  measurementCount: number;
  avgWeight: number | null;
  avgHeight: number | null;
  avgBMI: number | null;
  avgWaist: number | null;
  weightTrend: { date: string; value: number }[];
  bmiTrend: { date: string; value: number }[];
};

export interface IStorage {
  // Patients
  getPatients(): Promise<Patient[]>;
  getPatient(id: string): Promise<Patient | null>;
  getPatientProfile(id: string): Promise<PatientProfile | null>;
  createPatient(data: InsertPatient): Promise<Patient>;
  updatePatient(id: string, data: Partial<InsertPatient>, expectedVersion?: number): Promise<Patient | null>;
  deletePatient(id: string): Promise<boolean>;

  // Patient Groups
  getPatientGroups(): Promise<PatientGroup[]>;
  getPatientGroup(id: string): Promise<PatientGroup | null>;
  createPatientGroup(data: InsertPatientGroup): Promise<PatientGroup>;
  updatePatientGroup(id: string, data: Partial<InsertPatientGroup>, expectedVersion?: number): Promise<PatientGroup | null>;
  deletePatientGroup(id: string): Promise<boolean>;

  // Group Memberships
  getGroupMemberships(groupId?: string, patientId?: string): Promise<GroupMembership[]>;
  createGroupMembership(data: InsertGroupMembership): Promise<GroupMembership>;
  deleteGroupMembership(id: string): Promise<boolean>;
  reassignPatientGroup(patientId: string, newGroupId: string): Promise<boolean>;

  // Measurements
  getMeasurements(patientId?: string): Promise<Measurement[]>;
  getMeasurement(id: string): Promise<Measurement | null>;
  createMeasurement(data: InsertMeasurement): Promise<Measurement>;
  updateMeasurement(id: string, data: Partial<InsertMeasurement>, expectedVersion?: number): Promise<Measurement | null>;
  deleteMeasurement(id: string): Promise<boolean>;
  getLatestMeasurement(patientId: string): Promise<Measurement | null>;

  // Measurement Calculations
  getMeasurementCalculations(measurementId: string): Promise<MeasurementCalculation[]>;
  createMeasurementCalculation(data: InsertMeasurementCalculation): Promise<MeasurementCalculation>;
  updateMeasurementCalculation(id: string, data: Partial<InsertMeasurementCalculation>, expectedVersion?: number): Promise<MeasurementCalculation | null>;

  // Diets
  getDiets(): Promise<Diet[]>;
  getDiet(id: string): Promise<Diet | null>;
  createDiet(data: InsertDiet): Promise<Diet>;
  updateDiet(id: string, data: Partial<InsertDiet>, expectedVersion?: number): Promise<Diet | null>;
  deleteDiet(id: string): Promise<boolean>;

  // Diet Assignments
  getDietAssignments(patientId?: string, dietId?: string): Promise<DietAssignment[]>;
  getDietAssignment(id: string): Promise<DietAssignment | null>;
  createDietAssignment(data: InsertDietAssignment): Promise<DietAssignment>;
  updateDietAssignment(id: string, data: Partial<InsertDietAssignment>, expectedVersion?: number): Promise<DietAssignment | null>;
  deleteDietAssignment(id: string): Promise<boolean>;

  // Reports
  getReports(patientId?: string): Promise<Report[]>;
  getReport(id: string): Promise<Report | null>;
  createReport(data: InsertReport): Promise<Report>;
  updateReport(id: string, data: Partial<InsertReport>, expectedVersion?: number): Promise<Report | null>;
  deleteReport(id: string): Promise<boolean>;

  // Dashboard Statistics
  getGroupStatistics(): Promise<GroupStatistics[]>;

  // AI Diet Generation System
  // Diet Templates
  getDietTemplates(): Promise<DietTemplate[]>;
  getDietTemplate(id: string): Promise<DietTemplate | null>;
  createDietTemplate(data: InsertDietTemplate): Promise<DietTemplate>;
  updateDietTemplate(id: string, data: Partial<InsertDietTemplate>, expectedVersion?: number): Promise<DietTemplate | null>;
  deleteDietTemplate(id: string): Promise<boolean>;

  // Diet Generations
  getDietGenerations(patientId?: string): Promise<DietGeneration[]>;
  getDietGeneration(id: string): Promise<DietGeneration | null>;
  createDietGeneration(data: InsertDietGeneration): Promise<DietGeneration>;
  updateDietGeneration(id: string, data: Partial<InsertDietGeneration>, expectedVersion?: number): Promise<DietGeneration | null>;
  deleteDietGeneration(id: string): Promise<boolean>;

  // Diet Meal Plans
  getDietMealPlans(generationId: string): Promise<DietMealPlan[]>;
  createDietMealPlan(data: InsertDietMealPlan): Promise<DietMealPlan>;

  // Diet Exercise Blocks
  getDietExerciseBlocks(generationId: string): Promise<DietExerciseBlock[]>;
  createDietExerciseBlock(data: InsertDietExerciseBlock): Promise<DietExerciseBlock>;

  // Helper method for diet AI service
  getMeasurementsByPatient(patientId: string): Promise<Measurement[]>;

  // ============================================================================
  // MEAL CATALOG SYSTEM - Carolina's Pre-loaded Meals
  // ============================================================================

  // Meals
  getMeals(filters?: { category?: string; search?: string; tagIds?: string[] }): Promise<Meal[]>;
  getMeal(id: string): Promise<Meal | null>;
  createMeal(data: InsertMeal): Promise<Meal>;
  updateMeal(id: string, data: Partial<InsertMeal>, expectedVersion?: number): Promise<Meal | null>;
  deleteMeal(id: string): Promise<boolean>;

  // Meal Tags
  getMealTags(category?: string): Promise<MealTag[]>;
  getMealTag(id: string): Promise<MealTag | null>;
  createMealTag(data: InsertMealTag): Promise<MealTag>;
  updateMealTag(id: string, data: Partial<InsertMealTag>, expectedVersion?: number): Promise<MealTag | null>;
  deleteMealTag(id: string): Promise<boolean>;

  // Meal Tag Assignments
  getMealTagAssignments(mealId?: string, tagId?: string): Promise<MealTagAssignment[]>;
  createMealTagAssignment(data: InsertMealTagAssignment): Promise<MealTagAssignment>;
  deleteMealTagAssignment(id: string): Promise<boolean>;
  assignTagsToMeal(mealId: string, tagIds: string[]): Promise<void>;

  // Weekly Diet Plans
  getWeeklyDietPlans(patientId?: string): Promise<WeeklyDietPlan[]>;
  getWeeklyDietPlan(id: string): Promise<WeeklyDietPlan | null>;
  createWeeklyDietPlan(data: InsertWeeklyDietPlan): Promise<WeeklyDietPlan>;
  updateWeeklyDietPlan(id: string, data: Partial<InsertWeeklyDietPlan>, expectedVersion?: number): Promise<WeeklyDietPlan | null>;
  deleteWeeklyDietPlan(id: string): Promise<boolean>;

  // Weekly Plan Meals
  getWeeklyPlanMeals(planId: string): Promise<WeeklyPlanMeal[]>;
  getWeeklyPlanMeal(id: string): Promise<WeeklyPlanMeal | null>;
  createWeeklyPlanMeal(data: InsertWeeklyPlanMeal): Promise<WeeklyPlanMeal>;
  updateWeeklyPlanMeal(id: string, data: Partial<InsertWeeklyPlanMeal>, expectedVersion?: number): Promise<WeeklyPlanMeal | null>;
  deleteWeeklyPlanMeal(id: string): Promise<boolean>;
}
