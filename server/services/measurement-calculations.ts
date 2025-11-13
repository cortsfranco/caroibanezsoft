/**
 * Servicio para cálculos antropométricos según ISAK 2
 * D. Kerr 1988 - 5 Component Fractionation Model
 */

const MEAL_DISTRIBUTION: Record<string, number> = {
  breakfast: 0.25,
  snack1: 0.1,
  lunch: 0.3,
  snack2: 0.15,
  dinner: 0.2,
};

const HIGH_DEMAND_SPORT_KEYWORDS = ["alto rendimiento", "profesional", "intenso", "competencia", "selección"];

interface ActivityProfile {
  exercisesRegularly?: boolean | null;
  exerciseDays?: string | null;
  exerciseSchedule?: string | null;
  sportType?: string | null;
}

export interface NutritionPreferences {
  proteinMultiplierLoss: number;
  proteinMultiplierMaintain: number;
  proteinMultiplierGain: number;
  fatPerKg: number;
}

export interface MealMacroTarget {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fats: number | null;
}

export interface MeasurementCalculationResult {
  bmi?: string;
  sumOf4Skinfolds?: string; // Durnin & Womersley (4 pliegues)
  sumOf6Skinfolds?: string; // ISAK 2 (6 pliegues)
  bodyFatPercentage?: string; // % grasa corporal
  leanMass?: string;
  waistHipRatio?: string;
  endomorphy?: string;
  mesomorphy?: string;
  ectomorphy?: string;
  basalMetabolicRate?: string;
  activityMultiplier?: string;
  maintenanceCalories?: number;
  targetCalories?: number;
  calorieObjective?: string;
  proteinPerDay?: string;
  carbsPerDay?: string;
  fatsPerDay?: string;
  perMealPlan?: Record<string, MealMacroTarget>;
}

function normalizeObjective(objective?: string | null): "loss" | "gain" | "maintain" {
  if (!objective) {
    return "maintain";
  }
  const normalized = objective.toLowerCase();
  if (normalized.includes("baj") || normalized.includes("defin") || normalized.includes("pérd") || normalized.includes("perd")) {
    return "loss";
  }
  if (normalized.includes("aument") || normalized.includes("hipertrof") || normalized.includes("gananc")) {
    return "gain";
  }
  return "maintain";
}

function inferTrainingDays(exerciseDays?: string | null): number {
  if (!exerciseDays) {
    return 0;
  }
  const cleaned = exerciseDays.replace(/\s+/g, "");
  if (!cleaned) {
    return 0;
  }
  return cleaned.split(/[,;\/]+/).filter(Boolean).length;
}

function inferActivityMultiplier(profile: ActivityProfile): number {
  const days = inferTrainingDays(profile.exerciseDays);
  let multiplier = 1.2; // Sedentary baseline

  if (profile.exercisesRegularly || days > 0) {
    if (days <= 2) {
      multiplier = 1.375;
    } else if (days <= 4) {
      multiplier = 1.55;
    } else if (days <= 5) {
      multiplier = 1.725;
    } else {
      multiplier = 1.9;
    }
  }

  const schedule = profile.exerciseSchedule?.toLowerCase() ?? "";
  if (schedule.includes("doble") || schedule.includes("2")) {
    multiplier += 0.05;
  }

  const sport = profile.sportType?.toLowerCase() ?? "";
  if (HIGH_DEMAND_SPORT_KEYWORDS.some(keyword => sport.includes(keyword))) {
    multiplier += 0.05;
  }

  // Clamp multiplier to reasonable range
  return Math.min(2.2, Math.max(1.1, parseFloat(multiplier.toFixed(2))));
}

