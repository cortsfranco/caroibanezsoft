export type NormalizedObjective = "loss" | "maintain" | "gain";

type ObjectiveDisplay = {
  label: string;
  badge: string;
  text: string;
  bgSoft: string;
};

const objectiveMap: Record<NormalizedObjective, ObjectiveDisplay> = {
  loss: {
    label: "Pérdida de grasa",
    badge: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-200 dark:border-red-900",
    text: "text-red-600 dark:text-red-200",
    bgSoft: "bg-red-50/70 dark:bg-red-900/20",
  },
  maintain: {
    label: "Mantenimiento",
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-900",
    text: "text-emerald-600 dark:text-emerald-200",
    bgSoft: "bg-emerald-50/70 dark:bg-emerald-900/20",
  },
  gain: {
    label: "Ganancia muscular",
    badge: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-900",
    text: "text-amber-600 dark:text-amber-200",
    bgSoft: "bg-amber-50/70 dark:bg-amber-900/20",
  },
};

function stripDiacritics(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .normalize("NFC");
}

export function normalizeObjective(value?: string | null): NormalizedObjective | null {
  if (!value) return null;
  const normalized = stripDiacritics(value).trim().toLowerCase();

  if (normalized.includes("loss") || normalized.includes("perd") || normalized.includes("bajar")) {
    return "loss";
  }
  if (normalized.includes("gain") || normalized.includes("gan") || normalized.includes("hipert")) {
    return "gain";
  }
  return "maintain";
}

export function getObjectiveBadgeClasses(value?: string | null) {
  const normalized = normalizeObjective(value);
  if (!normalized) {
    return "bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-900/60 dark:text-slate-200 dark:border-slate-800";
  }
  return objectiveMap[normalized].badge;
}

export function getObjectiveLabel(value?: string | null) {
  const normalized = normalizeObjective(value);
  if (!normalized) return value ?? "Sin objetivo";
  return objectiveMap[normalized].label;
}

export function getObjectiveTextClass(value?: string | null) {
  const normalized = normalizeObjective(value);
  if (!normalized) return "text-slate-600 dark:text-slate-300";
  return objectiveMap[normalized].text;
}

export function getObjectiveBgSoft(value?: string | null) {
  const normalized = normalizeObjective(value);
  if (!normalized) return "bg-slate-100 dark:bg-slate-900/40";
  return objectiveMap[normalized].bgSoft;
}
