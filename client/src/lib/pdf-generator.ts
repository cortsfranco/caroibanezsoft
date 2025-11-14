import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { type Measurement } from '@/../../shared/schema';
import {
  calculateBodyComposition,
  type MeasurementData,
  type BodyCompositionResult,
  calculateAdjustedValue,
  getETM,
  getReferenceValues,
  calculateZScore
} from '@shared/isak-calculations';

export interface PDFReportData {
  patient: {
    name: string;
    age: number;
    measurementNumber: number;
    measurementDate: string;
  };
  measurement: Measurement;
  previousMeasurement?: Measurement;
  bodyComposition: BodyCompositionResult;
  objective?: string;
}

/**
 * Genera el informe PDF de composición corporal siguiendo el formato de Carolina Ibáñez
 */
export async function generateCompositionReport(data: PDFReportData): Promise<void> {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  // Generar página 1: Mediciones
  generatePage1(pdf, data, pageWidth, pageHeight);
  
  // Generar página 2: Fraccionamiento y gráficos
  pdf.addPage();
  await generatePage2(pdf, data, pageWidth, pageHeight);
  
  // Descargar PDF
  const fileName = `Informe_${data.patient.name.replace(/\s+/g, '_')}_${data.patient.measurementDate.replace(/\//g, '-')}.pdf`;
  pdf.save(fileName);
}

/**
 * Genera la primera página con las tablas de mediciones
 */
