import { db } from "../server/db";
import {
  patients,
  patientGroups,
  groupMemberships,
  measurements,
  measurementCalculations,
  type Patient,
  type PatientGroup,
} from "../shared/schema";
import { and, eq } from "drizzle-orm";
import { calculateAll } from "../server/services/measurement-calculations";

interface SamplePatient {
  name: string;
  email: string;
  phone: string;
  birthDate: string;
  gender: "M" | "F" | "Other";
  objective: "loss" | "gain" | "maintain";
  notes?: string;
  sportType?: string;
  exerciseDays?: string;
  exerciseSchedule?: string;
  groups: string[];
}

const sampleGroups: Array<{ name: string; description: string; color: string }> = [
  { name: "Running Team", description: "Grupo de corredores recreativos", color: "#38bdf8" },
  { name: "Fuerza & Hipertrofia", description: "Entrenamientos de fuerza e hipertrofia", color: "#f472b6" },
  { name: "Consultorio General", description: "Pacientes de seguimiento general", color: "#22c55e" },
  { name: "Triatlón", description: "Atletas de triatlón", color: "#a855f7" },
  { name: "Nutrición Clínica", description: "Casos clínicos específicos", color: "#f97316" },
];

const samplePatients: SamplePatient[] = [
  {
    name: "Domingo López",
    email: "domingolopez@example.com",
    phone: "+54 9 11 3000 1001",
    birthDate: "1990-04-18",
    gender: "M",
    objective: "loss",
    notes: "Prep de media maratón, ajustar hidratos las semanas largas.",
    sportType: "Running",
    exerciseDays: "Lunes, Miércoles, Viernes, Domingo",
    exerciseSchedule: "07:00-08:30",
    groups: ["Running Team"],
  },
  {
    name: "Luciana Pereyra",
    email: "lucianapereyra@example.com",
    phone: "+54 9 351 400 2233",
    birthDate: "1987-09-02",
    gender: "F",
    objective: "gain",
    notes: "Preparación para torneo provincial de powerlifting.",
    sportType: "Powerlifting",
    exerciseDays: "Lunes a Sábado",
    exerciseSchedule: "18:00-20:30",
    groups: ["Fuerza & Hipertrofia"],
  },
  {
    name: "Mauro Santillán",
    email: "maurosantillan@example.com",
    phone: "+54 9 261 555 4411",
    birthDate: "1995-01-25",
    gender: "M",
    objective: "maintain",
    notes: "Triatleta categoría age group, segunda temporada.",
    sportType: "Triatlón",
    exerciseDays: "Lunes a Domingo",
    exerciseSchedule: "07:00-09:00",
    groups: ["Triatlón"],
  },
  {
    name: "Agustina Rivas",
    email: "agustinarivas@example.com",
    phone: "+54 9 381 212 9876",
    birthDate: "1998-11-13",
    gender: "F",
    objective: "loss",
    notes: "Post cirugía de rodilla - reducir peso gradual.",
    sportType: "Rehabilitación",
    exerciseDays: "Martes, Jueves",
    exerciseSchedule: "16:00-17:00",
    groups: ["Nutrición Clínica"],
  },
  {
    name: "Sebastián Godoy",
    email: "sebastiangodoy@example.com",
    phone: "+54 9 261 600 4411",
    birthDate: "1982-03-08",
    gender: "M",
    objective: "gain",
    notes: "Plan de fuerza, historial de bajo peso crónico.",
    sportType: "Entrenamiento funcional",
    exerciseDays: "Lunes, Miércoles, Viernes",
    exerciseSchedule: "20:00-21:30",
    groups: ["Fuerza & Hipertrofia"],
  },
  {
    name: "Carla Ojeda",
    email: "carlaojeda@example.com",
    phone: "+54 9 299 311 8899",
    birthDate: "1992-06-21",
    gender: "F",
    objective: "maintain",
    notes: "Seguimiento general y control de lípidos.",
    groups: ["Consultorio General"],
  },
  {
    name: "Tomás Vázquez",
    email: "tomasvazquez@example.com",
    phone: "+54 9 221 301 7700",
    birthDate: "2001-12-30",
    gender: "M",
    objective: "gain",
    notes: "Novato en fuerza, necesita guía con macros.",
    sportType: "Gimnasio",
    exerciseDays: "Lunes, Martes, Jueves, Viernes",
    exerciseSchedule: "19:00-20:30",
    groups: ["Fuerza & Hipertrofia"],
  },
  {
    name: "Natalia Colombo",
    email: "nataliacolombo@example.com",
    phone: "+54 9 341 400 7120",
    birthDate: "1984-10-17",
    gender: "F",
    objective: "loss",
    notes: "Percibe ansiedad nocturna, priorizar colaciones controladas.",
    groups: ["Consultorio General"],
  },
  {
    name: "Julián Herrera",
    email: "julianherrera@example.com",
    phone: "+54 9 221 808 3200",
    birthDate: "1997-07-04",
    gender: "M",
    objective: "maintain",
    notes: "Triatlón olímpico, foco en recuperación.",
    sportType: "Triatlón",
    exerciseDays: "Lunes a Domingo",
    exerciseSchedule: "06:30-09:00",
    groups: ["Triatlón"],
  },
  {
    name: "Elena Duarte",
    email: "elenaduarte@example.com",
    phone: "+54 9 261 988 4412",
    birthDate: "1979-02-09",
    gender: "F",
    objective: "loss",
    notes: "Menopausia reciente, ajustar calorías y densidad nutricional.",
    groups: ["Nutrición Clínica"],
  },
  {
    name: "Federico Molina",
    email: "federicomolina@example.com",
    phone: "+54 9 381 455 2201",
    birthDate: "1989-05-11",
    gender: "M",
    objective: "gain",
    notes: "Maratonista, trabajando en mantener masa magra.",
    sportType: "Running",
    exerciseDays: "Lunes a Domingo",
    exerciseSchedule: "18:30-20:00",
    groups: ["Running Team"],
  },
];

