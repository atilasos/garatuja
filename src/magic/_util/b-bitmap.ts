import { clampRect, strokeBounds } from '../../core/draw';
import type { Point, Rect, ToolContext } from '../../core/types';
import { byte, type RgbOut } from './b-color';

export type PaintFn = (
  r: number, g: number, b: number, x: number, y: number, out: RgbOut, c: ToolContext,
) => void;

export function paintingContext(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D is unavailable');
  return ctx;
}

export function readPoint(ctx: CanvasRenderingContext2D, x: number, y: number, out: RgbOut) {
  const px = Math.max(0, Math.min(ctx.canvas.width - 1, Math.floor(x)));
  const py = Math.max(0, Math.min(ctx.canvas.height - 1, Math.floor(y)));
  const data = ctx.getImageData(px, py, 1, 1).data;
  out.r = data[0];
  out.g = data[1];
  out.b = data[2];
}

export function distanceToSegment(px: number, py: number, from: Point, to: Point) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq < 1e-6) return Math.hypot(px - from.x, py - from.y);
  const t = Math.max(0, Math.min(1, ((px - from.x) * dx + (py - from.y) * dy) / lengthSq));
  return Math.hypot(px - (from.x + dx * t), py - (from.y + dy * t));
}

/** Soft round brush: 1 inside, smooth falloff, 0 outside. */
export function brushCoverage(px: number, py: number, from: Point, to: Point, radius: number) {
  const dist = distanceToSegment(px + 0.5, py + 0.5, from, to);
  const inner = radius * 0.62;
  if (dist >= radius) return 0;
  if (dist <= inner) return 1;
  const t = (radius - dist) / (radius - inner);
  return t * t * (3 - 2 * t);
}

export function filterStroke(c: ToolContext, from: Point, to: Point, size: number, map: PaintFn) {
  const radius = Math.max(1, size / 2);
  const rect = clampRect(strokeBounds(from, to, radius + 1), c.width, c.height);
  if (!rect.w || !rect.h) return;
  const src = paintingContext(c.snapshot).getImageData(rect.x, rect.y, rect.w, rect.h);
  const dest = c.ctx.getImageData(rect.x, rect.y, rect.w, rect.h);
  const source = src.data;
  const data = dest.data;
  const out: RgbOut = { r: 0, g: 0, b: 0 };
  for (let y = 0; y < rect.h; y++) {
    for (let x = 0; x < rect.w; x++) {
      const cover = brushCoverage(rect.x + x, rect.y + y, from, to, radius);
      if (cover <= 0) continue;
      const i = (y * rect.w + x) * 4;
      map(source[i], source[i + 1], source[i + 2], rect.x + x, rect.y + y, out, c);
      data[i] = byte(source[i] + (out.r - source[i]) * cover);
      data[i + 1] = byte(source[i + 1] + (out.g - source[i + 1]) * cover);
      data[i + 2] = byte(source[i + 2] + (out.b - source[i + 2]) * cover);
      data[i + 3] = 255;
    }
  }
  c.ctx.putImageData(dest, rect.x, rect.y);
  c.markDirty(rect);
}

export function filterPage(c: ToolContext, map: PaintFn) {
  const width = c.width;
  const height = c.height;
  if (!width || !height) return;
  const image = c.ctx.getImageData(0, 0, width, height);
  const data = image.data;
  const out: RgbOut = { r: 0, g: 0, b: 0 };
  for (let y = 0, i = 0; y < height; y++) {
    for (let x = 0; x < width; x++, i += 4) {
      map(data[i], data[i + 1], data[i + 2], x, y, out, c);
      data[i] = byte(out.r);
      data[i + 1] = byte(out.g);
      data[i + 2] = byte(out.b);
      data[i + 3] = 255;
    }
  }
  c.ctx.putImageData(image, 0, 0);
  c.markAllDirty();
}

