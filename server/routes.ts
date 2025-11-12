import { Router, type Express } from "express";
import { z } from "zod";
import { storage } from "./db-storage";
import {
  insertPatientSchema,
  insertPatientGroupSchema,
  insertGroupMembershipSchema,
  insertMeasurementSchema,
  insertMeasurementCalculationSchema,
  insertDietSchema,
  insertDietAssignmentSchema,
  insertReportSchema,
  insertMealSchema,
  insertMealTagSchema,
  insertMealTagAssignmentSchema,
  insertWeeklyDietPlanSchema,
  insertWeeklyPlanMealSchema,
  insertWeeklyPlanAssignmentSchema,
} from "@shared/schema";
import { createServer, type Server } from "http";
import { wsManager } from "./websocket";
import { VersionConflictError } from "./storage";
import { imageService } from "./services/image-service";
import { saveAvatar, deleteAvatar } from "./services/avatar-service";
import { calculateAll } from "./services/measurement-calculations";
import { generateMeasurementReport } from "./services/pdf-report-service";
import { generateWeeklyPlanPDF } from "./services/weekly-plan-pdf-service";
import multer from "multer";
import path from "path";
import fs from "fs/promises";

const router = Router();

// Helper function for request validation
function validate<T>(schema: z.ZodType<T, any, any>, data: unknown): T {
  return schema.parse(data);
}

// ===== PATIENTS =====
router.get("/api/patients", async (req, res) => {
  try {
    const patients = await storage.getPatients();
    res.json(patients);
  } catch (error) {
    console.error("Error fetching patients:", error);
    res.status(500).json({ error: "Failed to fetch patients" });
  }
});

router.get("/api/patients/:id", async (req, res) => {
  try {
    const patient = await storage.getPatient(req.params.id);
    if (!patient) {
      return res.status(404).json({ error: "Patient not found" });
    }
    res.json(patient);
  } catch (error) {
    console.error("Error fetching patient:", error);
    res.status(500).json({ error: "Failed to fetch patient" });
  }
});

router.get("/api/patients/:id/profile", async (req, res) => {
  try {
    const profile = await storage.getPatientProfile(req.params.id);
    if (!profile) {
      return res.status(404).json({ error: "Patient not found" });
    }
    res.json(profile);
  } catch (error) {
    console.error("Error fetching patient profile:", error);
    res.status(500).json({ error: "Failed to fetch patient profile" });
  }
});

router.post("/api/patients", async (req, res) => {
  try {
    const data = validate(insertPatientSchema, req.body);
    const patient = await storage.createPatient(data);
    
    // Broadcast patient creation to all clients
    wsManager.notifyPatientCreated(patient);
    
    res.status(201).json(patient);
  } catch (error) {
    console.error("Error creating patient:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create patient" });
  }
});

router.patch("/api/patients/:id", async (req, res) => {
  try {
    const { version, ...updateData } = req.body;
    
    // Require version for optimistic locking
    if (version === undefined || version === null) {
      return res.status(400).json({ error: "version field is required for updates" });
    }
    
    const versionNum = Number(version);
    if (isNaN(versionNum)) {
      return res.status(400).json({ error: "version must be a valid number" });
    }
    
    // Get existing patient to check for avatar change
    const existingPatient = await storage.getPatient(req.params.id);
    if (!existingPatient) {
      return res.status(404).json({ error: "Patient not found" });
    }
    
    const data = validate(insertPatientSchema.partial(), updateData);
    const patient = await storage.updatePatient(req.params.id, data, versionNum);
    
    if (!patient) {
      return res.status(404).json({ error: "Patient not found" });
    }
    
    // Delete old avatar if it was changed (after successful update)
    if (updateData.avatarUrl && existingPatient.avatarUrl && existingPatient.avatarUrl !== updateData.avatarUrl) {
      await deleteAvatar(existingPatient.avatarUrl).catch(err => {
        console.error("Failed to delete old avatar:", err);
        // Don't fail the request if avatar deletion fails
      });
    }
    
    // Broadcast patient update to all clients
    wsManager.notifyPatientUpdate(patient.id, patient);
    
    res.json(patient);
  } catch (error) {
    console.error("Error updating patient:", error);
    if (error instanceof VersionConflictError) {
      return res.status(409).json({ error: "Version conflict - record was modified by another user" });
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    res.status(500).json({ error: "Failed to update patient" });
  }
});

router.delete("/api/patients/:id", async (req, res) => {
  try {
    const deleted = await storage.deletePatient(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Patient not found" });
    }
    
    // Broadcast patient deletion to all clients
    wsManager.notifyPatientDeleted(req.params.id);
    
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting patient:", error);
    res.status(500).json({ error: "Failed to delete patient" });
  }
});

// ===== PATIENT GROUPS =====
router.get("/api/groups", async (req, res) => {
  try {
    const groups = await storage.getPatientGroups();
    res.json(groups);
  } catch (error) {
    console.error("Error fetching groups:", error);
    res.status(500).json({ error: "Failed to fetch groups" });
  }
});

router.get("/api/groups/:id", async (req, res) => {
  try {
    const group = await storage.getPatientGroup(req.params.id);
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }
    res.json(group);
  } catch (error) {
    console.error("Error fetching group:", error);
    res.status(500).json({ error: "Failed to fetch group" });
  }
});

router.post("/api/groups", async (req, res) => {
  try {
    const data = validate(insertPatientGroupSchema, req.body);
    const group = await storage.createPatientGroup(data);
    
    // Broadcast group creation to all clients
    wsManager.notifyGroupCreated(group);
    
    res.status(201).json(group);
  } catch (error) {
    console.error("Error creating group:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create group" });
  }
});

