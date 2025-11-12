import { nanoid } from "nanoid";
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
import type { IStorage, PatientProfile, GroupStatistics } from "./storage";
import { VersionConflictError } from "./storage";

/**
 * In-memory storage implementation for development and testing
 * Used when Neon database is unavailable
 */
export class MemStorage implements IStorage {
  private patients: Patient[] = [];
  private patientGroups: PatientGroup[] = [];
  private groupMemberships: GroupMembership[] = [];
  private measurements: Measurement[] = [];
  private measurementCalculations: MeasurementCalculation[] = [];
  private diets: Diet[] = [];
  private dietAssignments: DietAssignment[] = [];
  private reports: Report[] = [];
  private dietTemplates: DietTemplate[] = [];
  private dietGenerations: DietGeneration[] = [];
  private dietMealPlans: DietMealPlan[] = [];
  private dietExerciseBlocks: DietExerciseBlock[] = [];
  
  // Meal Catalog System
  private meals: Meal[] = [];
  private mealTags: MealTag[] = [];
  private mealTagAssignments: MealTagAssignment[] = [];
  private weeklyDietPlans: WeeklyDietPlan[] = [];
  private weeklyPlanMeals: WeeklyPlanMeal[] = [];

  // ============================================================================
  // MEAL CATALOG SYSTEM - Carolina's Time-Saving Features
  // ============================================================================

  async getMeals(filters?: {
    category?: string;
    search?: string;
    tagIds?: string[];
  }): Promise<Meal[]> {
    let results = [...this.meals];

    if (filters?.category) {
      results = results.filter((m) => m.category === filters.category);
    }

    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      results = results.filter(
        (m) =>
          m.name.toLowerCase().includes(searchLower) ||
          m.description?.toLowerCase().includes(searchLower)
      );
    }

    if (filters?.tagIds && filters.tagIds.length > 0) {
      const mealIds = new Set(
        this.mealTagAssignments
          .filter((a) => filters.tagIds!.includes(a.tagId))
          .map((a) => a.mealId)
      );
      results = results.filter((m) => mealIds.has(m.id));
    }

    return results.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getMeal(id: string): Promise<Meal | null> {
    return this.meals.find((m) => m.id === id) || null;
  }

