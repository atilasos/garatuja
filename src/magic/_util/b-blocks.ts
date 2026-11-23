import { clampRect, strokeBounds } from '../../core/draw';
import type { Point, ToolContext } from '../../core/types';
import { paintingContext, brushCoverage } from './b-bitmap';
import { byte } from './b-color';

export type BlockLook = 'flat' | 'grout' | 'bevel';

/** Replace the brush with a grid of averaged cells. The grid is stable while dragging. */
export function blockStroke(c: ToolContext, from: Point, to: Point, size: number, cell: number, look: BlockLook) {
  const radius = Math.max(1, size / 2);
  const step = Math.max(3, Math.round(cell));
  const rect = clampRect(strokeBounds(from, to, radius + step), c.width, c.height);
  if (!rect.w || !rect.h) return;
  const snap = paintingContext(c.snapshot).getImageData(rect.x, rect.y, rect.w, rect.h);
  const dest = c.ctx.getImageData(rect.x, rect.y, rect.w, rect.h);
  const averages = new Map<number, { r: number; g: number; b: number }>();
  const cellKey = (x: number, y: number) => {
    const col = Math.floor(x / step);
    const row = Math.floor(y / step);
    return row * 8192 + col;
  };
  const average = (x: number, y: number) => {
    const key = cellKey(x, y);
    const cached = averages.get(key);
    if (cached) return cached;
    const x0 = Math.floor(x / step) * step;
    const y0 = Math.floor(y / step) * step;
    let r = 0;
    let g = 0;
    let b = 0;
    let n = 0;
    for (let py = y0; py < y0 + step; py++) {
      for (let px = x0; px < x0 + step; px++) {
        const lx = px - rect.x;
        const ly = py - rect.y;
        if (lx < 0 || ly < 0 || lx >= rect.w || ly >= rect.h) continue;
        const i = (ly * rect.w + lx) * 4;
        r += snap.data[i];
        g += snap.data[i + 1];
        b += snap.data[i + 2];
        n++;
      }
    }
    const color = n ? { r: r / n, g: g / n, b: b / n } : { r: 255, g: 255, b: 255 };
    averages.set(key, color);
    return color;
  };
  for (let y = 0; y < rect.h; y++) {
    for (let x = 0; x < rect.w; x++) {
      const px = rect.x + x;
      const py = rect.y + y;
      const cover = brushCoverage(px, py, from, to, radius);
      if (cover <= 0) continue;
      const base = average(px, py);
      let r = base.r;
      let g = base.g;
      let b = base.b;
      const localX = px - Math.floor(px / step) * step;
      const localY = py - Math.floor(py / step) * step;
      if (look === 'grout' && (localX === 0 || localY === 0)) {
        r = 74;
        g = 58;
        b = 46;
      } else if (look === 'bevel') {
        if (localX < 2 || localY < 2) {
          r = r + (255 - r) * 0.45;
          g = g + (255 - g) * 0.45;
          b = b + (255 - b) * 0.55;
        } else if (localX > step - 3 || localY > step - 3) {
          r *= 0.62;
          g *= 0.62;
          b *= 0.7;
        }
      }
      const i = (y * rect.w + x) * 4;
      const srcI = i;
      dest.data[i] = byte(snap.data[srcI] + (r - snap.data[srcI]) * cover);
      dest.data[i + 1] = byte(snap.data[srcI + 1] + (g - snap.data[srcI + 1]) * cover);
      dest.data[i + 2] = byte(snap.data[srcI + 2] + (b - snap.data[srcI + 2]) * cover);
      dest.data[i + 3] = 255;
    }
  }
  c.ctx.putImageData(dest, rect.x, rect.y);
  c.markDirty(rect);
}