router.patch("/api/groups/:id", async (req, res) => {
  try {
    const { version, ...updateData } = req.body;
    
    // Require version for optimistic locking
    if (version === undefined || version === null) {
      return res.status(400).json({ error: "version field is required for updates" });
    }
    
    const versionNum = Number(version);
    if (isNaN(versionNum)) {
      return res.status(400).json({ error: "version must be a valid number" });
    }
    
    const data = validate(insertPatientGroupSchema.partial(), updateData);
    const group = await storage.updatePatientGroup(req.params.id, data, versionNum);
    
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }
    
    // Broadcast group update to all clients
    wsManager.notifyGroupUpdate(group.id, group);
    
    res.json(group);
  } catch (error) {
    console.error("Error updating group:", error);
    if (error instanceof VersionConflictError) {
      return res.status(409).json({ error: "Version conflict - record was modified by another user" });
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    res.status(500).json({ error: "Failed to update group" });
  }
});

router.delete("/api/groups/:id", async (req, res) => {
  try {
    const deleted = await storage.deletePatientGroup(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Group not found" });
    }
    
    // Broadcast group deletion to all clients
    wsManager.notifyGroupDeleted(req.params.id);
    
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting group:", error);
    res.status(500).json({ error: "Failed to delete group" });
  }
});

// ===== GROUP MEMBERSHIPS =====
router.get("/api/memberships", async (req, res) => {
  try {
    const { groupId, patientId } = req.query;
    const memberships = await storage.getGroupMemberships(
      groupId as string | undefined,
      patientId as string | undefined
    );
    res.json(memberships);
  } catch (error) {
    console.error("Error fetching memberships:", error);
    res.status(500).json({ error: "Failed to fetch memberships" });
  }
});

router.post("/api/memberships", async (req, res) => {
  try {
    const data = validate(insertGroupMembershipSchema, req.body);
    const membership = await storage.createGroupMembership(data);
    
    // Broadcast membership update to all clients
    wsManager.notifyMembershipUpdate(membership);
    
    res.status(201).json(membership);
  } catch (error) {
    console.error("Error creating membership:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create membership" });
  }
});

router.post("/api/memberships/reassign", async (req, res) => {
  try {
    const { patientId, newGroupId } = req.body;
    if (!patientId || !newGroupId) {
      return res.status(400).json({ error: "patientId and newGroupId are required" });
    }
    const success = await storage.reassignPatientGroup(patientId, newGroupId);
    if (!success) {
      return res.status(500).json({ error: "Failed to reassign patient" });
    }
    
    // Broadcast membership update to all clients
    wsManager.notifyMembershipUpdate({ patientId, newGroupId });
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error reassigning patient:", error);
    res.status(500).json({ error: "Failed to reassign patient" });
  }
});

router.delete("/api/memberships/:id", async (req, res) => {
  try {
    const deleted = await storage.deleteGroupMembership(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Membership not found" });
    }
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting membership:", error);
    res.status(500).json({ error: "Failed to delete membership" });
  }
});

// ===== MEASUREMENTS =====
router.get("/api/measurements", async (req, res) => {
  try {
    const { patientId } = req.query;
    const measurements = await storage.getMeasurements(patientId as string | undefined);
    res.json(measurements);
  } catch (error) {
    console.error("Error fetching measurements:", error);
    res.status(500).json({ error: "Failed to fetch measurements" });
  }
});

router.get("/api/measurements/:id", async (req, res) => {
  try {
    const measurement = await storage.getMeasurement(req.params.id);
    if (!measurement) {
      return res.status(404).json({ error: "Measurement not found" });
    }
    res.json(measurement);
  } catch (error) {
    console.error("Error fetching measurement:", error);
    res.status(500).json({ error: "Failed to fetch measurement" });
  }
});

router.post("/api/measurements", async (req, res) => {
  try {
    const data = validate(insertMeasurementSchema, req.body);
    const measurement = await storage.createMeasurement(data);
    
    // Obtener el paciente para acceder a edad y género
    const patient = await storage.getPatient(measurement.patientId);
    let patientAge = null;
    let patientGender = null;
    
    if (patient) {
      patientGender = patient.gender;
      if (patient.birthDate) {
        const birthDate = new Date(patient.birthDate);
        const today = new Date();
        patientAge = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          patientAge--;
        }
      }
    }
    
    // Calcular BMI y otros indicadores automáticamente
    const calculations = calculateAll({
      weight: measurement.weight,
      height: measurement.height,
      triceps: measurement.triceps,
      subscapular: measurement.subscapular,
      supraspinal: measurement.supraspinal,
      abdominal: measurement.abdominal,
      thighSkinfold: measurement.thighSkinfold,
      calfSkinfold: measurement.calfSkinfold,
      waistCircumference: measurement.waist,
      hipCircumference: measurement.hip
    }, patientAge, patientGender);
    
    // Guardar los cálculos si hay algún resultado
    if (Object.keys(calculations).length > 0) {
      await storage.createMeasurementCalculation({
        measurementId: measurement.id,
        ...calculations
      });
    }
    
    // Broadcast measurement creation to all clients
    wsManager.notifyMeasurementCreated(measurement);
    
    res.status(201).json(measurement);
  } catch (error) {
    console.error("Error creating measurement:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create measurement" });
  }
});

