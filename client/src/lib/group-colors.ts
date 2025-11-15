/**
 * Utilidades para colores y gradientes de grupos de pacientes
 * Genera gradientes sutiles pero distintivos con transparencia
 */

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function hexToRgb(hex: string) {
  let sanitized = hex.replace("#", "");
  if (sanitized.length === 3) {
    sanitized = sanitized.split("").map((char) => char + char).join("");
  }
  const intValue = parseInt(sanitized, 16);
  const r = (intValue >> 16) & 255;
  const g = (intValue >> 8) & 255;
  const b = intValue & 255;
  return { r, g, b };
}

function rgbToHsl(r: number, g: number, b: number) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }

    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

function parseHexColor(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHsl(r, g, b);
}

function hslToHex(h: number, s: number, l: number) {
  s /= 100;
  l /= 100;

  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const color = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return Math.round(255 * color);
  };

  const r = f(0);
  const g = f(8);
  const b = f(4);

  const toHex = (value: number) => value.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function getGroupGradient(baseColor: string): string {
  const { h, s, l } = parseHexColor(baseColor);
  const gradientStart = { h, s: clamp(s + 15, 0, 100), l: clamp(l + 18, 0, 100) };
  const gradientEnd = { h, s: clamp(s + 5, 0, 100), l: clamp(l - 5, 0, 100) };
  return `linear-gradient(135deg, hsl(${gradientStart.h} ${gradientStart.s}% ${gradientStart.l}%), hsl(${gradientEnd.h} ${gradientEnd.s}% ${gradientEnd.l}%))`;
}

export function getGroupBorderColor(baseColor: string): string {
  const { h, s, l } = parseHexColor(baseColor);
  const border = { h, s: clamp(s - 6, 0, 100), l: clamp(l - 18, 0, 100) };
  return `hsl(${border.h} ${border.s}% ${border.l}%)`;
}

export function getGroupBadgeBg(baseColor: string): string {
  const { r, g, b } = hexToRgb(baseColor);
  return `rgba(${r}, ${g}, ${b}, 0.25)`;
}

export function getGroupBadgeText(baseColor: string): string {
  const { h, s, l } = parseHexColor(baseColor);
  const text = { h, s: clamp(s + 4, 0, 100), l: clamp(l - 32, 0, 100) };
  return `hsl(${text.h} ${text.s}% ${text.l}%)`;
}

export function getGroupAccentColor(baseColor: string): string {
  return getGroupBadgeText(baseColor);
}
