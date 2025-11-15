import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Chart, registerables } from 'chart.js';
import { createCanvas } from 'canvas';
import { Patient, Measurement, MeasurementCalculation } from '@shared/schema';
import {
  calculateBodyComposition,
  type MeasurementData,
  calculateAdjustedValue,
  getETM,
  getReferenceValues,
  calculateZScore,
  formatDifference,
  formatNumber as sharedFormatNumber,
  toNumberOrNull,
  ETM_VALUES,
} from '@shared/isak-calculations';
import fs from 'fs/promises';
import path from 'path';

interface ReportData {
  patient: Patient;
  measurement: Measurement;
  previousMeasurement?: Measurement | null;
  measurementNumber: number;
  calculations?: MeasurementCalculation[] | null;
  annotations?: {
    summary?: string;
    recommendations?: string;
    notes?: string;
  };
}

interface BodyCompositionWithExtras {
  skinMassKg: number;
  skinMassPercent: number;
  adiposeMassKg: number;
  adiposeMassPercent: number;
  muscleMassKg: number;
  muscleMassPercent: number;
  boneMassKg: number;
  boneMassPercent: number;
  residualMassKg: number;
  residualMassPercent: number;
  sumOf6Skinfolds: number;
  muscleToBoneRatio: number;
  adiposeToMuscleRatio: number;
  structuredWeight: number;
  weightDifference: number;
}

const BRAND_COLORS = {
  header: { r: 30, g: 64, b: 175 },
  headerEnd: { r: 59, g: 130, b: 246 },
  text: { r: 15, g: 23, b: 42 },
  muted: { r: 100, g: 116, b: 139 },
  strip: { r: 241, g: 245, b: 249 },
};

function buildMeasurementData(measurement: Measurement): MeasurementData | null {
  const requiredCore = [measurement.weight, measurement.height, measurement.triceps, measurement.subscapular, measurement.supraspinal, measurement.abdominal, measurement.thighSkinfold, measurement.calfSkinfold, measurement.relaxedArm, measurement.flexedArm, measurement.forearm, measurement.thoraxCirc, measurement.waist, measurement.hip, measurement.thighMedial, measurement.calf, measurement.humeral, measurement.femoral];
  const hasAllCore = requiredCore.every((value) => toNumberOrNull(value) !== null);

  if (!hasAllCore) {
    return null;
  }

  return {
    weight: toNumberOrNull(measurement.weight) ?? 0,
    height: toNumberOrNull(measurement.height) ?? 0,
    seatedHeight: toNumberOrNull(measurement.seatedHeight ?? null) ?? undefined,
    triceps: toNumberOrNull(measurement.triceps) ?? 0,
    subscapular: toNumberOrNull(measurement.subscapular) ?? 0,
    supraspinal: toNumberOrNull(measurement.supraspinal) ?? 0,
    abdominal: toNumberOrNull(measurement.abdominal) ?? 0,
    thighSkinfold: toNumberOrNull(measurement.thighSkinfold) ?? 0,
    calfSkinfold: toNumberOrNull(measurement.calfSkinfold) ?? 0,
    head: toNumberOrNull(measurement.head ?? null) ?? undefined,
    relaxedArm: toNumberOrNull(measurement.relaxedArm) ?? 0,
    flexedArm: toNumberOrNull(measurement.flexedArm) ?? 0,
    forearm: toNumberOrNull(measurement.forearm) ?? 0,
    thoraxCirc: toNumberOrNull(measurement.thoraxCirc ?? null) ?? 0,
    waist: toNumberOrNull(measurement.waist) ?? 0,
    hip: toNumberOrNull(measurement.hip) ?? 0,
    thighSuperior: toNumberOrNull(measurement.thighSuperior ?? null) ?? undefined,
    thighMedial: toNumberOrNull(measurement.thighMedial) ?? 0,
    calf: toNumberOrNull(measurement.calf) ?? 0,
    biacromial: toNumberOrNull(measurement.biacromial ?? null) ?? undefined,
    thoraxTransverse: toNumberOrNull(measurement.thoraxTransverse ?? null) ?? undefined,
    thoraxAnteroposterior: toNumberOrNull(measurement.thoraxAnteroposterior ?? null) ?? undefined,
    biiliocristideo: toNumberOrNull(measurement.biiliocristideo ?? null) ?? undefined,
    humeral: toNumberOrNull(measurement.humeral) ?? 0,
    femoral: toNumberOrNull(measurement.femoral) ?? 0,
  };
}

