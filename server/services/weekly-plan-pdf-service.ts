import jsPDF from "jspdf";
import autoTable, { RowInput } from "jspdf-autotable";
import fs from "fs";
import path from "path";
import type { WeeklyDietPlan, WeeklyPlanMeal, Meal, Patient, PatientGroup } from "@shared/schema";

const REPORTS_DIR = path.join(process.cwd(), "reports");

if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

const DAYS_OF_WEEK = ["LU", "MA", "MI", "JU", "VI", "SA", "DO"];

const COLUMN_CONFIG = [
  { key: "breakfast", label: "Desayuno", fallbackTime: "09:00 hs" },
  { key: "snack1", label: "Colación / Pre entreno", fallbackTime: "" },
  { key: "lunch", label: "Almuerzo", fallbackTime: "13:30 hs" },
  { key: "snack2", label: "Merienda", fallbackTime: "" },
  { key: "dinner", label: "Cena", fallbackTime: "" },
] as const;

const BRAND_COLORS = {
  header: [233, 215, 169],
  headerText: [66, 41, 24],
  columnHeader: [240, 240, 245],
  tableBorder: [185, 185, 195],
  dayLabel: [255, 239, 205],
  accent: [36, 123, 160],
  text: [55, 55, 55],
  noteBox: [250, 242, 235],
  noteBoxSecondary: [235, 243, 252],
  warning: [217, 83, 79],
};

type WeeklyPlanSlot = typeof COLUMN_CONFIG[number]["key"];

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

function formatMealContent(meals: MealWithDetails[]): string {
  if (meals.length === 0) {
    return "";
  }

  const entries = meals.map((meal) => {
    const lines: string[] = [];
    const name = meal.customName || meal.mealDetails?.name || "Comida personalizada";
    lines.push(name);

    if (meal.mealDetails?.description) {
      lines.push(meal.mealDetails.description);
    }

    if (meal.notes) {
      lines.push(meal.notes.toUpperCase());
    }

    return lines.join("\n");
  });

  return entries.join("\n\n");
}

function extractTimeLabel(meals: MealWithDetails[], fallback: string): string {
  const withTime = meals.find((meal) => meal.suggestedTime);
  if (!withTime) return fallback;
  return `${withTime.suggestedTime} hs`;
}

function parseGuidelines(raw?: string): Record<string, string[]> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
  } catch (_err) {
    // plain text fallback handled later
  }
  return null;
}

