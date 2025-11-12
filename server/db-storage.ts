import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "./db";
import {
  patients,
  patientGroups,
  groupMemberships,
  measurements,
  measurementCalculations,
  diets,
  dietAssignments,
  reports,
  type Patient,
  type InsertPatient,
  type PatientGroup,
  type InsertPatientGroup,
  type GroupMembership,
  type InsertGroupMembership,
  type Measurement,
  type InsertMeasurement,
  type MeasurementCalculation,
  type InsertMeasurementCalculation,
  type Diet,
  type InsertDiet,
  type DietAssignment,
  type InsertDietAssignment,
  type Report,
  type InsertReport,
} from "@shared/schema";
import type { IStorage, PatientProfile } from "./storage";
import { VersionConflictError } from "./storage";

export class DbStorage implements IStorage {
  // Patients
  async getPatients(): Promise<Patient[]> {
    return await db.select().from(patients).orderBy(patients.name);
  }

  async getPatient(id: string): Promise<Patient | null> {
    const result = await db.select().from(patients).where(eq(patients.id, id)).limit(1);
    return result[0] || null;
  }

  async getPatientProfile(id: string): Promise<PatientProfile | null> {
    // Get patient
    const patient = await this.getPatient(id);
    if (!patient) {
      return null;
    }

    // Get patient's groups
    const memberships = await this.getGroupMemberships(undefined, id);
    const groupIds = memberships.map(m => m.groupId);
    
    const patientGroups: PatientGroup[] = [];
    for (const groupId of groupIds) {
      const group = await this.getPatientGroup(groupId);
      if (group) {
        patientGroups.push(group);
      }
    }

    // Get latest measurement
    const latestMeasurement = await this.getLatestMeasurement(id);

    // Get measurement count
    const allMeasurements = await this.getMeasurements(id);
    const measurementCount = allMeasurements.length;

    return {
      patient,
      groups: patientGroups,
      latestMeasurement,
      measurementCount,
    };
  }

  async createPatient(data: InsertPatient): Promise<Patient> {
    const result = await db.insert(patients).values(data).returning();
    return result[0];
  }

  async updatePatient(id: string, data: Partial<InsertPatient>, expectedVersion?: number): Promise<Patient | null> {
    const whereConditions = expectedVersion !== undefined
      ? and(eq(patients.id, id), eq(patients.version, expectedVersion))
      : eq(patients.id, id);

    const result = await db
      .update(patients)
      .set({ 
        ...data, 
        updatedAt: new Date(),
        version: sql`${patients.version} + 1`
      })
      .where(whereConditions)
      .returning();

    if (!result[0] && expectedVersion !== undefined) {
      throw new VersionConflictError();
    }

    return result[0] || null;
  }