type MeasurementTemplate = {
  weight: number;
  height: number;
  waist: number;
  hip: number;
  triceps: number;
  biceps: number;
  subscapular: number;
  suprailiac: number;
  supraspinal: number;
  abdominal: number;
  thighSkinfold: number;
  calfSkinfold: number;
  relaxedArm: number;
  flexedArm: number;
  forearm: number;
  thoraxCirc: number;
  thighSuperior: number;
  thighMedial: number;
  calf: number;
  biacromial: number;
  thoraxTransverse: number;
  thoraxAnteroposterior: number;
  biiliocristideo: number;
  humeral: number;
  femoral: number;
  head: number;
  seatedHeight: number;
};

const baseMeasurement: MeasurementTemplate = {
  weight: 72,
  height: 175,
  waist: 80,
  hip: 94,
  triceps: 12,
  biceps: 8,
  subscapular: 14,
  suprailiac: 13,
  supraspinal: 12,
  abdominal: 20,
  thighSkinfold: 18,
  calfSkinfold: 12,
  relaxedArm: 30,
  flexedArm: 33,
  forearm: 26,
  thoraxCirc: 98,
  thighSuperior: 57,
  thighMedial: 53,
  calf: 37,
  biacromial: 40,
  thoraxTransverse: 32,
  thoraxAnteroposterior: 22,
  biiliocristideo: 29,
  humeral: 6.8,
  femoral: 9.5,
  head: 57,
  seatedHeight: 90,
};

function toDecimal(value: number, digits = 2): string {
  return value.toFixed(digits);
}

function generateMeasurementTemplate(multiplier: number, delta: number): MeasurementTemplate {
  return {
    weight: baseMeasurement.weight * multiplier + delta,
    height: baseMeasurement.height,
    waist: baseMeasurement.waist * multiplier,
    hip: baseMeasurement.hip * multiplier,
    triceps: baseMeasurement.triceps * multiplier,
    biceps: baseMeasurement.biceps * multiplier,
    subscapular: baseMeasurement.subscapular * multiplier,
    suprailiac: baseMeasurement.suprailiac * multiplier,
    supraspinal: baseMeasurement.supraspinal * multiplier,
    abdominal: baseMeasurement.abdominal * multiplier,
    thighSkinfold: baseMeasurement.thighSkinfold * multiplier,
    calfSkinfold: baseMeasurement.calfSkinfold * multiplier,
    relaxedArm: baseMeasurement.relaxedArm * multiplier,
    flexedArm: baseMeasurement.flexedArm * multiplier,
    forearm: baseMeasurement.forearm * multiplier,
    thoraxCirc: baseMeasurement.thoraxCirc * multiplier,
    thighSuperior: baseMeasurement.thighSuperior * multiplier,
    thighMedial: baseMeasurement.thighMedial * multiplier,
    calf: baseMeasurement.calf * multiplier,
    biacromial: baseMeasurement.biacromial,
    thoraxTransverse: baseMeasurement.thoraxTransverse,
    thoraxAnteroposterior: baseMeasurement.thoraxAnteroposterior,
    biiliocristideo: baseMeasurement.biiliocristideo,
    humeral: baseMeasurement.humeral,
    femoral: baseMeasurement.femoral,
    head: baseMeasurement.head,
    seatedHeight: baseMeasurement.seatedHeight,
  };
}

