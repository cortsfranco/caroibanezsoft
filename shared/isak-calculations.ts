/**
 * ISAK 2 - Fraccionamiento de 5 Componentes (D. Kerr, 1988)
 * Fórmulas y utilidades comunes para cálculos antropométricos.
 */

export const ETM_VALUES: Record<string, number> = {
  weight: 0.05,
  height: 0.11,
  seatedHeight: 0.23,
  biacromial: 0.39,
  thoraxTransverse: 0.61,
  thoraxAnteroposterior: 0.68,
  biiliocristideo: 0.64,
  humeral: 0.40,
  femoral: 0.30,
  head: 0.16,
  relaxedArm: 0.63,
  flexedArm: 0.69,
  forearm: 0.48,
  thoraxCirc: 0.35,
  waist: 0.54,
  hip: 0.21,
  thighSuperior: 0.32,
  thighMedial: 0.33,
  calf: 0.28,
  triceps: 1.55,
  subscapular: 1.59,
  supraspinal: 2.19,
  abdominal: 1.69,
  thighSkinfold: 1.54,
  calfSkinfold: 1.62,
};

const ADJUSTMENT_FACTOR = 0.935;

export const REFERENCE_VALUES = {
  weight: { mean: 74.6, sd: 9.8 },
  height: { mean: 179.5, sd: 7.2 },
  seatedHeight: { mean: 93.5, sd: 3.8 },
  biacromial: { mean: 40.8, sd: 2.1 },
  thoraxTransverse: { mean: 28.5, sd: 1.9 },
  thoraxAnteroposterior: { mean: 19.3, sd: 1.5 },
  biiliocristideo: { mean: 30.8, sd: 2.2 },
  humeral: { mean: 7.0, sd: 0.4 },
  femoral: { mean: 9.9, sd: 0.5 },
  head: { mean: 58.2, sd: 1.7 },
  relaxedArm: { mean: 29.5, sd: 2.4 },
  flexedArm: { mean: 31.8, sd: 2.5 },
  forearm: { mean: 27.1, sd: 1.5 },
  thoraxCirc: { mean: 94.2, sd: 6.8 },
  waist: { mean: 76.9, sd: 6.4 },
  hip: { mean: 100.8, sd: 5.2 },
  thighSuperior: { mean: 59.5, sd: 4.1 },
  thighMedial: { mean: 53.2, sd: 3.7 },
  calf: { mean: 37.6, sd: 2.2 },
  triceps: { mean: 9.8, sd: 4.2 },
  subscapular: { mean: 11.2, sd: 4.5 },
  supraspinal: { mean: 9.8, sd: 4.2 },
  abdominal: { mean: 17.5, sd: 6.8 },
  thighSkinfold: { mean: 14.8, sd: 5.9 },
  calfSkinfold: { mean: 11.5, sd: 4.5 },
};

export interface MeasurementData {
  weight: number;
  height: number;
  seatedHeight?: number;
  triceps: number;
  subscapular: number;
  supraspinal: number;
  abdominal: number;
  thighSkinfold: number;
  calfSkinfold: number;
  head?: number;
  relaxedArm: number;
  flexedArm: number;
  forearm: number;
  thoraxCirc: number;
  waist: number;
  hip: number;
  thighSuperior?: number;
  thighMedial: number;
  calf: number;
  biacromial?: number;
  thoraxTransverse?: number;
  thoraxAnteroposterior?: number;
  biiliocristideo?: number;
  humeral: number;
  femoral: number;
}

export interface BodyCompositionResult {
  bmi: number;
  skinMassKg: number;
  adiposeMassKg: number;
  muscleMassKg: number;
  boneMassKg: number;
  residualMassKg: number;
  skinMassPercent: number;
  adiposeMassPercent: number;
  muscleMassPercent: number;
  boneMassPercent: number;
  residualMassPercent: number;
  sumOf6Skinfolds: number;
  muscleToBoneRatio: number;
  adiposeToMuscleRatio: number;
  structuredWeight: number;
  weightDifference: number;
}

export function calculateBMI(weight: number, height: number): number {
  const heightM = height / 100;
  return weight / (heightM * heightM);
}

export function calculateSumOf6Skinfolds(data: MeasurementData): number {
  return (
    data.triceps +
    data.subscapular +
    data.supraspinal +
    data.abdominal +
    data.thighSkinfold +
    data.calfSkinfold
  );
}

export function calculateSkinMass(weight: number, height: number): number {
  const heightM = height / 100;
  const bodySurface = Math.pow(weight, 0.425) * Math.pow(heightM * 100, 0.725) * 0.007184;
  return bodySurface * 2.0 * 1.05;
}

export function calculateAdiposeMass(data: MeasurementData): number {
  const sumOf6 = calculateSumOf6Skinfolds(data);
  const density = 1.0982 - 0.000815 * sumOf6;
  const fatPercent = (495 / density) - 450;
  return (data.weight * fatPercent) / 100;
}

