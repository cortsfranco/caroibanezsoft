import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Patient, Measurement, MeasurementCalculation } from '@shared/schema';
import fs from 'fs/promises';
import path from 'path';

interface ReportData {
  patient: Patient;
  measurement: Measurement;
  calculations?: MeasurementCalculation[];
}

// Paleta de colores profesional
const COLORS = {
  primary: [46, 125, 142],      // Verde azulado principal
  secondary: [88, 177, 159],    // Verde menta
  accent: [255, 159, 67],       // Naranja cálido
  success: [76, 175, 80],       // Verde éxito
  warning: [255, 152, 0],       // Naranja advertencia
  danger: [244, 67, 54],        // Rojo peligro
  dark: [38, 50, 56],           // Gris oscuro
  light: [236, 239, 241],       // Gris claro
  white: [255, 255, 255],       // Blanco
  text: [33, 33, 33],           // Texto principal
  textLight: [117, 117, 117],   // Texto secundario
};

/**
 * Obtiene la clasificación del BMI con su color correspondiente
 */
function getBMIClassification(bmi: number): { category: string; color: number[]; description: string } {
  if (bmi < 18.5) return { 
    category: 'Bajo Peso', 
    color: COLORS.warning,
    description: 'Se recomienda evaluación nutricional para incremento de masa muscular'
  };
  if (bmi < 25) return { 
    category: 'Normal', 
    color: COLORS.success,
    description: 'Peso saludable. Mantener hábitos alimentarios y actividad física'
  };
  if (bmi < 30) return { 
    category: 'Sobrepeso', 
    color: COLORS.warning,
    description: 'Se recomienda plan nutricional y ejercicio regular'
  };
  if (bmi < 35) return { 
    category: 'Obesidad I', 
    color: COLORS.danger,
    description: 'Intervención nutricional necesaria con seguimiento profesional'
  };
  if (bmi < 40) return { 
    category: 'Obesidad II', 
    color: COLORS.danger,
    description: 'Requiere intervención intensiva multidisciplinaria'
  };
  return { 
    category: 'Obesidad III', 
    color: COLORS.danger,
    description: 'Requiere atención médica y nutricional urgente'
  };
}

/**
 * Genera un informe PDF de medición antropométrica profesional y colorido
 * @param data Datos del paciente y medición
 * @returns Ruta del archivo PDF generado
 */