router.patch("/api/measurements/:id", async (req, res) => {
  try {
    const { version, ...updateData } = req.body;
    
    // Require version for optimistic locking
    if (version === undefined || version === null) {
      return res.status(400).json({ error: "version field is required for updates" });
    }
    
    const versionNum = Number(version);
    if (isNaN(versionNum)) {
      return res.status(400).json({ error: "version must be a valid number" });
    }
    
    const data = validate(insertMeasurementSchema.partial(), updateData);
    const measurement = await storage.updateMeasurement(req.params.id, data, versionNum);
    
    if (!measurement) {
      return res.status(404).json({ error: "Measurement not found" });
    }
    
    // Obtener el paciente para acceder a edad y género
    const patient = await storage.getPatient(measurement.patientId);
    let patientAge = null;
    let patientGender = null;
    
    if (patient) {
      patientGender = patient.gender;
      if (patient.birthDate) {
        const birthDate = new Date(patient.birthDate);
        const today = new Date();
        patientAge = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          patientAge--;
        }
      }
    }
    
    // Re-calcular BMI y otros indicadores cuando se actualiza
    const calculations = calculateAll({
      weight: measurement.weight,
      height: measurement.height,
      triceps: measurement.triceps,
      subscapular: measurement.subscapular,
      supraspinal: measurement.supraspinal,
      abdominal: measurement.abdominal,
      thighSkinfold: measurement.thighSkinfold,
      calfSkinfold: measurement.calfSkinfold,
      waistCircumference: measurement.waist,
      hipCircumference: measurement.hip
    }, patientAge, patientGender);
    
    // Actualizar o crear cálculos
    if (Object.keys(calculations).length > 0) {
      const existingCalculations = await storage.getMeasurementCalculations(measurement.id);
      if (existingCalculations.length > 0) {
        await storage.updateMeasurementCalculation(
          existingCalculations[0].id,
          calculations,
          existingCalculations[0].version
        );
      } else {
        await storage.createMeasurementCalculation({
          measurementId: measurement.id,
          ...calculations
        });
      }
    }
    
    // Broadcast measurement update to all clients
    wsManager.notifyMeasurementUpdate(measurement.id, measurement);
    
    res.json(measurement);
  } catch (error) {
    console.error("Error updating measurement:", error);
    if (error instanceof VersionConflictError) {
      return res.status(409).json({ error: "Version conflict - record was modified by another user" });
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    res.status(500).json({ error: "Failed to update measurement" });
  }
});

router.delete("/api/measurements/:id", async (req, res) => {
  try {
    const deleted = await storage.deleteMeasurement(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Measurement not found" });
    }
    
    // Broadcast measurement deletion to all clients
    wsManager.notifyMeasurementDeleted(req.params.id);
    
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting measurement:", error);
    res.status(500).json({ error: "Failed to delete measurement" });
  }
});

// ===== MEASUREMENT CALCULATIONS =====
router.get("/api/calculations/:measurementId", async (req, res) => {
  try {
    const calculations = await storage.getMeasurementCalculations(req.params.measurementId);
    res.json(calculations);
  } catch (error) {
    console.error("Error fetching calculations:", error);
    res.status(500).json({ error: "Failed to fetch calculations" });
  }
});

// ===== DIETS =====
router.get("/api/diets", async (req, res) => {
  try {
    const diets = await storage.getDiets();
    res.json(diets);
  } catch (error) {
    console.error("Error fetching diets:", error);
    res.status(500).json({ error: "Failed to fetch diets" });
  }
});

router.get("/api/diets/:id", async (req, res) => {
  try {
    const diet = await storage.getDiet(req.params.id);
    if (!diet) {
      return res.status(404).json({ error: "Diet not found" });
    }
    res.json(diet);
  } catch (error) {
    console.error("Error fetching diet:", error);
    res.status(500).json({ error: "Failed to fetch diet" });
  }
});

router.post("/api/diets", async (req, res) => {
  try {
    const data = validate(insertDietSchema, req.body);
    const diet = await storage.createDiet(data);
    
    // Broadcast diet creation to all clients
    wsManager.notifyDietCreated(diet);
    
    res.status(201).json(diet);
  } catch (error) {
    console.error("Error creating diet:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create diet" });
  }
});

router.patch("/api/diets/:id", async (req, res) => {
  try {
    const { version, ...updateData } = req.body;
    
    // Require version for optimistic locking
    if (version === undefined || version === null) {
      return res.status(400).json({ error: "version field is required for updates" });
    }
    
    const versionNum = Number(version);
    if (isNaN(versionNum)) {
      return res.status(400).json({ error: "version must be a valid number" });
    }
    
    const data = validate(insertDietSchema.partial(), updateData);
    const diet = await storage.updateDiet(req.params.id, data, versionNum);
    
    if (!diet) {
      return res.status(404).json({ error: "Diet not found" });
    }
    
    // Broadcast diet update to all clients
    wsManager.notifyDietUpdate(diet.id, diet);
    
    res.json(diet);
  } catch (error) {
    console.error("Error updating diet:", error);
    if (error instanceof VersionConflictError) {
      return res.status(409).json({ error: "Version conflict - record was modified by another user" });
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    res.status(500).json({ error: "Failed to update diet" });
  }
});

router.delete("/api/diets/:id", async (req, res) => {
  try {
    const deleted = await storage.deleteDiet(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Diet not found" });
    }
    
    // Broadcast diet deletion to all clients
    wsManager.notifyDietDeleted(req.params.id);
    
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting diet:", error);
    res.status(500).json({ error: "Failed to delete diet" });
  }
});

// ===== DIET ASSIGNMENTS =====
router.get("/api/diet-assignments", async (req, res) => {
  try {
    const { patientId, dietId } = req.query;
    const assignments = await storage.getDietAssignments(
      patientId as string | undefined,
      dietId as string | undefined
    );
    res.json(assignments);
  } catch (error) {
    console.error("Error fetching diet assignments:", error);
    res.status(500).json({ error: "Failed to fetch diet assignments" });
  }
});

router.get("/api/diet-assignments/:id", async (req, res) => {
  try {
    const assignment = await storage.getDietAssignment(req.params.id);
    if (!assignment) {
      return res.status(404).json({ error: "Diet assignment not found" });
    }
    res.json(assignment);
  } catch (error) {
    console.error("Error fetching diet assignment:", error);
    res.status(500).json({ error: "Failed to fetch diet assignment" });
  }
});

router.post("/api/diet-assignments", async (req, res) => {
  try {
    const data = validate(insertDietAssignmentSchema, req.body);
    const assignment = await storage.createDietAssignment(data);
    res.status(201).json(assignment);
  } catch (error) {
    console.error("Error creating diet assignment:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create diet assignment" });
  }
});

