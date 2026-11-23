import { clampRect } from './draw';
import type { LabelObject, Rect } from './types';

interface Patch {
  area: Rect;
  before: Uint8ClampedArray;
  after: Uint8ClampedArray;
}

interface Step {
  bitmap?: Patch;
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

function bytes(step: Step) {
  return (step.bitmap?.before.byteLength ?? 0) * 2 + (step.labels ? JSON.stringify(step.labels).length * 2 : 0);
}

export class History {
  private past: Step[] = [];
  private future: Step[] = [];
  private pastBytes = 0;

  // Enough space for 30 consecutive full-page RGBA replacements.
  constructor(private limit = 512 * 1024 * 1024, private steps = 60) {}

  get canUndo() { return this.past.length > 0; }
  get canRedo() { return this.future.length > 0; }

  add(step: Step): boolean {
    if (!step.bitmap && !step.labels) return false;
    this.future = [];
    this.push(step);
    return true;
  }

  undo() {
    const step = this.past.pop();
    if (step) {
      this.pastBytes -= bytes(step);
      this.future.push(step);
    }
    return step;
  }

  redo() {
    const step = this.future.pop();
    if (step) this.push(step);
    return step;
  }

  private push(step: Step) {
    this.past.push(step);
    this.pastBytes += bytes(step);
    while (this.past.length > this.steps || this.pastBytes > this.limit) {
      const oldest = this.past.shift();
      if (oldest) this.pastBytes -= bytes(oldest);
    }
  }
}

export function capturePatch(before: CanvasRenderingContext2D, after: CanvasRenderingContext2D, rect: Rect) {
  const area = clampRect(rect, after.canvas.width, after.canvas.height);
  if (!area.w || !area.h) return;
  const read = (ctx: CanvasRenderingContext2D) => ctx.getImageData(area.x, area.y, area.w, area.h).data;
  return pixelPatch(area, read(before), read(after));
}