function calculateBMR(
  weight: number | null,
  height: number | null,
  age: number | null,
  gender: string | null,
  leanMass: number | null,
): number | null {
  if (leanMass && leanMass > 0) {
    // Katch-McArdle formula
    return 370 + 21.6 * leanMass;
  }
  if (weight && height && age !== null && age >= 0) {
    // Mifflin-St Jeor
    const s = gender === "F" ? -161 : gender === "M" ? 5 : -78; // Neutral value for Other/undefined
    return (10 * weight) + (6.25 * height) - (5 * age) + s;
  }
  return null;
}

function roundTo(value: number, digits = 2): string {
  return value.toFixed(digits);
}

/**
 * Calcula el BMI (Body Mass Index) a partir de peso y altura
 * @param weight Peso en kg
 * @param height Altura en cm
 * @returns BMI calculado y su clasificación
 */
export function calculateBMI(weight: string | null, height: string | null): BMIResult | null {
  if (!weight || !height) {
    return null;
  }

  const weightNum = parseFloat(weight);
  const heightNum = parseFloat(height);

  if (isNaN(weightNum) || isNaN(heightNum) || heightNum === 0) {
    return null;
  }

  // BMI = peso (kg) / (altura (m))^2
  const heightMeters = heightNum / 100;
  const bmi = weightNum / (heightMeters * heightMeters);

  let classification: string;
  if (bmi < 18.5) {
    classification = 'Bajo peso';
  } else if (bmi < 25) {
    classification = 'Peso normal';
  } else if (bmi < 30) {
    classification = 'Sobrepeso';
  } else if (bmi < 35) {
    classification = 'Obesidad tipo I';
  } else if (bmi < 40) {
    classification = 'Obesidad tipo II';
  } else {
    classification = 'Obesidad tipo III';
  }

  return {
    bmi: bmi.toFixed(2),
    classification
  };
}

/**
 * Calcula la suma de 4 pliegues cutáneos para Durnin & Womersley
 * Triceps + Biceps + Subscapular + Suprailiac
 * @param skinfolds Objeto con los 4 pliegues cutáneos específicos en mm
 */
export function calculateSum4Skinfolds(skinfolds: {
  triceps?: string | null;
  biceps?: string | null;
  subscapular?: string | null;
  suprailiac?: string | null;
}): string | null {
  const values = [
    skinfolds.triceps,
    skinfolds.biceps,
    skinfolds.subscapular,
    skinfolds.suprailiac
  ];

  // Filtrar valores nulos y convertir a números
  const numericValues = values
    .filter(v => v !== null && v !== undefined)
    .map(v => parseFloat(v!))
    .filter(v => !isNaN(v));

  // Si no tenemos los 4 valores requeridos, no calculamos
  if (numericValues.length < 4) {
    return null;
  }

  const sum = numericValues.reduce((acc, val) => acc + val, 0);
  return sum.toFixed(2);
}

/**
 * Calcula la suma de 6 pliegues cutáneos (ISAK 2)
 * Triceps + Subscapular + Supraspinal + Abdominal + Thigh + Calf
 * @param skinfolds Objeto con los pliegues cutáneos en mm
 */
export function calculateSum6Skinfolds(skinfolds: {
  triceps?: string | null;
  subscapular?: string | null;
  supraspinal?: string | null;
  abdominal?: string | null;
  thighSkinfold?: string | null;
  calfSkinfold?: string | null;
}): string | null {
  const values = [
    skinfolds.triceps,
    skinfolds.subscapular,
    skinfolds.supraspinal,
    skinfolds.abdominal,
    skinfolds.thighSkinfold,
    skinfolds.calfSkinfold
  ];

  // Filtrar valores nulos y convertir a números
  const numericValues = values
    .filter(v => v !== null && v !== undefined)
    .map(v => parseFloat(v!))
    .filter(v => !isNaN(v));

  // Si no tenemos los 6 valores, no calculamos
  if (numericValues.length < 6) {
    return null;
  }

  const sum = numericValues.reduce((acc, val) => acc + val, 0);
  return sum.toFixed(2);
}

/**
 * Calcula el somatotipo de Heath-Carter (simplificado)
 * Este es un cálculo básico - para precisión completa se requieren fórmulas más complejas
 */
