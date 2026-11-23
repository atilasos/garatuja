import { hexToRgb, rgbToHsl, type Rgb } from '../draw';
import type { Painter } from '../flood';
import type { Point, Rect } from '../types';

/** What the Fill tool can paint a region with. Pure functions of the page position, so tests can check them. */

export type FillMode = 'solid' | 'linear' | 'radial' | 'stripes' | 'dots' | 'checks' | 'waves' | 'bricks';
export const fillModes: FillMode[] = ['solid', 'linear', 'radial', 'stripes', 'dots', 'checks', 'waves', 'bricks'];
export const gradientModes: ReadonlySet<FillMode> = new Set(['linear', 'radial']);

const mixRgb = (a: Rgb, b: Rgb, t: number): Rgb => ({ r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t });
const lightness = (c: Rgb) => rgbToHsl(c).l;

/** The colour a gradient fades to: a pale tint, or a darker tone when the colour is already pale. */
export function gradientEnd(color: Rgb): Rgb {
  return lightness(color) > .8 ? mixRgb(color, { r: 0, g: 0, b: 0 }, .28) : mixRgb(color, { r: 255, g: 255, b: 255 }, .72);
}

/** The background of a pattern: a soft tint of the colour, so the pattern stays readable in any colour. */
export function patternPaper(color: Rgb): Rgb {
  return lightness(color) > .88 ? mixRgb(color, { r: 0, g: 0, b: 0 }, .14) : mixRgb(color, { r: 255, g: 255, b: 255 }, .78);
}

export interface Gradient { from: Point; to: Point }

/** Where a gradient goes when the child just taps instead of dragging. */
export function defaultGradient(mode: 'linear' | 'radial', bounds: Rect, seed: Point): Gradient {
  if (mode === 'linear') {
    const x = bounds.x + bounds.w / 2;
    return { from: { x, y: bounds.y }, to: { x, y: bounds.y + bounds.h } };
  }
  const far = Math.max(Math.hypot(seed.x - bounds.x, seed.y - bounds.y), Math.hypot(seed.x - bounds.x - bounds.w, seed.y - bounds.y),
    Math.hypot(seed.x - bounds.x, seed.y - bounds.y - bounds.h), Math.hypot(seed.x - bounds.x - bounds.w, seed.y - bounds.y - bounds.h));
  return { from: seed, to: { x: seed.x + far, y: seed.y } };
}

export function gradientPainter(mode: 'linear' | 'radial', { from, to }: Gradient, start: Rgb, end: Rgb): Painter {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const span = Math.max(1, dx * dx + dy * dy);
  const radius = Math.max(1, Math.sqrt(span));
  return (x, y, out) => {
    const px = x + .5 - from.x;
    const py = y + .5 - from.y;
    const raw = mode === 'linear' ? (px * dx + py * dy) / span : Math.sqrt(px * px + py * py) / radius;
    const t = Math.min(1, Math.max(0, raw));
    out.r = start.r + (end.r - start.r) * t;
    out.g = start.g + (end.g - start.g) * t;
    out.b = start.b + (end.b - start.b) * t;
  };
}

/** Coverage (0..1) of a stripe centred on phase 0, with a pixel-wide soft edge. `v` is in periods. */
function stripe(v: number, halfWidth: number, period: number) {
  const distance = Math.abs(v - Math.round(v));
  return Math.min(1, Math.max(0, (halfWidth - distance) * period + .5));
}

export type PatternKind = 'stripes' | 'dots' | 'checks' | 'waves' | 'bricks';

/**
 * A repeating pattern anchored to the page, so neighbouring fills line up. `scale` shrinks the
 * pattern for small thumbnails.
 */