export function sampleClamp(data: Uint8ClampedArray, w: number, h: number, x: number, y: number, out: RgbOut) {
  if (x < 0) x = 0;
  else if (x > w - 1) x = w - 1;
  if (y < 0) y = 0;
  else if (y > h - 1) y = h - 1;
  const x0 = x | 0;
  const y0 = y | 0;
  const x1 = x0 + 1 < w ? x0 + 1 : x0;
  const y1 = y0 + 1 < h ? y0 + 1 : y0;
  const tx = x - x0;
  const ty = y - y0;
  const i00 = (y0 * w + x0) * 4;
  const i10 = (y0 * w + x1) * 4;
  const i01 = (y1 * w + x0) * 4;
  const i11 = (y1 * w + x1) * 4;
  const mixRow = (offset: number) => {
    const a = data[i00 + offset] + (data[i10 + offset] - data[i00 + offset]) * tx;
    const b = data[i01 + offset] + (data[i11 + offset] - data[i01 + offset]) * tx;
    return a + (b - a) * ty;
  };
  out.r = mixRow(0);
  out.g = mixRow(1);
  out.b = mixRow(2);
}

export function sampleWrap(data: Uint8ClampedArray, w: number, h: number, x: number, y: number, out: RgbOut) {
  const wrap = (value: number, size: number) => ((value % size) + size) % size;
  const wx = wrap(x, w);
  const wy = wrap(y, h);
  const x0 = wx | 0;
  const y0 = wy | 0;
  const x1 = (x0 + 1) % w;
  const y1 = (y0 + 1) % h;
  const tx = wx - x0;
  const ty = wy - y0;
  const i00 = (y0 * w + x0) * 4;
  const i10 = (y0 * w + x1) * 4;
  const i01 = (y1 * w + x0) * 4;
  const i11 = (y1 * w + x1) * 4;
  const mixRow = (offset: number) => {
    const a = data[i00 + offset] + (data[i10 + offset] - data[i00 + offset]) * tx;
    const b = data[i01 + offset] + (data[i11 + offset] - data[i01 + offset]) * tx;
    return a + (b - a) * ty;
  };
  out.r = mixRow(0);
  out.g = mixRow(1);
  out.b = mixRow(2);
}

export function warpPage(
  c: ToolContext,
  locate: (x: number, y: number, w: number, h: number, out: Point) => void,
  wrap = false,
) {
  const w = c.width;
  const h = c.height;
  if (!w || !h) return;
  const src = c.ctx.getImageData(0, 0, w, h);
  const image = new ImageData(w, h);
  const source = src.data;
  const data = image.data;
  const point: Point = { x: 0, y: 0 };
  const color: RgbOut = { r: 0, g: 0, b: 0 };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      locate(x, y, w, h, point);
      if (wrap) sampleWrap(source, w, h, point.x, point.y, color);
      else sampleClamp(source, w, h, point.x, point.y, color);
      const i = (y * w + x) * 4;
      data[i] = byte(color.r);
      data[i + 1] = byte(color.g);
      data[i + 2] = byte(color.b);
      data[i + 3] = 255;
    }
  }
  c.ctx.putImageData(image, 0, 0);
  c.markAllDirty();
}

