/**
 * ISAK 2 - Fraccionamiento de 5 Componentes (D. Kerr, 1988)
 * 
 * Este servicio implementa las fórmulas del método ISAK 2 para el cálculo
 * del fraccionamiento corporal en 5 componentes según D. Kerr (1988).
 * 
 * Incluye cálculos de:
 * - %ETM (Error Técnico de Medición) según estándares ISAK
 * - Valor Ajustado (corrección por compresibilidad y calibración)
 * - Score-Z (comparación con población de referencia)
 */

/**
 * Tabla de %ETM (Error Técnico de Medición) según ISAK
 * Valores típicos para antropometristas nivel 2
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

/**
 * Factor de corrección para valores ajustados
 * Considera compresibilidad de tejidos y calibración
 */
const ADJUSTMENT_FACTOR = 0.935; // Factor estándar para ajustes antropométricos

/**
 * Tablas de referencia para Score-Z (valores poblacionales de referencia)
 * Estos son valores aproximados para atletas masculinos edad 25-35
 * En producción deberían venir de tablas ISAK completas por edad/sexo/deporte
 */
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
  // Datos básicos
  weight: number; // kg
  height: number; // cm
  seatedHeight?: number; // cm
  
  // Pliegues cutáneos (mm)
  triceps: number;
  subscapular: number;
  supraspinal: number;
  abdominal: number;
  thighSkinfold: number;
  calfSkinfold: number;
  
  // Perímetros (cm)
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
  
  // Diámetros (cm)
  biacromial?: number;
  thoraxTransverse?: number;
  thoraxAnteroposterior?: number;
  biiliocristideo?: number;
  humeral: number;
  femoral: number;
}

export interface BodyCompositionResult {
  // IMC
  bmi: number;
  
  // Fraccionamiento 5 componentes (kg)
  skinMassKg: number;
  adiposeMassKg: number;
  muscleMassKg: number;
  boneMassKg: number;
  residualMassKg: number;
  
  // Fraccionamiento 5 componentes (%)
  skinMassPercent: number;
  adiposeMassPercent: number;
  muscleMassPercent: number;
  boneMassPercent: number;
  residualMassPercent: number;
  
  // Suma de pliegues
  sumOf6Skinfolds: number;
  
  // Índices
  muscleToBoneratio: number; // Índice músculo/óseo
  adiposeToMuscleRatio: number; // Índice adiposo/muscular
  
  // Peso estructurado
  structuredWeight: number;
  weightDifference: number; // % diferencia peso estructurado - peso bruto
}

/**
 * Calcula el IMC (Índice de Masa Corporal)
 */
export function calculateBMI(weight: number, height: number): number {
  const heightM = height / 100;
  return weight / (heightM * heightM);
}

/**
 * Calcula la suma de 6 pliegues cutáneos
 */
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

/**
 * Calcula la masa de la piel (D. Kerr, 1988)
 * Fórmula: Masa Piel (kg) = Superficie corporal × 2.0 × 1.05
 * Superficie corporal (m²) = (Peso^0.425 × Talla^0.725) × 0.007184
 */
export function calculateSkinMass(weight: number, height: number): number {
  const heightM = height / 100;
  const bodySurface = Math.pow(weight, 0.425) * Math.pow(heightM * 100, 0.725) * 0.007184;
  return bodySurface * 2.0 * 1.05; // kg
}

/**
 * Calcula la masa adiposa (D. Kerr, 1988)
 * Fórmula simplificada para deportistas
 */
export function calculateAdiposeMass(data: MeasurementData): number {
  const sumOf6 = calculateSumOf6Skinfolds(data);
  // Fórmula de Yuhasz modificada para ISAK
  const density = 1.0982 - 0.000815 * sumOf6;
  const fatPercent = (495 / density) - 450;
  return (data.weight * fatPercent) / 100;
}

/**
 * Calcula la masa ósea (Rocha, 1975 - adaptado por D. Kerr)
 * Fórmula: 3.02 × (Talla² × Diámetro biestiloideo × Diámetro bicondilar femoral × 400)^0.712
 */
