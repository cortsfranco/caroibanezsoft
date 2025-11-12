/**
 * Coordinated color system for charts and dashboard cards
 * Each metric has a base color (for cards with transparency) and a vivid color (for charts without transparency)
 */

export const CHART_COLORS = {
  weight: {
    base: 'hsl(217, 91%, 60%)',      // Blue - weight/BMI
    vivid: 'hsl(217, 91%, 55%)',
    gradient: ['hsl(217, 91%, 60%)', 'hsl(217, 91%, 45%)']
  },
  bodyFat: {
    base: 'hsl(142, 76%, 36%)',      // Green - body composition
    vivid: 'hsl(142, 76%, 40%)',
    gradient: ['hsl(142, 76%, 45%)', 'hsl(142, 76%, 30%)']
  },
  muscle: {
    base: 'hsl(262, 83%, 58%)',      // Purple - muscle mass
    vivid: 'hsl(262, 83%, 55%)',
    gradient: ['hsl(262, 83%, 60%)', 'hsl(262, 83%, 45%)']
  },
  skinfolds: {
    base: 'hsl(24, 95%, 53%)',       // Orange - skinfolds
    vivid: 'hsl(24, 95%, 50%)',
    gradient: ['hsl(24, 95%, 55%)', 'hsl(24, 95%, 40%)']
  },
  perimeters: {
    base: 'hsl(45, 93%, 47%)',       // Yellow/Gold - perimeters
    vivid: 'hsl(45, 93%, 50%)',
    gradient: ['hsl(45, 93%, 55%)', 'hsl(45, 93%, 40%)']
  },
  bmi: {
    base: 'hsl(199, 89%, 48%)',      // Cyan - BMI
    vivid: 'hsl(199, 89%, 45%)',
    gradient: ['hsl(199, 89%, 50%)', 'hsl(199, 89%, 35%)']
  },
  waistHip: {
    base: 'hsl(340, 82%, 52%)',      // Pink/Red - ratios
    vivid: 'hsl(340, 82%, 50%)',
    gradient: ['hsl(340, 82%, 55%)', 'hsl(340, 82%, 40%)']
  },
  height: {
    base: 'hsl(173, 58%, 39%)',      // Teal - height
    vivid: 'hsl(173, 58%, 42%)',
    gradient: ['hsl(173, 58%, 45%)', 'hsl(173, 58%, 32%)']
  }
} as const;

export type MetricKey = keyof typeof CHART_COLORS;

/**
 * Get color configuration for a metric
 */
export function getMetricColor(metric: MetricKey) {
  return CHART_COLORS[metric];
}

/**
 * Get all vivid colors for multi-series charts
 */
export function getAllVividColors(): string[] {
  return Object.values(CHART_COLORS).map(c => c.vivid);
}

/**
 * Get gradient colors for area charts
 */
export function getGradientColors(metric: MetricKey): readonly string[] {
  return CHART_COLORS[metric].gradient;
}

/**
 * Chart type options
 */
export const CHART_TYPES = {
  line: { value: 'line', label: 'Línea' },
  area: { value: 'area', label: 'Área' },
  bar: { value: 'bar', label: 'Barras' },
  pie: { value: 'pie', label: 'Torta' }
} as const;

export type ChartType = keyof typeof CHART_TYPES;
