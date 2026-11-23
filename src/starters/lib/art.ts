/**
 * Shared drawing helpers for starters. This folder is not scanned by the
 * starter registry (it only globs `src/starters/*.ts`).
 */
import type { L10n } from '../../core/types';

export const paperCategory: L10n = { pt: 'Papel', en: 'Paper' };
export const structureCategory: L10n = { pt: 'Estruturas', en: 'Layouts' };
export const sceneCategory: L10n = { pt: 'Cenários', en: 'Scenes' };

/** Warm dark ink used by structural guides. */
export const ink = '#5b4a3e';

export type Box = { x: number; y: number; w: number; h: number };

export function roundRect(ctx: CanvasRenderingContext2D, b: Box, r: number) {
  ctx.beginPath();
  ctx.roundRect(b.x, b.y, b.w, b.h, r);
}

/**
 * Stroke the current path twice: a pale halo and a dark core. Structural lines
 * then stay visible on any paper colour, from white to black.
 */
export function inkStroke(ctx: CanvasRenderingContext2D, width = 6) {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#fffaf0';
  ctx.lineWidth = width + 5;
  ctx.stroke();
  ctx.strokeStyle = ink;
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.restore();
}

/** Thin, soft guide lines meant to be painted over (kept in the paper). */
export function guideStroke(ctx: CanvasRenderingContext2D, color = '#a9bfd3', width = 3, dash: number[] = []) {
  ctx.save();
  ctx.setLineDash(dash);
  ctx.lineCap = 'round';
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.restore();
}

export function panel(ctx: CanvasRenderingContext2D, b: Box, r = 18) {
  roundRect(ctx, b, r);
  inkStroke(ctx, 7);
}

/** Split an area into `cols × rows` panels separated by `gap`. */
export function grid(area: Box, cols: number, rows: number, gap: number): Box[] {
  const w = (area.w - gap * (cols - 1)) / cols;
  const h = (area.h - gap * (rows - 1)) / rows;
  const boxes: Box[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) boxes.push({ x: area.x + col * (w + gap), y: area.y + row * (h + gap), w, h });
  }
  return boxes;
}

/** Horizontal writing lines inside a box. */
export function writingLines(ctx: CanvasRenderingContext2D, b: Box, spacing: number) {
  ctx.beginPath();
  for (let y = b.y + spacing; y <= b.y + b.h + 0.5; y += spacing) {
    ctx.moveTo(b.x, y);
    ctx.lineTo(b.x + b.w, y);
  }
  guideStroke(ctx);
}

/** Curved arrow from `a` to `b`, bending by `bend` pixels to the left of travel. */
export function arrow(ctx: CanvasRenderingContext2D, ax: number, ay: number, bx: number, by: number, bend = 0, width = 7) {
  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2;
  const length = Math.hypot(bx - ax, by - ay) || 1;
  const nx = -(by - ay) / length;
  const ny = (bx - ax) / length;
  const cx = mx + nx * bend;
  const cy = my + ny * bend;
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.quadraticCurveTo(cx, cy, bx, by);
  inkStroke(ctx, width);
  const angle = Math.atan2(by - cy, bx - cx);
  const head = width * 4.2;
  ctx.beginPath();
  ctx.moveTo(bx - head * Math.cos(angle - 0.45), by - head * Math.sin(angle - 0.45));
  ctx.lineTo(bx, by);
  ctx.lineTo(bx - head * Math.cos(angle + 0.45), by - head * Math.sin(angle + 0.45));
  inkStroke(ctx, width);
}

/** Deterministic pseudo-random numbers so scenes always look the same. */
export function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let x = state;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export function vertical(ctx: CanvasRenderingContext2D, y0: number, y1: number, stops: [number, string][]) {
  const gradient = ctx.createLinearGradient(0, y0, 0, y1);
  for (const [at, color] of stops) gradient.addColorStop(at, color);
  return gradient;
}

export function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string | CanvasGradient) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

/** A puffy cloud built from overlapping circles. */
export function cloud(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, fill = '#ffffff') {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.beginPath();
  for (const [dx, dy, r] of [[-60, 10, 42], [-18, -18, 58], [38, -4, 48], [78, 16, 34], [10, 22, 44]]) {
    ctx.moveTo(x + dx * s + r * s, y + dy * s);
    ctx.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.restore();
}

/** Rolling hill band from `y` downwards. */
export function hills(ctx: CanvasRenderingContext2D, w: number, h: number, y: number, amplitude: number, waves: number, phase: number, fill: string | CanvasGradient) {
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= w; x += 20) ctx.lineTo(x, y + Math.sin(x / w * Math.PI * waves + phase) * amplitude);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

export function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, points = 5, inner = 0.45) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 ? r * inner : r;
    const angle = -Math.PI / 2 + i * Math.PI / points;
    ctx.lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
  }
  ctx.closePath();
}
