import { pgTable, text, integer, decimal, timestamp, uuid, boolean } from "drizzle-orm/pg-core";
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
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPatientSchema = createInsertSchema(patients).omit({
  id: true,
  version: true,
  createdAt: true,
  updatedAt: true,
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
});
export type InsertReport = z.infer<typeof insertReportSchema>;
export type Report = typeof reports.$inferSelect;