export function calculateBoneMass(data: MeasurementData): number {
  const heightM = data.height / 100;
  const humeral = data.humeral / 100;
  const femoral = data.femoral / 100;

  return 3.02 * Math.pow(
    heightM * heightM * humeral * femoral * 400,
    0.712
  );
}

export function calculateResidualMass(weight: number, gender: 'male' | 'female' = 'male'): number {
  const percent = gender === 'male' ? 24.1 : 20.9;
  return (weight * percent) / 100;
}

export function calculateMuscleMass(
  weight: number,
  skinMass: number,
  adiposeMass: number,
  boneMass: number,
  residualMass: number
): number {
  return weight - (skinMass + adiposeMass + boneMass + residualMass);
}

export function calculateBodyComposition(
  data: MeasurementData,
  gender: 'male' | 'female' = 'male'
): BodyCompositionResult {
  const skinMassKg = calculateSkinMass(data.weight, data.height);
  const adiposeMassKg = calculateAdiposeMass(data);
  const boneMassKg = calculateBoneMass(data);
  const residualMassKg = calculateResidualMass(data.weight, gender);
  const muscleMassKg = calculateMuscleMass(
    data.weight,
    skinMassKg,
    adiposeMassKg,
    boneMassKg,
    residualMassKg
  );

  const structuredWeight = skinMassKg + adiposeMassKg + muscleMassKg + boneMassKg + residualMassKg;

  const skinMassPercent = (skinMassKg / structuredWeight) * 100;
  const adiposeMassPercent = (adiposeMassKg / structuredWeight) * 100;
  const muscleMassPercent = (muscleMassKg / structuredWeight) * 100;
  const boneMassPercent = (boneMassKg / structuredWeight) * 100;
  const residualMassPercent = (residualMassKg / structuredWeight) * 100;

  const bmi = calculateBMI(data.weight, data.height);
  const sumOf6Skinfolds = calculateSumOf6Skinfolds(data);
  const muscleToBoneRatio = boneMassKg > 0 ? muscleMassKg / boneMassKg : 0;
  const adiposeToMuscleRatio = muscleMassKg > 0 ? adiposeMassKg / muscleMassKg : 0;
  const weightDifference = ((structuredWeight - data.weight) / data.weight) * 100;

  return {
    bmi,
    skinMassKg,
    adiposeMassKg,
    muscleMassKg,
    boneMassKg,
    residualMassKg,
    skinMassPercent,
    adiposeMassPercent,
    muscleMassPercent,
    boneMassPercent,
    residualMassPercent,
    sumOf6Skinfolds,
    muscleToBoneRatio,
    adiposeToMuscleRatio,
    structuredWeight,
    weightDifference,
  };
}

export function calculateZScore(value: number, mean: number, sd: number): number {
  if (sd === 0) return 0;
  return (value - mean) / sd;
}

export function calculateAdjustedValue(
  rawValue: number,
  measureType: 'skinfold' | 'perimeter' | 'diameter' | 'basic'
): number {
  if (measureType === 'skinfold') {
    return rawValue * ADJUSTMENT_FACTOR;
  }
  if (measureType === 'perimeter') {
    return rawValue * ADJUSTMENT_FACTOR;
  }
  if (measureType === 'diameter') {
    return rawValue * ADJUSTMENT_FACTOR;
  }
  return rawValue;
}

export function getETM(measurementKey: keyof typeof ETM_VALUES): number {
  return ETM_VALUES[measurementKey] || 0;
}

export function getReferenceValues(
  measurementKey: keyof typeof REFERENCE_VALUES
): { mean: number; sd: number } {
  return REFERENCE_VALUES[measurementKey] || { mean: 0, sd: 1 };
}

export function getBMIClassification(bmi: number): string {
  if (bmi < 18.5) {
    return "Bajo peso";
  }
  if (bmi < 25) {
    return "Normal";
  }
  if (bmi < 30) {
    return "Sobrepeso";
  }
  if (bmi < 35) {
    return "Obesidad grado I";
  }
  if (bmi < 40) {
    return "Obesidad grado II";
  }
  return "Obesidad grado III";
}

export function formatDifference(current: number | string | null | undefined, previous: number | string | null | undefined): string {
  if (current === null || current === undefined || previous === null || previous === undefined) {
    return "";
  }
  const curr = parseFloat(String(current));
  const prev = parseFloat(String(previous));
  if (!Number.isFinite(curr) || !Number.isFinite(prev)) {
    return "";
  }
  const difference = curr - prev;
  return difference.toFixed(2);
}

export function toNumberOrNull(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const num = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(num) ? num : null;
}

export function formatNumber(value: number | string | null | undefined, decimals = 2): string {
  const num = toNumberOrNull(value);
  if (num === null) return "";
  return num.toFixed(decimals);
}