router.patch("/api/diet-assignments/:id", async (req, res) => {
  try {
    const { version, ...updateData } = req.body;
    
    if (version === undefined || version === null) {
      return res.status(400).json({ error: "version field is required for updates" });
    }
    
    const versionNum = Number(version);
    if (isNaN(versionNum)) {
      return res.status(400).json({ error: "version must be a valid number" });
    }
    
    const data = validate(insertDietAssignmentSchema.partial(), updateData);
    const assignment = await storage.updateDietAssignment(req.params.id, data, versionNum);
    
    if (!assignment) {
      return res.status(404).json({ error: "Diet assignment not found" });
    }
    
    res.json(assignment);
  } catch (error) {
    console.error("Error updating diet assignment:", error);
    if (error instanceof VersionConflictError) {
      return res.status(409).json({ error: "Version conflict - record was modified by another user" });
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    res.status(500).json({ error: "Failed to update diet assignment" });
  }
});

router.delete("/api/diet-assignments/:id", async (req, res) => {
  try {
    const deleted = await storage.deleteDietAssignment(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Diet assignment not found" });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting diet assignment:", error);
    res.status(500).json({ error: "Failed to delete diet assignment" });
  }
});

// ===== DASHBOARD STATISTICS =====
router.get("/api/dashboard/statistics", async (req, res) => {
  try {
    const statistics = await storage.getGroupStatistics();
    res.json(statistics);
  } catch (error) {
    console.error("Error fetching group statistics:", error);
    res.status(500).json({ error: "Failed to fetch group statistics" });
  }
});

// ===== REPORTS =====
router.get("/api/reports", async (req, res) => {
  try {
    const { patientId } = req.query;
    const reports = await storage.getReports(patientId as string | undefined);
    res.json(reports);
  } catch (error) {
    console.error("Error fetching reports:", error);
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

router.get("/api/reports/:id", async (req, res) => {
  try {
    const report = await storage.getReport(req.params.id);
    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }
    res.json(report);
  } catch (error) {
    console.error("Error fetching report:", error);
    res.status(500).json({ error: "Failed to fetch report" });
  }
});

router.post("/api/reports", async (req, res) => {
  try {
    const data = validate(insertReportSchema, req.body);
    const report = await storage.createReport(data);
    
    // Broadcast report creation to all clients
    wsManager.notifyReportCreated(report);
    
    res.status(201).json(report);
  } catch (error) {
    console.error("Error creating report:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create report" });
  }
});

router.patch("/api/reports/:id", async (req, res) => {
  try {
    const { version, ...updateData } = req.body;
    
    // Require version for optimistic locking
    if (version === undefined || version === null) {
      return res.status(400).json({ error: "version field is required for updates" });
    }
    
    const versionNum = Number(version);
    if (isNaN(versionNum)) {
      return res.status(400).json({ error: "version must be a valid number" });
    }
    
    const data = validate(insertReportSchema.partial(), updateData);
    const report = await storage.updateReport(req.params.id, data, versionNum);
    
    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }
    
    // Broadcast report update to all clients
    wsManager.notifyReportUpdate(report.id, report);
    
    res.json(report);
  } catch (error) {
    console.error("Error updating report:", error);
    if (error instanceof VersionConflictError) {
      return res.status(409).json({ error: "Version conflict - record was modified by another user" });
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    res.status(500).json({ error: "Failed to update report" });
  }
});

router.delete("/api/reports/:id", async (req, res) => {
  try {
    const deleted = await storage.deleteReport(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Report not found" });
    }
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting report:", error);
    res.status(500).json({ error: "Failed to delete report" });
  }
});

// Generate PDF Report
router.post("/api/reports/generate", async (req, res) => {
  try {
    const { patientId, measurementId } = req.body;
    
    if (!patientId || !measurementId) {
      return res.status(400).json({ error: "patientId and measurementId are required" });
    }
    
    // Obtener datos del paciente y medición
    const patient = await storage.getPatient(patientId);
    if (!patient) {
      return res.status(404).json({ error: "Patient not found" });
    }
    
    const measurement = await storage.getMeasurement(measurementId);
    if (!measurement) {
      return res.status(404).json({ error: "Measurement not found" });
    }
    
    // Obtener cálculos si existen
    const calculations = await storage.getMeasurementCalculations(measurementId);
    
    // Generar PDF
    const pdfUrl = await generateMeasurementReport({
      patient,
      measurement,
      calculations: calculations.length > 0 ? calculations : undefined
    });
    
    // Crear registro de report
    const report = await storage.createReport({
      patientId,
      measurementId,
      pdfUrl,
      status: 'generated',
      sentAt: null
    });
    
    // Broadcast report creation
    wsManager.notifyReportCreated(report);
    
    res.status(201).json(report);
  } catch (error) {
    console.error("Error generating report PDF:", error);
    res.status(500).json({ error: "Failed to generate report" });
  }
});

// ===== AI DIET GENERATION =====
import { SimpleDietAiService } from "./services/diet-ai-service-simple";
const dietAiService = new SimpleDietAiService(storage);

router.post("/api/patients/:id/diets/generate", async (req, res) => {
  try {
    const request = {
      patientId: req.params.id,
      goal: req.body.goal || 'Mejorar composición corporal',
      durationWeeks: req.body.durationWeeks || 4,
      preferences: req.body.preferences,
    };

    const result = await dietAiService.generateDiet(request);
    
    res.json(result);
  } catch (error) {
    console.error("Error generating diet:", error);
    res.status(500).json({ error: "Failed to generate diet plan" });
  }
});

router.get("/api/patients/:id/diet-generations", async (req, res) => {
  try {
    const generations = await storage.getDietGenerations(req.params.id);
    res.json(generations);
  } catch (error) {
    console.error("Error fetching diet generations:", error);
    res.status(500).json({ error: "Failed to fetch diet generations" });
  }
});

router.get("/api/diet-generations/:id", async (req, res) => {
  try {
    const generation = await storage.getDietGeneration(req.params.id);
    if (!generation) {
      return res.status(404).json({ error: "Diet generation not found" });
    }
    res.json(generation);
  } catch (error) {
    console.error("Error fetching diet generation:", error);
    res.status(500).json({ error: "Failed to fetch diet generation" });
  }
});

router.get("/api/diet-generations/:id/meals", async (req, res) => {
  try {
    const meals = await storage.getDietMealPlans(req.params.id);
    res.json(meals);
  } catch (error) {
    console.error("Error fetching meals:", error);
    res.status(500).json({ error: "Failed to fetch meal plans" });
  }
});

router.get("/api/diet-generations/:id/exercises", async (req, res) => {
  try {
    const exercises = await storage.getDietExerciseBlocks(req.params.id);
    res.json(exercises);
  } catch (error) {
    console.error("Error fetching exercises:", error);
    res.status(500).json({ error: "Failed to fetch exercise blocks" });
  }
});

router.get("/api/diet-templates", async (req, res) => {
  try {
    const templates = await storage.getDietTemplates();
    res.json(templates);
  } catch (error) {
    console.error("Error fetching diet templates:", error);
    res.status(500).json({ error: "Failed to fetch diet templates" });
  }
});

router.post("/api/diet-templates", async (req, res) => {
  try {
    const data = {
      name: req.body.name,
      description: req.body.description || null,
      objective: req.body.objective || null,
      content: req.body.content,
      targetCalories: req.body.targetCalories || null,
      isActive: req.body.isActive ?? true,
      macros: null,
      mealStructure: null,
      sampleMeals: null,
      restrictions: null,
      tags: null,
      successRate: null,
    };
    
    const template = await storage.createDietTemplate(data);
    res.status(201).json(template);
  } catch (error) {
    console.error("Error creating diet template:", error);
    res.status(500).json({ error: "Failed to create diet template" });
  }
});

router.patch("/api/diet-templates/:id", async (req, res) => {
  try {
    const data = {
      name: req.body.name,
      description: req.body.description || null,
      objective: req.body.objective || null,
      content: req.body.content,
      targetCalories: req.body.targetCalories || null,
      isActive: req.body.isActive,
    };
    
    const template = await storage.updateDietTemplate(req.params.id, data);
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }
    res.json(template);
  } catch (error) {
    console.error("Error updating diet template:", error);
    res.status(500).json({ error: "Failed to update diet template" });
  }
});

// ============================================================================
// MEAL CATALOG SYSTEM - Carolina's Time-Saving Features
// ============================================================================

// ===== MEALS =====
// NOTE: Meals are a GLOBAL catalog, not patient-specific
// Patient filtering happens at the weekly plan level
router.get("/api/meals", async (req, res) => {
  try {
    const { category, search, tagIds } = req.query;
    const filters: { category?: string; search?: string; tagIds?: string[] } = {};
    
    if (category && typeof category === 'string') {
      filters.category = category;
    }
    if (search && typeof search === 'string') {
      filters.search = search;
    }
    if (tagIds) {
      filters.tagIds = Array.isArray(tagIds) ? tagIds.map(String) : [String(tagIds)];
    }
    
    const meals = await storage.getMeals(filters);
    res.json(meals);
  } catch (error) {
    console.error("Error fetching meals:", error);
    res.status(500).json({ error: "Failed to fetch meals" });
  }
});

router.get("/api/meals/:id", async (req, res) => {
  try {
    const meal = await storage.getMeal(req.params.id);
    if (!meal) {
      return res.status(404).json({ error: "Meal not found" });
    }
    res.json(meal);
  } catch (error) {
    console.error("Error fetching meal:", error);
    res.status(500).json({ error: "Failed to fetch meal" });
  }
});

router.post("/api/meals", async (req, res) => {
  try {
    const data = validate(insertMealSchema, req.body);
    const meal = await storage.createMeal(data);
    res.status(201).json(meal);
  } catch (error) {
    console.error("Error creating meal:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create meal" });
  }
});

