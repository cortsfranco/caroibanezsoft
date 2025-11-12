/**
 * Servicio para cálculos antropométricos según ISAK 2
 * D. Kerr 1988 - 5 Component Fractionation Model
 */

export interface BMIResult {
  bmi: string; // decimal as string
  classification: string;
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
 * Calcula la suma de 6 pliegues cutáneos (ISAK 2)
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
 * Interfaz para el resultado completo de cálculos de medición
 */
export interface MeasurementCalculationResult {
  bmi?: string;
  sumOf6Skinfolds?: string;
  endomorphy?: string;
  mesomorphy?: string;
  ectomorphy?: string;
  // Agregar más campos según se implementen
}

/**
 * Calcula todos los indicadores antropométricos para una medición
 * @param measurementData Datos de la medición
 * @returns Objeto con todos los cálculos
 */
export function calculateAll(measurementData: {
  weight?: string | null;
  height?: string | null;
  triceps?: string | null;
  subscapular?: string | null;
  supraspinal?: string | null;
  abdominal?: string | null;
  thighSkinfold?: string | null;
  calfSkinfold?: string | null;
}): MeasurementCalculationResult {
  const result: MeasurementCalculationResult = {};

  // 1. Calcular BMI
  const bmiResult = calculateBMI(measurementData.weight ?? null, measurementData.height ?? null);
  if (bmiResult) {
    result.bmi = bmiResult.bmi;
  }

  // 2. Calcular suma de 6 pliegues
  const sum6 = calculateSum6Skinfolds(measurementData);
  if (sum6) {
    result.sumOf6Skinfolds = sum6;
  }

  // 3. Calcular somatotipo (básico por ahora)
  const somatotype = calculateSomatotype({
    weight: measurementData.weight,
    height: measurementData.height,
    sum6Skinfolds: sum6
  });
  
  if (somatotype.endomorphy) result.endomorphy = somatotype.endomorphy;
  if (somatotype.mesomorphy) result.mesomorphy = somatotype.mesomorphy;
  if (somatotype.ectomorphy) result.ectomorphy = somatotype.ectomorphy;

  return result;
}
