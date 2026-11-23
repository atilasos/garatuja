import type { Rgb } from '../../core/draw';

/** Reused by pixel loops so a full page does not allocate a colour per pixel. */
export interface RgbOut {
  r: number;
  g: number;
  b: number;
}

export function byte(value: number) {
  if (value <= 0) return 0;
  if (value >= 255) return 255;
  return value | 0;
}

export function luma(r: number, g: number, b: number) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

export function mix(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function paintRgb(out: RgbOut, r: number, g: number, b: number) {
  out.r = r;
  out.g = g;
  out.b = b;
}

export function grayInto(out: RgbOut, r: number, g: number, b: number) {
  const y = luma(r, g, b);
  out.r = y;
  out.g = y;
  out.b = y;
}

/** Push chroma away from luminance. Amount 1 keeps the colour; 2 is vivid. */
export function saturateInto(out: RgbOut, r: number, g: number, b: number, amount: number) {
  const y = luma(r, g, b);
  out.r = y + (r - y) * amount;
  out.g = y + (g - y) * amount;
  out.b = y + (b - y) * amount;
}

export function nearColor(r: number, g: number, b: number, key: Rgb, limit = 78) {
  const dr = r - key.r;
  const dg = g - key.g;
  const db = b - key.b;
  return dr * dr + dg * dg + db * db <= limit * limit;
}

export function screenChannel(base: number, ink: number) {
  return 255 - ((255 - base) * (255 - ink)) / 255;
}