export function calculateSomatotype(data: {
  weight?: string | null;
  height?: string | null;
  sum6Skinfolds?: string | null;
  // Agregar más campos según se requiera para cálculos avanzados
}): {
  endomorphy: string | null;
  mesomorphy: string | null;
  ectomorphy: string | null;
} {
  // Implementación básica - para producción se debe usar fórmulas completas de Heath-Carter
  // Por ahora retornamos null, se implementará cuando se tenga todos los datos necesarios
  return {
    endomorphy: null,
    mesomorphy: null,
    ectomorphy: null
  };
}

/**
 * Calcula el porcentaje de grasa corporal usando fórmula de Durnin & Womersley
 * Esta fórmula usa la suma de 4 pliegues específicos (triceps, biceps, subscapular, suprailiac)
 * con constantes específicas por edad y género
 * @param sum4Skinfolds Suma de 4 pliegues en mm (Durnin & Womersley)
 * @param age Edad en años
 * @param gender Género ('M' o 'F')
 */
export function calculateBodyFatPercentage(
  sum4Skinfolds: string | null,
  age: number | null,
  gender: string | null
): string | null {
  if (!sum4Skinfolds || !age || !gender) {
    return null;
  }

  const sum = parseFloat(sum4Skinfolds);
  if (isNaN(sum) || sum <= 0) {
    return null;
  }

  // Constantes de Durnin & Womersley por edad y género
  let c: number; // Constante C
  let m: number; // Constante M

  if (gender === 'M') {
    // Hombres - rangos de edad específicos
    if (age < 17) {
      c = 1.1533;
      m = 0.0643;
    } else if (age <= 19) {
      c = 1.1620;
      m = 0.0630;
    } else if (age <= 29) {
      c = 1.1631;
      m = 0.0632;
    } else if (age <= 39) {
      c = 1.1422;
      m = 0.0544;
    } else if (age <= 49) {
      c = 1.1620;
      m = 0.0700;
    } else {
      // 50+ años
      c = 1.1715;
      m = 0.0779;
    }
  } else if (gender === 'F') {
    // Mujeres - rangos de edad específicos
    if (age < 17) {
      c = 1.1369;
      m = 0.0598;
    } else if (age <= 19) {
      c = 1.1549;
      m = 0.0678;
    } else if (age <= 29) {
      c = 1.1599;
      m = 0.0717;
    } else if (age <= 39) {
      c = 1.1423;
      m = 0.0632;
    } else if (age <= 49) {
      c = 1.1333;
      m = 0.0612;
    } else {
      // 50+ años
      c = 1.1339;
      m = 0.0645;
    }
  } else {
    // Para género 'Other', usar promedio de rangos adultos jóvenes
    c = 1.1615;
    m = 0.0675;
  }

  // Calcular densidad corporal: D = C - M * log10(suma de pliegues)
  const densidad = c - m * Math.log10(sum);

  // Fórmula de Siri: % grasa = ((4.95 / densidad) - 4.5) * 100
  const bodyFat = ((4.95 / densidad) - 4.5) * 100;

  // Validar que el resultado esté en un rango razonable (3% - 50%)
  if (bodyFat < 3 || bodyFat > 50) {
    return null;
  }

  return bodyFat.toFixed(2);
}

/**
 * Calcula la masa magra (lean body mass)
 * @param weight Peso total en kg
 * @param bodyFatPercentage Porcentaje de grasa corporal
 */
export function calculateLeanMass(
  weight: string | null,
  bodyFatPercentage: string | null
): string | null {
  if (!weight || !bodyFatPercentage) {
    return null;
  }

  const weightNum = parseFloat(weight);
  const fatPercent = parseFloat(bodyFatPercentage);

  if (isNaN(weightNum) || isNaN(fatPercent)) {
    return null;
  }

  const leanMass = weightNum * (1 - fatPercent / 100);
  return leanMass.toFixed(2);
}