export function patternPainter(kind: PatternKind, ink: Rgb, paper: Rgb, scale = 1): Painter {
  const blend = (out: Rgb, coverage: number) => {
    out.r = paper.r + (ink.r - paper.r) * coverage;
    out.g = paper.g + (ink.g - paper.g) * coverage;
    out.b = paper.b + (ink.b - paper.b) * coverage;
  };
  switch (kind) {
    case 'stripes': {
      const period = 34 * scale;
      return (x, y, out) => blend(out, stripe((x + y) / (period * Math.SQRT2), .25, period));
    }
    case 'dots': {
      const cell = 38 * scale;
      const half = cell / 2;
      const reach = cell * .29;
      const inner = (reach - .5) ** 2;
      const outer = (reach + .5) ** 2;
      // Painters are called row by row, so work out what depends only on the row once per row.
      let lastY = NaN;
      let shift = 0;
      let dy2 = 0;
      return (x, y, out) => {
        if (y !== lastY) {
          lastY = y;
          const row = Math.floor(y / cell);
          shift = row % 2 ? half : 0;
          const dy = y - row * cell - half;
          dy2 = dy * dy;
        }
        const shifted = x - shift;
        const dx = shifted - cell * Math.floor(shifted / cell) - half;
        const d2 = dx * dx + dy2;
        // Only the one-pixel soft edge needs a square root.
        if (d2 <= inner) blend(out, 1);
        else if (d2 >= outer) blend(out, 0);
        else blend(out, Math.min(1, Math.max(0, reach - Math.sqrt(d2) + .5)));
      };
    }
    case 'checks': {
      const cell = 36 * scale;
      return (x, y, out) => blend(out, (Math.floor(x / cell) + Math.floor(y / cell)) & 1 ? 1 : 0);
    }
    case 'waves': {
      const period = 30 * scale;
      // The wave only depends on the column, so look it up instead of recomputing it for every pixel.
      const swing: number[] = [];
      return (x, y, out) => {
        const column = Math.floor(x);
        swing[column] ??= Math.sin(column / (22 * scale)) * 11 * scale;
        blend(out, stripe((y + swing[column]) / period, .25, period));
      };
    }
    case 'bricks': {
      const height = 28 * scale;
      const width = 68 * scale;
      const mortar = Math.max(1.5, 3.5 * scale);
      return (x, y, out) => {
        const row = Math.floor(y / height);
        const px = x + (row % 2 ? width / 2 : 0);
        const lx = ((px % width) + width) % width;
        const ly = y - row * height;
        blend(out, lx < mortar || ly < mortar ? 0 : 1);
      };
    }
  }
}

/** Build the painter for a mode. `gradient` is required for the gradient modes. */
export function fillPainter(mode: FillMode, color: string, gradient?: Gradient, scale = 1): Rgb | Painter {
  const ink = hexToRgb(color);
  if (mode === 'solid') return ink;
  if (mode === 'linear' || mode === 'radial') {
    if (!gradient) throw new Error('A gradient needs its direction');
    return gradientPainter(mode, gradient, ink, gradientEnd(ink));
  }
  // Bricks read best the other way round: brick-coloured bricks on a pale mortar.
  return patternPainter(mode, ink, patternPaper(ink), scale);
}

/** Paint a mode into a small canvas, for the option buttons. */
export function drawFillSample(ctx: CanvasRenderingContext2D, w: number, h: number, mode: FillMode, color: string) {
  const image = ctx.createImageData(w, h);
  const gradient: Gradient = { from: { x: w * .12, y: h * .12 }, to: { x: w * .9, y: h * .9 } };
  const radial: Gradient = { from: { x: w * .5, y: h * .5 }, to: { x: w * .98, y: h * .5 } };
  const painter = fillPainter(mode, color, mode === 'radial' ? radial : gradient, .5);
  const out: Rgb = { r: 0, g: 0, b: 0 };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (typeof painter === 'function') painter(x, y, out);
      else Object.assign(out, painter);
      image.data.set([out.r, out.g, out.b, 255], (y * w + x) * 4);
    }
  }
  ctx.putImageData(image, 0, 0);
}