export function calculateBoneMass(data: MeasurementData): number {
  const heightM = data.height / 100;
  const humeral = data.humeral / 100; // Convertir a metros
  const femoral = data.femoral / 100;
  
  return 3.02 * Math.pow(
    heightM * heightM * humeral * femoral * 400,
    0.712
  );
}

/**
 * Calcula la masa residual (Würch, 1974)
 * Hombres: 24.1% del peso corporal
 * Mujeres: 20.9% del peso corporal
 * Nota: Asumimos hombres por defecto, se debería parametrizar
 */
export function calculateResidualMass(weight: number, gender: 'male' | 'female' = 'male'): number {
  const percent = gender === 'male' ? 24.1 : 20.9;
  return (weight * percent) / 100;
}

/**
 * Calcula la masa muscular (por diferencia)
 * Masa Muscular = Peso Total - (Masa Piel + Masa Adiposa + Masa Ósea + Masa Residual)
 */
export function calculateMuscleMass(
  weight: number,
  skinMass: number,
  adiposeMass: number,
  boneMass: number,
  residualMass: number
): number {
  return weight - (skinMass + adiposeMass + boneMass + residualMass);
}

/**
 * Calcula el fraccionamiento completo de 5 componentes
 */
export function calculateBodyComposition(data: MeasurementData, gender: 'male' | 'female' = 'male'): BodyCompositionResult {
  // Cálculo de masas en kg
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
  
  // Peso estructurado (suma de todos los componentes)
  const structuredWeight = skinMassKg + adiposeMassKg + muscleMassKg + boneMassKg + residualMassKg;
  
  // Cálculo de porcentajes
  const skinMassPercent = (skinMassKg / structuredWeight) * 100;
  const adiposeMassPercent = (adiposeMassKg / structuredWeight) * 100;
  const muscleMassPercent = (muscleMassKg / structuredWeight) * 100;
  const boneMassPercent = (boneMassKg / structuredWeight) * 100;
  const residualMassPercent = (residualMassKg / structuredWeight) * 100;
  
  // Cálculos adicionales
  const bmi = calculateBMI(data.weight, data.height);
  const sumOf6Skinfolds = calculateSumOf6Skinfolds(data);
  const muscleToBoneratio = muscleMassKg / boneMassKg;
  const adiposeToMuscleRatio = adiposeMassKg / muscleMassKg;
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
    muscleToBoneratio,
    adiposeToMuscleRatio,
    structuredWeight,
    weightDifference,
  };
}

/**
 * Calcula Score-Z para una medida (comparación con población de referencia)
 */
export function calculateZScore(value: number, mean: number, sd: number): number {
  if (sd === 0) return 0;
  return (value - mean) / sd;
}

/**
 * Calcula el valor ajustado de una medición considerando compresibilidad
 * Para pliegues y perímetros principalmente
 */
export function calculateAdjustedValue(rawValue: number, measureType: 'skinfold' | 'perimeter' | 'diameter' | 'basic'): number {
  if (measureType === 'skinfold') {
    // Los pliegues tienen mayor factor de ajuste por compresibilidad
    return rawValue * ADJUSTMENT_FACTOR;
  } else if (measureType === 'perimeter') {
    // Perímetros se ajustan considerando la cinta métrica
    return rawValue * 0.935;
  } else if (measureType === 'diameter') {
    // Diámetros se ajustan por calibración del calibre
    return rawValue * 0.935;
  }
  // Medidas básicas (peso, talla) no requieren ajuste significativo
  return rawValue;
}

/**
 * Obtiene el %ETM para un tipo de medición
 */
export function getETM(measurementKey: keyof typeof ETM_VALUES): number {
  return ETM_VALUES[measurementKey] || 0;
}

/**
 * Obtiene valores de referencia para Score-Z
 */
export function getReferenceValues(measurementKey: keyof typeof REFERENCE_VALUES): { mean: number; sd: number } {
  return REFERENCE_VALUES[measurementKey] || { mean: 0, sd: 1 };
}