/**
 * Calcula el ratio cintura/cadera
 * @param waist Perímetro de cintura en cm
 * @param hip Perímetro de cadera en cm
 */
export function calculateWaistHipRatio(
  waist: string | null,
  hip: string | null
): string | null {
  if (!waist || !hip) {
    return null;
  }

  const waistNum = parseFloat(waist);
  const hipNum = parseFloat(hip);

  if (isNaN(waistNum) || isNaN(hipNum) || hipNum === 0) {
    return null;
  }

  const ratio = waistNum / hipNum;
  return ratio.toFixed(3);
}

/**
 * Interfaz para el resultado completo de cálculos de medición
 */
export interface BMIResult {
  bmi: string; // decimal as string
  classification: string;
}

/**
 * Calcula todos los indicadores antropométricos para una medición
 * @param measurementData Datos de la medición
 * @param options Opciones para cálculos adicionales (edad, género, objetivo, perfil de actividad)
 * @returns Objeto con todos los cálculos
 */
export function calculateAll(
  measurementData: {
    weight?: string | null;
    height?: string | null;
    triceps?: string | null;
    biceps?: string | null;
    subscapular?: string | null;
    suprailiac?: string | null;
    supraspinal?: string | null;
    abdominal?: string | null;
    thighSkinfold?: string | null;
    calfSkinfold?: string | null;
    waistCircumference?: string | null;
    hipCircumference?: string | null;
  },
  options?: {
    age?: number | null;
    gender?: string | null;
    objective?: string | null;
    activityProfile?: ActivityProfile;
    preferences?: NutritionPreferences;
  }
): MeasurementCalculationResult {
  const result: MeasurementCalculationResult = {};

  // 1. Calcular BMI
  const bmiResult = calculateBMI(measurementData.weight ?? null, measurementData.height ?? null);
  if (bmiResult) {
    result.bmi = bmiResult.bmi;
  }

  // 2. Calcular suma de 4 pliegues (Durnin & Womersley)
  const sum4 = calculateSum4Skinfolds({
    triceps: measurementData.triceps,
    biceps: measurementData.biceps,
    subscapular: measurementData.subscapular,
    suprailiac: measurementData.suprailiac
  });
  if (sum4) {
    result.sumOf4Skinfolds = sum4;
  }

  // 3. Calcular suma de 6 pliegues (ISAK 2)
  const sum6 = calculateSum6Skinfolds({
    triceps: measurementData.triceps,
    subscapular: measurementData.subscapular,
    supraspinal: measurementData.supraspinal,
    abdominal: measurementData.abdominal,
    thighSkinfold: measurementData.thighSkinfold,
    calfSkinfold: measurementData.calfSkinfold
  });
  if (sum6) {
    result.sumOf6Skinfolds = sum6;
  }

  // 4. Calcular porcentaje de grasa corporal (usando sum4 - Durnin & Womersley)
  const age = options?.age ?? null;
  const gender = options?.gender ?? null;

  if (sum4 && age !== null && gender) {
    const bodyFat = calculateBodyFatPercentage(sum4, age, gender);
    if (bodyFat) {
      result.bodyFatPercentage = bodyFat;

      // 5. Calcular masa magra
      const leanMass = calculateLeanMass(measurementData.weight ?? null, bodyFat);
      if (leanMass) {
        result.leanMass = leanMass;
      }
    }
  }

  // 6. Calcular ratio cintura/cadera
  const waistHip = calculateWaistHipRatio(
    measurementData.waistCircumference ?? null,
    measurementData.hipCircumference ?? null
  );
  if (waistHip) {
    result.waistHipRatio = waistHip;
  }

  // 7. Calcular somatotipo (básico por ahora)
  const somatotype = calculateSomatotype({
    weight: measurementData.weight,
    height: measurementData.height,
    sum6Skinfolds: sum6
  });

  if (somatotype.endomorphy) result.endomorphy = somatotype.endomorphy;
  if (somatotype.mesomorphy) result.mesomorphy = somatotype.mesomorphy;
  if (somatotype.ectomorphy) result.ectomorphy = somatotype.ectomorphy;

  // 8. Calcular objetivos nutricionales automáticos
  const weightNum = measurementData.weight ? parseFloat(measurementData.weight) : null;
  const heightNum = measurementData.height ? parseFloat(measurementData.height) : null;
  const leanMassNum = result.leanMass ? parseFloat(result.leanMass) : null;

  const basalMetabolicRate = calculateBMR(weightNum, heightNum, age, gender, leanMassNum);
  const activityMultiplier = inferActivityMultiplier(options?.activityProfile ?? {});

  if (basalMetabolicRate) {
    result.basalMetabolicRate = roundTo(basalMetabolicRate);
    result.activityMultiplier = roundTo(activityMultiplier, 2);

    const maintenanceCalories = basalMetabolicRate * activityMultiplier;
    const objective = normalizeObjective(options?.objective ?? null);
    let targetFactor = 1;
    let objectiveLabel = "Mantenimiento";

    if (objective === "loss") {
      targetFactor = 0.85;
      objectiveLabel = "Déficit moderado (-15%)";
    } else if (objective === "gain") {
      targetFactor = 1.1;
      objectiveLabel = "Superávit moderado (+10%)";
    }

    const targetCalories = Math.max(900, Math.round(maintenanceCalories * targetFactor));
    result.maintenanceCalories = Math.round(maintenanceCalories);
    result.targetCalories = targetCalories;
    result.calorieObjective = objectiveLabel;

    // Cálculo de macros
    const prefs: NutritionPreferences = options?.preferences ?? {
      proteinMultiplierLoss: 1.8,
      proteinMultiplierMaintain: 1.8,
      proteinMultiplierGain: 2,
      fatPerKg: 0.9,
    };

    const effectiveWeight = leanMassNum && leanMassNum > 0 ? leanMassNum : weightNum;

    let proteinMultiplier = prefs.proteinMultiplierMaintain;
    if (objective === "loss") {
      proteinMultiplier = prefs.proteinMultiplierLoss;
    } else if (objective === "gain") {
      proteinMultiplier = prefs.proteinMultiplierGain;
    }

    const proteinPerDay = effectiveWeight ? effectiveWeight * proteinMultiplier : null;
    const fatsPerDay = weightNum ? Math.max(0.8, weightNum * prefs.fatPerKg) : null;
    const caloriesFromProtein = proteinPerDay ? proteinPerDay * 4 : 0;
    const caloriesFromFat = fatsPerDay ? fatsPerDay * 9 : 0;
    const remainingCalories = Math.max(0, targetCalories - (caloriesFromProtein + caloriesFromFat));
    const carbsPerDay = remainingCalories > 0 ? remainingCalories / 4 : 0;

    if (proteinPerDay) {
      result.proteinPerDay = roundTo(proteinPerDay);
    }
    if (carbsPerDay) {
      result.carbsPerDay = roundTo(carbsPerDay);
    }
    if (fatsPerDay) {
      result.fatsPerDay = roundTo(fatsPerDay);
    }

    const perMealPlan: Record<string, MealMacroTarget> = {};
    Object.entries(MEAL_DISTRIBUTION).forEach(([slot, ratio]) => {
      perMealPlan[slot] = {
        calories: Math.round(targetCalories * ratio),
        protein: proteinPerDay ? parseFloat((proteinPerDay * ratio).toFixed(1)) : null,
        carbs: carbsPerDay ? parseFloat((carbsPerDay * ratio).toFixed(1)) : null,
        fats: fatsPerDay ? parseFloat((fatsPerDay * ratio).toFixed(1)) : null,
      };
    });

    result.perMealPlan = perMealPlan;
  }

  return result;
}
