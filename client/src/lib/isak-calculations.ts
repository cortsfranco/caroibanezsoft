/**
 * ISAK 2 - Fraccionamiento de 5 Componentes (D. Kerr, 1988)
 * 
 * Este servicio implementa las fórmulas del método ISAK 2 para el cálculo
 * del fraccionamiento corporal en 5 componentes según D. Kerr (1988).
 */

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
 * Nota: Esta es una implementación simplificada. Los valores de media y SD
 * deberían venir de tablas de referencia ISAK según edad, sexo y población.
 */
export function calculateZScore(value: number, mean: number, sd: number): number {
  return (value - mean) / sd;
}