export async function generateMeasurementReport(data: ReportData): Promise<string> {
  const doc = new jsPDF();
  const { patient, measurement, calculations } = data;
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // ===== HEADER CON DEGRADADO =====
  // Fondo de header con color principal
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 45, 'F');
  
  // Acento inferior del header
  doc.setFillColor(...COLORS.secondary);
  doc.rect(0, 40, pageWidth, 5, 'F');
  
  // Título principal
  doc.setTextColor(...COLORS.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text('INFORME NUTRICIONAL', pageWidth / 2, 18, { align: 'center' });
  
  // Subtítulo
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text('Evaluación Antropométrica Profesional', pageWidth / 2, 26, { align: 'center' });
  
  // Info profesional y fecha
  doc.setFontSize(9);
  doc.text('Carolina Ibáñez - Nutricionista Profesional', pageWidth / 2, 34, { align: 'center' });
  doc.text(`Fecha: ${new Date().toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`, pageWidth / 2, 39, { align: 'center' });
  
  let yPos = 55;
  
  // ===== SECCIÓN 1: DATOS DEL PACIENTE =====
  doc.setTextColor(...COLORS.text);
  
  // Caja de datos del paciente con fondo
  doc.setFillColor(...COLORS.light);
  doc.roundedRect(15, yPos, pageWidth - 30, 35, 2, 2, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...COLORS.primary);
  doc.text('DATOS DEL PACIENTE', 20, yPos + 8);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.text);
  yPos += 16;
  
  doc.setFont('helvetica', 'bold');
  doc.text('Nombre:', 20, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(patient.name, 50, yPos);
  yPos += 6;
  
  if (patient.birthDate) {
    const age = Math.floor((Date.now() - new Date(patient.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    doc.setFont('helvetica', 'bold');
    doc.text('Edad:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(`${age} años`, 50, yPos);
    
    if (patient.email) {
      doc.setFont('helvetica', 'bold');
      doc.text('Email:', 100, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(patient.email, 120, yPos);
    }
    yPos += 6;
  }
  
  if (patient.objective) {
    doc.setFont('helvetica', 'bold');
    doc.text('Objetivo:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(patient.objective, 50, yPos);
  }
  
  yPos += 15;
  
  // ===== SECCIÓN 2: MEDICIONES PRINCIPALES CON IMC DESTACADO =====
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...COLORS.primary);
  doc.text('MEDICIONES PRINCIPALES', 20, yPos);
  yPos += 10;
  
  // Calcular BMI y su clasificación
  const bmiValue = calculations && calculations.length > 0 && calculations[0].bmi 
    ? parseFloat(calculations[0].bmi) 
    : (measurement.weight && measurement.height) 
      ? parseFloat(measurement.weight) / Math.pow(parseFloat(measurement.height) / 100, 2)
      : null;
      
  const bmiInfo = bmiValue ? getBMIClassification(bmiValue) : null;
  
  const basicMeasurements = [];
  if (measurement.weight) basicMeasurements.push(['Peso Corporal', `${measurement.weight} kg`]);
  if (measurement.height) basicMeasurements.push(['Estatura', `${measurement.height} cm`]);
  
  if (basicMeasurements.length > 0) {
    autoTable(doc, {
      startY: yPos,
      head: [['Medición', 'Valor']],
      body: basicMeasurements,
      theme: 'striped',
      headStyles: { 
        fillColor: COLORS.primary,
        textColor: COLORS.white,
        fontStyle: 'bold',
        fontSize: 11
      },
      bodyStyles: {
        fontSize: 10,
        textColor: COLORS.text
      },
      alternateRowStyles: {
        fillColor: COLORS.light
      },
      margin: { left: 20, right: 20 }
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // Caja destacada para IMC con color según clasificación
  if (bmiInfo) {
    const boxHeight = 38;
    doc.setFillColor(...bmiInfo.color);
    doc.roundedRect(15, yPos, pageWidth - 30, boxHeight, 2, 2, 'F');
    
    doc.setTextColor(...COLORS.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('ÍNDICE DE MASA CORPORAL (IMC)', pageWidth / 2, yPos + 8, { align: 'center' });
    
    doc.setFontSize(24);
    doc.text(bmiValue.toFixed(1), pageWidth / 2, yPos + 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(bmiInfo.category, pageWidth / 2, yPos + 28, { align: 'center' });
    
    yPos += boxHeight + 5;
    
    // Recomendación debajo de la caja
    doc.setTextColor(...COLORS.textLight);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    const splitRecommendation = doc.splitTextToSize(bmiInfo.description, pageWidth - 40);
    doc.text(splitRecommendation, pageWidth / 2, yPos, { align: 'center' });
    yPos += splitRecommendation.length * 4 + 10;
  }
  
  // ===== SECCIÓN 3: PLIEGUES CUTÁNEOS (ISAK) =====
  const skinfolds = [];
  if (measurement.triceps) skinfolds.push(['Tríceps', `${measurement.triceps} mm`]);
  if (measurement.subscapular) skinfolds.push(['Subescapular', `${measurement.subscapular} mm`]);
  if (measurement.supraspinal) skinfolds.push(['Supraespinal', `${measurement.supraspinal} mm`]);
  if (measurement.abdominal) skinfolds.push(['Abdominal', `${measurement.abdominal} mm`]);
  if (measurement.thighSkinfold) skinfolds.push(['Muslo', `${measurement.thighSkinfold} mm`]);
  if (measurement.calfSkinfold) skinfolds.push(['Pantorrilla', `${measurement.calfSkinfold} mm`]);
  
  // Calcular suma de 6 pliegues si existe
  const sum6Skinfolds = calculations && calculations.length > 0 && calculations[0].sumOf6Skinfolds
    ? parseFloat(calculations[0].sumOf6Skinfolds)
    : null;
  
  if (sum6Skinfolds) {
    skinfolds.push(['SUMA DE 6 PLIEGUES', `${sum6Skinfolds.toFixed(1)} mm`]);
  }
  
  if (skinfolds.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...COLORS.primary);
    doc.text('PLIEGUES CUTÁNEOS (ISAK)', 20, yPos);
    yPos += 10;
    
    autoTable(doc, {
      startY: yPos,
      head: [['Sitio de Medición', 'Valor (mm)']],
      body: skinfolds,
      theme: 'striped',
      headStyles: { 
        fillColor: COLORS.secondary,
        textColor: COLORS.white,
        fontStyle: 'bold',
        fontSize: 11
      },
      bodyStyles: {
        fontSize: 10,
        textColor: COLORS.text
      },
      alternateRowStyles: {
        fillColor: COLORS.light
      },
      margin: { left: 20, right: 20 },
      didParseCell: function(data: any) {
        // Resaltar la suma total
        if (data.row.index === skinfolds.length - 1 && sum6Skinfolds) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = COLORS.accent;
          data.cell.styles.textColor = COLORS.white;
        }
      }
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // ===== SECCIÓN 4: PERÍMETROS =====
  const perimeters = [];
  if (measurement.relaxedArm) perimeters.push(['Brazo relajado', `${measurement.relaxedArm} cm`]);
  if (measurement.flexedArm) perimeters.push(['Brazo flexionado', `${measurement.flexedArm} cm`]);
  if (measurement.waist) perimeters.push(['Cintura', `${measurement.waist} cm`]);
  if (measurement.hip) perimeters.push(['Cadera', `${measurement.hip} cm`]);
  if (measurement.thighSuperior) perimeters.push(['Muslo superior', `${measurement.thighSuperior} cm`]);
  if (measurement.calf) perimeters.push(['Pantorrilla', `${measurement.calf} cm`]);
  
  if (perimeters.length > 0) {
    // Nueva página si es necesario
    if (yPos > 220) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...COLORS.primary);
    doc.text('PERÍMETROS CORPORALES', 20, yPos);
    yPos += 10;
    
    autoTable(doc, {
      startY: yPos,
      head: [['Sitio de Medición', 'Valor (cm)']],
      body: perimeters,
      theme: 'striped',
      headStyles: { 
        fillColor: COLORS.secondary,
        textColor: COLORS.white,
        fontStyle: 'bold',
        fontSize: 11
      },
      bodyStyles: {
        fontSize: 10,
        textColor: COLORS.text
      },
      alternateRowStyles: {
        fillColor: COLORS.light
      },
      margin: { left: 20, right: 20 }
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // ===== SECCIÓN 5: OBSERVACIONES Y RECOMENDACIONES =====
  if (measurement.notes) {
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...COLORS.primary);
    doc.text('OBSERVACIONES Y RECOMENDACIONES', 20, yPos);
    yPos += 10;
    
    // Caja con fondo para notas
    const notesHeight = doc.splitTextToSize(measurement.notes, pageWidth - 50).length * 5 + 10;
    doc.setFillColor(...COLORS.light);
    doc.roundedRect(15, yPos - 3, pageWidth - 30, Math.min(notesHeight, 60), 2, 2, 'F');
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.text);
    const splitNotes = doc.splitTextToSize(measurement.notes, pageWidth - 50);
    doc.text(splitNotes, 20, yPos + 4);
    yPos += Math.min(notesHeight, 60) + 10;
  }
  
  // ===== FOOTER =====
  const footerY = pageHeight - 20;
  doc.setDrawColor(...COLORS.secondary);
  doc.setLineWidth(1);
  doc.line(20, footerY - 5, pageWidth - 20, footerY - 5);
  
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.textLight);
  doc.text('Este informe es confidencial y de uso exclusivo del paciente.', pageWidth / 2, footerY, { align: 'center' });
  doc.text('Carolina Ibáñez - Nutricionista Profesional | contacto@carolinaibanez.cl', pageWidth / 2, footerY + 4, { align: 'center' });
  
  // Guardar PDF
  const reportsDir = path.join(process.cwd(), 'reports');
  await fs.mkdir(reportsDir, { recursive: true });
  
  const filename = `informe_${patient.name.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
  const filepath = path.join(reportsDir, filename);
  
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  await fs.writeFile(filepath, pdfBuffer);
  
  // Retornar ruta relativa para almacenar en DB
  return `/reports/${filename}`;
}