  async createMeal(data: InsertMeal): Promise<Meal> {
    const meal: Meal = {
      id: nanoid(),
      name: data.name,
      description: data.description ?? null,
      category: data.category,
      ingredients: data.ingredients ?? null,
      portionSize: data.portionSize ?? null,
      calories: data.calories ?? null,
      protein: data.protein ?? null,
      carbs: data.carbs ?? null,
      fats: data.fats ?? null,
      fiber: data.fiber ?? null,
      prepTime: data.prepTime ?? null,
      cookTime: data.cookTime ?? null,
      instructions: data.instructions ?? null,
      isVegetarian: data.isVegetarian ?? null,
      isVegan: data.isVegan ?? null,
      isGlutenFree: data.isGlutenFree ?? null,
      isDairyFree: data.isDairyFree ?? null,
      notes: data.notes ?? null,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.meals.push(meal);
    return meal;
  }

  async updateMeal(
    id: string,
    data: Partial<InsertMeal>,
    expectedVersion?: number
  ): Promise<Meal | null> {
    const index = this.meals.findIndex((m) => m.id === id);
    if (index === -1) return null;

    const current = this.meals[index];
    if (expectedVersion !== undefined && current.version !== expectedVersion) {
      throw new VersionConflictError();
    }

    const updated: Meal = {
      ...current,
      ...data,
      version: expectedVersion !== undefined ? expectedVersion + 1 : current.version + 1,
      updatedAt: new Date(),
    };
    this.meals[index] = updated;
    return updated;
  }

  async deleteMeal(id: string): Promise<boolean> {
    const initialLength = this.meals.length;
    this.meals = this.meals.filter((m) => m.id !== id);
    // Also delete tag assignments
    this.mealTagAssignments = this.mealTagAssignments.filter(
      (a) => a.mealId !== id
    );
    return this.meals.length < initialLength;
  }

  // Meal Tags
  async getMealTags(category?: string): Promise<MealTag[]> {
    if (category) {
      return this.mealTags.filter((t) => t.category === category);
    }
    return [...this.mealTags];
  }

  async getMealTag(id: string): Promise<MealTag | null> {
    return this.mealTags.find((t) => t.id === id) || null;
  }

  async createMealTag(data: InsertMealTag): Promise<MealTag> {
    const tag: MealTag = {
      id: nanoid(),
      name: data.name,
      category: data.category,
      description: data.description ?? null,
      color: data.color ?? null,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.mealTags.push(tag);
    return tag;
  }

  async updateMealTag(
    id: string,
    data: Partial<InsertMealTag>,
    expectedVersion?: number
  ): Promise<MealTag | null> {
    const index = this.mealTags.findIndex((t) => t.id === id);
    if (index === -1) return null;

    const current = this.mealTags[index];
    if (expectedVersion !== undefined && current.version !== expectedVersion) {
      throw new VersionConflictError();
    }

    const updated: MealTag = {
      ...current,
      ...data,
      version: expectedVersion !== undefined ? expectedVersion + 1 : current.version + 1,
      updatedAt: new Date(),
    };
    this.mealTags[index] = updated;
    return updated;
  }

  async deleteMealTag(id: string): Promise<boolean> {
    const initialLength = this.mealTags.length;
    this.mealTags = this.mealTags.filter((t) => t.id !== id);
    // Also delete assignments
    this.mealTagAssignments = this.mealTagAssignments.filter(
      (a) => a.tagId !== id
    );
    return this.mealTags.length < initialLength;
  }

  // Meal Tag Assignments
  async getMealTagAssignments(
    mealId?: string,
    tagId?: string
  ): Promise<MealTagAssignment[]> {
    let results = [...this.mealTagAssignments];
    if (mealId) {
      results = results.filter((a) => a.mealId === mealId);
    }
    if (tagId) {
      results = results.filter((a) => a.tagId === tagId);
    }
    return results;
  }

  async createMealTagAssignment(
    data: InsertMealTagAssignment
  ): Promise<MealTagAssignment> {
    const assignment: MealTagAssignment = {
      id: nanoid(),
      ...data,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.mealTagAssignments.push(assignment);
    return assignment;
  }

  async deleteMealTagAssignment(id: string): Promise<boolean> {
    const initialLength = this.mealTagAssignments.length;
    this.mealTagAssignments = this.mealTagAssignments.filter((a) => a.id !== id);
    return this.mealTagAssignments.length < initialLength;
  }

  async assignTagsToMeal(mealId: string, tagIds: string[]): Promise<void> {
    // Remove existing assignments for this meal
    this.mealTagAssignments = this.mealTagAssignments.filter(
      (a) => a.mealId !== mealId
    );
    // Create new assignments
    for (const tagId of tagIds) {
      await this.createMealTagAssignment({ mealId, tagId });
    }
  }

  // Weekly Diet Plans
  async getWeeklyDietPlans(patientId?: string): Promise<WeeklyDietPlan[]> {
    if (patientId) {
      return this.weeklyDietPlans.filter((p) => p.patientId === patientId);
    }
    return [...this.weeklyDietPlans];
  }

  async getWeeklyDietPlan(id: string): Promise<WeeklyDietPlan | null> {
    return this.weeklyDietPlans.find((p) => p.id === id) || null;
  }

  async createWeeklyDietPlan(data: InsertWeeklyDietPlan): Promise<WeeklyDietPlan> {
    const plan: WeeklyDietPlan = {
      id: nanoid(),
      patientId: data.patientId,
      name: data.name,
      startDate: data.startDate ?? null,
      endDate: data.endDate ?? null,
      goal: data.goal ?? null,
      dailyCalories: data.dailyCalories ?? null,
      proteinGrams: data.proteinGrams ?? null,
      carbsGrams: data.carbsGrams ?? null,
      fatsGrams: data.fatsGrams ?? null,
      status: data.status ?? "draft",
      notes: data.notes ?? null,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.weeklyDietPlans.push(plan);
    return plan;
  }

  async updateWeeklyDietPlan(
    id: string,
    data: Partial<InsertWeeklyDietPlan>,
    expectedVersion?: number
  ): Promise<WeeklyDietPlan | null> {
    const index = this.weeklyDietPlans.findIndex((p) => p.id === id);
    if (index === -1) return null;

    const current = this.weeklyDietPlans[index];
    if (expectedVersion !== undefined && current.version !== expectedVersion) {
      throw new VersionConflictError();
    }

    const updated: WeeklyDietPlan = {
      ...current,
      ...data,
      version: expectedVersion !== undefined ? expectedVersion + 1 : current.version + 1,
      updatedAt: new Date(),
    };
    this.weeklyDietPlans[index] = updated;
    return updated;
  }

  async deleteWeeklyDietPlan(id: string): Promise<boolean> {
    const initialLength = this.weeklyDietPlans.length;
    this.weeklyDietPlans = this.weeklyDietPlans.filter((p) => p.id !== id);
    // Also delete associated meals
    this.weeklyPlanMeals = this.weeklyPlanMeals.filter((m) => m.planId !== id);
    return this.weeklyDietPlans.length < initialLength;
  }

  // Weekly Plan Meals
  async getWeeklyPlanMeals(planId: string): Promise<WeeklyPlanMeal[]> {
    return this.weeklyPlanMeals
      .filter((m) => m.planId === planId)
      .sort((a, b) => {
        if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
        if (a.mealSlot !== b.mealSlot) return a.mealSlot.localeCompare(b.mealSlot);
        return (a.slotOrder || 0) - (b.slotOrder || 0);
      });
  }

  async getWeeklyPlanMeal(id: string): Promise<WeeklyPlanMeal | null> {
    return this.weeklyPlanMeals.find((m) => m.id === id) || null;
  }

  async createWeeklyPlanMeal(data: InsertWeeklyPlanMeal): Promise<WeeklyPlanMeal> {
    const planMeal: WeeklyPlanMeal = {
      id: nanoid(),
      planId: data.planId,
      mealId: data.mealId ?? null,
      dayOfWeek: data.dayOfWeek,
      mealSlot: data.mealSlot,
      slotOrder: data.slotOrder ?? null,
      customName: data.customName ?? null,
      customDescription: data.customDescription ?? null,
      customCalories: data.customCalories ?? null,
      customProtein: data.customProtein ?? null,
      customCarbs: data.customCarbs ?? null,
      customFats: data.customFats ?? null,
      suggestedTime: data.suggestedTime ?? null,
      linkedToExercise: data.linkedToExercise ?? null,
      notes: data.notes ?? null,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.weeklyPlanMeals.push(planMeal);
    return planMeal;
  }

  async updateWeeklyPlanMeal(
    id: string,
    data: Partial<InsertWeeklyPlanMeal>,
    expectedVersion?: number
  ): Promise<WeeklyPlanMeal | null> {
    const index = this.weeklyPlanMeals.findIndex((m) => m.id === id);
    if (index === -1) return null;

    const current = this.weeklyPlanMeals[index];
    if (expectedVersion !== undefined && current.version !== expectedVersion) {
      throw new VersionConflictError();
    }

    const updated: WeeklyPlanMeal = {
      ...current,
      ...data,
      version: expectedVersion !== undefined ? expectedVersion + 1 : current.version + 1,
      updatedAt: new Date(),
    };
    this.weeklyPlanMeals[index] = updated;
    return updated;
  }

  async deleteWeeklyPlanMeal(id: string): Promise<boolean> {
    const initialLength = this.weeklyPlanMeals.length;
    this.weeklyPlanMeals = this.weeklyPlanMeals.filter((m) => m.id !== id);
    return this.weeklyPlanMeals.length < initialLength;
  }

  // ============================================================================
  // EXISTING METHODS - Stub implementations for other tables
  // (Will need to be fully implemented for complete MemStorage)
  // ============================================================================

  async getPatients(): Promise<Patient[]> {
    throw new Error("MemStorage getPatients not implemented yet - use DbStorage when Neon is enabled");
  }

  async getPatient(id: string): Promise<Patient | null> {
    throw new Error("MemStorage getPatient not implemented yet - use DbStorage when Neon is enabled");
  }

  async getPatientProfile(id: string): Promise<PatientProfile | null> {
    throw new Error("MemStorage getPatientProfile not implemented yet - use DbStorage when Neon is enabled");
  }

  async createPatient(data: InsertPatient): Promise<Patient> {
    throw new Error("MemStorage createPatient not implemented yet - use DbStorage when Neon is enabled");
  }

  async updatePatient(id: string, data: Partial<InsertPatient>, expectedVersion?: number): Promise<Patient | null> {
    throw new Error("MemStorage updatePatient not implemented yet - use DbStorage when Neon is enabled");
  }

  async deletePatient(id: string): Promise<boolean> {
    throw new Error("MemStorage deletePatient not implemented yet - use DbStorage when Neon is enabled");
  }

  async getPatientGroups(): Promise<PatientGroup[]> {
    throw new Error("MemStorage not implemented yet - use DbStorage when Neon is enabled");
  }

  async getPatientGroup(id: string): Promise<PatientGroup | null> {
    throw new Error("MemStorage not implemented yet - use DbStorage when Neon is enabled");
  }

  async createPatientGroup(data: InsertPatientGroup): Promise<PatientGroup> {
    throw new Error("MemStorage not implemented yet - use DbStorage when Neon is enabled");
  }

  async updatePatientGroup(id: string, data: Partial<InsertPatientGroup>, expectedVersion?: number): Promise<PatientGroup | null> {
    throw new Error("MemStorage not implemented yet - use DbStorage when Neon is enabled");
  }

  async deletePatientGroup(id: string): Promise<boolean> {
    throw new Error("MemStorage not implemented yet - use DbStorage when Neon is enabled");
  }

  async getGroupMemberships(groupId?: string, patientId?: string): Promise<GroupMembership[]> {
    throw new Error("MemStorage not implemented yet - use DbStorage when Neon is enabled");
  }

  async createGroupMembership(data: InsertGroupMembership): Promise<GroupMembership> {
    throw new Error("MemStorage not implemented yet - use DbStorage when Neon is enabled");
  }

  async deleteGroupMembership(id: string): Promise<boolean> {
    throw new Error("MemStorage not implemented yet - use DbStorage when Neon is enabled");
  }

  async reassignPatientGroup(patientId: string, newGroupId: string): Promise<boolean> {
    throw new Error("MemStorage not implemented yet - use DbStorage when Neon is enabled");
  }

  async getMeasurements(patientId?: string): Promise<Measurement[]> {
    throw new Error("MemStorage not implemented yet - use DbStorage when Neon is enabled");
  }

  async getMeasurement(id: string): Promise<Measurement | null> {
    throw new Error("MemStorage not implemented yet - use DbStorage when Neon is enabled");
  }

  async createMeasurement(data: InsertMeasurement): Promise<Measurement> {
    throw new Error("MemStorage not implemented yet - use DbStorage when Neon is enabled");
  }

  async updateMeasurement(id: string, data: Partial<InsertMeasurement>, expectedVersion?: number): Promise<Measurement | null> {
    throw new Error("MemStorage not implemented yet - use DbStorage when Neon is enabled");
  }

  async deleteMeasurement(id: string): Promise<boolean> {
    throw new Error("MemStorage not implemented yet - use DbStorage when Neon is enabled");
  }

  async getLatestMeasurement(patientId: string): Promise<Measurement | null> {
    throw new Error("MemStorage not implemented yet - use DbStorage when Neon is enabled");
  }

  async getMeasurementCalculations(measurementId: string): Promise<MeasurementCalculation[]> {
    throw new Error("MemStorage not implemented yet - use DbStorage when Neon is enabled");
  }

  async createMeasurementCalculation(data: InsertMeasurementCalculation): Promise<MeasurementCalculation> {
    throw new Error("MemStorage not implemented yet - use DbStorage when Neon is enabled");
  }

  async updateMeasurementCalculation(id: string, data: Partial<InsertMeasurementCalculation>, expectedVersion?: number): Promise<MeasurementCalculation | null> {
    throw new Error("MemStorage not implemented yet - use DbStorage when Neon is enabled");
  }

  async getDiets(): Promise<Diet[]> {
    throw new Error("MemStorage not implemented yet - use DbStorage when Neon is enabled");
  }

  async getDiet(id: string): Promise<Diet | null> {
    throw new Error("MemStorage not implemented yet - use DbStorage when Neon is enabled");
  }

  async createDiet(data: InsertDiet): Promise<Diet> {
    throw new Error("MemStorage not implemented yet - use DbStorage when Neon is enabled");
  }

  async updateDiet(id: string, data: Partial<InsertDiet>, expectedVersion?: number): Promise<Diet | null> {
    throw new Error("MemStorage not implemented yet - use DbStorage when Neon is enabled");
  }

  async deleteDiet(id: string): Promise<boolean> {
    throw new Error("MemStorage not implemented yet - use DbStorage when Neon is enabled");
  }

  async getDietAssignments(patientId?: string, dietId?: string): Promise<DietAssignment[]> {
    throw new Error("MemStorage not implemented yet - use DbStorage when Neon is enabled");
  }

  async getDietAssignment(id: string): Promise<DietAssignment | null> {
    throw new Error("MemStorage not implemented yet - use DbStorage when Neon is enabled");
  }

  async createDietAssignment(data: InsertDietAssignment): Promise<DietAssignment> {
    throw new Error("MemStorage not implemented yet - use DbStorage when Neon is enabled");
  }

  async updateDietAssignment(id: string, data: Partial<InsertDietAssignment>, expectedVersion?: number): Promise<DietAssignment | null> {
    throw new Error("MemStorage not implemented yet - use DbStorage when Neon is enabled");
  }

  async deleteDietAssignment(id: string): Promise<boolean> {
    throw new Error("MemStorage not implemented yet - use DbStorage when Neon is enabled");
  }

  async getReports(patientId?: string): Promise<Report[]> {
    throw new Error("MemStorage not implemented yet - use DbStorage when Neon is enabled");
  }

  async getReport(id: string): Promise<Report | null> {
    throw new Error("MemStorage not implemented yet - use DbStorage when Neon is enabled");
  }

  async createReport(data: InsertReport): Promise<Report> {
    throw new Error("MemStorage not implemented yet - use DbStorage when Neon is enabled");
  }

  async updateReport(id: string, data: Partial<InsertReport>, expectedVersion?: number): Promise<Report | null> {
    throw new Error("MemStorage not implemented yet - use DbStorage when Neon is enabled");
  }

  async deleteReport(id: string): Promise<boolean> {
    throw new Error("MemStorage not implemented yet - use DbStorage when Neon is enabled");
  }

  async getGroupStatistics(): Promise<GroupStatistics[]> {
    throw new Error("MemStorage not implemented yet - use DbStorage when Neon is enabled");
  }

  async getDietTemplates(): Promise<DietTemplate[]> {
    throw new Error("MemStorage not implemented yet - use DbStorage when Neon is enabled");
  }

  async getDietTemplate(id: string): Promise<DietTemplate | null> {
    throw new Error("MemStorage not implemented yet - use DbStorage when Neon is enabled");
  }

  async createDietTemplate(data: InsertDietTemplate): Promise<DietTemplate> {
    throw new Error("MemStorage not implemented yet - use DbStorage when Neon is enabled");
  }

  async updateDietTemplate(id: string, data: Partial<InsertDietTemplate>, expectedVersion?: number): Promise<DietTemplate | null> {
    throw new Error("MemStorage not implemented yet - use DbStorage when Neon is enabled");
  }

  async deleteDietTemplate(id: string): Promise<boolean> {
    throw new Error("MemStorage not implemented yet - use DbStorage when Neon is enabled");
  }

  async getDietGenerations(patientId?: string): Promise<DietGeneration[]> {
    throw new Error("MemStorage not implemented yet - use DbStorage when Neon is enabled");
  }

  async getDietGeneration(id: string): Promise<DietGeneration | null> {
    throw new Error("MemStorage not implemented yet - use DbStorage when Neon is enabled");
  }

  async createDietGeneration(data: InsertDietGeneration): Promise<DietGeneration> {
    throw new Error("MemStorage not implemented yet - use DbStorage when Neon is enabled");
  }

  async updateDietGeneration(id: string, data: Partial<InsertDietGeneration>, expectedVersion?: number): Promise<DietGeneration | null> {
    throw new Error("MemStorage not implemented yet - use DbStorage when Neon is enabled");
  }

  async deleteDietGeneration(id: string): Promise<boolean> {
    throw new Error("MemStorage not implemented yet - use DbStorage when Neon is enabled");
  }

  async getDietMealPlans(generationId: string): Promise<DietMealPlan[]> {
    throw new Error("MemStorage not implemented yet - use DbStorage when Neon is enabled");
  }

  async createDietMealPlan(data: InsertDietMealPlan): Promise<DietMealPlan> {
    throw new Error("MemStorage not implemented yet - use DbStorage when Neon is enabled");
  }

  async getDietExerciseBlocks(generationId: string): Promise<DietExerciseBlock[]> {
    throw new Error("MemStorage not implemented yet - use DbStorage when Neon is enabled");
  }

  async createDietExerciseBlock(data: InsertDietExerciseBlock): Promise<DietExerciseBlock> {
    throw new Error("MemStorage not implemented yet - use DbStorage when Neon is enabled");
  }

  async getMeasurementsByPatient(patientId: string): Promise<Measurement[]> {
    throw new Error("MemStorage not implemented yet - use DbStorage when Neon is enabled");
  }
}
