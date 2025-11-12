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
    return [...this.patients].sort((a, b) => {
      const aName = `${a.lastName}, ${a.firstName}`;
      const bName = `${b.lastName}, ${b.firstName}`;
      return aName.localeCompare(bName);
    });
  }

  async getPatient(id: string): Promise<Patient | null> {
    return this.patients.find((p) => p.id === id) || null;
  }

  async getPatientProfile(id: string): Promise<PatientProfile | null> {
    const patient = await this.getPatient(id);
    if (!patient) return null;
    
    const measurements = this.measurements.filter((m) => m.patientId === id);
    const latestMeasurement = measurements.length > 0 ? measurements[measurements.length - 1] : null;
    
    const groupMemberships = this.groupMemberships.filter((gm) => gm.patientId === id);
    const groupIds = groupMemberships.map((gm) => gm.groupId);
    const groups = this.patientGroups.filter((g) => groupIds.includes(g.id));
    
    return {
      ...patient,
      latestMeasurement,
      groups,
      measurementCount: measurements.length,
    };
  }

  async createPatient(data: InsertPatient): Promise<Patient> {
    const patient: Patient = {
      id: nanoid(),
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email ?? null,
      phone: data.phone ?? null,
      dateOfBirth: data.dateOfBirth ?? null,
      gender: data.gender ?? null,
      address: data.address ?? null,
      emergencyContact: data.emergencyContact ?? null,
      emergencyPhone: data.emergencyPhone ?? null,
      medicalHistory: data.medicalHistory ?? null,
      allergies: data.allergies ?? null,
      medications: data.medications ?? null,
      healthObjectives: data.healthObjectives ?? null,
      dietaryPreferences: data.dietaryPreferences ?? null,
      activityLevel: data.activityLevel ?? null,
      occupation: data.occupation ?? null,
      notes: data.notes ?? null,
      sportType: data.sportType ?? null,
      trainingDays: data.trainingDays ?? null,
      trainingSchedule: data.trainingSchedule ?? null,
      version: 1,
    };
    
    this.patients.push(patient);
    return patient;
  }

  async updatePatient(id: string, data: Partial<InsertPatient>, expectedVersion?: number): Promise<Patient | null> {
    const index = this.patients.findIndex((p) => p.id === id);
    if (index === -1) return null;
    
    const patient = this.patients[index];
    
    // Optimistic locking check
    if (expectedVersion !== undefined && patient.version !== expectedVersion) {
      throw new VersionConflictError(
        `Patient version mismatch: expected ${expectedVersion}, got ${patient.version}`
      );
    }
    
    // Update patient
    const updated: Patient = {
      ...patient,
      ...data,
      id: patient.id, // Preserve ID
      version: patient.version + 1,
    };
    
    this.patients[index] = updated;
    return updated;
  }

  async deletePatient(id: string): Promise<boolean> {
    const index = this.patients.findIndex((p) => p.id === id);
    if (index === -1) return false;
    
    // Also delete related data
    this.measurements = this.measurements.filter((m) => m.patientId !== id);
    this.dietAssignments = this.dietAssignments.filter((da) => da.patientId !== id);
    this.groupMemberships = this.groupMemberships.filter((gm) => gm.patientId !== id);
    
    this.patients.splice(index, 1);
    return true;
  }

  async getPatientGroups(): Promise<PatientGroup[]> {
    return [...this.patientGroups].sort((a, b) => a.name.localeCompare(b.name));
  }

  async getPatientGroup(id: string): Promise<PatientGroup | null> {
    return this.patientGroups.find((g) => g.id === id) || null;
  }

  async createPatientGroup(data: InsertPatientGroup): Promise<PatientGroup> {
    const group: PatientGroup = {
      id: nanoid(),
      name: data.name,
      description: data.description ?? null,
      color: data.color ?? null,
      version: 1,
    };
    this.patientGroups.push(group);
    return group;
  }

  async updatePatientGroup(id: string, data: Partial<InsertPatientGroup>, expectedVersion?: number): Promise<PatientGroup | null> {
    const index = this.patientGroups.findIndex((g) => g.id === id);
    if (index === -1) return null;
    
    const group = this.patientGroups[index];
    if (expectedVersion !== undefined && group.version !== expectedVersion) {
      throw new VersionConflictError();
    }
    
    const updated: PatientGroup = {
      ...group,
      ...data,
      id: group.id,
      version: group.version + 1,
    };
    this.patientGroups[index] = updated;
    return updated;
  }

  async deletePatientGroup(id: string): Promise<boolean> {
    const index = this.patientGroups.findIndex((g) => g.id === id);
    if (index === -1) return false;
    
    // Remove memberships
    this.groupMemberships = this.groupMemberships.filter((gm) => gm.groupId !== id);
    
    this.patientGroups.splice(index, 1);
    return true;
  }

  async getGroupMemberships(groupId?: string, patientId?: string): Promise<GroupMembership[]> {
    let results = [...this.groupMemberships];
    
    if (groupId) {
      results = results.filter((gm) => gm.groupId === groupId);
    }
    
    if (patientId) {
      results = results.filter((gm) => gm.patientId === patientId);
    }
    
    return results;
  }

  async createGroupMembership(data: InsertGroupMembership): Promise<GroupMembership> {
    const membership: GroupMembership = {
      id: nanoid(),
      patientId: data.patientId,
      groupId: data.groupId,
      joinedAt: new Date(),
    };
    this.groupMemberships.push(membership);
    return membership;
  }

  async deleteGroupMembership(id: string): Promise<boolean> {
    const initialLength = this.groupMemberships.length;
    this.groupMemberships = this.groupMemberships.filter((gm) => gm.id !== id);
    return this.groupMemberships.length < initialLength;
  }

  async reassignPatientGroup(patientId: string, newGroupId: string): Promise<boolean> {
    // Remove old memberships
    this.groupMemberships = this.groupMemberships.filter((gm) => gm.patientId !== patientId);
    
    // Add new membership
    await this.createGroupMembership({ patientId, groupId: newGroupId });
    return true;
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
    return [...this.diets].sort((a, b) => a.name.localeCompare(b.name));
  }

  async getDiet(id: string): Promise<Diet | null> {
    return this.diets.find((d) => d.id === id) || null;
  }

  async createDiet(data: InsertDiet): Promise<Diet> {
    const diet: Diet = {
      id: nanoid(),
      name: data.name,
      description: data.description ?? null,
      calories: data.calories ?? null,
      protein: data.protein ?? null,
      carbs: data.carbs ?? null,
      fats: data.fats ?? null,
      fiber: data.fiber ?? null,
      mealPlan: data.mealPlan ?? null,
      notes: data.notes ?? null,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.diets.push(diet);
    return diet;
  }

  async updateDiet(id: string, data: Partial<InsertDiet>, expectedVersion?: number): Promise<Diet | null> {
    const index = this.diets.findIndex((d) => d.id === id);
    if (index === -1) return null;

    const diet = this.diets[index];
    if (expectedVersion !== undefined && diet.version !== expectedVersion) {
      throw new VersionConflictError(
        `Diet version mismatch: expected ${expectedVersion}, got ${diet.version}`
      );
    }

    const updated: Diet = {
      ...diet,
      ...data,
      id: diet.id,
      version: diet.version + 1,
      updatedAt: new Date(),
    };
    this.diets[index] = updated;
    return updated;
  }

  async deleteDiet(id: string): Promise<boolean> {
    const index = this.diets.findIndex((d) => d.id === id);
    if (index === -1) return false;
    
    this.diets.splice(index, 1);
    // Clean up related assignments
    this.dietAssignments = this.dietAssignments.filter((a) => a.dietId !== id);
    return true;
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
    const stats: GroupStatistics[] = [];
    
    for (const group of this.patientGroups) {
      const memberships = this.groupMemberships.filter((gm) => gm.groupId === group.id);
      const patientIds = memberships.map((gm) => gm.patientId);
      
      stats.push({
        groupId: group.id,
        groupName: group.name,
        patientCount: patientIds.length,
        color: group.color,
      });
    }
    
    return stats.sort((a, b) => b.patientCount - a.patientCount);
  }

  async getDietTemplates(): Promise<DietTemplate[]> {
    return [...this.dietTemplates].sort((a, b) => a.name.localeCompare(b.name));
  }

  async getDietTemplate(id: string): Promise<DietTemplate | null> {
    return this.dietTemplates.find((t) => t.id === id) || null;
  }

  async createDietTemplate(data: InsertDietTemplate): Promise<DietTemplate> {
    const template: DietTemplate = {
      id: nanoid(),
      name: data.name,
      description: data.description ?? null,
      objective: data.objective ?? null,
      content: data.content,
      targetCalories: data.targetCalories ?? null,
      isActive: data.isActive ?? true,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.dietTemplates.push(template);
    return template;
  }

  async updateDietTemplate(id: string, data: Partial<InsertDietTemplate>, expectedVersion?: number): Promise<DietTemplate | null> {
    const index = this.dietTemplates.findIndex((t) => t.id === id);
    if (index === -1) return null;

    const template = this.dietTemplates[index];
    if (expectedVersion !== undefined && template.version !== expectedVersion) {
      throw new VersionConflictError(
        `Diet template version mismatch: expected ${expectedVersion}, got ${template.version}`
      );
    }

    const updated: DietTemplate = {
      ...template,
      ...data,
      id: template.id,
      version: template.version + 1,
      updatedAt: new Date(),
    };
    this.dietTemplates[index] = updated;
    return updated;
  }

  async deleteDietTemplate(id: string): Promise<boolean> {
    const index = this.dietTemplates.findIndex((t) => t.id === id);
    if (index === -1) return false;
    
    this.dietTemplates.splice(index, 1);
    return true;
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
