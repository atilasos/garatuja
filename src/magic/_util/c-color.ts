import { hexToRgb, hslToRgb, rgbToHex, rgbToHsl } from '../../core/draw';

/** Clamp a number into [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Return a CSS rgba() string from a #rrggbb hex color. */
export function rgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1)})`;
}

/** Shift hue (degrees), saturation (-1..1), and lightness (-1..1) of a #rrggbb color. */
export function shiftColor(hex: string, dh = 0, ds = 0, dl = 0): string {
  const hsl = rgbToHsl(hexToRgb(hex));
  return rgbToHex(hslToRgb({
    h: (hsl.h + dh + 360) % 360,
    s: clamp(hsl.s + ds, 0, 1),
    l: clamp(hsl.l + dl, 0, 1),
  }));
}

/** Linearly mix two #rrggbb colors (t = 0 returns a, t = 1 returns b). */
export function mixColors(a: string, b: string, t: number): string {
  const k = clamp(t, 0, 1);
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  return rgbToHex({
    r: ca.r + (cb.r - ca.r) * k,
    g: ca.g + (cb.g - ca.g) * k,
    b: ca.b + (cb.b - ca.b) * k,
  });
}

/** Perceptual luminance in [0, 1]. */
export function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/** Light companion color for patterns; switches to warm muted tone when input is very light. */
export function patternPartner(hex: string): string {
  return luminance(hex) > 0.78 ? shiftColor(hex, 0, -0.05, -0.24) : mixColors(hex, '#fffdf7', 0.82);
}

/** Crisp contrasting outline color so very light chosen colors stay visible on white paper. */
export function edgeShade(hex: string): string {
  return luminance(hex) > 0.72 ? shiftColor(hex, 0, -0.05, -0.32) : shiftColor(hex, 0, 0.05, -0.22);
}

/** Bright highlight tint that still reads on light colors. */
export function highlightTint(hex: string): string {
  return luminance(hex) > 0.82 ? '#ffffff' : mixColors(hex, '#ffffff', 0.55);
}