export async function generateWeeklyPlanPDF(params: GenerateWeeklyPlanPDFParams): Promise<string> {
  const { plan, meals, patient, group, assignmentNotes, startDate, endDate } = params;

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 14;

  // Header banner similar to las plantillas originales
  doc.setFillColor(...BRAND_COLORS.header);
  doc.rect(10, y, pageWidth - 20, 16, "F");
  doc.setTextColor(...BRAND_COLORS.headerText);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  const title = plan.name || "Plan nutricional personalizado";
  doc.text(title.toUpperCase(), pageWidth / 2, y + 6, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const subtitleParts: string[] = [];
  if (patient) subtitleParts.push(`Paciente: ${patient.name}`);
  if (group) subtitleParts.push(`Grupo: ${group.name}`);
  if (startDate || endDate) {
    subtitleParts.push(
      `Período: ${startDate ? new Date(startDate).toLocaleDateString("es-AR") : "—"} al ${endDate ? new Date(endDate).toLocaleDateString("es-AR") : "—"}`,
    );
  }
  doc.text(subtitleParts.join(" | "), pageWidth / 2, y + 11, { align: "center" });
  if (plan.goal) {
    doc.text(`Objetivo: ${plan.goal}`, pageWidth / 2, y + 15, { align: "center" });
  }
  y += 22;

  const summary: string[] = [];
  if (plan.dailyCalories) summary.push(`${plan.dailyCalories} kcal/día`);
  if (plan.proteinGrams) summary.push(`Proteínas ${plan.proteinGrams} g`);
  if (plan.carbsGrams) summary.push(`Hidratos ${plan.carbsGrams} g`);
  if (plan.fatsGrams) summary.push(`Grasas ${plan.fatsGrams} g`);
  if (summary.length > 0) {
    doc.setFillColor(...BRAND_COLORS.columnHeader);
    doc.roundedRect(10, y - 4, pageWidth - 20, 8, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND_COLORS.text);
    doc.setFontSize(9.5);
    doc.text(summary.join("   •   "), pageWidth / 2, y + 1, { align: "center" });
    y += 10;
  }

  const weekGrid: Record<number, Record<WeeklyPlanSlot, MealWithDetails[]>> = {} as any;
  for (let day = 1; day <= 7; day++) {
    weekGrid[day] = {
      breakfast: [],
      snack1: [],
      lunch: [],
      snack2: [],
      dinner: [],
    };
  }

  meals.forEach((meal) => {
    if (meal.dayOfWeek >= 1 && meal.dayOfWeek <= 7) {
      const slot = meal.mealSlot as WeeklyPlanSlot;
      if (!weekGrid[meal.dayOfWeek][slot]) {
        weekGrid[meal.dayOfWeek][slot] = [];
      }
      weekGrid[meal.dayOfWeek][slot].push(meal);
    }
  });

  const headRow: RowInput = COLUMN_CONFIG.map((column) => column.label);
  const timeRow: RowInput = COLUMN_CONFIG.map((column) => {
    const mealsForDay = weekGrid[1][column.key];
    return extractTimeLabel(mealsForDay, column.fallbackTime) || " ";
  });

  const bodyRows: RowInput[] = [];
  for (let day = 1; day <= 7; day++) {
    const row: string[] = [];
    COLUMN_CONFIG.forEach((column) => {
      const content = formatMealContent(weekGrid[day][column.key]);
      row.push(content || "—");
    });
    bodyRows.push(row);
  }

  autoTable(doc, {
    startY: y,
    head: [headRow, timeRow],
    body: bodyRows,
    tableLineColor: BRAND_COLORS.tableBorder,
    tableLineWidth: 0.2,
    theme: "grid",
    headStyles: [
      {
        fillColor: BRAND_COLORS.columnHeader,
        textColor: BRAND_COLORS.headerText,
        fontSize: 10,
        fontStyle: "bold",
        halign: "center",
        valign: "middle",
        cellPadding: 3,
      },
      {
        fillColor: BRAND_COLORS.columnHeader,
        textColor: BRAND_COLORS.accent,
        fontSize: 9,
        fontStyle: "bold",
        halign: "center",
        valign: "middle",
        cellPadding: 2,
      },
    ],
    bodyStyles: {
      fontSize: 8.5,
      textColor: BRAND_COLORS.text,
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 54 },
      1: { cellWidth: 54 },
      2: { cellWidth: 70 },
      3: { cellWidth: 54 },
      4: { cellWidth: 54 },
    },
    didParseCell: (data) => {
      if (data.section === "body") {
        const dayIndex = data.row.index;
        if (data.column.index === 0) {
          data.cell.styles.fillColor = BRAND_COLORS.dayLabel;
          data.cell.text = [`${DAYS_OF_WEEK[dayIndex]}`].concat(data.cell.text || []);
        }
        const raw = (data.cell.raw as string) || "";
        if (raw.toLowerCase().includes("musculación")) {
          data.cell.styles.textColor = BRAND_COLORS.accent;
          data.cell.styles.fontStyle = "bold";
        }
        if (raw.toLowerCase().includes("funcional")) {
          data.cell.styles.textColor = BRAND_COLORS.warning;
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
  });

  y = (doc as any).lastAutoTable.finalY + 6;

  if (assignmentNotes || plan.notes) {
    if (assignmentNotes) {
      doc.setFillColor(...BRAND_COLORS.noteBoxSecondary);
      doc.roundedRect(10, y, (pageWidth - 30) / 2, 40, 2, 2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...BRAND_COLORS.accent);
      doc.text("Notas personalizadas", 14, y + 6);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...BRAND_COLORS.text);
      const notesText = doc.splitTextToSize(assignmentNotes, (pageWidth - 30) / 2 - 8);
      doc.text(notesText, 14, y + 12);
    }

    const guidelines = parseGuidelines(plan.notes || undefined);
    if (guidelines) {
      const keys = Object.keys(guidelines);
      const boxWidth = (pageWidth - 30) / 2;
      let boxY = y;
      let columnX = assignmentNotes ? pageWidth / 2 + 5 : 10;

      keys.forEach((key, index) => {
        if (index === 2 && assignmentNotes) {
          columnX = 10;
          boxY += 44;
        } else if (index > 0 && index % 2 === 0 && !assignmentNotes) {
          columnX = 10;
          boxY += 44;
        } else if (index % 2 === 1) {
          columnX = pageWidth / 2 + 5;
        }

        doc.setFillColor(index % 2 === 0 ? BRAND_COLORS.noteBox : BRAND_COLORS.noteBoxSecondary);
        doc.roundedRect(columnX, boxY, boxWidth, 40, 2, 2, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(...BRAND_COLORS.accent);
        doc.text(`${key.toUpperCase()}:`, columnX + 4, boxY + 6);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...BRAND_COLORS.text);
        const content = guidelines[key].join(" • ");
        const wrapped = doc.splitTextToSize(content, boxWidth - 8);
        doc.text(wrapped, columnX + 4, boxY + 12);
      });
      y = boxY + 44;
    } else if (plan.notes) {
      const boxWidth = assignmentNotes ? (pageWidth - 30) / 2 : pageWidth - 20;
      const boxX = assignmentNotes ? pageWidth / 2 + 5 : 10;
      doc.setFillColor(...BRAND_COLORS.noteBox);
      doc.roundedRect(boxX, y, boxWidth, 40, 2, 2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...BRAND_COLORS.accent);
      doc.text("Observaciones generales", boxX + 4, y + 6);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...BRAND_COLORS.text);
      const wrapped = doc.splitTextToSize(plan.notes, boxWidth - 8);
      doc.text(wrapped, boxX + 4, y + 12);
      y += 44;
    }
  }

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(...BRAND_COLORS.text);
    doc.text(
      "Carolina Ibáñez · Nutrición Deportiva · contacto@carolinaibanez.com",
      pageWidth / 2,
      doc.internal.pageSize.height - 8,
      { align: "center" },
    );
  }

  const timestamp = Date.now();
  const sanitizedName = (plan.name || "plan").replace(/[^a-z0-9]/gi, "_").toLowerCase();
  const filename = `plan_${sanitizedName}_${timestamp}.pdf`;
  const filepath = path.join(REPORTS_DIR, filename);
  doc.save(filepath);

  return `/reports/${filename}`;
}
