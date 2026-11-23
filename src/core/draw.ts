import { CANVAS_H, CANVAS_W, type Point, type Rect } from './types';

export function clampRect(rect: Rect, width = CANVAS_W, height = CANVAS_H): Rect {
  const x = Math.min(width, Math.max(0, Math.floor(rect.x)));
  const y = Math.min(height, Math.max(0, Math.floor(rect.y)));
  return {
    x, y,
    w: Math.max(0, Math.min(width, Math.ceil(rect.x + rect.w)) - x),
    h: Math.max(0, Math.min(height, Math.ceil(rect.y + rect.h)) - y),
  };
}

export function unionRect(a: Rect, b: Rect): Rect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
}

export function strokeBounds(from: Point, to: Point, padding: number): Rect {
  return {
    x: Math.min(from.x, to.x) - padding,
    y: Math.min(from.y, to.y) - padding,
    w: Math.abs(to.x - from.x) + padding * 2,
    h: Math.abs(to.y - from.y) + padding * 2,
  };
}

export function readRect(ctx: CanvasRenderingContext2D, rect: Rect) {
  const area = clampRect(rect, ctx.canvas.width, ctx.canvas.height);
  if (area.w === 0 || area.h === 0) return null;
  return { ...area, image: ctx.getImageData(area.x, area.y, area.w, area.h) };
}

export function writeRect(ctx: CanvasRenderingContext2D, image: ImageData, x: number, y: number) {
  x = Math.trunc(x);
  y = Math.trunc(y);
  const area = clampRect({ x, y, w: image.width, h: image.height }, ctx.canvas.width, ctx.canvas.height);
  if (area.w && area.h) ctx.putImageData(image, x, y, area.x - x, area.y - y, area.w, area.h);
}

export function pagePoint(point: Point, box: Rect, width = CANVAS_W, height = CANVAS_H): Point {
  return { x: (point.x - box.x) * width / box.w, y: (point.y - box.y) * height / box.h };
}

/** Visit evenly spaced positions. Carry the returned distance into the next segment. */
export function interpolateDabs(from: Point, to: Point, spacing: number, remaining: number,
  visit: (point: Point, fraction: number, angle: number, distance: number) => void): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length === 0 || spacing <= 0 || remaining < 0) return remaining;
  const angle = Math.atan2(dy, dx);
  let distance = remaining;
  for (; distance <= length; distance += spacing) {
    const fraction = distance / length;
    visit({ x: from.x + dx * fraction, y: from.y + dy * fraction }, fraction, angle, distance);
  }
  return distance - length;
}

export function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let n = Math.imul(seed ^ (seed >>> 15), seed | 1);
    n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Rgb { r: number; g: number; b: number }
export interface Hsl { h: number; s: number; l: number }

export function hexToRgb(hex: string): Rgb {
  if (!/^#[\da-f]{6}$/i.test(hex)) throw new RangeError('Expected #rrggbb');
  const value = Number.parseInt(hex.slice(1), 16);
  return { r: value >> 16, g: (value >> 8) & 255, b: value & 255 };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  return '#' + [r, g, b].map(value => Math.round(Math.min(255, Math.max(0, value))).toString(16).padStart(2, '0')).join('');
}

/** Hue is in degrees. Saturation and lightness are between zero and one. */
export function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const high = Math.max(r, g, b);
  const low = Math.min(r, g, b);
  const delta = high - low;
  const l = (high + low) / 510;
  if (!delta) return { h: 0, s: 0, l };
  const hue = high === r ? (g - b) / delta : high === g ? 2 + (b - r) / delta : 4 + (r - g) / delta;
  return { h: (hue * 60 + 360) % 360, s: delta / (255 * (1 - Math.abs(2 * l - 1))), l };
}

export function hslToRgb({ h, s, l }: Hsl): Rgb {
  const hue = ((h % 360) + 360) % 360 / 30;
  const amplitude = s * Math.min(l, 1 - l);
  const channel = (offset: number) => {
    const k = (offset + hue) % 12;
    return 255 * (l - amplitude * Math.max(-1, Math.min(k - 3, 9 - k, 1)));
  };
  return { r: channel(0), g: channel(8), b: channel(4) };
}