function resolveBodyComposition(
  measurement: Measurement,
  gender: string | null,
): BodyCompositionWithExtras | null {
  const measurementData = buildMeasurementData(measurement);
  if (!measurementData) {
    return null;
  }

  const parsedGender = gender?.toUpperCase().startsWith('F') ? 'female' : 'male';
  const bc = calculateBodyComposition(measurementData, parsedGender);

  return {
    skinMassKg: bc.skinMassKg,
    skinMassPercent: bc.skinMassPercent,
    adiposeMassKg: bc.adiposeMassKg,
    adiposeMassPercent: bc.adiposeMassPercent,
    muscleMassKg: bc.muscleMassKg,
    muscleMassPercent: bc.muscleMassPercent,
    boneMassKg: bc.boneMassKg,
    boneMassPercent: bc.boneMassPercent,
    residualMassKg: bc.residualMassKg,
    residualMassPercent: bc.residualMassPercent,
    sumOf6Skinfolds: bc.sumOf6Skinfolds,
    muscleToBoneRatio: bc.muscleToBoneratio,
    adiposeToMuscleRatio: bc.adiposeToMuscleRatio,
    structuredWeight: bc.structuredWeight,
    weightDifference: bc.weightDifference,
  };
}

function formatValue(value: number | string | null | undefined, decimals = 2): string {
  const formatted = sharedFormatNumber(value, decimals);
  return formatted || '';
}

function getAdjusted(value: number | string | null | undefined, type: 'skinfold' | 'perimeter' | 'diameter' | 'basic'): string {
  if (value === null || value === undefined) return '';
  const num = parseFloat(String(value));
  if (!Number.isFinite(num)) return '';
  return calculateAdjustedValue(num, type).toFixed(2);
}

function getZScoreFormatted(value: number | string | null | undefined, key: keyof typeof getReferenceValues extends never ? never : keyof typeof ETM_VALUES | keyof typeof getReferenceValues): string {
  if (value === null || value === undefined) return '';
  const num = parseFloat(String(value));
  if (!Number.isFinite(num)) return '';
  const refKey = key as keyof typeof getReferenceValues;
  const ref = getReferenceValues(refKey as keyof typeof getReferenceValues);
  return calculateZScore(num, ref.mean, ref.sd).toFixed(2);
}

function calculateAge(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age + (monthDiff >= 0 ? monthDiff / 12 : (12 + monthDiff) / 12);
}

function renderMassPieChart(bodyComp: BodyCompositionWithExtras): string {
  const data = [
    bodyComp.adiposeMassPercent,
    bodyComp.muscleMassPercent,
    bodyComp.residualMassPercent,
    bodyComp.boneMassPercent,
    bodyComp.skinMassPercent,
  ];

  const configuration = {
    type: 'pie' as const,
    data: {
      labels: ['Masa Adiposa', 'Masa Muscular', 'Masa Residual', 'Masa Ósea', 'Masa de la Piel'],
      datasets: [
        {
          data,
          backgroundColor: ['#2563EB', '#0EA5E9', '#8B5CF6', '#EC4899', '#10B981'],
          borderColor: '#F8FAFC',
          borderWidth: 1.5,
        },
      ],
    },
    options: {
      plugins: {
        legend: {
          position: 'left' as const,
          labels: {
            font: { size: 11, family: 'Helvetica' },
            padding: 12,
          },
        },
      },
    },
  };

  return renderChartToBase64(configuration, PIE_CHART_SIZE);
}

function renderMassScatterChart(scores: { label: string; value: number }[]): string {
  const configuration = {
    type: 'scatter' as const,
    data: {
      datasets: [
        {
          label: 'Score Z',
          data: scores.map((score, index) => ({ x: Math.max(-4, Math.min(4, score.value)), y: index })),
          backgroundColor: '#2563EB',
          borderColor: '#1D4ED8',
          pointRadius: 6,
        },
      ],
    },
    options: {
      scales: {
        x: {
          min: -4,
          max: 4,
          grid: { color: 'rgba(148, 163, 184, 0.4)' },
          ticks: {
            stepSize: 1,
            font: { size: 10 },
          },
        },
        y: {
          min: -0.5,
          max: scores.length - 0.5,
          grid: { color: 'rgba(148, 163, 184, 0.25)' },
          ticks: {
            stepSize: 1,
            callback: (value: number) => scores[Math.round(value)]?.label ?? '',
            font: { size: 10 },
          },
        },
      },
      plugins: {
        legend: { display: false },
      },
    },
  };

  return renderChartToBase64(configuration, SCATTER_CHART_SIZE);
}

