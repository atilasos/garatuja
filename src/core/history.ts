import { clampRect } from './draw';
import type { LabelObject, Rect } from './types';

interface Patch {
  area: Rect;
  before: Uint8ClampedArray;
  after: Uint8ClampedArray;
}

interface BitmapDelta {
  area: Rect;
  xor: Uint8Array;
}

interface Step {
  solid?: { before: string; after: string };
  writing?: { before(): void; after(): void; bytes: number };
  bitmap?: BitmapDelta;
  labels?: { before: LabelObject[]; after: LabelObject[] };
}

/** Keep only the bounding rectangle of pixels that actually changed. */
export function pixelPatch(area: Rect, before: Uint8ClampedArray, after: Uint8ClampedArray): Patch | undefined {
  const { w, h } = area;
  const oldPixels = new Uint32Array(before.buffer, before.byteOffset, before.length / 4);
  const newPixels = new Uint32Array(after.buffer, after.byteOffset, after.length / 4);
  let left = w;
  let top = h;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (oldPixels[i] === newPixels[i]) continue;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      bottom = y;
    }
  }
  if (right < 0) return;
  if (left === 0 && top === 0 && right === w - 1 && bottom === h - 1) return { area, before, after };

  const width = right - left + 1;
  const height = bottom - top + 1;
  const crop = (source: Uint8ClampedArray) => {
    const result = new Uint8ClampedArray(width * height * 4);
    for (let row = 0; row < height; row++) {
      const offset = ((top + row) * w + left) * 4;
      result.set(source.subarray(offset, offset + width * 4), row * width * 4);
    }
    return result;
  };
  return {
    area: { x: area.x + left, y: area.y + top, w: width, h: height },
    before: crop(before), after: crop(after),
  };
}

// The drawing bitmap is opaque. An RGB XOR can reconstruct either side from
// the other, with a fixed upper bound even for incompressible full-page art.
export function bitmapDelta(patch: Patch): BitmapDelta {
  const { area, before, after } = patch;
  const xor = new Uint8Array(area.w * area.h * 3);
  for (let src = 0, dst = 0; src < before.length; src += 4) {
    xor[dst++] = before[src] ^ after[src];
    xor[dst++] = before[src + 1] ^ after[src + 1];
    xor[dst++] = before[src + 2] ^ after[src + 2];
  }
  return { area, xor };
}

export function applyDelta(data: Uint8ClampedArray, { xor }: BitmapDelta) {
  for (let dst = 0, src = 0; dst < data.length; dst += 4) {
    data[dst] ^= xor[src++];
    data[dst + 1] ^= xor[src++];
    data[dst + 2] ^= xor[src++];
  }
}

function bytes(step: Step) {
  return (step.writing?.bytes ?? 0) + (step.bitmap?.xor.byteLength ?? 0) + (step.labels ? JSON.stringify(step.labels).length * 2 : 0);
}

export const HISTORY_BUDGET = 168 * 1024 * 1024;

export class History {
  private past: Step[] = [];
  private future: Step[] = [];
  retainedBytes = 0;

  constructor(private limit = HISTORY_BUDGET, private steps = 60) {}

  get canUndo() { return this.past.length > 0; }
  get canRedo() { return this.future.length > 0; }

  add(step: Step): boolean {
    if (!step.bitmap && !step.labels && !step.writing && !step.solid) return false;
    for (const undone of this.future) this.retainedBytes -= bytes(undone);
    this.future = [];
    this.past.push(step);
    this.retainedBytes += bytes(step);
    while (this.past.length > this.steps || this.retainedBytes > this.limit) this.trim();
    return true;
  }

  trim() {
    const oldest = this.past.shift() ?? this.future.shift();
    if (oldest) this.retainedBytes -= bytes(oldest);
  }

  undo() {
    const step = this.past.pop();
    if (step) this.future.push(step);
    return step;
  }

  redo() {
    const step = this.future.pop();
    if (step) this.past.push(step);
    return step;
  }
}

export function capturePatch(before: CanvasRenderingContext2D, after: CanvasRenderingContext2D, rect: Rect) {
  const area = clampRect(rect, after.canvas.width, after.canvas.height);
  if (!area.w || !area.h) return;
  const read = (ctx: CanvasRenderingContext2D) => ctx.getImageData(area.x, area.y, area.w, area.h).data;
  const patch = pixelPatch(area, read(before), read(after));
  return patch && bitmapDelta(patch);
}
