import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import fs from "fs";
import path from "path";
import type { WeeklyDietPlan, WeeklyPlanMeal, Meal, Patient, PatientGroup } from "@shared/schema";

const REPORTS_DIR = path.join(process.cwd(), "reports");

if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

const DAYS_OF_WEEK = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const MEAL_TYPES: Record<string, string> = {
  breakfast: "Desayuno",
  snack1: "Colación AM",
  lunch: "Almuerzo",
  snack2: "Colación PM",
  dinner: "Cena",
};

interface MealWithDetails extends WeeklyPlanMeal {
  mealDetails?: Meal;
}

interface GenerateWeeklyPlanPDFParams {
  plan: WeeklyDietPlan;
  meals: MealWithDetails[];
  patient?: Patient;
  group?: PatientGroup;
  assignmentNotes?: string;
  startDate?: Date;
  endDate?: Date;
}

export async function generateWeeklyPlanPDF(params: GenerateWeeklyPlanPDFParams): Promise<string> {
  const { plan, meals, patient, group, assignmentNotes, startDate, endDate } = params;
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  let yPosition = 20;

  // Header
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Plan Semanal de Alimentación", pageWidth / 2, yPosition, { align: "center" });
  yPosition += 10;

  // Plan name
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.text(plan.name, pageWidth / 2, yPosition, { align: "center" });
  yPosition += 15;

  // Patient/Group info
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  if (patient) {
    doc.text(`Paciente: ${patient.name}`, 14, yPosition);
    yPosition += 6;
  } else if (group) {
    doc.text(`Grupo: ${group.name}`, 14, yPosition);
    yPosition += 6;
  }

  // Date range
  if (startDate || endDate) {
    const dateText = `Período: ${startDate ? new Date(startDate).toLocaleDateString('es-AR') : '—'} al ${endDate ? new Date(endDate).toLocaleDateString('es-AR') : '—'}`;
    doc.text(dateText, 14, yPosition);
    yPosition += 6;
  }

  // Nutritional goals
  if (plan.goal) {
    doc.text(`Objetivo: ${plan.goal}`, 14, yPosition);
    yPosition += 6;
  }

  const nutritionalInfo = [];
  if (plan.dailyCalories) nutritionalInfo.push(`${plan.dailyCalories} kcal/día`);
  if (plan.proteinGrams) nutritionalInfo.push(`Proteínas: ${plan.proteinGrams}g`);
  if (plan.carbsGrams) nutritionalInfo.push(`Carbohidratos: ${plan.carbsGrams}g`);
  if (plan.fatsGrams) nutritionalInfo.push(`Grasas: ${plan.fatsGrams}g`);

  if (nutritionalInfo.length > 0) {
    doc.setFont("helvetica", "normal");
    doc.text(nutritionalInfo.join(" | "), 14, yPosition);
    yPosition += 10;
  } else {
    yPosition += 4;
  }

  // Organize meals by day and meal type
  const weekGrid: Record<number, Record<string, MealWithDetails[]>> = {};
  
  for (let day = 1; day <= 7; day++) {
    weekGrid[day] = {
      breakfast: [],
      snack1: [],
      lunch: [],
      snack2: [],
      dinner: [],
    };
  }

  meals.forEach(meal => {
    if (meal.dayOfWeek >= 1 && meal.dayOfWeek <= 7) {
      const mealType = meal.mealSlot;
      if (!weekGrid[meal.dayOfWeek][mealType]) {
        weekGrid[meal.dayOfWeek][mealType] = [];
      }
      weekGrid[meal.dayOfWeek][mealType].push(meal);
    }
  });

  // Generate table for each day
  for (let dayNum = 1; dayNum <= 7; dayNum++) {
    const dayName = DAYS_OF_WEEK[dayNum - 1];
    const dayMeals = weekGrid[dayNum];

    // Check if we need a new page
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    // Day header
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setFillColor(230, 240, 250);
    doc.rect(14, yPosition - 5, pageWidth - 28, 8, "F");
    doc.text(dayName, 16, yPosition);
    yPosition += 10;

    // Build table data for this day
    const tableData: any[] = [];

    Object.keys(dayMeals).forEach(mealTypeKey => {
      const mealsList = dayMeals[mealTypeKey];
      
      if (mealsList.length > 0) {
        // Get the time (use first meal's time or default)
        const mealTime = mealsList[0].suggestedTime || "—";
        
        // Build food list with "+" separator
        const foodNames = mealsList.map(m => {
          if (m.mealDetails) {
            return m.mealDetails.name;
          } else if (m.customName) {
            return m.customName;
          } else {
            return "Comida personalizada";
          }
        });

        const foodText = foodNames.join(" + ");

        tableData.push([
          MEAL_TYPES[mealTypeKey] || mealTypeKey,
          mealTime,
          foodText,
        ]);
      }
    });

    if (tableData.length > 0) {
      autoTable(doc, {
        startY: yPosition,
        head: [["Comida", "Horario", "Alimentos"]],
        body: tableData,
        theme: "grid",
        headStyles: {
          fillColor: [100, 150, 200],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 10,
        },
        styles: {
          fontSize: 9,
          cellPadding: 4,
        },
        columnStyles: {
          0: { cellWidth: 30, fontStyle: "bold" },
          1: { cellWidth: 25, halign: "center" },
          2: { cellWidth: "auto" },
        },
        margin: { left: 14, right: 14 },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 8;
    } else {
      doc.setFontSize(9);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(120, 120, 120);
      doc.text("Sin comidas asignadas", 16, yPosition);
      doc.setTextColor(0, 0, 0);
      yPosition += 10;
    }
  }

  // Assignment notes
  if (assignmentNotes) {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Notas:", 14, yPosition);
    yPosition += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    
    const splitNotes = doc.splitTextToSize(assignmentNotes, pageWidth - 28);
    doc.text(splitNotes, 14, yPosition);
    yPosition += splitNotes.length * 5;
  }

  // Plan notes (general)
  if (plan.notes) {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Observaciones del Plan:", 14, yPosition);
    yPosition += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    
    const splitPlanNotes = doc.splitTextToSize(plan.notes, pageWidth - 28);
    doc.text(splitPlanNotes, 14, yPosition);
  }

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(120, 120, 120);
    doc.text(
      `Carolina Ibáñez - Nutricionista | Página ${i} de ${totalPages}`,
      pageWidth / 2,
      doc.internal.pageSize.height - 10,
      { align: "center" }
    );
    doc.setTextColor(0, 0, 0);
  }

  // Save PDF
  const timestamp = Date.now();
  const sanitizedName = plan.name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  const filename = `plan_${sanitizedName}_${timestamp}.pdf`;
  const filepath = path.join(REPORTS_DIR, filename);

  doc.save(filepath);

  return `/reports/${filename}`;
}
