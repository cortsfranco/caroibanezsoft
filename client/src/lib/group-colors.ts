/**
 * Utilidades para colores y gradientes de grupos de pacientes
 * Genera gradientes sutiles pero distintivos con transparencia
 */

/**
 * Convierte un color hex a RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Genera un gradiente translúcido para una card de grupo
 * @param color - Color hex del grupo
 * @returns String CSS con el gradiente
 */
export function getGroupGradient(color: string): string {
  const rgb = hexToRgb(color);
  if (!rgb) return "linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(59, 130, 246, 0.02))";
  
  // Gradiente diagonal sutil con opacidades bajas (8% a 2%)
  return `linear-gradient(135deg, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.12), rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.03))`;
}

/**
 * Genera un color de borde sutil basado en el color del grupo
 * @param color - Color hex del grupo
 * @returns String CSS con el color rgba
 */
export function getGroupBorderColor(color: string): string {
  const rgb = hexToRgb(color);
  if (!rgb) return "rgba(59, 130, 246, 0.2)";
  
  // Borde con 20% de opacidad
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`;
}

/**
 * Genera un color de texto/badge basado en el color del grupo
 * @param color - Color hex del grupo
 * @returns String CSS con el color rgba para texto
 */
export function getGroupAccentColor(color: string): string {
  const rgb = hexToRgb(color);
  if (!rgb) return "rgba(59, 130, 246, 0.8)";
  
  // Color más visible para badges y detalles (80% opacidad)
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.85)`;
}

/**
 * Genera un fondo sutil para badges basado en el color del grupo
 * @param color - Color hex del grupo
 * @returns String CSS con el color rgba
 */
export function getGroupBadgeBg(color: string): string {
  const rgb = hexToRgb(color);
  if (!rgb) return "rgba(59, 130, 246, 0.15)";
  
  // Fondo sutil para badges (15% opacidad)
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`;
}
