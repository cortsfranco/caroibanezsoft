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
export interface MeasurementCalculationResult {
  bmi?: string;
  sumOf4Skinfolds?: string; // Durnin & Womersley (4 pliegues)
  sumOf6Skinfolds?: string; // ISAK 2 (6 pliegues)
  bodyFatPercentage?: string; // Basado en sum4
  leanMass?: string;
  waistHipRatio?: string;
  endomorphy?: string;
  mesomorphy?: string;
  ectomorphy?: string;
}

/**
 * Calcula todos los indicadores antropométricos para una medición
 * @param measurementData Datos de la medición
 * @param patientAge Edad del paciente (para % grasa)
 * @param patientGender Género del paciente ('M', 'F', o 'Other')
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
  patientAge?: number | null,
  patientGender?: string | null
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
  if (sum4 && patientAge && patientGender) {
    const bodyFat = calculateBodyFatPercentage(sum4, patientAge, patientGender);
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

  return result;
}