router.patch("/api/meals/:id", async (req, res) => {
  try {
    const { version, ...updateData } = req.body;
    
    if (version === undefined || version === null) {
      return res.status(400).json({ error: "version field is required for updates" });
    }
    
    const versionNum = Number(version);
    if (isNaN(versionNum)) {
      return res.status(400).json({ error: "version must be a valid number" });
    }
    
    const data = validate(insertMealSchema.partial(), updateData);
    const meal = await storage.updateMeal(req.params.id, data, versionNum);
    
    if (!meal) {
      return res.status(404).json({ error: "Meal not found" });
    }
    
    res.json(meal);
  } catch (error) {
    console.error("Error updating meal:", error);
    if (error instanceof VersionConflictError) {
      return res.status(409).json({ error: "Version conflict - record was modified by another user" });
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    res.status(500).json({ error: "Failed to update meal" });
  }
});

router.delete("/api/meals/:id", async (req, res) => {
  try {
    const deleted = await storage.deleteMeal(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Meal not found" });
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting meal:", error);
    res.status(500).json({ error: "Failed to delete meal" });
  }
});

// ===== MEAL IMAGES =====
// Configure multer for image uploads
const uploadsDir = path.join(process.cwd(), 'uploads', 'meals');
const upload = multer({
  storage: multer.diskStorage({
    destination: async (_req, _file, cb) => {
      try {
        await fs.mkdir(uploadsDir, { recursive: true });
        cb(null, uploadsDir);
      } catch (error) {
        cb(error as Error, uploadsDir);
      }
    },
    filename: (_req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, 'meal-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG and WebP are allowed.'));
    }
  }
});

// Upload image for a meal
router.post("/api/meals/:id/upload-image", upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    const meal = await storage.getMeal(req.params.id);
    if (!meal) {
      return res.status(404).json({ error: "Meal not found" });
    }

    const imageUrl = `/uploads/meals/${req.file.filename}`;
    
    const updatedMeal = await storage.updateMeal(
      req.params.id,
      { imageUrl },
      meal.version
    );

    if (!updatedMeal) {
      return res.status(404).json({ error: "Failed to update meal" });
    }

    res.json({ imageUrl, meal: updatedMeal });
  } catch (error) {
    console.error("Error uploading meal image:", error);
    if (error instanceof VersionConflictError) {
      return res.status(409).json({ error: "Version conflict - record was modified by another user" });
    }
    res.status(500).json({ error: "Failed to upload image" });
  }
});

