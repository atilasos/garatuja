import { clampRect, hexToRgb, hslToRgb, rgbToHex, rgbToHsl, unionRect } from '../draw';
import type { Rect } from '../types';

/** Small helpers shared by the brush plug-ins: colours, scratch canvases, wash layers and paper grain. */

type Context = CanvasRenderingContext2D;

/* ------------------------------------------------------------------ */
/* Colour                                                              */
/* ------------------------------------------------------------------ */

export function mix(from: string, to: string, amount: number): string {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  return rgbToHex({ r: a.r + (b.r - a.r) * amount, g: a.g + (b.g - a.g) * amount, b: a.b + (b.b - a.b) * amount });
}

export function rgba(color: string, alpha: number): string {
  const { r, g, b } = hexToRgb(color);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Move the HSL lightness by `delta` (−1..1). */
export function shade(color: string, delta: number): string {
  const hsl = rgbToHsl(hexToRgb(color));
  return rgbToHex(hslToRgb({ ...hsl, l: Math.min(.97, Math.max(.03, hsl.l + delta)) }));
}

export interface Hue { h: number; s: number; l: number }

export function hslOf(color: string): Hue { return rgbToHsl(hexToRgb(color)); }

export function hsl(h: number, s: number, l: number): string { return rgbToHex(hslToRgb({ h, s, l })); }

/* ------------------------------------------------------------------ */
/* Scratch canvases                                                    */
/* ------------------------------------------------------------------ */

const canvases = new Map<string, HTMLCanvasElement>();

/** A reusable offscreen canvas that only grows. Contents are kept; use `scratch` for a cleared one. */
export function reusable(key: string, width: number, height: number): Context {
  let canvas = canvases.get(key);
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvases.set(key, canvas);
  }
  if (canvas.width < width) canvas.width = Math.ceil(width);
  if (canvas.height < height) canvas.height = Math.ceil(height);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D is unavailable');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  return ctx;
}

export function scratch(key: string, width: number, height: number): Context {
  const ctx = reusable(key, width, height);
  ctx.clearRect(0, 0, width, height);
  return ctx;
}

/* ------------------------------------------------------------------ */
/* Wash layer: one flat translucent stroke instead of accumulating dabs */
/* ------------------------------------------------------------------ */

/**
 * Brushes that must not build up inside one stroke (marker, neon) paint on a private
 * layer. The layer is shown over the pixels the page had when the stroke began, so
 * overlapping dabs never add opacity to each other.
 *
 * Showing the layer is the expensive part (the browser copies the whole layer each time it
 * is drawn and then changed), so dabs only mark what they touched and the host calls
 * `flushLayers` once per pointer movement.
 */
const active = new Set<Layer>();

export class Layer {
  private target?: Context;
  private fresh = true;
  private dirty?: Rect;

  constructor(private readonly alpha = 1) {}

  /** Call from the brush's `begin`. */
  reset() { this.fresh = true; this.dirty = undefined; }

  paint(ctx: Context, area: Rect, draw: (layer: Context) => void) {
    const { width, height } = ctx.canvas;
    const layer = reusable('layer-top', width, height);
    if (this.fresh || this.target !== ctx) {
      const base = reusable('layer-base', width, height);
      base.clearRect(0, 0, width, height);
      base.drawImage(ctx.canvas, 0, 0);
      layer.clearRect(0, 0, width, height);
      this.target = ctx;
      this.fresh = false;
    }
    draw(layer);
    layer.globalCompositeOperation = 'source-over';
    this.dirty = this.dirty ? unionRect(this.dirty, area) : area;
    active.add(this);
  }

  flush() {
    active.delete(this);
    const ctx = this.target;
    if (!ctx || !this.dirty) return;
    const { width, height } = ctx.canvas;
    const a = clampRect(this.dirty, width, height);
    this.dirty = undefined;
    if (!a.w || !a.h) return;
    const base = reusable('layer-base', width, height);
    const layer = reusable('layer-top', width, height);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.clearRect(a.x, a.y, a.w, a.h);
    ctx.drawImage(base.canvas, a.x, a.y, a.w, a.h, a.x, a.y, a.w, a.h);
    ctx.globalAlpha = this.alpha;
    ctx.drawImage(layer.canvas, a.x, a.y, a.w, a.h, a.x, a.y, a.w, a.h);
    ctx.restore();
  }
}

/** Show every layer that was painted since the last call. The brush host calls this after each batch of dabs. */
export function flushLayers() {
  for (const layer of [...active]) layer.flush();
}

/* ------------------------------------------------------------------ */
/* Paper grain: a seamless noise tile anchored to page coordinates      */
/* ------------------------------------------------------------------ */

const TILE = 192;