function renderScoreChart(labels: string[], scores: number[]): string {
  const configuration = {
    type: 'scatter' as const,
    data: {
      datasets: [
        {
          label: 'Score-Z',
          data: scores.map((value, index) => ({ x: Math.max(-4, Math.min(4, value)), y: index })),
          backgroundColor: '#EC4899',
          borderColor: '#DB2777',
          pointRadius: 6,
        },
      ],
    },
    options: {
      scales: {
        x: {
          min: -4,
          max: 4,
          grid: { color: 'rgba(148, 163, 184, 0.35)' },
          ticks: {
            stepSize: 1,
            font: { size: 10 },
          },
        },
        y: {
          min: -0.5,
          max: labels.length - 0.5,
          grid: { color: 'rgba(148, 163, 184, 0.2)' },
          ticks: {
            stepSize: 1,
            callback: (value: number) => labels[Math.round(value)] ?? '',
            font: { size: 10 },
          },
        },
      },
      plugins: {
        legend: { display: false },
      },
    },
  };

  return renderChartToBase64(configuration, SCORE_CHART_SIZE);
}

Chart.register(...registerables);

const PIE_CHART_SIZE = { width: 360, height: 260 };
const SCATTER_CHART_SIZE = { width: 360, height: 260 };
const SCORE_CHART_SIZE = { width: 360, height: 220 };

function renderChartToBase64(configuration: any, size: { width: number; height: number }): string {
  const canvas = createCanvas(size.width, size.height);
  const context = canvas.getContext('2d');
  const chart = new Chart(context, configuration);
  chart.draw();
  const buffer = canvas.toBuffer('image/png');
  chart.destroy();
  return buffer.toString('base64');
}

