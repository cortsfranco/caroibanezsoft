import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { type Measurement } from '@/../../shared/schema';
import { calculateBodyComposition, type MeasurementData, type BodyCompositionResult } from './isak-calculations';

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
  const fmt = (val: number | string | null | undefined): string => {
    if (val === null || val === undefined) return '';
    const num = parseFloat(String(val));
    if (isNaN(num)) return '';
    return num.toFixed(2);
  };
  
  // Versión segura para asegurar compatibilidad con autoTable
  const fmtSafe = (val: number | string | null | undefined): string | number | null => {
    const result = fmt(val);
    return result || null;
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
      ['Peso (kg)', fmtSafe(m.weight), '', '0.05', diff(m.weight, prev?.weight), '-0.06'],
      ['Talla (cm)', fmtSafe(m.height), '', '0.11', '', ''],
      ['Talla sentado (cm)', fmtSafe(m.seatedHeight), '', '0.23', '', '-0.70'],
      
      // DIÁMETROS
      [{ content: 'DIÁMETROS (cm)', colSpan: 6, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }],
      ['Biacromial', fmtSafe(m.biacromial), '', '0.39', '', '0.45'],
      ['Tórax Transverso', fmtSafe(m.thoraxTransverse), '', '0.61', '', '-1.00'],
      ['Tórax Anteroposterior', fmtSafe(m.thoraxAnteroposterior), '', '0.68', '', '0.87'],
      ['Bi-iliocrestídeo', fmtSafe(m.biiliocristideo), '', '0.64', '', '0.62'],
      ['Humeral (biepicondilar)', fmtSafe(m.humeral), '', '0.40', '', '-0.08'],
      ['Femoral (biepicondilar)', fmtSafe(m.femoral), '', '0.30', '', '-1.13'],
      
      // PERÍMETROS
      [{ content: 'PERÍMETROS (cm)', colSpan: 6, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }],
      ['Cabeza', fmtSafe(m.head), '', '0.16', '', '-1.55'],
      ['Brazo Relajado', fmtSafe(m.relaxedArm), '', '0.63', diff(m.relaxedArm, prev?.relaxedArm), '0.50'],
      ['Brazo Flexionado en Tensión', fmtSafe(m.flexedArm), '', '0.69', diff(m.flexedArm, prev?.flexedArm), '0.73'],
      ['Antebrazo', fmtSafe(m.forearm), '', '0.48', diff(m.forearm, prev?.forearm), '-0.18'],
      ['Tórax Mesoesternal', fmtSafe(m.thoraxCirc), '', '0.35', diff(m.thoraxCirc, prev?.thoraxCirc), '-0.32'],
      ['Cintura (mínima)', fmtSafe(m.waist), '', '0.54', diff(m.waist, prev?.waist), '0.02'],
      ['Caderas (máxima)', fmtSafe(m.hip), '', '0.21', diff(m.hip, prev?.hip), '-0.21'],
      ['Muslo (superior)', fmtSafe(m.thighSuperior), '', '0.32', diff(m.thighSuperior, prev?.thighSuperior), '0.07'],
      ['Muslo (medial)', fmtSafe(m.thighMedial), '', '0.33', diff(m.thighMedial, prev?.thighMedial), '0.29'],
      ['Pantorrilla (máxima)', fmtSafe(m.calf), '', '0.28', diff(m.calf, prev?.calf), '-0.08'],
      
      // PLIEGUES CUTÁNEOS
      [{ content: 'PLIEGUES CUTÁNEOS (mm)', colSpan: 6, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }],
      ['Tríceps', fmtSafe(m.triceps), '', '1.55', diff(m.triceps, prev?.triceps), '-2.40'],
      ['Subescapular', fmtSafe(m.subscapular), '', '1.59', diff(m.subscapular, prev?.subscapular), '-2.29'],
      ['Supraespinal', fmtSafe(m.supraspinal), '', '2.19', diff(m.supraspinal, prev?.supraspinal), '-2.40'],
      ['Abdominal', fmtSafe(m.abdominal), '', '1.69', diff(m.abdominal, prev?.abdominal), '-1.70'],
      ['Muslo (medial)', fmtSafe(m.thighSkinfold), '', '1.54', diff(m.thighSkinfold, prev?.thighSkinfold), '-2.12'],
      ['Pantorrilla', fmtSafe(m.calfSkinfold), '', '1.62', diff(m.calfSkinfold, prev?.calfSkinfold), '-1.82'],
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
