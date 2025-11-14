import { endOfDay, startOfDay, startOfYear, subDays, subMonths } from "date-fns";

export type TimeRangePreset = "7d" | "30d" | "90d" | "1y" | "ytd" | "all" | "custom";

export interface TimeRangeValue {
  preset: TimeRangePreset;
  from: Date | null;
  to: Date | null;
}

export const TIME_RANGE_PRESETS: Array<{
  value: TimeRangePreset;
  label: string;
  description?: string;
}> = [
  { value: "7d", label: "7 días", description: "Últimos 7 días" },
  { value: "30d", label: "30 días", description: "Últimos 30 días" },
  { value: "90d", label: "90 días", description: "Últimos 90 días" },
  { value: "1y", label: "1 año", description: "Últimos 12 meses" },
  { value: "ytd", label: "YTD", description: "Desde inicio del año" },
  { value: "all", label: "Todo" },
  { value: "custom", label: "Personalizado" },
];

export const getDefaultTimeRange = (): TimeRangeValue => {
  const { from, to } = getPresetRange("90d");
  return { preset: "90d", from, to };
};

export function getPresetRange(preset: TimeRangePreset, baseDate = new Date()): { from: Date | null; to: Date | null } {
  const today = endOfDay(baseDate);
  switch (preset) {
    case "7d":
      return { from: startOfDay(subDays(today, 6)), to: today };
    case "30d":
      return { from: startOfDay(subDays(today, 29)), to: today };
    case "90d":
      return { from: startOfDay(subDays(today, 89)), to: today };
    case "1y":
      return { from: startOfDay(subMonths(today, 12)), to: today };
    case "ytd":
      return { from: startOfDay(startOfYear(today)), to: today };
    case "all":
      return { from: null, to: null };
    case "custom":
    default:
      return { from: null, to: today };
  }
}

export function normalizeCustomRange(range: { from?: Date; to?: Date } | undefined, fallback: TimeRangeValue): TimeRangeValue {
  if (!range?.from || !range?.to) {
    return fallback;
  }
  const from = startOfDay(range.from);
  const to = endOfDay(range.to);
  if (from > to) {
    return { preset: "custom", from: to, to: from };
  }
  return { preset: "custom", from, to };
}

export function isDateWithinRange(date: Date | string, range: TimeRangeValue): boolean {
  if (!range.from && !range.to) return true;
  const value = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(value.getTime())) return false;
  if (range.from && value < startOfDay(range.from)) return false;
  if (range.to && value > endOfDay(range.to)) return false;
  return true;
}

export function getTimeRangeKey(range: TimeRangeValue): string {
  const fromKey = range.from ? startOfDay(range.from).toISOString() : "null";
  const toKey = range.to ? endOfDay(range.to).toISOString() : "null";
  return `${range.preset}:${fromKey}:${toKey}`;
}

export function rangeToQueryParams(range: TimeRangeValue): Record<string, string> {
  const params: Record<string, string> = {};
  if (range.from) {
    params.startDate = startOfDay(range.from).toISOString();
  }
  if (range.to) {
    params.endDate = endOfDay(range.to).toISOString();
  }
  return params;
}

export function formatRangeLabel(range: TimeRangeValue): string {
  const preset = TIME_RANGE_PRESETS.find((item) => item.value === range.preset);
  if (preset && preset.value !== "custom") {
    return preset.label;
  }
  if (range.from && range.to) {
    return `${range.from.toLocaleDateString()} - ${range.to.toLocaleDateString()}`;
  }
  return "Todo el histórico";
}