async function ensureGroups(): Promise<Record<string, PatientGroup>> {
  const map: Record<string, PatientGroup> = {};
  for (const group of sampleGroups) {
    const existing = await db.select().from(patientGroups).where(eq(patientGroups.name, group.name)).limit(1);
    if (existing.length > 0) {
      map[group.name] = existing[0];
      continue;
    }
    const inserted = await db
      .insert(patientGroups)
      .values({
        name: group.name,
        description: group.description,
        color: group.color,
      })
      .returning();
    map[group.name] = inserted[0];
  }
  return map;
}

async function createMeasurementEntries(patient: Patient, template: MeasurementTemplate, measurementDate: Date) {
  const measurementInsert = await db
    .insert(measurements)
    .values({
      patientId: patient.id,
      measurementDate,
      weight: toDecimal(template.weight),
      height: toDecimal(template.height),
      waist: toDecimal(template.waist),
      hip: toDecimal(template.hip),
      triceps: toDecimal(template.triceps),
      biceps: toDecimal(template.biceps),
      subscapular: toDecimal(template.subscapular),
      suprailiac: toDecimal(template.suprailiac),
      supraspinal: toDecimal(template.supraspinal),
      abdominal: toDecimal(template.abdominal),
      thighSkinfold: toDecimal(template.thighSkinfold),
      calfSkinfold: toDecimal(template.calfSkinfold),
      relaxedArm: toDecimal(template.relaxedArm),
      flexedArm: toDecimal(template.flexedArm),
      forearm: toDecimal(template.forearm),
      thoraxCirc: toDecimal(template.thoraxCirc),
      thighSuperior: toDecimal(template.thighSuperior),
      thighMedial: toDecimal(template.thighMedial),
      calf: toDecimal(template.calf),
      biacromial: toDecimal(template.biacromial),
      thoraxTransverse: toDecimal(template.thoraxTransverse),
      thoraxAnteroposterior: toDecimal(template.thoraxAnteroposterior),
      biiliocristideo: toDecimal(template.biiliocristideo),
      humeral: toDecimal(template.humeral),
      femoral: toDecimal(template.femoral),
      head: toDecimal(template.head),
      seatedHeight: toDecimal(template.seatedHeight),
    })
    .returning();

  const measurement = measurementInsert[0];
  const patientBirthDate = patient.birthDate ? new Date(patient.birthDate) : new Date("1990-01-01");
  const age = Math.max(
    0,
    Math.floor((measurementDate.getTime() - patientBirthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)),
  );

  const calc = calculateAll(
    {
      weight: toDecimal(template.weight),
      height: toDecimal(template.height),
      seatedHeight: toDecimal(template.seatedHeight),
      triceps: toDecimal(template.triceps),
      biceps: toDecimal(template.biceps),
      subscapular: toDecimal(template.subscapular),
      suprailiac: toDecimal(template.suprailiac),
      supraspinal: toDecimal(template.supraspinal),
      abdominal: toDecimal(template.abdominal),
      thighSkinfold: toDecimal(template.thighSkinfold),
      calfSkinfold: toDecimal(template.calfSkinfold),
      waistCircumference: toDecimal(template.waist),
      hipCircumference: toDecimal(template.hip),
      head: toDecimal(template.head),
      relaxedArm: toDecimal(template.relaxedArm),
      flexedArm: toDecimal(template.flexedArm),
      forearm: toDecimal(template.forearm),
      thoraxCirc: toDecimal(template.thoraxCirc),
      thighSuperior: toDecimal(template.thighSuperior),
      thighMedial: toDecimal(template.thighMedial),
      calf: toDecimal(template.calf),
      biacromial: toDecimal(template.biacromial),
      thoraxTransverse: toDecimal(template.thoraxTransverse),
      thoraxAnteroposterior: toDecimal(template.thoraxAnteroposterior),
      biiliocristideo: toDecimal(template.biiliocristideo),
      humeral: toDecimal(template.humeral),
      femoral: toDecimal(template.femoral),
    },
    {
      age,
      gender: patient.gender,
      objective: patient.objective,
      activityProfile: {
        exercisesRegularly: patient.exercisesRegularly,
        exerciseDays: patient.exerciseDays,
        exerciseSchedule: patient.exerciseSchedule,
        sportType: patient.sportType,
      },
    },
  );

  await db.insert(measurementCalculations).values({
    measurementId: measurement.id,
    bmi: calc.bmi ?? null,
    sumOf4Skinfolds: calc.sumOf4Skinfolds ?? null,
    sumOf6Skinfolds: calc.sumOf6Skinfolds ?? null,
    bodyFatPercentage: calc.bodyFatPercentage ?? null,
    leanMass: calc.leanMass ?? null,
    waistHipRatio: calc.waistHipRatio ?? null,
    basalMetabolicRate: calc.basalMetabolicRate ?? null,
    activityMultiplier: calc.activityMultiplier ?? null,
    maintenanceCalories: calc.maintenanceCalories ?? null,
    targetCalories: calc.targetCalories ?? null,
    calorieObjective: calc.calorieObjective ?? null,
    proteinPerDay: calc.proteinPerDay ?? null,
    carbsPerDay: calc.carbsPerDay ?? null,
    fatsPerDay: calc.fatsPerDay ?? null,
    skinMassKg: calc.skinMassKg ?? null,
    skinMassPercent: calc.skinMassPercent ?? null,
    adiposeMassKg: calc.adiposeMassKg ?? null,
    adiposeMassPercent: calc.adiposeMassPercent ?? null,
    muscleMassKg: calc.muscleMassKg ?? null,
    muscleMassPercent: calc.muscleMassPercent ?? null,
    boneMassKg: calc.boneMassKg ?? null,
    boneMassPercent: calc.boneMassPercent ?? null,
    residualMassKg: calc.residualMassKg ?? null,
    residualMassPercent: calc.residualMassPercent ?? null,
    weightZScore: calc.weightZScore ?? null,
    heightZScore: calc.heightZScore ?? null,
    bmiZScore: calc.bmiZScore ?? null,
    perMealPlan: calc.perMealPlan ?? null,
  });
}