export function warpStroke(
  c: ToolContext,
  from: Point,
  to: Point,
  size: number,
  locate: (x: number, y: number, out: Point) => void,
) {
  const radius = Math.max(1, size / 2);
  const rect = clampRect(strokeBounds(from, to, radius + 1), c.width, c.height);
  if (!rect.w || !rect.h) return;
  const srcRect = clampRect(strokeBounds(from, to, radius + size), c.width, c.height);
  const snap = paintingContext(c.snapshot).getImageData(srcRect.x, srcRect.y, srcRect.w, srcRect.h);
  const dest = c.ctx.getImageData(rect.x, rect.y, rect.w, rect.h);
  const source = snap.data;
  const data = dest.data;
  const point: Point = { x: 0, y: 0 };
  const color: RgbOut = { r: 0, g: 0, b: 0 };
  for (let y = 0; y < rect.h; y++) {
    for (let x = 0; x < rect.w; x++) {
      const px = rect.x + x;
      const py = rect.y + y;
      const cover = brushCoverage(px, py, from, to, radius);
      if (cover <= 0) continue;
      const i = (y * rect.w + x) * 4;
      locate(px, py, point);
      const localX = Math.max(0, Math.min(srcRect.w - 1, point.x - srcRect.x));
      const localY = Math.max(0, Math.min(srcRect.h - 1, point.y - srcRect.y));
      sampleClamp(source, srcRect.w, srcRect.h, localX, localY, color);
      data[i] = byte(sourceAt(snap, srcRect, px, py, 0) + (color.r - sourceAt(snap, srcRect, px, py, 0)) * cover);
      data[i + 1] = byte(sourceAt(snap, srcRect, px, py, 1) + (color.g - sourceAt(snap, srcRect, px, py, 1)) * cover);
      data[i + 2] = byte(sourceAt(snap, srcRect, px, py, 2) + (color.b - sourceAt(snap, srcRect, px, py, 2)) * cover);
      data[i + 3] = 255;
    }
  }
  c.ctx.putImageData(dest, rect.x, rect.y);
  c.markDirty(rect);
}

function sourceAt(image: ImageData, rect: Rect, x: number, y: number, channel: number) {
  const lx = Math.max(0, Math.min(rect.w - 1, x - rect.x));
  const ly = Math.max(0, Math.min(rect.h - 1, y - rect.y));
  return image.data[(ly * rect.w + lx) * 4 + channel];
}

/** Separable box blur. Radius is in pixels and the result stays opaque. */
export function boxBlur(src: Uint8ClampedArray, w: number, h: number, radius: number) {
  const r = Math.max(1, Math.round(radius));
  const horizontal = blurAxis(src, w, h, r, true);
  return blurAxis(horizontal, w, h, r, false);
}

function blurAxis(src: Uint8ClampedArray, w: number, h: number, radius: number, horizontal: boolean) {
  const out = new Uint8ClampedArray(src.length);
  const span = horizontal ? w : h;
  const lines = horizontal ? h : w;
  const window = radius * 2 + 1;
  for (let line = 0; line < lines; line++) {
    let red = 0;
    let green = 0;
    let blue = 0;
    const indexAt = (offset: number) => {
      const clamped = offset < 0 ? 0 : offset >= span ? span - 1 : offset;
      const x = horizontal ? clamped : line;
      const y = horizontal ? line : clamped;
      return (y * w + x) * 4;
    };
    for (let k = -radius; k <= radius; k++) {
      const i = indexAt(k);
      red += src[i];
      green += src[i + 1];
      blue += src[i + 2];
    }
    for (let offset = 0; offset < span; offset++) {
      const i = indexAt(offset);
      out[i] = red / window;
      out[i + 1] = green / window;
      out[i + 2] = blue / window;
      out[i + 3] = 255;
      const remove = indexAt(offset - radius);
      const add = indexAt(offset + radius + 1);
      red += src[add] - src[remove];
      green += src[add + 1] - src[remove + 1];
      blue += src[add + 2] - src[remove + 2];
    }
  }
  return out;
}