export interface GrainSpec {
  key: string;
  seed: number;
  /** Lattice cell sizes in pixels. Each must divide 192 so the tile repeats seamlessly. */
  cells: number[];
  /** Noise above this value leaves paint; below it the paper shows through. */
  threshold: number;
  softness: number;
}

export interface Grain {
  canvas: HTMLCanvasElement;
  pattern?: CanvasPattern;
}

const grains = new Map<string, Grain>();

function lattice(seed: number, cell: number) {
  const n = TILE / cell;
  const values = new Float32Array(n * n);
  let state = seed | 0;
  for (let i = 0; i < values.length; i++) {
    state = (Math.imul(state, 1664525) + 1013904223) | 0;
    values[i] = (state >>> 8) / 16777216;
  }
  return (x: number, y: number) => {
    const gx = x / cell;
    const gy = y / cell;
    const x0 = Math.floor(gx);
    const y0 = Math.floor(gy);
    const fx = gx - x0;
    const fy = gy - y0;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const at = (ix: number, iy: number) => values[((iy % n + n) % n) * n + ((ix % n + n) % n)];
    const top = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * sx;
    const bottom = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * sx;
    return top + (bottom - top) * sy;
  };
}

export function grain(spec: GrainSpec): Grain {
  const cached = grains.get(spec.key);
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = TILE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D is unavailable');
  const samplers = spec.cells.map((cell, i) => lattice(spec.seed * 31 + i * 977, cell));
  const image = ctx.createImageData(TILE, TILE);
  const low = spec.threshold - spec.softness;
  const span = Math.max(.0001, spec.softness * 2);
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      let value = 0;
      for (const sample of samplers) value += sample(x, y);
      value /= samplers.length;
      // Averaging squeezes the range towards .5, so stretch it before thresholding.
      value = Math.min(1, Math.max(0, (value - .5) * 2.2 + .5));
      const t = Math.min(1, Math.max(0, (value - low) / span));
      image.data[(y * TILE + x) * 4 + 3] = Math.round(t * t * (3 - 2 * t) * 255);
    }
  }
  ctx.putImageData(image, 0, 0);
  const result: Grain = { canvas };
  grains.set(spec.key, result);
  return result;
}

/**
 * Paint one dab through the grain. `shape` draws the dab's silhouette on a private
 * canvas centred at (cx, cy); the grain then punches holes in it, and the result is
 * stamped onto `ctx`. The grain is aligned to the page, so overlapping dabs leave
 * the same holes and the texture reads as paper tooth rather than noise.
 */
export function grainDab(ctx: Context, x: number, y: number, radius: number, texture: Grain, alpha: number,
  shape: (s: Context, cx: number, cy: number) => void) {
  const box = Math.ceil(radius * 2) + 4;
  const ox = Math.round(x - box / 2);
  const oy = Math.round(y - box / 2);
  const s = scratch('dab', box, box);
  shape(s, x - ox, y - oy);
  s.globalCompositeOperation = 'destination-in';
  s.setTransform(1, 0, 0, 1, -ox, -oy);
  texture.pattern ??= s.createPattern(texture.canvas, 'repeat') ?? undefined;
  if (texture.pattern) {
    s.fillStyle = texture.pattern;
    s.fillRect(ox, oy, box, box);
  }
  s.setTransform(1, 0, 0, 1, 0, 0);
  s.globalCompositeOperation = 'source-over';
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(s.canvas, 0, 0, box, box, ox, oy, box, box);
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Shapes used by several brushes                                      */
/* ------------------------------------------------------------------ */

/** A four-pointed sparkle with concave sides. */
export function sparklePath(ctx: Context, x: number, y: number, radius: number, rotation: number) {
  ctx.beginPath();
  const tip = (k: number) => [x + Math.cos(rotation + k * Math.PI / 2) * radius, y + Math.sin(rotation + k * Math.PI / 2) * radius];
  const [startX, startY] = tip(0);
  ctx.moveTo(startX, startY);
  for (let k = 0; k < 4; k++) {
    const middle = rotation + k * Math.PI / 2 + Math.PI / 4;
    const [endX, endY] = tip(k + 1);
    ctx.quadraticCurveTo(x + Math.cos(middle) * radius * .2, y + Math.sin(middle) * radius * .2, endX, endY);
  }
  ctx.closePath();
}

/** Walking brushes alternate sides: which step of the stroke is this dab? */
export function stepIndex(travelled: number, size: number, spacing: number) {
  return Math.round(travelled / Math.max(1, size * spacing));
}

/** Width factor for brushes driven by speed: slow = wide, fast = thin. */
export function speedWidth(speed: number | undefined) {
  const s = speed ?? .6;
  return Math.min(1.2, Math.max(.25, 1.25 - .38 * s));
}