export async function generateMeasurementReport(data: ReportData): Promise<string> {
  const { patient, measurement, previousMeasurement, measurementNumber, calculations, annotations } = data;
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();

  const measurementDate = measurement.measurementDate
    ? new Date(measurement.measurementDate).toLocaleDateString('es-AR')
    : new Date().toLocaleDateString('es-AR');
  const age = calculateAge(patient.birthDate);
  const bodyComposition = resolveBodyComposition(measurement, patient.gender);

  doc.setFillColor(BRAND_COLORS.header.r, BRAND_COLORS.header.g, BRAND_COLORS.header.b);
  doc.rect(0, 0, pageWidth, 26, 'F');
  doc.setFillColor(BRAND_COLORS.headerEnd.r, BRAND_COLORS.headerEnd.g, BRAND_COLORS.headerEnd.b);
  doc.rect(0, 26, pageWidth, 14, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text('INFORME DE COMPOSICIÓN CORPORAL', pageWidth / 2, 12, { align: 'center' });
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Evaluación antropométrica profesional · Protocolo ISAK 2', pageWidth / 2, 19, { align: 'center' });
  doc.text(`Emitido ${new Date().toLocaleDateString('es-AR')}`, pageWidth / 2, 24, { align: 'center' });

  let y = 45;
  doc.setTextColor(BRAND_COLORS.text.r, BRAND_COLORS.text.g, BRAND_COLORS.text.b);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Datos del paciente', 20, y);

  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Nombre: ${patient.name}`, 20, y);
  doc.text(`Edad: ${age ? age.toFixed(2) : 'S/D'} años`, 120, y);
  y += 5;
  doc.text(`Fecha de medición: ${measurementDate}`, 20, y);
  doc.text(`Medición Nº: ${measurementNumber}`, 120, y);
  y += 5;
  if (patient.objective) {
    doc.text(`Objetivo declarado: ${patient.objective}`, 20, y);
    y += 5;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Mediciones antropométricas', 20, y + 4);
  y += 10;

  const tableBody: any[] = [];
  tableBody.push([{ content: 'BÁSICOS', colSpan: 6, styles: { fillColor: [BRAND_COLORS.strip.r, BRAND_COLORS.strip.g, BRAND_COLORS.strip.b], fontStyle: 'bold' } }]);
  tableBody.push([
    'Peso (kg)',
    formatValue(measurement.weight),
    getAdjusted(measurement.weight, 'basic'),
    formatValue(getETM('weight'), 2),
    formatDifference(measurement.weight, previousMeasurement?.weight),
    getZScoreFormatted(measurement.weight, 'weight'),
  ]);
  tableBody.push([
    'Talla (cm)',
    formatValue(measurement.height),
    '',
    formatValue(getETM('height'), 2),
    formatDifference(measurement.height, previousMeasurement?.height),
    getZScoreFormatted(measurement.height, 'height'),
  ]);
  tableBody.push([
    'Talla sentado (cm)',
    formatValue(measurement.seatedHeight),
    getAdjusted(measurement.seatedHeight, 'basic'),
    formatValue(getETM('seatedHeight'), 2),
    formatDifference(measurement.seatedHeight, previousMeasurement?.seatedHeight),
    getZScoreFormatted(measurement.seatedHeight, 'seatedHeight'),
  ]);

  const pushGroup = (title: string) => {
    tableBody.push([{ content: title, colSpan: 6, styles: { fillColor: [BRAND_COLORS.strip.r, BRAND_COLORS.strip.g, BRAND_COLORS.strip.b], fontStyle: 'bold' } }]);
  };

  const addRow = (
    label: string,
    value: any,
    adjustedType: 'skinfold' | 'perimeter' | 'diameter' | 'basic',
    etmKey: keyof typeof ETM_VALUES,
    refKey: keyof typeof getReferenceValues,
    previousValue: any,
  ) => {
    tableBody.push([
      label,
      formatValue(value),
      getAdjusted(value, adjustedType),
      formatValue(getETM(etmKey), 2),
      formatDifference(value, previousValue),
      getZScoreFormatted(value, refKey),
    ]);
  };

  pushGroup('DIÁMETROS (cm)');
  addRow('Biacromial', measurement.biacromial, 'diameter', 'biacromial', 'biacromial', previousMeasurement?.biacromial);
  addRow('Tórax transverso', measurement.thoraxTransverse, 'diameter', 'thoraxTransverse', 'thoraxTransverse', previousMeasurement?.thoraxTransverse);
  addRow('Tórax anteroposterior', measurement.thoraxAnteroposterior, 'diameter', 'thoraxAnteroposterior', 'thoraxAnteroposterior', previousMeasurement?.thoraxAnteroposterior);
  addRow('Bi-iliocrestídeo', measurement.biiliocristideo, 'diameter', 'biiliocristideo', 'biiliocristideo', previousMeasurement?.biiliocristideo);
  addRow('Humeral', measurement.humeral, 'diameter', 'humeral', 'humeral', previousMeasurement?.humeral);
  addRow('Femoral', measurement.femoral, 'diameter', 'femoral', 'femoral', previousMeasurement?.femoral);

  pushGroup('PERÍMETROS (cm)');
  addRow('Cabeza', measurement.head, 'perimeter', 'head', 'head', previousMeasurement?.head);
  addRow('Brazo relajado', measurement.relaxedArm, 'perimeter', 'relaxedArm', 'relaxedArm', previousMeasurement?.relaxedArm);
  addRow('Brazo flexionado', measurement.flexedArm, 'perimeter', 'flexedArm', 'flexedArm', previousMeasurement?.flexedArm);
  addRow('Antebrazo', measurement.forearm, 'perimeter', 'forearm', 'forearm', previousMeasurement?.forearm);
  addRow('Tórax mesoesternal', measurement.thoraxCirc, 'perimeter', 'thoraxCirc', 'thoraxCirc', previousMeasurement?.thoraxCirc);
  addRow('Cintura (mínima)', measurement.waist, 'perimeter', 'waist', 'waist', previousMeasurement?.waist);
  addRow('Caderas (máxima)', measurement.hip, 'perimeter', 'hip', 'hip', previousMeasurement?.hip);
  addRow('Muslo (superior)', measurement.thighSuperior, 'perimeter', 'thighSuperior', 'thighSuperior', previousMeasurement?.thighSuperior);
  addRow('Muslo (medial)', measurement.thighMedial, 'perimeter', 'thighMedial', 'thighMedial', previousMeasurement?.thighMedial);
  addRow('Pantorrilla (máxima)', measurement.calf, 'perimeter', 'calf', 'calf', previousMeasurement?.calf);

  pushGroup('PLIEGUES CUTÁNEOS (mm)');
  addRow('Tríceps', measurement.triceps, 'skinfold', 'triceps', 'triceps', previousMeasurement?.triceps);
  addRow('Bíceps', measurement.biceps, 'skinfold', 'triceps', 'triceps', previousMeasurement?.biceps);
  addRow('Subescapular', measurement.subscapular, 'skinfold', 'subscapular', 'subscapular', previousMeasurement?.subscapular);
  addRow('Suprailiaco', measurement.suprailiac, 'skinfold', 'triceps', 'triceps', previousMeasurement?.suprailiac);
  addRow('Supraespinal', measurement.supraspinal, 'skinfold', 'supraspinal', 'supraspinal', previousMeasurement?.supraspinal);
  addRow('Abdominal', measurement.abdominal, 'skinfold', 'abdominal', 'abdominal', previousMeasurement?.abdominal);
  addRow('Muslo (medial)', measurement.thighSkinfold, 'skinfold', 'thighSkinfold', 'thighSkinfold', previousMeasurement?.thighSkinfold);
  addRow('Pantorrilla', measurement.calfSkinfold, 'skinfold', 'calfSkinfold', 'calfSkinfold', previousMeasurement?.calfSkinfold);

  autoTable(doc, {
    startY: y,
    head: [[
      { content: '', styles: { fontStyle: 'bold' } },
      { content: 'Resultado', styles: { halign: 'center', fontStyle: 'bold' } },
      { content: 'Valor ajustado', styles: { halign: 'center', fontStyle: 'bold' } },
      { content: '% ETM', styles: { halign: 'center', fontStyle: 'bold' } },
      { content: 'Δ previa', styles: { halign: 'center', fontStyle: 'bold' } },
      { content: 'Score-Z', styles: { halign: 'center', fontStyle: 'bold' } },
    ]],
    body: tableBody,
    styles: {
      fontSize: 8,
      cellPadding: 2.2,
      textColor: [BRAND_COLORS.text.r, BRAND_COLORS.text.g, BRAND_COLORS.text.b],
    },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 22, halign: 'center' },
      2: { cellWidth: 24, halign: 'center' },
      3: { cellWidth: 18, halign: 'center' },
      4: { cellWidth: 22, halign: 'center' },
      5: { cellWidth: 18, halign: 'center' },
    },
    headStyles: {
      fillColor: [BRAND_COLORS.strip.r, BRAND_COLORS.strip.g, BRAND_COLORS.strip.b],
      textColor: [BRAND_COLORS.text.r, BRAND_COLORS.text.g, BRAND_COLORS.text.b],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  const indicatorRows = [
    [
      'Suma de 6 pliegues cutáneos',
      bodyComposition ? `${bodyComposition.sumOf6Skinfolds.toFixed(2)} mm` : 'S/D',
      previousMeasurement && bodyComposition && resolveBodyComposition(previousMeasurement, patient.gender)
        ? `${(bodyComposition.sumOf6Skinfolds -
            resolveBodyComposition(previousMeasurement, patient.gender)!.sumOf6Skinfolds).toFixed(2)} mm`
        : '—',
    ],
    [
      'Índice músculo/óseo',
      bodyComposition ? bodyComposition.muscleToBoneRatio.toFixed(3) : 'S/D',
      '≥ 4.00',
    ],
    [
      'Índice adiposo/muscular',
      bodyComposition ? bodyComposition.adiposeToMuscleRatio.toFixed(3) : 'S/D',
      '≤ 0.45',
    ],
    [
      'Índice de masa corporal',
      measurement.weight && measurement.height
        ? (parseFloat(String(measurement.weight)) / ((parseFloat(String(measurement.height)) / 100) ** 2)).toFixed(2)
        : 'S/D',
      '18.5 - 24.9',
    ],
  ];

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 6,
    head: [[
      { content: 'Indicador', styles: { fontStyle: 'bold' } },
      { content: 'Valor actual', styles: { halign: 'center', fontStyle: 'bold' } },
      { content: 'Referencia / Objetivo', styles: { halign: 'center', fontStyle: 'bold' } },
    ]],
    body: indicatorRows,
    styles: { fontSize: 9, cellPadding: 2, textColor: [BRAND_COLORS.text.r, BRAND_COLORS.text.g, BRAND_COLORS.text.b] },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 35, halign: 'center' },
      2: { cellWidth: 55, halign: 'center' },
    },
    headStyles: {
      fillColor: [BRAND_COLORS.strip.r, BRAND_COLORS.strip.g, BRAND_COLORS.strip.b],
    },
    margin: { left: 20, right: 20 },
  });

  let nextY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Resumen y notas', 20, nextY);
  nextY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const summaryText = annotations?.summary || 'Evaluación antropométrica realizada siguiendo protocolo ISAK 2 (5 componentes).';
  const summaryLines = doc.splitTextToSize(summaryText, pageWidth - 40);
  doc.text(summaryLines, 20, nextY);
  nextY += summaryLines.length * 3.2 + 8;

  doc.setFont('helvetica', 'bold');
  doc.text('Recomendaciones clave', 20, nextY);
  nextY += 5;
  doc.setFont('helvetica', 'normal');
  const recommendationLines = doc.splitTextToSize(annotations?.recommendations || 'Ajustar plan nutricional y entrenamiento para reforzar el objetivo planteado.', pageWidth - 40);
  doc.text(recommendationLines, 20, nextY);
  nextY += recommendationLines.length * 3.2 + 8;

  doc.setFont('helvetica', 'bold');
  doc.text('Notas complementarias', 20, nextY);
  nextY += 5;
  doc.setFont('helvetica', 'normal');
  const notesLines = doc.splitTextToSize(annotations?.notes || measurement.notes || 'Sin notas adicionales.', pageWidth - 40);
  doc.text(notesLines, 20, nextY);

  doc.addPage();
  doc.setFillColor(BRAND_COLORS.header.r, BRAND_COLORS.header.g, BRAND_COLORS.header.b);
  doc.rect(0, 0, pageWidth, 20, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Análisis de composición corporal', pageWidth / 2, 12, { align: 'center' });

  let page2Y = 30;
  doc.setTextColor(BRAND_COLORS.text.r, BRAND_COLORS.text.g, BRAND_COLORS.text.b);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Fraccionamiento 5 componentes (D. Kerr, 1988)', 20, page2Y);
  page2Y += 6;

  const previousBodyComposition = previousMeasurement ? resolveBodyComposition(previousMeasurement, patient.gender) : null;
  if (bodyComposition) {
    const MASS_PERCENT_REFERENCE = {
      adipose: 22,
      muscle: 49,
      residual: 11,
      bone: 13,
      skin: 5,
    };
    const massPieBase64 = renderMassPieChart(bodyComposition);
    const weightScore = measurement.weight
      ? Math.max(-4, Math.min(4, (parseFloat(String(measurement.weight)) - bodyComposition.structuredWeight) / 5))
      : 0;

    const massScatterData = [
      { label: 'Peso (kg)', value: weightScore },
      {
        label: 'Masa Adiposa',
        value: (bodyComposition.adiposeMassPercent - MASS_PERCENT_REFERENCE.adipose) / 5,
      },
      {
        label: 'Masa Muscular',
        value: (bodyComposition.muscleMassPercent - MASS_PERCENT_REFERENCE.muscle) / 5,
      },
      {
        label: 'Masa Residual',
        value: (bodyComposition.residualMassPercent - MASS_PERCENT_REFERENCE.residual) / 5,
      },
      {
        label: 'Masa Ósea',
        value: (bodyComposition.boneMassPercent - MASS_PERCENT_REFERENCE.bone) / 5,
      },
      {
        label: 'Masa de la Piel',
        value: (bodyComposition.skinMassPercent - MASS_PERCENT_REFERENCE.skin) / 5,
      },
    ];
    const massScatterBase64 = renderMassScatterChart(massScatterData);

    if (massPieBase64) {
      doc.addImage(massPieBase64, 'PNG', 20, page2Y, 80, 80);
    }
    if (massScatterBase64) {
      doc.addImage(massScatterBase64, 'PNG', 110, page2Y, 90, 80);
    }
    page2Y += 86;

    const componentRows = [
      ['Masa adiposa', formatValue(bodyComposition.adiposeMassPercent), formatValue(bodyComposition.adiposeMassKg, 3), massScatterData[1]?.value.toFixed(2) ?? '0.00', previousBodyComposition ? formatValue(bodyComposition.adiposeMassKg - previousBodyComposition.adiposeMassKg, 3) : '—'],
      ['Masa muscular', formatValue(bodyComposition.muscleMassPercent), formatValue(bodyComposition.muscleMassKg, 3), massScatterData[2]?.value.toFixed(2) ?? '0.00', previousBodyComposition ? formatValue(bodyComposition.muscleMassKg - previousBodyComposition.muscleMassKg, 3) : '—'],
      ['Masa residual', formatValue(bodyComposition.residualMassPercent), formatValue(bodyComposition.residualMassKg, 3), massScatterData[3]?.value.toFixed(2) ?? '0.00', previousBodyComposition ? formatValue(bodyComposition.residualMassKg - previousBodyComposition.residualMassKg, 3) : '—'],
      ['Masa ósea', formatValue(bodyComposition.boneMassPercent), formatValue(bodyComposition.boneMassKg, 3), massScatterData[4]?.value.toFixed(2) ?? '0.00', previousBodyComposition ? formatValue(bodyComposition.boneMassKg - previousBodyComposition.boneMassKg, 3) : '—'],
      ['Masa de la piel', formatValue(bodyComposition.skinMassPercent), formatValue(bodyComposition.skinMassKg, 3), massScatterData[5]?.value.toFixed(2) ?? '0.00', previousBodyComposition ? formatValue(bodyComposition.skinMassKg - previousBodyComposition.skinMassKg, 3) : '—'],
      ['Masa total', '100%', formatValue(parseFloat(String(measurement.weight)), 3), weightScore.toFixed(2), previousMeasurement?.weight ? formatDifference(measurement.weight, previousMeasurement.weight) : '—'],
    ];

    autoTable(doc, {
      startY: page2Y,
      head: [[
        { content: 'Componente', styles: { fontStyle: 'bold' } },
        { content: '%', styles: { halign: 'center', fontStyle: 'bold' } },
        { content: 'Kg', styles: { halign: 'center', fontStyle: 'bold' } },
        { content: 'Score-Z', styles: { halign: 'center', fontStyle: 'bold' } },
        { content: 'Δ previa (kg)', styles: { halign: 'center', fontStyle: 'bold' } },
      ]],
      body: componentRows,
      styles: {
        fontSize: 9,
        cellPadding: 2,
      },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 28, halign: 'center' },
        3: { cellWidth: 25, halign: 'center' },
        4: { cellWidth: 25, halign: 'center' },
      },
      headStyles: {
        fillColor: [BRAND_COLORS.strip.r, BRAND_COLORS.strip.g, BRAND_COLORS.strip.b],
      },
      margin: { left: 20, right: 20 },
    });

    page2Y = (doc as any).lastAutoTable.finalY + 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Suma de 6 pliegues: ${bodyComposition.sumOf6Skinfolds.toFixed(2)} mm`, 20, page2Y);
    page2Y += 5;
    doc.text(`Índice músculo/óseo: ${bodyComposition.muscleToBoneRatio.toFixed(3)}`, 20, page2Y);
    page2Y += 5;
    doc.text(`Índice adiposo/muscular: ${bodyComposition.adiposeToMuscleRatio.toFixed(3)}`, 20, page2Y);
    page2Y += 5;
    doc.text(`Peso estructurado estimado: ${bodyComposition.structuredWeight.toFixed(2)} kg`, 20, page2Y);
    page2Y += 5;
    doc.text(`Porcentaje de diferencia entre peso estructurado y peso bruto: ${bodyComposition.weightDifference.toFixed(2)}%`, 20, page2Y);
    page2Y += 10;

    const kerrText = 'El fraccionamiento corporal en 5 componentes (D. Kerr, 1988) es un modelo anatómico basado en estudios antropométricos con disección de cadáveres. Es el único modelo con validación directa. La compresibilidad del tejido adiposo es la principal fuente de error al utilizar calibres. Con este modelo, el cuerpo se fracciona en 5 tejidos:';
    const kerrLines = doc.splitTextToSize(kerrText, pageWidth - 40);
    doc.text(kerrLines, 20, page2Y);
    page2Y += kerrLines.length * 3.2 + 3;

    const tissues = [
      '1- Adiposo (grasa subcutánea)',
      '2- Muscular (músculo)',
      '3- Residual (vísceras, órganos, pulmones)',
      '4- Óseo (huesos)',
      '5- Cutáneo (piel)',
    ];
    tissues.forEach((line) => {
      doc.text(line, 25, page2Y);
      page2Y += 4;
    });

    page2Y += 4;
    doc.text(
      'Una alimentación sana y planificada junto con actividad física adecuada aseguran proporciones óptimas de tejido adiposo y muscular según el patrón genético.',
      20,
      page2Y,
    );
    page2Y += 10;
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.text('No se pudo calcular el fraccionamiento por falta de datos completos en la medición.', 20, page2Y);
    page2Y += 12;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Score-Z Perímetros', 20, page2Y);
  page2Y += 6;
  const perimeterLabels = ['Cabeza', 'Brazo rel.', 'Brazo flex.', 'Antebrazo', 'Tórax', 'Cintura', 'Cadera', 'Muslo sup.', 'Muslo med.', 'Pantorrilla'];
  const perimeterKeys: Array<keyof Measurement> = ['head', 'relaxedArm', 'flexedArm', 'forearm', 'thoraxCirc', 'waist', 'hip', 'thighSuperior', 'thighMedial', 'calf'];
  const perimeterZ = perimeterKeys.map((key, idx) => {
    const value = measurement[key];
    if (value === null || value === undefined) return 0;
    const refKey = ['head', 'relaxedArm', 'flexedArm', 'forearm', 'thoraxCirc', 'waist', 'hip', 'thighSuperior', 'thighMedial', 'calf'][idx] as keyof typeof getReferenceValues;
    const ref = getReferenceValues(refKey);
    return calculateZScore(parseFloat(String(value)), ref.mean, ref.sd);
  });
  const perimeterChartBase64 = renderScoreChart(perimeterLabels, perimeterZ);
  if (perimeterChartBase64) {
    doc.addImage(perimeterChartBase64, 'PNG', 20, page2Y, pageWidth - 40, 60);
    page2Y += 68;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Score-Z Pliegues', 20, page2Y);
  page2Y += 6;
  const skinfoldLabels = ['Tríceps', 'Bíceps', 'Subescap.', 'Suprailiaco', 'Supraesp.', 'Abdominal', 'Muslo Med.', 'Pantorrilla'];
  const skinfoldKeys: Array<keyof Measurement> = ['triceps', 'biceps', 'subscapular', 'suprailiac', 'supraspinal', 'abdominal', 'thighSkinfold', 'calfSkinfold'];
  const skinfoldRefKeys: Array<keyof typeof getReferenceValues> = ['triceps', 'triceps', 'subscapular', 'triceps', 'supraspinal', 'abdominal', 'thighSkinfold', 'calfSkinfold'];
  const skinfoldZ = skinfoldKeys.map((key, idx) => {
    const value = measurement[key];
    if (value === null || value === undefined) return 0;
    const ref = getReferenceValues(skinfoldRefKeys[idx]);
    return calculateZScore(parseFloat(String(value)), ref.mean, ref.sd);
  });
  const skinfoldChartBase64 = renderScoreChart(skinfoldLabels, skinfoldZ);
  if (skinfoldChartBase64) {
    doc.addImage(skinfoldChartBase64, 'PNG', 20, page2Y, pageWidth - 40, 60);
    page2Y += 68;
  }

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  const explanatory = 'Los Score-Z describen la relación con valores de referencia antropométricos. Valores cercanos a 0 indican similitud con la media; los positivos indican valores mayores al promedio y los negativos, menores.';
  const explanatoryLines = doc.splitTextToSize(explanatory, pageWidth - 40);
  doc.text(explanatoryLines, 20, page2Y + 6);
  page2Y += explanatoryLines.length * 2.8 + 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`Objetivo actual: ${patient.objective ?? 'Sin especificar'}`, 20, page2Y + 4);

  const reportsDir = path.join(process.cwd(), 'reports');
  await fs.mkdir(reportsDir, { recursive: true });
  const filename = `informe_${patient.name.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
  const filepath = path.join(reportsDir, filename);
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  await fs.writeFile(filepath, pdfBuffer);

  return `/reports/${filename}`;
}