export function blurStroke(c: ToolContext, from: Point, to: Point, size: number, radius: number, saturate = 1) {
  const brush = Math.max(1, size / 2);
  const rect = clampRect(strokeBounds(from, to, brush + radius + 2), c.width, c.height);
  if (!rect.w || !rect.h) return;
  const snap = paintingContext(c.snapshot).getImageData(rect.x, rect.y, rect.w, rect.h);
  const blurred = boxBlur(snap.data, rect.w, rect.h, radius);
  const dest = c.ctx.getImageData(rect.x, rect.y, rect.w, rect.h);
  const data = dest.data;
  for (let y = 0; y < rect.h; y++) {
    for (let x = 0; x < rect.w; x++) {
      const cover = brushCoverage(rect.x + x, rect.y + y, from, to, brush);
      if (cover <= 0) continue;
      const i = (y * rect.w + x) * 4;
      const yLum = 0.299 * blurred[i] + 0.587 * blurred[i + 1] + 0.114 * blurred[i + 2];
      const br = yLum + (blurred[i] - yLum) * saturate;
      const bg = yLum + (blurred[i + 1] - yLum) * saturate;
      const bb = yLum + (blurred[i + 2] - yLum) * saturate;
      data[i] = byte(snap.data[i] + (br - snap.data[i]) * cover);
      data[i + 1] = byte(snap.data[i + 1] + (bg - snap.data[i + 1]) * cover);
      data[i + 2] = byte(snap.data[i + 2] + (bb - snap.data[i + 2]) * cover);
      data[i + 3] = 255;
    }
  }
  c.ctx.putImageData(dest, rect.x, rect.y);
  c.markDirty(rect);
}

export interface ShadeFn {
  (src: Uint8ClampedArray, w: number, h: number, x: number, y: number, out: RgbOut): void;
}

export function shadePage(c: ToolContext, shade: ShadeFn) {
  const w = c.width;
  const h = c.height;
  const src = c.ctx.getImageData(0, 0, w, h);
  const image = new ImageData(w, h);
  const out: RgbOut = { r: 0, g: 0, b: 0 };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      shade(src.data, w, h, x, y, out);
      const i = (y * w + x) * 4;
      image.data[i] = byte(out.r);
      image.data[i + 1] = byte(out.g);
      image.data[i + 2] = byte(out.b);
      image.data[i + 3] = 255;
    }
  }
  c.ctx.putImageData(image, 0, 0);
  c.markAllDirty();
}

export function shadeStroke(c: ToolContext, from: Point, to: Point, size: number, shade: ShadeFn) {
  const radius = Math.max(1, size / 2);
  const rect = clampRect(strokeBounds(from, to, radius + 1), c.width, c.height);
  if (!rect.w || !rect.h) return;
  const srcRect = clampRect(strokeBounds(from, to, radius + 4), c.width, c.height);
  const snap = paintingContext(c.snapshot).getImageData(srcRect.x, srcRect.y, srcRect.w, srcRect.h);
  const dest = c.ctx.getImageData(rect.x, rect.y, rect.w, rect.h);
  const out: RgbOut = { r: 0, g: 0, b: 0 };
  for (let y = 0; y < rect.h; y++) {
    for (let x = 0; x < rect.w; x++) {
      const px = rect.x + x;
      const py = rect.y + y;
      const cover = brushCoverage(px, py, from, to, radius);
      if (cover <= 0) continue;
      shade(snap.data, srcRect.w, srcRect.h, px - srcRect.x, py - srcRect.y, out);
      const i = (y * rect.w + x) * 4;
      const base = (py - srcRect.y) * srcRect.w + (px - srcRect.x);
      const bi = base * 4;
      dest.data[i] = byte(snap.data[bi] + (out.r - snap.data[bi]) * cover);
      dest.data[i + 1] = byte(snap.data[bi + 1] + (out.g - snap.data[bi + 1]) * cover);
      dest.data[i + 2] = byte(snap.data[bi + 2] + (out.b - snap.data[bi + 2]) * cover);
      dest.data[i + 3] = 255;
    }
  }
  c.ctx.putImageData(dest, rect.x, rect.y);
  c.markDirty(rect);
}

export function channelAt(data: Uint8ClampedArray, w: number, h: number, x: number, y: number) {
  const cx = x < 0 ? 0 : x >= w ? w - 1 : x;
  const cy = y < 0 ? 0 : y >= h ? h - 1 : y;
  const i = (cy * w + cx) * 4;
  return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
}