  async deletePatient(id: string): Promise<boolean> {
    const result = await db.delete(patients).where(eq(patients.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Patient Groups
  async getPatientGroups(): Promise<PatientGroup[]> {
    return await db.select().from(patientGroups).orderBy(patientGroups.name);
  }

  async getPatientGroup(id: string): Promise<PatientGroup | null> {
    const result = await db.select().from(patientGroups).where(eq(patientGroups.id, id)).limit(1);
    return result[0] || null;
  }

  async createPatientGroup(data: InsertPatientGroup): Promise<PatientGroup> {
    const result = await db.insert(patientGroups).values(data).returning();
    return result[0];
  }

  async updatePatientGroup(id: string, data: Partial<InsertPatientGroup>, expectedVersion?: number): Promise<PatientGroup | null> {
    const whereConditions = expectedVersion !== undefined
      ? and(eq(patientGroups.id, id), eq(patientGroups.version, expectedVersion))
      : eq(patientGroups.id, id);

    const result = await db
      .update(patientGroups)
      .set({ 
        ...data, 
        updatedAt: new Date(),
        version: sql`${patientGroups.version} + 1`
      })
      .where(whereConditions)
      .returning();

    if (!result[0] && expectedVersion !== undefined) {
      throw new VersionConflictError();
    }

    return result[0] || null;
  }

  async deletePatientGroup(id: string): Promise<boolean> {
    const result = await db.delete(patientGroups).where(eq(patientGroups.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Group Memberships
  async getGroupMemberships(groupId?: string, patientId?: string): Promise<GroupMembership[]> {
    let query = db.select().from(groupMemberships);

    if (groupId && patientId) {
      return await query.where(
        and(
          eq(groupMemberships.groupId, groupId),
          eq(groupMemberships.patientId, patientId)
        )
      );
    } else if (groupId) {
      return await query.where(eq(groupMemberships.groupId, groupId));
    } else if (patientId) {
      return await query.where(eq(groupMemberships.patientId, patientId));
    }

    return await query;
  }

  async createGroupMembership(data: InsertGroupMembership): Promise<GroupMembership> {
    const result = await db.insert(groupMemberships).values(data).returning();
    return result[0];
  }

  async deleteGroupMembership(id: string): Promise<boolean> {
    const result = await db.delete(groupMemberships).where(eq(groupMemberships.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async reassignPatientGroup(patientId: string, newGroupId: string): Promise<boolean> {
    // Delete all existing group memberships for this patient
    await db.delete(groupMemberships).where(eq(groupMemberships.patientId, patientId));

    // Create new group membership
    await this.createGroupMembership({ patientId, groupId: newGroupId });
    return true;
  }

  // Measurements
  async getMeasurements(patientId?: string): Promise<Measurement[]> {
    if (patientId) {
      return await db
        .select()
        .from(measurements)
        .where(eq(measurements.patientId, patientId))
        .orderBy(desc(measurements.measurementDate));
    }
    return await db.select().from(measurements).orderBy(desc(measurements.measurementDate));
  }

  async getMeasurement(id: string): Promise<Measurement | null> {
    const result = await db.select().from(measurements).where(eq(measurements.id, id)).limit(1);
    return result[0] || null;
  }

  async createMeasurement(data: InsertMeasurement): Promise<Measurement> {
    const result = await db.insert(measurements).values(data).returning();
    return result[0];
  }

  async updateMeasurement(id: string, data: Partial<InsertMeasurement>, expectedVersion?: number): Promise<Measurement | null> {
    const whereConditions = expectedVersion !== undefined
      ? and(eq(measurements.id, id), eq(measurements.version, expectedVersion))
      : eq(measurements.id, id);

    const result = await db
      .update(measurements)
      .set({ 
        ...data, 
        updatedAt: new Date(),
        version: sql`${measurements.version} + 1`
      })
      .where(whereConditions)
      .returning();

    if (!result[0] && expectedVersion !== undefined) {
      throw new VersionConflictError();
    }

    return result[0] || null;
  }

  async deleteMeasurement(id: string): Promise<boolean> {
    const result = await db.delete(measurements).where(eq(measurements.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getLatestMeasurement(patientId: string): Promise<Measurement | null> {
    const result = await db
      .select()
      .from(measurements)
      .where(eq(measurements.patientId, patientId))
      .orderBy(desc(measurements.measurementDate))
      .limit(1);
    return result[0] || null;
  }

  // Measurement Calculations
  async getMeasurementCalculations(measurementId: string): Promise<MeasurementCalculation[]> {
    return await db
      .select()
      .from(measurementCalculations)
      .where(eq(measurementCalculations.measurementId, measurementId));
  }

  async createMeasurementCalculation(data: InsertMeasurementCalculation): Promise<MeasurementCalculation> {
    const result = await db.insert(measurementCalculations).values(data).returning();
    return result[0];
  }

  async updateMeasurementCalculation(
    id: string,
    data: Partial<InsertMeasurementCalculation>,
    expectedVersion?: number
  ): Promise<MeasurementCalculation | null> {
    const whereConditions = expectedVersion !== undefined
      ? and(eq(measurementCalculations.id, id), eq(measurementCalculations.version, expectedVersion))
      : eq(measurementCalculations.id, id);

    const result = await db
      .update(measurementCalculations)
      .set({ 
        ...data, 
        updatedAt: new Date(),
        version: sql`${measurementCalculations.version} + 1`
      })
      .where(whereConditions)
      .returning();

    if (!result[0] && expectedVersion !== undefined) {
      throw new VersionConflictError();
    }

    return result[0] || null;
  }

  // Diets
  async getDiets(): Promise<Diet[]> {
    return await db.select().from(diets).orderBy(diets.name);
  }

  async getDiet(id: string): Promise<Diet | null> {
    const result = await db.select().from(diets).where(eq(diets.id, id)).limit(1);
    return result[0] || null;
  }

  async createDiet(data: InsertDiet): Promise<Diet> {
    const result = await db.insert(diets).values(data).returning();
    return result[0];
  }

  async updateDiet(id: string, data: Partial<InsertDiet>, expectedVersion?: number): Promise<Diet | null> {
    const whereConditions = expectedVersion !== undefined
      ? and(eq(diets.id, id), eq(diets.version, expectedVersion))
      : eq(diets.id, id);

    const result = await db
      .update(diets)
      .set({ 
        ...data, 
        updatedAt: new Date(),
        version: sql`${diets.version} + 1`
      })
      .where(whereConditions)
      .returning();

    if (!result[0] && expectedVersion !== undefined) {
      throw new VersionConflictError();
    }

    return result[0] || null;
  }

  async deleteDiet(id: string): Promise<boolean> {
    const result = await db.delete(diets).where(eq(diets.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Diet Assignments
  async getDietAssignments(patientId?: string, dietId?: string): Promise<DietAssignment[]> {
    if (patientId && dietId) {
      return await db
        .select()
        .from(dietAssignments)
        .where(and(eq(dietAssignments.patientId, patientId), eq(dietAssignments.dietId, dietId)))
        .orderBy(desc(dietAssignments.startDate));
    } else if (patientId) {
      return await db
        .select()
        .from(dietAssignments)
        .where(eq(dietAssignments.patientId, patientId))
        .orderBy(desc(dietAssignments.startDate));
    } else if (dietId) {
      return await db
        .select()
        .from(dietAssignments)
        .where(eq(dietAssignments.dietId, dietId))
        .orderBy(desc(dietAssignments.startDate));
    }
    return await db.select().from(dietAssignments).orderBy(desc(dietAssignments.startDate));
  }

  async getDietAssignment(id: string): Promise<DietAssignment | null> {
    const result = await db.select().from(dietAssignments).where(eq(dietAssignments.id, id)).limit(1);
    return result[0] || null;
  }

  async createDietAssignment(data: InsertDietAssignment): Promise<DietAssignment> {
    const result = await db.insert(dietAssignments).values(data).returning();
    return result[0];
  }

  async updateDietAssignment(id: string, data: Partial<InsertDietAssignment>, expectedVersion?: number): Promise<DietAssignment | null> {
    const whereConditions = expectedVersion !== undefined
      ? and(eq(dietAssignments.id, id), eq(dietAssignments.version, expectedVersion))
      : eq(dietAssignments.id, id);

    const result = await db
      .update(dietAssignments)
      .set({
        ...data,
        version: sql`${dietAssignments.version} + 1`,
        updatedAt: new Date(),
      })
      .where(whereConditions)
      .returning();

    if (expectedVersion !== undefined && result.length === 0) {
      throw new VersionConflictError();
    }

    return result[0] || null;
  }

  async deleteDietAssignment(id: string): Promise<boolean> {
    const result = await db.delete(dietAssignments).where(eq(dietAssignments.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Reports
  async getReports(patientId?: string): Promise<Report[]> {
    if (patientId) {
      return await db
        .select()
        .from(reports)
        .where(eq(reports.patientId, patientId))
        .orderBy(desc(reports.createdAt));
    }
    return await db.select().from(reports).orderBy(desc(reports.createdAt));
  }

  async getReport(id: string): Promise<Report | null> {
    const result = await db.select().from(reports).where(eq(reports.id, id)).limit(1);
    return result[0] || null;
  }

  async createReport(data: InsertReport): Promise<Report> {
    const result = await db.insert(reports).values(data).returning();
    return result[0];
  }

  async updateReport(id: string, data: Partial<InsertReport>, expectedVersion?: number): Promise<Report | null> {
    const whereConditions = expectedVersion !== undefined
      ? and(eq(reports.id, id), eq(reports.version, expectedVersion))
      : eq(reports.id, id);

    const result = await db
      .update(reports)
      .set({ 
        ...data, 
        updatedAt: new Date(),
        version: sql`${reports.version} + 1`
      })
      .where(whereConditions)
      .returning();

    if (!result[0] && expectedVersion !== undefined) {
      throw new VersionConflictError();
    }

    return result[0] || null;
  }

  async deleteReport(id: string): Promise<boolean> {
    const result = await db.delete(reports).where(eq(reports.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }
}

export const storage = new DbStorage();