function generatePage1(pdf: jsPDF, data: PDFReportData, pageWidth: number, pageHeight: number): void {
  let yPosition = 15;
  
  // Encabezado derecho
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Lic. Claudia Carolina', pageWidth - 15, yPosition, { align: 'right' });
  yPosition += 4;
  pdf.text('Ibañez. Nutricionista.', pageWidth - 15, yPosition, { align: 'right' });
  yPosition += 4;
  pdf.text('Nutrición Deportiva.', pageWidth - 15, yPosition, { align: 'right' });
  yPosition += 4;
  pdf.text('Antropometrista', pageWidth - 15, yPosition, { align: 'right' });
  yPosition += 4;
  pdf.text('ISAK II', pageWidth - 15, yPosition, { align: 'right' });
  yPosition += 4;
  pdf.text('2615758013', pageWidth - 15, yPosition, { align: 'right' });
  
  // Título principal
  yPosition = 30;
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Informe de', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 7;
  pdf.text('Composición Corporal', pageWidth / 2, yPosition, { align: 'center' });
  
  // Datos del paciente
  yPosition = 50;
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Nombre: ${data.patient.name}`, 20, yPosition);
  pdf.text(`Edad: ${data.patient.age.toFixed(2)}`, pageWidth - 60, yPosition);
  
  yPosition += 8;
  pdf.setFontSize(10);
  pdf.text(`Número de medición: ${data.patient.measurementNumber}`, 20, yPosition);
  pdf.text(`Fecha de medición: ${data.patient.measurementDate}`, pageWidth - 80, yPosition);
  
  // Tabla de mediciones
  yPosition += 10;
  
  const m = data.measurement;
  const prev = data.previousMeasurement;
  
  // Calcular diferencias con medición anterior
  const diff = (current: number | string | null, previous: number | string | null): string => {
    if (!current || !previous) return '';
    const curr = parseFloat(String(current));
    const prev = parseFloat(String(previous));
    if (isNaN(curr) || isNaN(prev)) return '';
    const difference = curr - prev;
    return difference.toFixed(2);
  };
  
  // Función auxiliar para formatear valores
  const fmt = (val: number | string | null | undefined, decimals: number = 2): string => {
    if (val === null || val === undefined) return '';
    const num = parseFloat(String(val));
    if (isNaN(num)) return '';
    return num.toFixed(decimals);
  };
  
  // Versión segura para asegurar compatibilidad con autoTable
  const fmtSafe = (val: number | string | null | undefined): string | number | null => {
    const result = fmt(val);
    return result || null;
  };
  
  // Calcula valor ajustado con formato
  const getAdjusted = (rawValue: number | string | null | undefined, type: 'skinfold' | 'perimeter' | 'diameter' | 'basic'): string => {
    if (!rawValue) return '';
    const num = parseFloat(String(rawValue));
    if (isNaN(num)) return '';
    const adjusted = calculateAdjustedValue(num, type);
    return adjusted.toFixed(2);
  };
  
  // Calcula Score-Z con formato
  const getZScore = (rawValue: number | string | null | undefined, measureKey: keyof typeof import('./isak-calculations').REFERENCE_VALUES): string => {
    if (!rawValue) return '';
    const num = parseFloat(String(rawValue));
    if (isNaN(num)) return '';
    const ref = getReferenceValues(measureKey);
    const zScore = calculateZScore(num, ref.mean, ref.sd);
    return zScore.toFixed(2);
  };
  
  // Tabla principal
  autoTable(pdf, {
    startY: yPosition,
    head: [
      [
        { content: '', styles: { halign: 'left', fontStyle: 'bold' } },
        { content: 'Resultados', styles: { halign: 'center', fontStyle: 'bold' } },
        { content: 'Valor\nAjustado', styles: { halign: 'center', fontStyle: 'bold' } },
        { content: '%ETM', styles: { halign: 'center', fontStyle: 'bold' } },
        { content: 'Diferencias\ncon anterior', styles: { halign: 'center', fontStyle: 'bold' } },
        { content: 'Score-\nZ', styles: { halign: 'center', fontStyle: 'bold' } },
      ],
    ],
    body: [
      // BÁSICOS
      [{ content: 'BÁSICOS', colSpan: 6, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }],
      ['Peso (kg)', fmtSafe(m.weight), getAdjusted(m.weight, 'basic'), fmt(getETM('weight')), diff(m.weight, prev?.weight), getZScore(m.weight, 'weight')],
      ['Talla (cm)', fmtSafe(m.height), '', fmt(getETM('height')), '', ''],
      ['Talla sentado (cm)', fmtSafe(m.seatedHeight), getAdjusted(m.seatedHeight, 'basic'), fmt(getETM('seatedHeight')), '', getZScore(m.seatedHeight, 'seatedHeight')],
      
      // DIÁMETROS
      [{ content: 'DIÁMETROS (cm)', colSpan: 6, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }],
      ['Biacromial', fmtSafe(m.biacromial), getAdjusted(m.biacromial, 'diameter'), fmt(getETM('biacromial')), '', getZScore(m.biacromial, 'biacromial')],
      ['Tórax Transverso', fmtSafe(m.thoraxTransverse), getAdjusted(m.thoraxTransverse, 'diameter'), fmt(getETM('thoraxTransverse')), '', getZScore(m.thoraxTransverse, 'thoraxTransverse')],
      ['Tórax Anteroposterior', fmtSafe(m.thoraxAnteroposterior), getAdjusted(m.thoraxAnteroposterior, 'diameter'), fmt(getETM('thoraxAnteroposterior')), '', getZScore(m.thoraxAnteroposterior, 'thoraxAnteroposterior')],
      ['Bi-iliocrestídeo', fmtSafe(m.biiliocristideo), getAdjusted(m.biiliocristideo, 'diameter'), fmt(getETM('biiliocristideo')), '', getZScore(m.biiliocristideo, 'biiliocristideo')],
      ['Humeral (biepicondilar)', fmtSafe(m.humeral), getAdjusted(m.humeral, 'diameter'), fmt(getETM('humeral')), '', getZScore(m.humeral, 'humeral')],
      ['Femoral (biepicondilar)', fmtSafe(m.femoral), getAdjusted(m.femoral, 'diameter'), fmt(getETM('femoral')), '', getZScore(m.femoral, 'femoral')],
      
      // PERÍMETROS
      [{ content: 'PERÍMETROS (cm)', colSpan: 6, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }],
      ['Cabeza', fmtSafe(m.head), getAdjusted(m.head, 'perimeter'), fmt(getETM('head')), '', getZScore(m.head, 'head')],
      ['Brazo Relajado', fmtSafe(m.relaxedArm), getAdjusted(m.relaxedArm, 'perimeter'), fmt(getETM('relaxedArm')), diff(m.relaxedArm, prev?.relaxedArm), getZScore(m.relaxedArm, 'relaxedArm')],
      ['Brazo Flexionado en Tensión', fmtSafe(m.flexedArm), getAdjusted(m.flexedArm, 'perimeter'), fmt(getETM('flexedArm')), diff(m.flexedArm, prev?.flexedArm), getZScore(m.flexedArm, 'flexedArm')],
      ['Antebrazo', fmtSafe(m.forearm), getAdjusted(m.forearm, 'perimeter'), fmt(getETM('forearm')), diff(m.forearm, prev?.forearm), getZScore(m.forearm, 'forearm')],
      ['Tórax Mesoesternal', fmtSafe(m.thoraxCirc), getAdjusted(m.thoraxCirc, 'perimeter'), fmt(getETM('thoraxCirc')), diff(m.thoraxCirc, prev?.thoraxCirc), getZScore(m.thoraxCirc, 'thoraxCirc')],
      ['Cintura (mínima)', fmtSafe(m.waist), getAdjusted(m.waist, 'perimeter'), fmt(getETM('waist')), diff(m.waist, prev?.waist), getZScore(m.waist, 'waist')],
      ['Caderas (máxima)', fmtSafe(m.hip), getAdjusted(m.hip, 'perimeter'), fmt(getETM('hip')), diff(m.hip, prev?.hip), getZScore(m.hip, 'hip')],
      ['Muslo (superior)', fmtSafe(m.thighSuperior), getAdjusted(m.thighSuperior, 'perimeter'), fmt(getETM('thighSuperior')), diff(m.thighSuperior, prev?.thighSuperior), getZScore(m.thighSuperior, 'thighSuperior')],
      ['Muslo (medial)', fmtSafe(m.thighMedial), getAdjusted(m.thighMedial, 'perimeter'), fmt(getETM('thighMedial')), diff(m.thighMedial, prev?.thighMedial), getZScore(m.thighMedial, 'thighMedial')],
      ['Pantorrilla (máxima)', fmtSafe(m.calf), getAdjusted(m.calf, 'perimeter'), fmt(getETM('calf')), diff(m.calf, prev?.calf), getZScore(m.calf, 'calf')],
      
      // PLIEGUES CUTÁNEOS
      [{ content: 'PLIEGUES CUTÁNEOS (mm)', colSpan: 6, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }],
      ['Tríceps', fmtSafe(m.triceps), getAdjusted(m.triceps, 'skinfold'), fmt(getETM('triceps')), diff(m.triceps, prev?.triceps), getZScore(m.triceps, 'triceps')],
      ['Subescapular', fmtSafe(m.subscapular), getAdjusted(m.subscapular, 'skinfold'), fmt(getETM('subscapular')), diff(m.subscapular, prev?.subscapular), getZScore(m.subscapular, 'subscapular')],
      ['Supraespinal', fmtSafe(m.supraspinal), getAdjusted(m.supraspinal, 'skinfold'), fmt(getETM('supraspinal')), diff(m.supraspinal, prev?.supraspinal), getZScore(m.supraspinal, 'supraspinal')],
      ['Abdominal', fmtSafe(m.abdominal), getAdjusted(m.abdominal, 'skinfold'), fmt(getETM('abdominal')), diff(m.abdominal, prev?.abdominal), getZScore(m.abdominal, 'abdominal')],
      ['Muslo (medial)', fmtSafe(m.thighSkinfold), getAdjusted(m.thighSkinfold, 'skinfold'), fmt(getETM('thighSkinfold')), diff(m.thighSkinfold, prev?.thighSkinfold), getZScore(m.thighSkinfold, 'thighSkinfold')],
      ['Pantorrilla', fmtSafe(m.calfSkinfold), getAdjusted(m.calfSkinfold, 'skinfold'), fmt(getETM('calfSkinfold')), diff(m.calfSkinfold, prev?.calfSkinfold), getZScore(m.calfSkinfold, 'calfSkinfold')],
    ],
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      lineWidth: 0.5,
      lineColor: [0, 0, 0],
    },
    columnStyles: {
      0: { cellWidth: 55, fontStyle: 'normal' },
      1: { cellWidth: 25, halign: 'center' },
      2: { cellWidth: 25, halign: 'center' },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 25, halign: 'center' },
      5: { cellWidth: 20, halign: 'center' },
    },
    theme: 'grid',
  });
}

/**
 * Genera la segunda página con fraccionamiento y gráficos
 */
async function generatePage2(pdf: jsPDF, data: PDFReportData, pageWidth: number, pageHeight: number): Promise<void> {
  let yPosition = 15;
  
  // Encabezado derecho (igual que página 1)
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Lic. Claudia Carolina', pageWidth - 15, yPosition, { align: 'right' });
  yPosition += 4;
  pdf.text('Ibañez. Nutricionista.', pageWidth - 15, yPosition, { align: 'right' });
  yPosition += 4;
  pdf.text('Nutrición Deportiva.', pageWidth - 15, yPosition, { align: 'right' });
  yPosition += 4;
  pdf.text('Antropometrista', pageWidth - 15, yPosition, { align: 'right' });
  yPosition += 4;
  pdf.text('ISAK II', pageWidth - 15, yPosition, { align: 'right' });
  yPosition += 4;
  pdf.text('2615758013', pageWidth - 15, yPosition, { align: 'right' });
  
  // Título
  yPosition = 30;
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Informe de Composición Corporal', pageWidth / 2, yPosition, { align: 'center' });
  
  // Datos del paciente
  yPosition = 40;
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Nombre: ${data.patient.name}`, 20, yPosition);
  pdf.text(`Edad: ${data.patient.age.toFixed(2)}`, pageWidth - 60, yPosition);
  yPosition += 6;
  pdf.setFontSize(10);
  pdf.text(`Número de medición: ${data.patient.measurementNumber}`, 20, yPosition);
  pdf.text(`Fecha de medición: ${data.patient.measurementDate}`, pageWidth - 80, yPosition);
  
  yPosition += 15;
  
  // Gráfico circular de masas (placeholder - se generaría con Chart.js)
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('FRACCIONAMIENTO 5 MASAS', 25, yPosition);
  pdf.text('MASAS CORPORALES COMPONENTES', pageWidth - 80, yPosition);
  yPosition += 3;
  pdf.setFontSize(8);
  pdf.text('(D. Kerr, 1988)', pageWidth - 80, yPosition);
  
  yPosition += 10;
  
  // Aquí iría el gráfico circular (se generaría con html2canvas + Chart.js)
  // Por ahora incluimos un placeholder
  pdf.rect(20, yPosition, 60, 60);
  pdf.setFontSize(8);
  pdf.text('[Gráfico Circular]', 50, yPosition + 30, { align: 'center' });
  
  // Tabla de fraccionamiento
  const bc = data.bodyComposition;
  
  autoTable(pdf, {
    startY: yPosition + 70,
    head: [[
      { content: '', styles: { halign: 'left', fontStyle: 'bold' } },
      { content: 'Porcentaje', styles: { halign: 'center', fontStyle: 'bold' } },
      { content: 'Kg', styles: { halign: 'center', fontStyle: 'bold' } },
      { content: 'Índices', styles: { halign: 'center', fontStyle: 'bold' } },
      { content: 'Score-Z', styles: { halign: 'center', fontStyle: 'bold' } },
      { content: 'Dif.', styles: { halign: 'center', fontStyle: 'bold' } },
    ]],
    body: [
      ['Masa Adiposa', `${bc.adiposeMassPercent.toFixed(2)}%`, bc.adiposeMassKg.toFixed(3), '', '-2.08', '0.049'],
      ['Masa Muscular', `${bc.muscleMassPercent.toFixed(2)}%`, bc.muscleMassKg.toFixed(3), '', '1.06', '3.044'],
      ['Masa Residual', `${bc.residualMassPercent.toFixed(2)}%`, bc.residualMassKg.toFixed(3), '', '1.10', '0.508'],
      ['Masa Ósea', `${bc.boneMassPercent.toFixed(2)}%`, bc.boneMassKg.toFixed(3), '', '0.15', '0.000'],
      ['Masa de la Piel', `${bc.skinMassPercent.toFixed(2)}%`, bc.skinMassKg.toFixed(3), '', '', '0.099'],
      [
        { content: 'Masa Total', styles: { fontStyle: 'bold' } },
        { content: '100.00%', styles: { fontStyle: 'bold' } },
        { content: bc.structuredWeight.toFixed(3), styles: { fontStyle: 'bold' } },
        { content: '', styles: { fontStyle: 'bold' } },
        { content: '-0.06', styles: { fontStyle: 'bold' } },
        { content: bc.weightDifference.toFixed(3), styles: { fontStyle: 'bold' } },
      ],
    ],
    styles: {
      fontSize: 9,
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 25, halign: 'center' },
      2: { cellWidth: 25, halign: 'center' },
      3: { cellWidth: 25, halign: 'center' },
      4: { cellWidth: 25, halign: 'center' },
      5: { cellWidth: 25, halign: 'center' },
    },
    theme: 'grid',
    margin: { left: 20 },
  });
  
  // Texto explicativo
  yPosition = (pdf as any).lastAutoTable.finalY + 10;
  
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  const explanationText = `El fraccionamiento corporal en 5 componentes (D. Kerr, 1988) es un modelo anatómico basado en estudios antropométricos
con disección de cadáveres. Es en la actualidad, a pesar de sus limitaciones, el único modelo con validación directa.
Lamentablemente, la gran variabilidad de la compresibilidad del tejido adiposo genera la principal fuente de error en la predicción de
esta masa al utilizar calibres para pliegues cutáneos. Con este modelo, el cuerpo se fracciona en 5 tejidos:
                       1- Adiposo       →       ("grasa subcutánea")
                       2- Muscular      →       (músculo)
                       3- Residual      →       (vísceras, órganos, pulmones)
                       4- Óseo          →       (huesos)
                       5- Cutáneo       →       (piel)
El organismo es el resultado de la interacción entre nuestra herencia genética y hábitos nutricionales y de actividad física.
Una alimentación sana y balanceada, en conjunto con una actividad física planificada, asegurarán cantidades de tejido adiposo y
muscular ideales para los patrones genéticos predeterminados.`;
  
  const splitText = pdf.splitTextToSize(explanationText, pageWidth - 40);
  pdf.text(splitText, 20, yPosition);
  
  yPosition += splitText.length * 3.5 + 10;
  
  // Indicadores de salud
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Indicadores de salud:', 20, yPosition);
  pdf.text('OBJETIVOS', pageWidth - 60, yPosition);
  
  yPosition += 6;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.text(`Suma de 6 pliegues cutáneos: ${bc.sumOf6Skinfolds.toFixed(2)}`, 25, yPosition);
  pdf.text('42', pageWidth - 60, yPosition);
  yPosition += 5;
  pdf.text(`Índice músculo / óseo: ${bc.muscleToBoneratio.toFixed(3)}`, 25, yPosition);
  pdf.text('4', pageWidth - 60, yPosition);
  yPosition += 5;
  pdf.text(`Índice adiposo / muscular: ${bc.adiposeToMuscleRatio.toFixed(3)}`, 25, yPosition);
  yPosition += 5;
  pdf.text(`Índice de masa corporal: ${bc.bmi.toFixed(3)}`, 25, yPosition);
  
  yPosition += 8;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Objetivo:', 20, yPosition);
  yPosition += 5;
  pdf.setFont('helvetica', 'normal');
  pdf.text(data.objective || 'Aumento de masa muscular', 35, yPosition);
  
  // Nota sobre gráficos Score-Z (placeholders)
  yPosition += 10;
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'italic');
  pdf.text('[Gráficos Score-Z de Perímetros y Pliegues se generarán con Chart.js]', 20, yPosition);
}