async function main() {
  console.log("🌱 Generando pacientes y mediciones de ejemplo...");
  const groups = await ensureGroups();

  for (const sample of samplePatients) {
    const existing = await db
      .select()
      .from(patients)
      .where(eq(patients.email, sample.email))
      .limit(1);

    if (existing.length > 0) {
      console.log(`• Paciente ${sample.name} ya existe, saltando.`);
      continue;
    }

    const inserted = await db
      .insert(patients)
      .values({
        name: sample.name,
        email: sample.email,
        phone: sample.phone,
        birthDate: new Date(sample.birthDate),
        gender: sample.gender,
        objective: sample.objective,
        notes: sample.notes ?? null,
        sportType: sample.sportType ?? null,
        exerciseDays: sample.exerciseDays ?? null,
        exerciseSchedule: sample.exerciseSchedule ?? null,
        exercisesRegularly: Boolean(sample.exerciseDays),
      })
      .returning();

    const patient = inserted[0];

    for (const groupName of sample.groups) {
      const group = groups[groupName];
      if (!group) continue;

      const existingMembership = await db
        .select()
        .from(groupMemberships)
        .where(
          and(eq(groupMemberships.patientId, patient.id), eq(groupMemberships.groupId, group.id)),
        )
        .limit(1);

      if (existingMembership.length === 0) {
        await db.insert(groupMemberships).values({ patientId: patient.id, groupId: group.id });
      }
    }

    // Generar entre 2 y 3 mediciones por paciente
    const measurementCount = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < measurementCount; i++) {
      const multiplier = sample.objective === "gain" ? 1 + i * 0.02 : sample.objective === "loss" ? 1 - i * 0.02 : 1 + (i - 1) * 0.005;
      const delta = sample.objective === "gain" ? i * 0.8 : sample.objective === "loss" ? -i * 0.6 : i * 0.2;
      const template = generateMeasurementTemplate(multiplier, delta);
      const measurementDate = new Date();
      measurementDate.setMonth(measurementDate.getMonth() - (measurementCount - 1 - i) * 2);
      await createMeasurementEntries(patient, template, measurementDate);
    }

    console.log(`✓ Paciente ${sample.name} creado con ${measurementCount} mediciones.`);
  }

  console.log("\n✅ Datos de ejemplo generados correctamente.\n");
  process.exit(0);
}

main().catch((error) => {
  console.error("Error generando datos de ejemplo:", error);
  process.exit(1);
});
