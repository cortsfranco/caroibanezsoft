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
  Report,
  InsertReport,
} from "@shared/schema";

export class VersionConflictError extends Error {
  constructor(message: string = "Version conflict - record was modified by another user") {
    super(message);
    this.name = "VersionConflictError";
  }
}

export interface IStorage {
  // Patients
  getPatients(): Promise<Patient[]>;
  getPatient(id: string): Promise<Patient | null>;
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

  // Reports
  getReports(patientId?: string): Promise<Report[]>;
  getReport(id: string): Promise<Report | null>;
  createReport(data: InsertReport): Promise<Report>;
  updateReport(id: string, data: Partial<InsertReport>, expectedVersion?: number): Promise<Report | null>;
  deleteReport(id: string): Promise<boolean>;
}
