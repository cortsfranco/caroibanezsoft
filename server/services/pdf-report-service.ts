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

/**
 * Genera un informe PDF de medición antropométrica
 * @param data Datos del paciente y medición
 * @returns Ruta del archivo PDF generado
 */
export async function generateMeasurementReport(data: ReportData): Promise<string> {
  const doc = new jsPDF();
  const { patient, measurement, calculations } = data;
  
  // Configurar fuente
  doc.setFont('helvetica');
  
  // Título del informe
  doc.setFontSize(18);
  doc.text('Informe de Medición Antropométrica', 105, 20, { align: 'center' });
  
  // Información de Carolina Ibáñez
  doc.setFontSize(10);
  doc.text('Carolina Ibáñez - Nutricionista', 105, 28, { align: 'center' });
  doc.text(`Fecha del informe: ${new Date().toLocaleDateString('es-CL')}`, 105, 34, { align: 'center' });
  
  // Línea separadora
  doc.setLineWidth(0.5);
  doc.line(20, 38, 190, 38);
  
  let yPos = 45;
  
  // Sección 1: Datos del Paciente
  doc.setFontSize(14);
  doc.text('Datos del Paciente', 20, yPos);
  yPos += 8;
  
  doc.setFontSize(10);
  doc.text(`Nombre: ${patient.name}`, 20, yPos);
  yPos += 6;
  
  if (patient.email) {
    doc.text(`Email: ${patient.email}`, 20, yPos);
    yPos += 6;
  }
  
  if (patient.birthDate) {
    const age = Math.floor((Date.now() - new Date(patient.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    doc.text(`Edad: ${age} años`, 20, yPos);
    yPos += 6;
  }
  
  if (patient.objective) {
    doc.text(`Objetivo: ${patient.objective}`, 20, yPos);
    yPos += 6;
  }
  
  yPos += 4;
  
  // Sección 2: Mediciones Básicas
  doc.setFontSize(14);
  doc.text('Mediciones Básicas', 20, yPos);
  yPos += 8;
  
  const basicMeasurements = [];
  
  if (measurement.weight) {
    basicMeasurements.push(['Peso', `${measurement.weight} kg`]);
  }
  if (measurement.height) {
    basicMeasurements.push(['Altura', `${measurement.height} cm`]);
  }
  
  // Agregar BMI si está calculado
  if (calculations && calculations.length > 0 && calculations[0].bmi) {
    basicMeasurements.push(['IMC (BMI)', calculations[0].bmi]);
  }
  
  if (basicMeasurements.length > 0) {
    autoTable(doc, {
      startY: yPos,
      head: [['Medida', 'Valor']],
      body: basicMeasurements,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
      margin: { left: 20, right: 20 }
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // Sección 3: Pliegues Cutáneos
  const skinfolds = [];
  if (measurement.triceps) skinfolds.push(['Tríceps', `${measurement.triceps} mm`]);
  if (measurement.subscapular) skinfolds.push(['Subescapular', `${measurement.subscapular} mm`]);
  if (measurement.supraspinal) skinfolds.push(['Supraespinal', `${measurement.supraspinal} mm`]);
  if (measurement.abdominal) skinfolds.push(['Abdominal', `${measurement.abdominal} mm`]);
  if (measurement.thighSkinfold) skinfolds.push(['Muslo', `${measurement.thighSkinfold} mm`]);
  if (measurement.calfSkinfold) skinfolds.push(['Pantorrilla', `${measurement.calfSkinfold} mm`]);
  
  if (skinfolds.length > 0) {
    doc.setFontSize(14);
    doc.text('Pliegues Cutáneos', 20, yPos);
    yPos += 8;
    
    autoTable(doc, {
      startY: yPos,
      head: [['Sitio de Medición', 'Valor']],
      body: skinfolds,
      theme: 'striped',
      headStyles: { fillColor: [52, 152, 219] },
      margin: { left: 20, right: 20 }
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // Sección 4: Perímetros
  const perimeters = [];
  if (measurement.relaxedArm) perimeters.push(['Brazo relajado', `${measurement.relaxedArm} cm`]);
  if (measurement.flexedArm) perimeters.push(['Brazo flexionado', `${measurement.flexedArm} cm`]);
  if (measurement.waist) perimeters.push(['Cintura', `${measurement.waist} cm`]);
  if (measurement.hip) perimeters.push(['Cadera', `${measurement.hip} cm`]);
  if (measurement.thighSuperior) perimeters.push(['Muslo superior', `${measurement.thighSuperior} cm`]);
  if (measurement.calf) perimeters.push(['Pantorrilla', `${measurement.calf} cm`]);
  
  if (perimeters.length > 0) {
    // Nueva página si es necesario
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(14);
    doc.text('Perímetros', 20, yPos);
    yPos += 8;
    
    autoTable(doc, {
      startY: yPos,
      head: [['Perímetro', 'Valor']],
      body: perimeters,
      theme: 'striped',
      headStyles: { fillColor: [52, 152, 219] },
      margin: { left: 20, right: 20 }
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // Sección 5: Notas
  if (measurement.notes) {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(14);
    doc.text('Observaciones', 20, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    const splitNotes = doc.splitTextToSize(measurement.notes, 170);
    doc.text(splitNotes, 20, yPos);
  }
  
  // Guardar PDF
  const reportsDir = path.join(process.cwd(), 'reports');
  await fs.mkdir(reportsDir, { recursive: true });
  
  const filename = `report_${patient.name.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
  const filepath = path.join(reportsDir, filename);
  
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  await fs.writeFile(filepath, pdfBuffer);
  
  // Retornar ruta relativa para almacenar en DB
  return `/reports/${filename}`;
}
