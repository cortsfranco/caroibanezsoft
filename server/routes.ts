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
} from "@shared/schema";
import { createServer, type Server } from "http";
import { wsManager } from "./websocket";
import { VersionConflictError } from "./storage";

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
    
    const data = validate(insertPatientSchema.partial(), updateData);
    const patient = await storage.updatePatient(req.params.id, data, versionNum);
    
    if (!patient) {
      return res.status(404).json({ error: "Patient not found" });
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
    
    // Trigger ISAK 2 calculations here (will implement in next task)
    
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
    
    // Re-calculate ISAK 2 when measurement is updated
    
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
    
    wsManager.notifyPatientUpdate(request.patientId);
    
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
