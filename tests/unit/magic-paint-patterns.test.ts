import { describe, expect, it } from 'vitest';
import { clampRect, seededRandom, unionRect } from '../../src/core/draw';
import type { MagicEffect, PaintPointer, Rect, ToolContext } from '../../src/core/types';
import { SoftwareCanvas } from './software-canvas';

const modules = import.meta.glob<MagicEffect>('../../src/magic/*.ts', { eager: true, import: 'default' });
const batchEffects = Object.values(modules)
  .filter(effect => effect.category === 'pintar' || effect.category === 'padroes')
  .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));

const W = 320;
const H = 240;

function runDiagonalStroke(effect: MagicEffect, seed: number, color = '#2b6cb0', size = 36) {
  const main = new SoftwareCanvas(W, H, 255);
  const overlay = new SoftwareCanvas(W, H, 0);
  const paper = new SoftwareCanvas(W, H, 255);
  const snapshot = new SoftwareCanvas(W, H, 255);
  const initial = main.data.slice();

  let dirty: Rect | undefined;
  const empty = () => {};
  const ctx = main as unknown as CanvasRenderingContext2D;
  const overlayCtx = overlay as unknown as CanvasRenderingContext2D;

  const context: ToolContext = {
    width: W,
    height: H,
    ctx,
    overlay: overlayCtx,
    paper: paper.canvas as unknown as HTMLCanvasElement,
    snapshot: snapshot.canvas as unknown as HTMLCanvasElement,
    foreground: null,
    color,
    opt() { throw new Error('Magic effects receive size as an argument'); },
    markDirty(r) {
      dirty = dirty ? unionRect(dirty, r) : r;
    },
    markAllDirty() {
      const full = { x: 0, y: 0, w: W, h: H };
      dirty = dirty ? unionRect(dirty, full) : full;
    },
    clearOverlay() {
      overlay.clearRect(0, 0, W, H);
    },
    commit: empty,
    rollback: empty,
    random: seededRandom(seed),
    sound: empty,
    say: empty,
    labels: { list: () => [], add: empty, update: empty, remove: empty, at: () => undefined },
  };

  const pt = (x: number, y: number, t: number): PaintPointer => ({
    x, y, t, pressure: 0.5, pointerType: 'mouse', constrain: false,
  });

  const start = pt(56, 48, 0);
  effect.begin?.(start, context, size);
  effect.stroke?.(start, start, context, size);

  let prev = start;
  const steps = 10;
  for (let i = 1; i <= steps; i++) {
    const frac = i / steps;
    const next = pt(56 + frac * 204, 48 + frac * 144, i * 16);
    effect.stroke?.(prev, next, context, size);
    prev = next;
  }
  effect.end?.(prev, context, size);

  return { initial, pixels: main.data, dirty };
}

describe('magic effects batch C (pintar & padroes)', () => {
  it('registers at least 32 unique paint & pattern effects with valid metadata', () => {
    expect(batchEffects.length).toBeGreaterThanOrEqual(32);
    const ids = new Set(batchEffects.map(e => e.id));
    expect(ids.size).toBe(batchEffects.length);

    const levelOne = batchEffects.filter(e => e.level === 1);
    expect(levelOne.length).toBeGreaterThanOrEqual(10);
    expect(levelOne.length).toBeLessThanOrEqual(15);

    for (const effect of batchEffects) {
      expect(effect.label.pt.trim().length).toBeGreaterThan(0);
      expect(effect.label.en.trim().length).toBeGreaterThan(0);
      expect(effect.hint.pt.trim().length).toBeGreaterThan(0);
      expect(effect.hint.en.trim().length).toBeGreaterThan(0);
      expect(typeof effect.stroke).toBe('function');
    }
  });

  it.each(batchEffects.map(e => [e.id, e] as const))(
    '%s alters pixels, stays opaque, is deterministic, and covers every changed pixel in markDirty',
    (_id, effect) => {
      const run1 = runDiagonalStroke(effect, 42);
      const run2 = runDiagonalStroke(effect, 42);

      // Deterministic with the same seed
      expect(run1.pixels).toEqual(run2.pixels);

      // Must have reported dirty bounds
      expect(run1.dirty).toBeDefined();
      const clamped = clampRect(run1.dirty!, W, H);
      expect(clamped.w).toBeGreaterThan(0);
      expect(clamped.h).toBeGreaterThan(0);

      let changed = 0;
      let transparent = 0;
      let escapedDirty = 0;
      let firstEscape = '';

      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4;
          if (run1.pixels[i + 3] !== 255) transparent++;

          const diff =
            run1.pixels[i] !== run1.initial[i] ||
            run1.pixels[i + 1] !== run1.initial[i + 1] ||
            run1.pixels[i + 2] !== run1.initial[i + 2] ||
            run1.pixels[i + 3] !== run1.initial[i + 3];
          if (!diff) continue;

          changed++;
          const inside =
            x >= clamped.x &&
            x < clamped.x + clamped.w &&
            y >= clamped.y &&
            y < clamped.y + clamped.h;
          if (!inside) {
            escapedDirty++;
            if (!firstEscape) {
              firstEscape = `pixel (${x}, ${y}) outside dirty {x:${clamped.x}, y:${clamped.y}, w:${clamped.w}, h:${clamped.h}}`;
            }
          }
        }
      }

      expect(changed).toBeGreaterThan(0);
      expect(transparent).toBe(0);
      expect(escapedDirty, firstEscape).toBe(0);
    },
  );
});