// Generate AI image for a meal
router.post("/api/meals/:id/generate-image", async (req, res) => {
  try {
    if (!imageService.isAvailable()) {
      return res.status(503).json({ 
        error: "Generación de imágenes IA no disponible. Por favor configura la variable GOOGLE_API_KEY." 
      });
    }

    const meal = await storage.getMeal(req.params.id);
    if (!meal) {
      return res.status(404).json({ error: "Meal not found" });
    }

    const ingredients = Array.isArray(meal.ingredients) 
      ? meal.ingredients.map((ing: any) => `${ing.quantity} ${ing.unit} ${ing.name}`).join(', ')
      : 'mixed ingredients';

    const imageUrl = await imageService.generateMealImage({
      mealName: meal.name,
      ingredients,
      portionSize: meal.portionSize || '1 portion',
      description: meal.description || undefined,
    });

    const updatedMeal = await storage.updateMeal(
      req.params.id,
      { imageUrl },
      meal.version
    );

    if (!updatedMeal) {
      return res.status(404).json({ error: "Failed to update meal" });
    }

    res.json({ imageUrl, meal: updatedMeal });
  } catch (error) {
    console.error("Error generating meal image:", error);
    if (error instanceof VersionConflictError) {
      return res.status(409).json({ error: "Version conflict - record was modified by another user" });
    }
    res.status(500).json({ 
      error: "Failed to generate image",
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Delete image for a meal
router.delete("/api/meals/:id/image", async (req, res) => {
  try {
    const meal = await storage.getMeal(req.params.id);
    if (!meal) {
      return res.status(404).json({ error: "Meal not found" });
    }

    const updatedMeal = await storage.updateMeal(
      req.params.id,
      { imageUrl: null },
      meal.version
    );

    if (!updatedMeal) {
      return res.status(404).json({ error: "Failed to update meal" });
    }

    res.json({ meal: updatedMeal });
  } catch (error) {
    console.error("Error deleting meal image:", error);
    if (error instanceof VersionConflictError) {
      return res.status(409).json({ error: "Version conflict - record was modified by another user" });
    }
    res.status(500).json({ error: "Failed to delete image" });
  }
});

// Check if AI image generation is available
router.get("/api/image-generation/status", async (_req, res) => {
  res.json({ 
    available: imageService.isAvailable(),
    provider: imageService.isAvailable() ? 'Google Gemini 2.5 Flash Image' : null
  });
});

// ===== PATIENT AVATARS =====
// Configure multer for patient avatar uploads
const avatarUploadDir = path.join(process.cwd(), 'attached_assets', 'temp_uploads');
const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: async (_req, _file, cb) => {
      try {
        await fs.mkdir(avatarUploadDir, { recursive: true });
        cb(null, avatarUploadDir);
      } catch (error) {
        cb(error as Error, avatarUploadDir);
      }
    },
    filename: (_req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, 'temp-avatar-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB max for avatars
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG and WebP are allowed.'));
    }
  }
});

// Upload avatar for a patient
router.post("/api/uploads/patient-avatar", avatarUpload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No avatar file provided" });
    }

    const patientId = req.body.patientId;
    if (!patientId) {
      // Clean up temp file if validation fails
      await fs.unlink(req.file.path).catch(err => console.error("Failed to cleanup temp file:", err));
      return res.status(400).json({ error: "patientId is required" });
    }

    // Validate that patient exists (optional but recommended)
    if (patientId !== "temp") {
      const patient = await storage.getPatient(patientId);
      if (!patient) {
        // Clean up temp file if patient doesn't exist
        await fs.unlink(req.file.path).catch(err => console.error("Failed to cleanup temp file:", err));
        return res.status(404).json({ error: "Patient not found" });
      }
    }

    const avatarUrl = await saveAvatar(req.file, patientId);
    
    res.json({ url: avatarUrl });
  } catch (error) {
    console.error("Error uploading patient avatar:", error);
    // Clean up temp file on error
    if (req.file?.path) {
      await fs.unlink(req.file.path).catch(err => console.error("Failed to cleanup temp file:", err));
    }
    res.status(500).json({ 
      error: "Failed to upload avatar",
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ===== MEAL TAGS =====
router.get("/api/meal-tags", async (req, res) => {
  try {
    const { category } = req.query;
    const tags = await storage.getMealTags(
      category && typeof category === 'string' ? category : undefined
    );
    res.json(tags);
  } catch (error) {
    console.error("Error fetching meal tags:", error);
    res.status(500).json({ error: "Failed to fetch meal tags" });
  }
});

router.get("/api/meal-tags/:id", async (req, res) => {
  try {
    const tag = await storage.getMealTag(req.params.id);
    if (!tag) {
      return res.status(404).json({ error: "Meal tag not found" });
    }
    res.json(tag);
  } catch (error) {
    console.error("Error fetching meal tag:", error);
    res.status(500).json({ error: "Failed to fetch meal tag" });
  }
});

router.post("/api/meal-tags", async (req, res) => {
  try {
    const data = validate(insertMealTagSchema, req.body);
    const tag = await storage.createMealTag(data);
    res.status(201).json(tag);
  } catch (error) {
    console.error("Error creating meal tag:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create meal tag" });
  }
});

router.patch("/api/meal-tags/:id", async (req, res) => {
  try {
    const { version, ...updateData } = req.body;
    
    if (version === undefined || version === null) {
      return res.status(400).json({ error: "version field is required for updates" });
    }
    
    const versionNum = Number(version);
    if (isNaN(versionNum)) {
      return res.status(400).json({ error: "version must be a valid number" });
    }
    
    const data = validate(insertMealTagSchema.partial(), updateData);
    const tag = await storage.updateMealTag(req.params.id, data, versionNum);
    
    if (!tag) {
      return res.status(404).json({ error: "Meal tag not found" });
    }
    
    res.json(tag);
  } catch (error) {
    console.error("Error updating meal tag:", error);
    if (error instanceof VersionConflictError) {
      return res.status(409).json({ error: "Version conflict - record was modified by another user" });
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    res.status(500).json({ error: "Failed to update meal tag" });
  }
});

router.delete("/api/meal-tags/:id", async (req, res) => {
  try {
    const deleted = await storage.deleteMealTag(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Meal tag not found" });
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting meal tag:", error);
    res.status(500).json({ error: "Failed to delete meal tag" });
  }
});

// ===== MEAL TAG ASSIGNMENTS =====
router.post("/api/meals/:id/tags", async (req, res) => {
  try {
    const { tagIds } = req.body;
    if (!Array.isArray(tagIds)) {
      return res.status(400).json({ error: "tagIds must be an array" });
    }
    await storage.assignTagsToMeal(req.params.id, tagIds);
    res.json({ success: true });
  } catch (error) {
    console.error("Error assigning tags to meal:", error);
    res.status(500).json({ error: "Failed to assign tags to meal" });
  }
});

router.get("/api/meal-tag-assignments", async (req, res) => {
  try {
    const { mealId, tagId } = req.query;
    const assignments = await storage.getMealTagAssignments(
      mealId && typeof mealId === 'string' ? mealId : undefined,
      tagId && typeof tagId === 'string' ? tagId : undefined
    );
    res.json(assignments);
  } catch (error) {
    console.error("Error fetching meal tag assignments:", error);
    res.status(500).json({ error: "Failed to fetch meal tag assignments" });
  }
});

// ===== WEEKLY DIET PLANS =====
router.get("/api/weekly-plans", async (req, res) => {
  try {
    const { isTemplate, search } = req.query;
    const filters: { isTemplate?: boolean; search?: string } = {};
    
    if (isTemplate === 'true') filters.isTemplate = true;
    else if (isTemplate === 'false') filters.isTemplate = false;
    
    if (search && typeof search === 'string') filters.search = search;
    
    const plans = await storage.getWeeklyDietPlans(Object.keys(filters).length > 0 ? filters : undefined);
    res.json(plans);
  } catch (error) {
    console.error("Error fetching weekly plans:", error);
    res.status(500).json({ error: "Failed to fetch weekly plans" });
  }
});

router.get("/api/weekly-plans/:id", async (req, res) => {
  try {
    const plan = await storage.getWeeklyDietPlan(req.params.id);
    if (!plan) {
      return res.status(404).json({ error: "Weekly plan not found" });
    }
    res.json(plan);
  } catch (error) {
    console.error("Error fetching weekly plan:", error);
    res.status(500).json({ error: "Failed to fetch weekly plan" });
  }
});

router.post("/api/weekly-plans", async (req, res) => {
  try {
    const data = validate(insertWeeklyDietPlanSchema, req.body);
    const plan = await storage.createWeeklyDietPlan(data);
    res.status(201).json(plan);
  } catch (error) {
    console.error("Error creating weekly plan:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create weekly plan" });
  }
});

router.patch("/api/weekly-plans/:id", async (req, res) => {
  try {
    const { version, ...updateData } = req.body;
    
    if (version === undefined || version === null) {
      return res.status(400).json({ error: "version field is required for updates" });
    }
    
    const versionNum = Number(version);
    if (isNaN(versionNum)) {
      return res.status(400).json({ error: "version must be a valid number" });
    }
    
    const data = validate(insertWeeklyDietPlanSchema.partial(), updateData);
    const plan = await storage.updateWeeklyDietPlan(req.params.id, data, versionNum);
    
    if (!plan) {
      return res.status(404).json({ error: "Weekly plan not found" });
    }
    
    res.json(plan);
  } catch (error) {
    console.error("Error updating weekly plan:", error);
    if (error instanceof VersionConflictError) {
      return res.status(409).json({ error: "Version conflict - record was modified by another user" });
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    res.status(500).json({ error: "Failed to update weekly plan" });
  }
});

router.delete("/api/weekly-plans/:id", async (req, res) => {
  try {
    const deleted = await storage.deleteWeeklyDietPlan(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Weekly plan not found" });
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting weekly plan:", error);
    res.status(500).json({ error: "Failed to delete weekly plan" });
  }
});

// ===== WEEKLY PLAN ASSIGNMENTS =====
router.get("/api/weekly-plan-assignments", async (req, res) => {
  try {
    const { planId, groupId, patientId } = req.query;
    const assignments = await storage.getWeeklyPlanAssignments(
      planId && typeof planId === 'string' ? planId : undefined,
      groupId && typeof groupId === 'string' ? groupId : undefined,
      patientId && typeof patientId === 'string' ? patientId : undefined
    );
    res.json(assignments);
  } catch (error) {
    console.error("Error fetching weekly plan assignments:", error);
    res.status(500).json({ error: "Failed to fetch weekly plan assignments" });
  }
});

router.get("/api/weekly-plan-assignments/:id", async (req, res) => {
  try {
    const assignment = await storage.getWeeklyPlanAssignment(req.params.id);
    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }
    res.json(assignment);
  } catch (error) {
    console.error("Error fetching weekly plan assignment:", error);
    res.status(500).json({ error: "Failed to fetch weekly plan assignment" });
  }
});

router.post("/api/weekly-plan-assignments", async (req, res) => {
  try {
    const data = validate(insertWeeklyPlanAssignmentSchema, req.body);
    const assignment = await storage.createWeeklyPlanAssignment(data);
    res.status(201).json(assignment);
  } catch (error) {
    console.error("Error creating weekly plan assignment:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create weekly plan assignment" });
  }
});

router.patch("/api/weekly-plan-assignments/:id", async (req, res) => {
  try {
    const expectedVersion = req.body.version;
    delete req.body.version;
    
    // Don't validate with .partial() on a ZodEffects - just pass the data
    const assignment = await storage.updateWeeklyPlanAssignment(req.params.id, req.body, expectedVersion);
    
    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }
    res.json(assignment);
  } catch (error) {
    console.error("Error updating weekly plan assignment:", error);
    if (error instanceof VersionConflictError) {
      return res.status(409).json({ error: "Version conflict - assignment was modified by another user" });
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    res.status(500).json({ error: "Failed to update weekly plan assignment" });
  }
});

router.delete("/api/weekly-plan-assignments/:id", async (req, res) => {
  try {
    const deleted = await storage.deleteWeeklyPlanAssignment(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Assignment not found" });
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting weekly plan assignment:", error);
    res.status(500).json({ error: "Failed to delete weekly plan assignment" });
  }
});

router.post("/api/weekly-plans/:id/assign-to-group", async (req, res) => {
  try {
    const { groupId, startDate, endDate } = req.body;
    if (!groupId) {
      return res.status(400).json({ error: "groupId is required" });
    }
    
    const assignment = await storage.assignPlanToGroup(
      req.params.id,
      groupId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );
    res.status(201).json(assignment);
  } catch (error) {
    console.error("Error assigning plan to group:", error);
    res.status(500).json({ error: "Failed to assign plan to group" });
  }
});

router.post("/api/weekly-plans/:id/assign-to-patient", async (req, res) => {
  try {
    const { patientId, startDate, endDate } = req.body;
    if (!patientId) {
      return res.status(400).json({ error: "patientId is required" });
    }
    
    const assignment = await storage.assignPlanToPatient(
      req.params.id,
      patientId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );
    res.status(201).json(assignment);
  } catch (error) {
    console.error("Error assigning plan to patient:", error);
    res.status(500).json({ error: "Failed to assign plan to patient" });
  }
});

// ===== WEEKLY PLAN MEALS =====
router.get("/api/weekly-plans/:id/meals", async (req, res) => {
  try {
    const meals = await storage.getWeeklyPlanMeals(req.params.id);
    res.json(meals);
  } catch (error) {
    console.error("Error fetching weekly plan meals:", error);
    res.status(500).json({ error: "Failed to fetch weekly plan meals" });
  }
});

router.post("/api/weekly-plan-meals", async (req, res) => {
  try {
    const data = validate(insertWeeklyPlanMealSchema, req.body);
    const planMeal = await storage.createWeeklyPlanMeal(data);
    res.status(201).json(planMeal);
  } catch (error) {
    console.error("Error creating weekly plan meal:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create weekly plan meal" });
  }
});

router.patch("/api/weekly-plan-meals/:id", async (req, res) => {
  try {
    const { version, ...updateData } = req.body;
    
    if (version === undefined || version === null) {
      return res.status(400).json({ error: "version field is required for updates" });
    }
    
    const versionNum = Number(version);
    if (isNaN(versionNum)) {
      return res.status(400).json({ error: "version must be a valid number" });
    }
    
    const data = validate(insertWeeklyPlanMealSchema.partial(), updateData);
    const planMeal = await storage.updateWeeklyPlanMeal(req.params.id, data, versionNum);
    
    if (!planMeal) {
      return res.status(404).json({ error: "Weekly plan meal not found" });
    }
    
    res.json(planMeal);
  } catch (error) {
    console.error("Error updating weekly plan meal:", error);
    if (error instanceof VersionConflictError) {
      return res.status(409).json({ error: "Version conflict - record was modified by another user" });
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    res.status(500).json({ error: "Failed to update weekly plan meal" });
  }
});

router.delete("/api/weekly-plan-meals/:id", async (req, res) => {
  try {
    const deleted = await storage.deleteWeeklyPlanMeal(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Weekly plan meal not found" });
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting weekly plan meal:", error);
    res.status(500).json({ error: "Failed to delete weekly plan meal" });
  }
});

// Generate PDF for weekly plan assignment
router.post("/api/weekly-plans/:id/generate-pdf", async (req, res) => {
  try {
    const { assignmentId } = req.body;
    
    // Get the plan
    const plan = await storage.getWeeklyDietPlan(req.params.id);
    if (!plan) {
      return res.status(404).json({ error: "Weekly plan not found" });
    }

    // Get the meals
    const meals = await storage.getWeeklyPlanMeals(req.params.id);
    
    // Fetch meal details for each planned meal
    const mealsWithDetails = await Promise.all(
      meals.map(async (planMeal) => {
        if (planMeal.mealId) {
          const mealDetails = await storage.getMeal(planMeal.mealId);
          return { ...planMeal, mealDetails: mealDetails || undefined };
        }
        return planMeal;
      })
    );

    // Get assignment details if provided
    let patient = undefined;
    let group = undefined;
    let assignmentNotes = undefined;
    let startDate = undefined;
    let endDate = undefined;

    if (assignmentId) {
      const assignment = await storage.getWeeklyPlanAssignment(assignmentId);
      if (assignment) {
        assignmentNotes = assignment.assignmentNotes || undefined;
        startDate = assignment.startDate || undefined;
        endDate = assignment.endDate || undefined;
        
        if (assignment.patientId) {
          patient = await storage.getPatient(assignment.patientId) || undefined;
        } else if (assignment.groupId) {
          group = await storage.getPatientGroup(assignment.groupId) || undefined;
        }
      }
    }

    // Generate PDF
    const pdfUrl = await generateWeeklyPlanPDF({
      plan,
      meals: mealsWithDetails,
      patient,
      group,
      assignmentNotes,
      startDate,
      endDate,
    });

    res.json({ pdfUrl });
  } catch (error) {
    console.error("Error generating weekly plan PDF:", error);
    res.status(500).json({ error: "Failed to generate PDF" });
  }
});

// Export router for testing
export { router };

// Main function to register routes and create HTTP server
export function registerRoutes(app: Express): Server {
  // Mount all API routes
  app.use(router);

  // Create and return HTTP server
  const server = createServer(app);
  return server;
}
